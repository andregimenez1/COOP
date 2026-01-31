import { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import {
  getCooperativaAdmin,
  getProductGaps,
  getLiquidationSavings,
  getUserTransactionHistory,
  processMarketplacePurchase,
  processImmediateLiquidation,
} from '../services/marketplace.service.js';
import {
  listActiveFlashDeals,
  listAllFlashDeals,
  listStrategicQuotasWithMyRemaining,
  listAllStrategicQuotas,
} from '../services/vantagens.service.js';

const prisma = new PrismaClient();

async function getLatestValidDocStatus(userId: string, type: 'ae' | 'policia_federal') {
  const docs = await prisma.userprofiledocument.findMany({
    where: { userId, type: type as any },
    orderBy: { uploadedAt: 'desc' },
  });
  const now = new Date();
  if (docs.some((d) => Boolean((d as any).validIndefinitely))) return true;
  const maxValidUntil = docs
    .map((d) => (d as any).validUntil as Date | null)
    .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  return !!(maxValidUntil && maxValidUntil.getTime() >= now.getTime());
}

async function assertUserCanHandleControlledSubstance(userId: string, substanceId: string, action: string) {
  const substance = await prisma.substance.findUnique({ where: { id: substanceId } });
  if (!substance) throw new AppError('Substância não encontrada', 404);

  const missing: string[] = [];
  if (substance.requiresAe) {
    const ok = await getLatestValidDocStatus(userId, 'ae');
    if (!ok) missing.push('AE');
  }
  if (substance.requiresPf) {
    const ok = await getLatestValidDocStatus(userId, 'policia_federal');
    if (!ok) missing.push('PF');
  }

  if (missing.length > 0) {
    throw new AppError(
      `Para ${action} esta matéria-prima controlada, o cooperado precisa ter ${missing.join(' e ')} aprovado e dentro da validade no Perfil.`,
      403
    );
  }
}

const VALID_OFFER_STATUSES = new Set(['active', 'completed', 'cancelled', 'draft']);
const normalizeOfferStatus = (status: unknown): 'active' | 'completed' | 'cancelled' | 'draft' => {
  if (typeof status === 'string' && VALID_OFFER_STATUSES.has(status)) {
    return status as 'active' | 'completed' | 'cancelled' | 'draft';
  }
  if (status === 'paused') return 'draft';
  if (status === 'expired') return 'active';
  return 'active';
};

/** GET /marketplace/stock – Estoque inteligente: dados conforme Admin vs Cooperado */
export async function getStockDashboard(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const cooperativa = await getCooperativaAdmin();
    const isAdmin = !!cooperativa && userId === cooperativa.id;

    if (isAdmin) {
      const [products, savings, gaps, flashDeals, strategicQuotas] = await Promise.all([
        prisma.product.findMany({
          include: { substance: true },
          orderBy: { substance: { name: 'asc' } },
        }),
        getLiquidationSavings(),
        getProductGaps(),
        listAllFlashDeals(),
        listAllStrategicQuotas(),
      ]);
      return res.json({
        role: 'admin',
        products,
        gaps,
        liquidationSavings: { total: savings.total, transactions: savings.transactions },
        flashDeals,
        strategicQuotas,
      });
    }

    const myItems = await prisma.inventoryitem.findMany({
      where: { ownerId: userId },
      include: {
        substance: true,
        rawmaterial: true,
        user_inventoryitem_holderIdTouser: { select: { id: true, name: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const gaps = await getProductGaps();
    const gapsBySubstance = new Map(gaps.map((g) => [g.substanceId, g]));

    const itemsWithLiquidation = myItems.map((it) => {
      const item: any = { ...it };
      if (item.user_inventoryitem_holderIdTouser) {
        item.holder = item.user_inventoryitem_holderIdTouser;
        delete item.user_inventoryitem_holderIdTouser;
      }

      const g = gapsBySubstance.get(item.substanceId);
      const canLiquidate = it.isExcess && g && g.gap > 0 && it.quantity > 0;
      return {
        ...it,
        canLiquidate: !!canLiquidate,
        gap: g?.gap ?? 0,
      };
    });

    const flashDeals = await listActiveFlashDeals();
    const strategicQuotas = await listStrategicQuotasWithMyRemaining(userId);

    return res.json({
      role: 'cooperado',
      inventoryItems: itemsWithLiquidation,
      productGaps: gaps,
      flashDeals,
      strategicQuotas,
    });
  } catch (e) {
    next(e);
  }
}

/** GET /marketplace/products – Lista produtos (estoque-alvo/atual). Admin ou Cooperado. */
export async function listProducts(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const products = await prisma.product.findMany({
      include: { substance: true },
      orderBy: { substance: { name: 'asc' } },
    });
    const gaps = await getProductGaps();
    return res.json({ products, gaps });
  } catch (e) {
    return next(e);
  }
}

/** PATCH /marketplace/products/:id – Atualizar targetStock (e unit). Apenas Cooperativa Admin. */
export async function updateProductTarget(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const cooperativa = await getCooperativaAdmin();
    if (!cooperativa || cooperativa.id !== userId) {
      throw new AppError('Apenas a Cooperativa (Market Maker) pode alterar estoque-alvo', 403);
    }
    const { id } = req.params;
    const { targetStock, unit } = req.body as { targetStock?: number; unit?: string };
    const data: { targetStock?: number; unit?: string } = {};
    if (typeof targetStock === 'number' && targetStock >= 0) data.targetStock = targetStock;
    if (unit) data.unit = unit;
    const product = await prisma.product.update({
      where: { id: id as string },
      data,
      include: { substance: true },
    });
    res.json({ product });
  } catch (e) {
    next(e);
  }
}

/** POST /marketplace/products – Criar Product para substância (Cooperativa). */
export async function createProduct(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const cooperativa = await getCooperativaAdmin();
    if (!cooperativa || cooperativa.id !== userId) {
      throw new AppError('Apenas a Cooperativa pode criar produtos', 403);
    }
    const { substanceId, targetStock, unit } = req.body as {
      substanceId: string;
      targetStock?: number;
      unit?: string;
    };
    if (!substanceId) throw new AppError('substanceId obrigatório', 400);
    const product = await prisma.product.upsert({
      where: { substanceId },
      create: {
        id: randomUUID(),
        substanceId,
        targetStock: typeof targetStock === 'number' ? targetStock : 0,
        unit: unit ?? 'g',
        updatedAt: new Date(),
      },
      update: {
        ...(typeof targetStock === 'number' && { targetStock }),
        ...(unit && { unit }),
        updatedAt: new Date(),
      },
      include: { substance: true },
    });
    res.status(201).json({ product });
  } catch (e) {
    next(e);
  }
}

/** GET /marketplace/inventory – Meus itens de estoque (ownerId = eu). */
export async function listMyInventory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const itemsRaw = await prisma.inventoryitem.findMany({
      where: { ownerId: userId },
      include: {
        substance: true,
        rawmaterial: true,
        user_inventoryitem_holderIdTouser: { select: { id: true, name: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = itemsRaw.map((it: any) => {
      const item = { ...it };
      if (item.user_inventoryitem_holderIdTouser) {
        item.holder = item.user_inventoryitem_holderIdTouser;
        delete item.user_inventoryitem_holderIdTouser;
      }
      return item;
    });

    res.json({ items });
  } catch (e) {
    next(e);
  }
}

/** POST /marketplace/inventory – Criar item (lote). Se isExcess, gera oferta implícita. */
export async function createInventoryItem(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, company: true },
    });
    if (!user) throw new AppError('Usuário não encontrado', 404);
    const {
      substanceId,
      rawMaterialId,
      batch,
      quantity,
      unit,
      expirationDate,
      isExcess,
    } = req.body as {
      substanceId: string;
      rawMaterialId?: string;
      batch?: string;
      quantity: number;
      unit: string;
      expirationDate: string;
      isExcess?: boolean;
    };
    if (!substanceId || quantity == null || !unit || !expirationDate) {
      throw new AppError('substanceId, quantity, unit, expirationDate obrigatórios', 400);
    }
    const substance = await prisma.substance.findUnique({ where: { id: substanceId } });
    if (!substance) throw new AppError('Substância não encontrada', 404);

    // Controlados: só pode cadastrar/negociar se tiver licença aprovada e válida no perfil
    await assertUserCanHandleControlledSubstance(userId, substanceId, 'cadastrar/negociar');

    const item = await prisma.inventoryitem.create({
      data: {
        id: randomUUID(),
        substanceId,
        rawMaterialId: rawMaterialId || undefined,
        batch: batch || undefined,
        ownerId: userId,
        holderId: userId,
        quantity,
        unit,
        expirationDate: new Date(expirationDate),
        isExcess: !!isExcess,
        updatedAt: new Date(),
      },
      include: {
        substance: true,
        rawmaterial: true,
      },
    });
    res.status(201).json({ item });
  } catch (e) {
    next(e);
  }
}

/** PATCH /marketplace/inventory/:id – Atualizar (ex.: marcar/desmarcar excesso). */
export async function updateInventoryItem(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const item = await prisma.inventoryitem.findUnique({ where: { id: id as string } });
    if (!item) throw new AppError('Item não encontrado', 404);
    if (item.ownerId !== userId) throw new AppError('Sem permissão para editar este item', 403);
    const { quantity, isExcess } = req.body as { quantity?: number; isExcess?: boolean };
    const data: { quantity?: number; isExcess?: boolean } = {};
    if (typeof quantity === 'number' && quantity >= 0) data.quantity = quantity;
    if (typeof isExcess === 'boolean') data.isExcess = isExcess;
    const updatedRaw = await prisma.inventoryitem.update({
      where: { id: id as string },
      data,
      include: { substance: true, rawmaterial: true, user_inventoryitem_holderIdTouser: { select: { id: true, name: true, company: true } } },
    });
    const updated: any = { ...updatedRaw };
    if (updated.user_inventoryitem_holderIdTouser) {
      updated.holder = updated.user_inventoryitem_holderIdTouser;
      delete updated.user_inventoryitem_holderIdTouser;
    }
    res.json({ item: updated });
  } catch (e) {
    next(e);
  }
}

