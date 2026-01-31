import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

const COOPERATIVA_EMAIL = 'usuario@magistral.com';
const LIQUIDATION_DISCOUNT = 0.15; // 15%
const LAST_SALES_COUNT = 3;

export async function getCooperativaAdmin() {
  const admin = await prisma.user.findUnique({
    where: { email: COOPERATIVA_EMAIL },
    select: { id: true, name: true, email: true },
  });
  if (!admin) return null;
  return admin;
}

export function isCooperativaAdmin(email: string): boolean {
  return email === COOPERATIVA_EMAIL;
}

/** Média das últimas N vendas (MARKETPLACE ou LIQUIDACAO) para a substância. */
export async function getLastSalesAveragePrice(
  substanceId: string,
  count: number = LAST_SALES_COUNT
): Promise<number | null> {
  const sales = await prisma.transaction.findMany({
    where: {
      substanceId,
      type: { in: ['MARKETPLACE', 'LIQUIDACAO'] },
      pricePerUnit: { not: null },
    },
    orderBy: { completedAt: 'desc' },
    take: count,
    select: { pricePerUnit: true },
  });
  if (sales.length === 0) return null;
  const sum = sales.reduce((acc, s) => acc + (s.pricePerUnit ?? 0), 0);
  return sum / sales.length;
}

/**
 * Transfere apenas a propriedade (ownerId) entre cooperados. holderId permanece com o vendedor
 * até o comprador solicitar retirada. Registra Transaction tipo MARKETPLACE.
 */
export async function processMarketplacePurchase(
  inventoryItemId: string,
  buyerId: string,
  pricePerUnit: number
) {
  const item = await prisma.inventoryitem.findUnique({
    where: { id: inventoryItemId },
    include: {
      substance: true,
      user_inventoryitem_ownerIdTouser: { select: { id: true, name: true, company: true } },
      user_inventoryitem_holderIdTouser: { select: { id: true, name: true, company: true } },
    },
  });
  if (!item) throw new Error('Item de estoque não encontrado');
  if (item.ownerId === buyerId) throw new Error('Comprador já é o proprietário');
  const sellerId = item.ownerId;
  const quantity = item.quantity;
  const totalPrice = pricePerUnit * quantity;

  await prisma.$transaction(async (tx) => {
    await tx.inventoryitem.update({
      where: { id: inventoryItemId },
      data: { ownerId: buyerId },
    });
    const buyer = await tx.user.findUnique({
      where: { id: buyerId },
      select: { id: true, name: true, company: true },
    });
    if (!buyer) throw new Error('Comprador não encontrado');
    await tx.transaction.create({
      data: {
        type: 'MARKETPLACE',
        substanceId: item.substanceId,
        substanceName: item.substance.name,
        quantity,
        unit: item.unit,
        pricePerUnit,
        totalPrice,
        sellerId,
        sellerName: item.user_inventoryitem_ownerIdTouser.name,
        buyerId: buyer.id,
        buyerName: buyer.name,
      },
    });
  });
  return { success: true, inventoryItemId, buyerId };
}

/**
 * Liquidação imediata: Cooperativa compra excesso do cooperado.
 * Verifica gap (targetStock - currentStock), preço = média últimas 3 vendas - 15%,
 * usa Prisma $transaction para evitar concorrência.
 */
