import { PrismaClient } from '@prisma/client';
import { broadcastToCooperados } from './sse.service.js';
import {
  sendFlashDealPublished,
  sendReserveRunningLow,
  sendHubCreditDeposited,
} from './EmailService.js';

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_FRONTEND_URL ?? 'http://localhost:8080';

/** Chamar após criar um Flash Deal: SSE + e-mails. */
export async function onFlashDealCreated(deal: {
  id: string;
  product?: { substance?: { name: string } };
  unit?: string;
}) {
  const productName = deal.product?.substance?.name ?? 'Produto';
  const link = `${BASE_URL}/estoque-inteligente#flash-deals`;

  broadcastToCooperados('flash-deal-created', {
    productName,
    flashDealId: deal.id,
    link,
  });

  const users = await prisma.user.findMany({
    where: {
      role: 'cooperado',
      status: 'active',
      notifyEmailFlashDeals: true,
      email: { not: null },
    },
    select: { email: true },
  });
  for (const u of users) {
    if (u.email) await sendFlashDealPublished(u.email, productName, deal.id);
  }
}

const RESERVE_LOW_THRESHOLD = 0.2; // 20% restante

/** Chamar após claim de reserva: se restante < 20%, e-mail para quem já resgatou e optou (exceto o que acabou de resgatar). */
export async function onStrategicReserveClaimed(
  quotaId: string,
  productName: string,
  remainingInPeriod: number,
  totalReserved: number,
  unit: string,
  excludeUserId?: string
) {
  const ratio = totalReserved > 0 ? remainingInPeriod / totalReserved : 1;
  if (ratio > RESERVE_LOW_THRESHOLD) return;

  const userIds = await prisma.strategicReserveClaim
    .findMany({
      where: { strategicQuotaId: quotaId },
      select: { userId: true },
      distinct: ['userId'],
    })
    .then((rows) => rows.map((r) => r.userId));

  const ids = excludeUserId ? userIds.filter((id) => id !== excludeUserId) : userIds;
  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
      status: 'active',
      notifyEmailReservas: true,
      email: { not: null },
    },
    select: { email: true },
  });
  for (const u of users) {
    if (u.email) await sendReserveRunningLow(u.email, productName, remainingInPeriod, unit);
  }
}

/** Chamar quando crédito Hub for depositado (movimento hub_credit para userId). */
export async function onHubCreditDeposited(userId: string, amount: number) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, notifyEmailHubCredit: true },
  });
  if (!u?.email || !u.notifyEmailHubCredit) return;
  await sendHubCreditDeposited(u.email, amount);
}