/** POST /marketplace/purchase – Compra entre cooperados (só propriedade). */
export async function purchase(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user!.id;
    const { inventoryItemId, pricePerUnit } = req.body as {
      inventoryItemId: string;
      pricePerUnit: number;
    };
    if (!inventoryItemId || pricePerUnit == null) {
      throw new AppError('inventoryItemId e pricePerUnit obrigatórios', 400);
    }

    // Antes de comprar/receber, validar licenças do comprador para o item (controlados AE/PF)
    const item = await prisma.inventoryitem.findUnique({
      where: { id: inventoryItemId },
      select: { id: true, substanceId: true },
    });
    if (item) {
      await assertUserCanHandleControlledSubstance(buyerId, item.substanceId, 'comprar/receber');
    }

    const result = await processMarketplacePurchase(inventoryItemId, buyerId, pricePerUnit);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

/** POST /marketplace/liquidation – Liquidação imediata (excesso → Cooperativa). */
export async function liquidation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cooperadoId = req.user!.id;
    const { inventoryItemId, quantity } = req.body as {
      inventoryItemId: string;
      quantity: number;
    };
    if (!inventoryItemId || quantity == null) {
      throw new AppError('inventoryItemId e quantity obrigatórios', 400);
    }
    const result = await processImmediateLiquidation(cooperadoId, inventoryItemId, quantity);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

/** GET /marketplace/liquidation-savings – Economia com liquidações (Admin). */
export async function liquidationSavings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { total, transactions } = await getLiquidationSavings();
    res.json({ total, transactions });
  } catch (e) {
    next(e);
  }
}