export async function processImmediateLiquidation(
  cooperadoId: string,
  inventoryItemId: string,
  quantityToLiquidate: number
) {
  const cooperativa = await getCooperativaAdmin();
  if (!cooperativa) throw new Error('Cooperativa (Market Maker) não configurada');

  const item = await prisma.inventoryitem.findUnique({
    where: { id: inventoryItemId },
    include: { substance: true, user_inventoryitem_ownerIdTouser: true, user_inventoryitem_holderIdTouser: true },
  });
  if (!item) throw new Error('Item de estoque não encontrado');
  if (!item.isExcess) throw new Error('Apenas itens marcados como excesso podem ser liquidados');
  if (item.ownerId !== cooperadoId || item.holderId !== cooperadoId) {
    throw new Error('Só é possível liquidar seu próprio excesso');
  }
  if (quantityToLiquidate <= 0 || quantityToLiquidate > item.quantity) {
    throw new Error('Quantidade inválida para liquidação');
  }

  const avgPrice = await getLastSalesAveragePrice(item.substanceId);
  if (avgPrice == null || avgPrice <= 0) {
    throw new Error('Sem histórico de vendas para calcular preço de liquidação');
  }
  const liquidationPricePerUnit = avgPrice * (1 - LIQUIDATION_DISCOUNT);
  const totalPrice = liquidationPricePerUnit * quantityToLiquidate;

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { substanceId: item!.substanceId },
    });
    if (!product) throw new Error('Produto sem estoque-alvo configurado pela Cooperativa');
    const gap = product.targetStock - product.currentStock;
    if (gap <= 0) throw new Error('Cooperativa não precisa deste insumo no momento');
    const amount = Math.min(quantityToLiquidate, gap);

    const coop = await tx.user.findUnique({
      where: { id: cooperativa.id },
      select: { id: true, name: true, company: true },
    });
    if (!coop) throw new Error('Cooperativa não encontrada');

    await tx.transaction.create({
      data: {
        type: 'LIQUIDACAO',
        substanceId: item!.substanceId,
        substanceName: item!.substance.name,
        quantity: amount,
        unit: item!.unit,
        pricePerUnit: liquidationPricePerUnit,
        totalPrice: liquidationPricePerUnit * amount,
        sellerId: cooperadoId,
        sellerName: item!.user_inventoryitem_ownerIdTouser.name,
        buyerId: coop.id,
        buyerName: coop.name,
      },
    });

    await tx.product.update({
      where: { id: product.id },
      data: { currentStock: { increment: amount } },
    });

    if (amount >= item!.quantity) {
      await tx.inventoryitem.delete({ where: { id: inventoryItemId } });
    } else {
      await tx.inventoryitem.update({
        where: { id: inventoryItemId },
        data: { quantity: { decrement: amount } },
      });
    }

    return {
      amount,
      pricePerUnit: liquidationPricePerUnit,
      totalPrice: liquidationPricePerUnit * amount,
      productId: product.id,
    };
  });

  return result;
}

/** Retorna gap (targetStock - currentStock) por produto. Útil para saber se "Liquidação Imediata" deve aparecer. */
export async function getProductGaps() {
  const products = await prisma.product.findMany({
    include: { substance: true },
    orderBy: { substance: { name: 'asc' } },
  });
  return products.map((p) => ({
    productId: p.id,
    substanceId: p.substanceId,
    substanceName: p.substance.name,
    targetStock: p.targetStock,
    currentStock: p.currentStock,
    gap: Math.max(0, p.targetStock - p.currentStock),
    unit: p.unit,
  }));
}

/** Economia gerada pelas liquidações (soma de totalPrice das transações LIQUIDACAO). */
export async function getLiquidationSavings() {
  const rows = await prisma.transaction.findMany({
    where: { type: 'LIQUIDACAO' },
    select: { totalPrice: true, completedAt: true, substanceName: true, quantity: true, unit: true },
    orderBy: { completedAt: 'desc' },
  });
  const total = rows.reduce((acc, r) => acc + (r.totalPrice ?? 0), 0);
  return { total, transactions: rows };
}

export interface UnsuccessfulTransactionItem {
  id: string;
  type: 'rejected_proposal';
  proposalId: string;
  offerId: string;
  substanceName: string;
  quantity: number;
  unit: string;
  role: 'proposer' | 'owner';
  otherPartyName: string;
  otherPartyCompany?: string;
  createdAt: Date;
  respondedAt?: Date;
  rejectionReason?: string;
  offerType: 'sell' | 'buy';
  proposal?: any;
}

