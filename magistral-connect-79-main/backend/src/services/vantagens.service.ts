import { PrismaClient, DeliveryType } from '@prisma/client';
import { getCooperativaAdmin } from './marketplace.service.js';

const prisma = new PrismaClient();

/** Número de cooperados com CNPJ (para cota per capita na reserva estratégica). */
async function countCooperadosWithCnpj(): Promise<number> {
  const n = await prisma.user.count({
    where: {
      role: 'cooperado',
      status: 'active',
      cnpj: { not: null },
    },
  });
  return Math.max(1, n);
}

/** Cota por membro = totalReserved / N. */
export async function getQuotaPerMember(totalReserved: number): Promise<number> {
  const n = await countCooperadosWithCnpj();
  return totalReserved / n;
}

// --- Flash Deals ---

export interface CreateFlashDealInput {
  productId: string;
  startTime: Date;
  endTime: Date;
  specialPrice: number;
  stockLimit: number;
  limitPerUser?: number;
  unit?: string;
}

export async function createFlashDeal(input: CreateFlashDealInput) {
  const cooperativa = await getCooperativaAdmin();
  if (!cooperativa) throw new Error('Cooperativa (Market Maker) não configurada');

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { substance: true },
  });
  if (!product) throw new Error('Produto não encontrado');
  if (input.startTime >= input.endTime) throw new Error('startTime deve ser anterior a endTime');
  if (input.specialPrice <= 0 || input.stockLimit <= 0) {
    throw new Error('specialPrice e stockLimit devem ser positivos');
  }

  const deal = await prisma.flashdeal.create({
    data: {
      productId: input.productId,
      startTime: input.startTime,
      endTime: input.endTime,
      specialPrice: input.specialPrice,
      stockLimit: input.stockLimit,
      limitPerUser: input.limitPerUser ?? undefined,
      unit: input.unit ?? product.unit,
    },
    include: { product: { include: { substance: true } } },
  });
  return deal;
}

function enrichFlashDeals(
  deals: any[]
) {
  const now = new Date();
  return deals.map((d) => {
    const claimed = (d.flashdealclaim || []).reduce((s: number, c: any) => s + c.quantity, 0);
    const remaining = Math.max(0, d.stockLimit - claimed);
    const isInWindow = now >= d.startTime && now <= d.endTime;
    return {
      ...d,
      claims: d.flashdealclaim,
      claimedTotal: claimed,
      remainingStock: remaining,
      isActive: isInWindow && remaining > 0,
    };
  });
}

/** Lista Flash Deals ativos (startTime <= now <= endTime) com estoque restante. */
export async function listActiveFlashDeals() {
  const now = new Date();
  const deals = await prisma.flashdeal.findMany({
    where: {
      startTime: { lte: now },
      endTime: { gte: now },
    },
    include: {
      product: { include: { substance: true } },
      flashdealclaim: true,
    },
    orderBy: { endTime: 'asc' },
  });
  return enrichFlashDeals(deals).filter((d) => d.remainingStock > 0);
}

/** Lista todos os Flash Deals (admin). */
export async function listAllFlashDeals() {
  const deals = await prisma.flashdeal.findMany({
    include: {
      product: { include: { substance: true } },
      flashdealclaim: true,
    },
    orderBy: { endTime: 'desc' },
  });
  return enrichFlashDeals(deals);
}