/** GET /marketplace/transactions/history – Histórico do usuário: bem-sucedidas e mal-sucedidas. */
export async function transactionHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { successful, unsuccessful } = await getUserTransactionHistory(userId);
    return res.json({ successful, unsuccessful });
  } catch (e) {
    return next(e);
  }
}

/** GET /marketplace/offers – Lista ofertas do marketplace. Filtros via query. */
export async function listOffers(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const offers = await prisma.marketplaceoffer.findMany({
      where: {
        status: 'active',
      },
      include: {
        user: { select: { id: true, name: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ offers });
  } catch (e) {
    return next(e);
  }
}

/** POST /marketplace/offers – Criar nova oferta. */
export async function createOffer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const {
      type,
      rawMaterialId,
      rawMaterialName,
      substanceId,
      substanceName,
      quantity,
      unit,
      pricePerUnit,
      expiryDate,
      maxPrice,
      minExpiryDate,
      acceptShortExpiry,
      status,
      isAuction,
      startingPrice,
      auctionEnd
    } = req.body;

    // Se for oferta de venda e tiver matéria-prima, validar licenças
    if (type === 'sell' && substanceId) {
      await assertUserCanHandleControlledSubstance(userId, substanceId, 'vender');
    }

    // Validações básicas para retornar 400 em vez de 500
    if (!type || (type !== 'sell' && type !== 'buy')) {
      throw new AppError('Tipo de oferta inválido. Use "sell" ou "buy".', 400);
    }
    if (!unit || typeof unit !== 'string' || unit.trim() === '') {
      throw new AppError('Unidade é obrigatória.', 400);
    }

    const normalizedQuantity = Number(quantity);
    if (isNaN(normalizedQuantity) || normalizedQuantity <= 0) {
      throw new AppError('Quantidade deve ser um número maior que zero.', 400);
    }

    const normalizedPricePerUnit = Number(pricePerUnit || 0);
    const normalizedMaxPrice = maxPrice != null ? Number(maxPrice) : null;
    const normalizedExpiryDate = expiryDate ? new Date(expiryDate) : null;
    const normalizedMinExpiryDate = minExpiryDate ? new Date(minExpiryDate) : null;
    const normalizedStatus = normalizeOfferStatus(status);

    // rawMaterialId pode ser um ID de laudo do localStorage (não verificamos FK)
    // Usado para identificar ofertas de excesso criadas a partir de laudos
    const resolvedRawMaterialId = rawMaterialId || null;

    const existingOffer = await prisma.marketplaceoffer.findFirst({
      where: {
        userId,
        type,
        rawMaterialId: resolvedRawMaterialId,
        rawMaterialName: rawMaterialName || null,
        substanceId: substanceId || null,
        substanceName: substanceName || null,
        quantity: normalizedQuantity,
        unit,
        pricePerUnit: normalizedPricePerUnit,
        maxPrice: normalizedMaxPrice,
        expiryDate: normalizedExpiryDate,
        minExpiryDate: normalizedMinExpiryDate,
        status: normalizedStatus,
      },
    });

    if (existingOffer) {
      return res.status(200).json({ offer: existingOffer, duplicated: true });
    }

    const offer = await (prisma.marketplaceoffer.create as any)({
      data: {
        id: randomUUID(),
        type,
        rawMaterialId: resolvedRawMaterialId,
        rawMaterialName: rawMaterialName || null,
        substanceId,
        substanceName: substanceName || null,
        quantity: normalizedQuantity,
        unit,
        pricePerUnit: normalizedPricePerUnit,
        expiryDate: normalizedExpiryDate,
        maxPrice: normalizedMaxPrice,
        minExpiryDate: normalizedMinExpiryDate,
        acceptShortExpiry: Boolean(acceptShortExpiry),
        userId,
        userName: req.user!.name || '',
        companyName: req.user!.company || '',
        status: normalizedStatus,
        isAuction: !!isAuction,
        startingPrice: startingPrice != null ? Number(startingPrice) : null,
        auctionEnd: auctionEnd ? new Date(auctionEnd) : null,
        currentBid: isAuction ? (startingPrice != null ? Number(startingPrice) : 0) : null,
        bidCount: isAuction ? 0 : null,
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, company: true } },
      }
    });

    return res.status(201).json({ offer });
  } catch (e) {
    return next(e);
  }
}