/** Histórico de transações do usuário: bem-sucedidas (Transaction) e mal-sucedidas (propostas rejeitadas). */
export async function getUserTransactionHistory(userId: string) {
  const [successful, rejectedProposals] = await Promise.all([
    prisma.transaction.findMany({
      where: { OR: [{ sellerId: userId }, { buyerId: userId }] },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        type: true,
        proposalId: true,
        offerId: true,
        offerType: true,
        substanceId: true,
        substanceName: true,
        quantity: true,
        unit: true,
        pricePerUnit: true,
        totalPrice: true,
        sellerId: true,
        sellerName: true,
        buyerId: true,
        buyerName: true,
        laudoId: true,
        laudoPdfUrl: true,
        laudoFileName: true,
        completedAt: true,
        createdAt: true,
        offerproposal: {
          select: {
            id: true,
            offerId: true,
            offerType: true,
            proposerId: true,
            proposerName: true,
            proposerCompany: true,
            quantity: true,
            unit: true,
            status: true,
            counterProposalQuantity: true,
            counterProposalMessage: true,
            createdAt: true,
            respondedAt: true,
            completedAt: true,
            laudoId: true,
            substanceId: true,
            substanceName: true,
            isAgreement: true,
            cashAmount: true,
            tradeSubstanceId: true,
            tradeSubstanceName: true,
            tradeQuantity: true,
            tradeUnit: true,
            tradeLaudoId: true,
            rejectionReason: true,
            marketplaceoffer: {
              select: {
                userId: true,
                userName: true,
                companyName: true,
                type: true,
                rawMaterialName: true,
              },
            },
          },
        },
      },
    }),
    prisma.offerproposal.findMany({
      where: { status: 'rejected' },
      include: { marketplaceoffer: { select: { userId: true, userName: true, companyName: true, type: true, rawMaterialName: true } } },
      orderBy: { respondedAt: 'desc' },
    }),
  ]);

  const unsuccessful: UnsuccessfulTransactionItem[] = [];
  for (const p of rejectedProposals) {
    const isProposer = p.proposerId === userId;
    const isOwner = p.marketplaceoffer.userId === userId;
    if (!isProposer && !isOwner) continue;
    const role = isProposer ? ('proposer' as const) : ('owner' as const);
    const otherPartyName = isProposer ? p.marketplaceoffer.userName : p.proposerName;
    const otherPartyCompany = isProposer ? p.marketplaceoffer.companyName ?? undefined : p.proposerCompany ?? undefined;
    unsuccessful.push({
      id: p.id,
      type: 'rejected_proposal',
      proposalId: p.id,
      offerId: p.offerId,
      substanceName: p.substanceName ?? p.marketplaceoffer.rawMaterialName ?? 'Matéria-prima',
      quantity: p.quantity,
      unit: p.unit,
      role,
      otherPartyName,
      otherPartyCompany,
      createdAt: p.createdAt,
      respondedAt: p.respondedAt ?? undefined,
      rejectionReason: p.rejectionReason ?? undefined,
      offerType: p.marketplaceoffer.type as 'sell' | 'buy',
      proposal: {
        id: p.id,
        offerId: p.offerId,
        offerType: p.offerType,
        proposerId: p.proposerId,
        proposerName: p.proposerName,
        proposerCompany: p.proposerCompany ?? undefined,
        quantity: p.quantity,
        unit: p.unit,
        status: p.status,
        counterProposalQuantity: p.counterProposalQuantity ?? undefined,
        counterProposalMessage: p.counterProposalMessage ?? undefined,
        createdAt: p.createdAt,
        respondedAt: p.respondedAt ?? undefined,
        completedAt: p.completedAt ?? undefined,
        laudoId: p.laudoId ?? undefined,
        substanceId: p.substanceId ?? undefined,
        substanceName: p.substanceName ?? undefined,
        isAgreement: p.isAgreement ?? undefined,
        cashAmount: p.cashAmount ?? undefined,
        tradeSubstanceId: p.tradeSubstanceId ?? undefined,
        tradeSubstanceName: p.tradeSubstanceName ?? undefined,
        tradeQuantity: p.tradeQuantity ?? undefined,
        tradeUnit: p.tradeUnit ?? undefined,
        tradeLaudoId: p.tradeLaudoId ?? undefined,
        rejectionReason: p.rejectionReason ?? undefined,
        offer: {
          userId: p.marketplaceoffer.userId,
          userName: p.marketplaceoffer.userName,
          companyName: p.marketplaceoffer.companyName ?? undefined,
          type: p.marketplaceoffer.type,
          rawMaterialName: p.marketplaceoffer.rawMaterialName,
        },
      },
    });
  }

  return { successful, unsuccessful };
}