/** Resgata Flash Deal. deliveryType: HUB | COOPERATIVA. */
export async function claimFlashDeal(
  userId: string,
  flashDealId: string,
  quantity: number,
  deliveryType: DeliveryType
) {
  if (quantity <= 0) throw new Error('Quantidade deve ser positiva');

  const deal = await prisma.flashdeal.findUnique({
    where: { id: flashDealId },
    include: { product: { include: { substance: true } }, flashdealclaim: true },
  });
  if (!deal) throw new Error('Flash Deal não encontrado');

  const now = new Date();
  if (now < deal.startTime) throw new Error('Flash Deal ainda não iniciou');
  if (now > deal.endTime) throw new Error('Flash Deal já encerrou');

  const claimedTotal = (deal.flashdealclaim || []).reduce((s: number, c: any) => s + c.quantity, 0);
  const remaining = Math.max(0, deal.stockLimit - claimedTotal);
  if (quantity > remaining) throw new Error(`Estoque insuficiente. Disponível: ${remaining} ${deal.unit}`);

  const userClaimed = (deal.flashdealclaim || []).filter((c: any) => c.userId === userId).reduce((s: number, c: any) => s + c.quantity, 0);
  const limit = deal.limitPerUser;
  if (limit != null && userClaimed + quantity > limit) {
    throw new Error(`Limite por cooperado: ${limit} ${deal.unit}. Você já resgatou ${userClaimed}.`);
  }

  const claim = await prisma.flashdealclaim.create({
    data: {
      flashDealId,
      userId,
      quantity,
      deliveryType,
    },
    include: { flashdeal: { include: { product: { include: { substance: true } } } }, user: true },
  });

  return {
    claim,
    totalPrice: deal.specialPrice * quantity,
    deliveryType,
  };
}

// --- Reserva Estratégica ---

export interface CreateStrategicQuotaInput {
  productId: string;
  totalReserved: number;
  resetDate: Date;
  periodDays?: number;
  unit?: string;
}

export async function createStrategicQuota(input: CreateStrategicQuotaInput) {
  const cooperativa = await getCooperativaAdmin();
  if (!cooperativa) throw new Error('Cooperativa (Market Maker) não configurada');

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { substance: true },
  });
  if (!product) throw new Error('Produto não encontrado');
  if (input.totalReserved <= 0) throw new Error('totalReserved deve ser positivo');

  const periodDays = input.periodDays ?? 30;
  const quota = await prisma.strategicquota.create({
    data: {
      productId: input.productId,
      totalReserved: input.totalReserved,
      resetDate: input.resetDate,
      periodDays,
      unit: input.unit ?? product.unit,
    },
    include: { product: { include: { substance: true } } },
  });
  return quota;
}

/** Período atual: [resetDate, resetDate + periodDays). */
function getPeriodEnd(resetDate: Date, periodDays: number): Date {
  const end = new Date(resetDate);
  end.setDate(end.getDate() + periodDays);
  return end;
}

/** Lista cotas ativas (no período atual) com quota por membro e consumo do usuário. */
export async function listStrategicQuotasWithMyRemaining(userId: string) {
  const now = new Date();
  const quotas = await prisma.strategicquota.findMany({
    include: {
      product: { include: { substance: true } },
      strategicreserveclaim: true,
    },
    orderBy: { resetDate: 'desc' },
  }) as any[];

  const n = await countCooperadosWithCnpj();
  const result: {
    id: string;
    productId: string;
    product: any;
    totalReserved: number;
    resetDate: Date;
    periodDays: number;
    unit: string;
    quotaPerMember: number;
    consumedByMe: number;
    remainingForMe: number;
    totalConsumedInPeriod: number;
    remainingInPeriod: number;
    isInPeriod: boolean;
    periodEnd: Date;
  }[] = [];

  for (const q of quotas) {
    const periodEnd = getPeriodEnd(q.resetDate, q.periodDays);
    const isInPeriod = now >= q.resetDate && now < periodEnd;
    const quotaPerMember = q.totalReserved / n;

    const periodClaims = (q.strategicreserveclaim || []).filter(
      (c: any) => c.claimedAt >= q.resetDate && c.claimedAt < periodEnd
    );
    const totalConsumedInPeriod = periodClaims.reduce((s: number, c: any) => s + c.quantity, 0);
    const consumedByMe = periodClaims
      .filter((c: any) => c.userId === userId)
      .reduce((s: number, c: any) => s + c.quantity, 0);
    const remainingForMe = Math.max(0, quotaPerMember - consumedByMe);
    const remainingInPeriod = Math.max(0, q.totalReserved - totalConsumedInPeriod);

    result.push({
      id: q.id,
      productId: q.productId,
      product: q.product,
      totalReserved: q.totalReserved,
      resetDate: q.resetDate,
      periodDays: q.periodDays,
      unit: q.unit,
      quotaPerMember,
      consumedByMe,
      remainingForMe,
      totalConsumedInPeriod,
      remainingInPeriod,
      isInPeriod,
      periodEnd,
    });
  }

  return result;
}