/** POST /marketplace/offers/:id/bid – Dar um lance em um leilão. */
export async function placeBid(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const bidderId = req.user!.id;
    const offerId = req.params.id as string;
    const { amount } = req.body;

    const normalizedAmount = Number(amount);
    if (!normalizedAmount || isNaN(normalizedAmount) || normalizedAmount <= 0) {
      throw new AppError('Valor do lance inválido', 400);
    }

    const offer = await prisma.marketplaceoffer.findUnique({
      where: { id: offerId as string }
    });

    if (!offer) throw new AppError('Oferta não encontrada', 404);
    if (!(offer as any).isAuction) throw new AppError('Esta oferta não é um leilão', 400);
    if (offer.status !== 'active') throw new AppError('Leilão não está ativo', 400);
    if (offer.userId === bidderId) throw new AppError('Você não pode dar lances em sua própria oferta', 400);

    const now = new Date();
    if ((offer as any).auctionEnd && now > (offer as any).auctionEnd) {
      await prisma.marketplaceoffer.update({
        where: { id: offerId as string },
        data: { status: 'completed' }
      });
      throw new AppError('Leilão já encerrado', 400);
    }

    const updatedOffer = await prisma.$transaction(async (tx) => {
      // Atomic check for currentBid
      const current = await (tx.marketplaceoffer.findUnique as any)({
        where: { id: offerId as string },
        select: { currentBid: true, startingPrice: true }
      });

      const realMin = current?.currentBid != null ? current.currentBid + 0.01 : (current?.startingPrice || 0);
      if (normalizedAmount < realMin) {
        throw new Error('Alguém já deu um lance maior ou igual. Tente novamente.');
      }

      const offerUpdated = await (tx.marketplaceoffer.update as any)({
        where: { id: offerId as string },
        data: {
          currentBid: normalizedAmount,
          highestBidderId: bidderId,
          bidCount: { increment: 1 }
        },
        include: {
          user: { select: { id: true, name: true, company: true } },
          highestbidder: { select: { id: true, name: true, company: true } }
        }
      });

      await (tx as any).marketplacebid.create({
        data: {
          id: randomUUID(),
          offerId,
          bidderId,
          amount: normalizedAmount
        }
      });

      return offerUpdated;
    });

    return res.json({ success: true, offer: updatedOffer });
  } catch (e: any) {
    if (e instanceof Error && e.message.includes('Alguém já deu um lance')) {
      return res.status(409).json({ error: e.message });
    }
    return next(e);
  }
}

