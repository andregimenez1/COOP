import { Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getCooperativaAdmin } from '../services/marketplace.service.js';
import {
  createFlashDeal,
  listActiveFlashDeals,
  claimFlashDeal,
  createStrategicQuota,
  listStrategicQuotasWithMyRemaining,
  claimStrategicReserve,
} from '../services/vantagens.service.js';
import { onFlashDealCreated, onStrategicReserveClaimed } from '../services/notificationTriggers.js';
import { DeliveryType } from '@prisma/client';

/** POST /marketplace/flash-deals – Criar Flash Deal (Cooperativa). */
export async function createFlashDealHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const cooperativa = await getCooperativaAdmin();
    if (!cooperativa || cooperativa.id !== userId) {
      throw new AppError('Apenas a Cooperativa (Market Maker) pode criar Flash Deals', 403);
    }
    const { productId, startTime, endTime, specialPrice, stockLimit, limitPerUser, unit } = req.body;
    if (!productId || !startTime || !endTime || specialPrice == null || stockLimit == null) {
      throw new AppError('productId, startTime, endTime, specialPrice e stockLimit obrigatórios', 400);
    }
    const deal = await createFlashDeal({
      productId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      specialPrice: Number(specialPrice),
      stockLimit: Number(stockLimit),
      limitPerUser: limitPerUser != null ? Number(limitPerUser) : undefined,
      unit: unit || undefined,
    });
    await onFlashDealCreated(deal).catch((err) => console.error('[vantagens] onFlashDealCreated:', err));
    res.status(201).json({ flashDeal: deal });
  } catch (e) {
    next(e);
  }
}

/** GET /marketplace/flash-deals – Listar Flash Deals ativos. */
export async function listFlashDealsHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const deals = await listActiveFlashDeals();
    res.json({ flashDeals: deals });
  } catch (e) {
    next(e);
  }
}

/** POST /marketplace/flash-deals/:id/claim – Resgatar Flash Deal (quantity, deliveryType). */
export async function claimFlashDealHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const { id: flashDealId } = req.params;
    const { quantity, deliveryType } = req.body as { quantity: number; deliveryType: 'HUB' | 'COOPERATIVA' };
    if (!flashDealId || quantity == null || !deliveryType) {
      throw new AppError('quantity e deliveryType (HUB ou COOPERATIVA) obrigatórios', 400);
    }
    const dt = deliveryType === 'COOPERATIVA' ? ('COOPERATIVA' as DeliveryType) : ('HUB' as DeliveryType);
    const result = await claimFlashDeal(userId, flashDealId, Number(quantity), dt);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

/** POST /marketplace/strategic-quotas – Criar Reserva Estratégica (Cooperativa). */
export async function createStrategicQuotaHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const cooperativa = await getCooperativaAdmin();
    if (!cooperativa || cooperativa.id !== userId) {
      throw new AppError('Apenas a Cooperativa (Market Maker) pode criar Reservas Estratégicas', 403);
    }
    const { productId, totalReserved, resetDate, periodDays, unit } = req.body;
    if (!productId || totalReserved == null || !resetDate) {
      throw new AppError('productId, totalReserved e resetDate obrigatórios', 400);
    }
    const quota = await createStrategicQuota({
      productId,
      totalReserved: Number(totalReserved),
      resetDate: new Date(resetDate),
      periodDays: periodDays != null ? Number(periodDays) : undefined,
      unit: unit || undefined,
    });
    res.status(201).json({ strategicQuota: quota });
  } catch (e) {
    next(e);
  }
}

/** GET /marketplace/strategic-quotas – Listar cotas com minha cota restante. */
export async function listStrategicQuotasHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const quotas = await listStrategicQuotasWithMyRemaining(userId);
    res.json({ strategicQuotas: quotas });
  } catch (e) {
    next(e);
  }
}

/** POST /marketplace/strategic-quotas/:id/claim – Resgatar cota (quantity, deliveryType). */
export async function claimStrategicReserveHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const { id: strategicQuotaId } = req.params;
    const { quantity, deliveryType } = req.body as { quantity: number; deliveryType: 'HUB' | 'COOPERATIVA' };
    if (!strategicQuotaId || quantity == null || !deliveryType) {
      throw new AppError('quantity e deliveryType (HUB ou COOPERATIVA) obrigatórios', 400);
    }
    const dt = deliveryType === 'COOPERATIVA' ? ('COOPERATIVA' as DeliveryType) : ('HUB' as DeliveryType);
    const result = await claimStrategicReserve(userId, strategicQuotaId, Number(quantity), dt);
    if (result.quotaId && result.remainingInPeriodAfter != null && result.totalReserved != null) {
      await onStrategicReserveClaimed(
        result.quotaId,
        result.productName ?? 'Insumo',
        result.remainingInPeriodAfter,
        result.totalReserved,
        result.unit ?? 'g',
        userId
      ).catch((err) => console.error('[vantagens] onStrategicReserveClaimed:', err));
    }
    res.json(result);
  } catch (e) {
    next(e);
  }
}