/** Lista todas as Reservas Estratégicas (admin), sem consumo por usuário. */
export async function listAllStrategicQuotas() {
  const quotas = await prisma.strategicquota.findMany({
    include: { product: { include: { substance: true } }, strategicreserveclaim: true },
    orderBy: { resetDate: 'desc' },
  }) as any[];
  const n = await countCooperadosWithCnpj();
  return quotas.map((q) => {
    const periodEnd = getPeriodEnd(q.resetDate, q.periodDays);
    const periodClaims = (q.strategicreserveclaim || []).filter(
      (c: any) => c.claimedAt >= q.resetDate && c.claimedAt < periodEnd
    );
    const totalConsumed = periodClaims.reduce((s: number, c: any) => s + c.quantity, 0);
    return {
      ...q,
      claims: q.strategicreserveclaim,
      quotaPerMember: q.totalReserved / n,
      totalConsumedInPeriod: totalConsumed,
      remainingInPeriod: Math.max(0, q.totalReserved - totalConsumed),
      periodEnd,
    };
  });
}

/** Resgata cota de reserva estratégica. deliveryType: HUB | COOPERATIVA. */
export async function claimStrategicReserve(
  userId: string,
  strategicQuotaId: string,
  quantity: number,
  deliveryType: DeliveryType
) {
  if (quantity <= 0) throw new Error('Quantidade deve ser positiva');

  const quota = await prisma.strategicquota.findUnique({
    where: { id: strategicQuotaId },
    include: { product: { include: { substance: true } }, strategicreserveclaim: true },
  }) as any;
  if (!quota) throw new Error('Reserva estratégica não encontrada');

  const now = new Date();
  const periodEnd = getPeriodEnd(quota.resetDate, quota.periodDays);
  if (now < quota.resetDate) throw new Error('Período da reserva ainda não iniciou');
  if (now >= periodEnd) throw new Error('Período da reserva já encerrou. Aguarde o próximo ciclo.');

  const n = await countCooperadosWithCnpj();
  const quotaPerMember = quota.totalReserved / n;
  const periodClaims = (quota.strategicreserveclaim || []).filter(
    (c: any) => c.claimedAt >= quota.resetDate && c.claimedAt < periodEnd
  );
  const totalConsumed = periodClaims.reduce((s: number, c: any) => s + c.quantity, 0);
  const consumedByMe = periodClaims
    .filter((c: any) => c.userId === userId)
    .reduce((s: number, c: any) => s + c.quantity, 0);
  const remainingForMe = Math.max(0, quotaPerMember - consumedByMe);
  const remainingInPeriod = Math.max(0, quota.totalReserved - totalConsumed);

  if (quantity > remainingForMe) {
    throw new Error(`Cota insuficiente. Você pode resgatar até ${remainingForMe} ${quota.unit} neste período.`);
  }
  if (quantity > remainingInPeriod) {
    throw new Error(`Estoque da reserva insuficiente. Disponível: ${remainingInPeriod} ${quota.unit}.`);
  }

  const claim = await prisma.strategicreserveclaim.create({
    data: {
      strategicQuotaId,
      userId,
      quantity,
      deliveryType,
    } as any,
    include: {
      strategicquota: { include: { product: { include: { substance: true } } } },
      user: true,
    },
  });

  const remainingInPeriodAfter = Math.max(0, remainingInPeriod - quantity);
  const productName = quota.product?.substance?.name ?? 'Insumo';

  return {
    claim,
    remainingQuotaAfter: remainingForMe - quantity,
    deliveryType,
    quotaId: strategicQuotaId,
    productName,
    totalReserved: quota.totalReserved,
    unit: quota.unit,
    remainingInPeriodAfter,
  };
}