/** PATCH /marketplace/offers/:id – Atualizar oferta (status, preço, etc). */
export async function updateOffer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const {
      quantity,
      pricePerUnit,
      expiryDate,
      maxPrice,
      status,
      acceptShortExpiry
    } = req.body;

    const existing = await prisma.marketplaceoffer.findUnique({ where: { id: id as string } });
    if (!existing) throw new AppError('Oferta não encontrada', 404);

    // Apenas dono ou admin pode editar
    const isOwner = existing.userId === userId;
    // TODO: Adicionar checagem de permissão admin se necessário
    if (!isOwner) throw new AppError('Sem permissão para editar esta oferta', 403);

    const normalizedStatus = status != null ? normalizeOfferStatus(status) : undefined;
    const updated = await prisma.marketplaceoffer.update({
      where: { id: id as string },
      data: {
        ...(quantity != null && { quantity: Number(quantity) }),
        ...(pricePerUnit != null && { pricePerUnit: Number(pricePerUnit) }),
        ...(expiryDate && { expiryDate: new Date(expiryDate) }),
        ...(maxPrice != null && { maxPrice: Number(maxPrice) }),
        ...(status && { status: normalizedStatus }),
        acceptShortExpiry: acceptShortExpiry !== undefined ? Boolean(acceptShortExpiry) : undefined,
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, company: true } },
      }
    });

    return res.json({ offer: updated });
  } catch (e) {
    return next(e);
  }
}

/** DELETE /marketplace/offers/:id – Remover oferta. */
export async function deleteOffer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const offerId = req.params.id as string;

    const existing = await (prisma.marketplaceoffer.findUnique as any)({ where: { id: offerId } });
    if (!existing) throw new AppError('Oferta não encontrada', 404);

    if (existing.userId !== userId) {
      throw new AppError('Sem permissão para remover esta oferta', 403);
    }

    await (prisma.marketplaceoffer.delete as any)({ where: { id: offerId } });
    return res.json({ success: true });
  } catch (e) {
    return next(e);
  }
}

/** DELETE /marketplace/admin/offers/:id – Admin remove qualquer oferta. */
export async function adminDeleteOffer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cooperativa = await getCooperativaAdmin();
    const offerId = req.params.id as string;
    if (!cooperativa || cooperativa.id !== req.user!.id) {
      throw new AppError('Apenas Cooperativa Admin pode deletar qualquer oferta', 403);
    }
    await (prisma.marketplaceoffer.delete as any)({ where: { id: offerId } });
    return res.json({ success: true });
  } catch (e) {
    return next(e);
  }
}

// --- PROPOSALS ---

/** GET /marketplace/proposals – Listar propostas relacionadas ao usuário. */
export async function listProposals(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const proposals = await prisma.offerproposal.findMany({
      where: {
        OR: [
          { proposerId: userId },
          { marketplaceoffer: { userId } }
        ]
      },
      include: {
        marketplaceoffer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ proposals });
  } catch (e) {
    next(e);
  }
}

/** POST /marketplace/proposals – Criar nova proposta. */
export async function createProposal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const proposerId = req.user!.id;
    const {
      offerId,
      offerType,
      quantity,
      unit,
      productExpiryDate,
      laudoId,
      substanceId,
      substanceName,
      isAgreement,
      cashAmount,
      tradeSubstanceId,
      tradeSubstanceName,
      tradeQuantity,
      tradeUnit,
      tradeLaudoId
    } = req.body;

    const proposal = await prisma.offerproposal.create({
      data: {
        offerId,
        offerType,
        proposerId,
        proposerName: req.user!.name,
        proposerCompany: req.user!.company,
        quantity: Number(quantity),
        unit,
        productExpiryDate: productExpiryDate ? new Date(productExpiryDate) : null,
        status: 'pending',
        laudoId,
        substanceId,
        substanceName,
        isAgreement: !!isAgreement,
        cashAmount: cashAmount ? Number(cashAmount) : null,
        tradeSubstanceId,
        tradeSubstanceName,
        tradeQuantity: tradeQuantity ? Number(tradeQuantity) : null,
        tradeUnit,
        tradeLaudoId,
      },
      include: {
        marketplaceoffer: true,
      }
    });

    res.status(201).json({ proposal });
  } catch (e) {
    next(e);
  }
}

/** PATCH /marketplace/proposals/:id – Atualizar status da proposta. */
export async function updateProposal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status, counterProposalQuantity, counterProposalMessage, rejectionReason } = req.body;

    const existing = await prisma.offerproposal.findUnique({
      where: { id },
      include: { marketplaceoffer: true }
    });

    if (!existing) throw new AppError('Proposta não encontrada', 404);

    // Validar quem pode alterar o status
    // ... simplificado para permitir ambos ou master ...

    const updated = await prisma.offerproposal.update({
      where: { id },
      data: {
        status,
        counterProposalQuantity: counterProposalQuantity != null ? Number(counterProposalQuantity) : undefined,
        counterProposalMessage,
        rejectionReason,
        respondedAt: status !== 'pending' ? new Date() : undefined,
      },
      include: { marketplaceoffer: true }
    });

    res.json({ proposal: updated });
  } catch (e) {
    next(e);
  }
}

// --- TRANSACTIONS ---

/** GET /marketplace/transactions – Listar transações do usuário. */
export async function listTransactions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { sellerId: userId },
          { buyerId: userId }
        ]
      },
      include: {
        offerproposal: true,
      },
      orderBy: { completedAt: 'desc' },
    });
    res.json({ transactions });
  } catch (e) {
    next(e);
  }
}

/** POST /marketplace/transactions – Criar nova transação manual. */
export async function createTransaction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      type,
      proposalId,
      offerId,
      offerType,
      substanceId,
      substanceName,
      quantity,
      unit,
      pricePerUnit,
      totalPrice,
      sellerId,
      sellerName,
      buyerId,
      buyerName,
      laudoId,
      laudoPdfUrl,
      laudoFileName
    } = req.body;

    const transaction = await prisma.transaction.create({
      data: {
        id: randomUUID(),
        type: type || 'MARKETPLACE',
        proposalId,
        offerId,
        offerType,
        substanceId,
        substanceName,
        quantity: Number(quantity),
        unit,
        pricePerUnit: pricePerUnit ? Number(pricePerUnit) : null,
        totalPrice: totalPrice ? Number(totalPrice) : null,
        sellerId,
        sellerName,
        buyerId,
        buyerName,
        laudoId,
        laudoPdfUrl,
        laudoFileName,
        completedAt: new Date(),
        user_transaction_buyerIdTouser: { connect: { id: buyerId } },
        user_transaction_sellerIdTouser: { connect: { id: sellerId } },
      } as any,
    });

    res.status(201).json({ transaction });
  } catch (e) {
    next(e);
  }
}
