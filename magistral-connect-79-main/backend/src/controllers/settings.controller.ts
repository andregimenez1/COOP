import { Response, NextFunction } from 'express';
import { PrismaClient, DocumentType, SupplierDocValidityPolicyMode } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

const ALLOWED_POLICY_TYPES: DocumentType[] = ['afe', 'ae', 'crt'];

function normalizeMode(input: unknown): SupplierDocValidityPolicyMode {
  if (input === 'months' || input === 'indefinite') return input as SupplierDocValidityPolicyMode;
  return 'indefinite';
}

function normalizeMonths(input: unknown): number | null {
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  const m = Math.trunc(n);
  if (![6, 12, 24].includes(m)) return null;
  return m;
}

export const getSupplierDocumentValidityPolicies = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const policies = await prisma.supplierdocumentvaliditypolicy.findMany({
      where: { type: { in: ALLOWED_POLICY_TYPES } },
      orderBy: { type: 'asc' },
    });
    res.json({ policies });
  } catch (error) {
    next(error);
  }
};

export const updateSupplierDocumentValidityPolicy = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401);

    const { type, mode, months } = req.body ?? {};
    if (!type || typeof type !== 'string') throw new AppError('type é obrigatório', 400);
    if (!ALLOWED_POLICY_TYPES.includes(type as DocumentType)) {
      throw new AppError('type inválido para política de validade', 400);
    }

    const normalizedMode = normalizeMode(mode);
    const normalizedMonths = normalizedMode === 'months' ? normalizeMonths(months) : null;
    if (normalizedMode === 'months' && !normalizedMonths) {
      throw new AppError('months deve ser 6, 12 ou 24 quando mode=months', 400);
    }

    const policy = await prisma.supplierdocumentvaliditypolicy.upsert({
      where: { type: type as DocumentType },
      create: {
        type: type as DocumentType,
        mode: normalizedMode,
        months: normalizedMode === 'months' ? normalizedMonths : null,
        updatedBy: userId,
      },
      update: {
        mode: normalizedMode,
        months: normalizedMode === 'months' ? normalizedMonths : null,
        updatedBy: userId,
      },
    });

    res.json({ policy });
  } catch (error) {
    next(error);
  }
};

// Marketplace Config (singleton)
function normalizeMinSellValidityDays(input: unknown): number {
  const n = Number(input);
  if (!Number.isFinite(n)) return 30;
  const v = Math.trunc(n);
  // Limites razoáveis para evitar valores absurdos
  if (v < 0) return 0;
  if (v > 3650) return 3650;
  return v;
}

function normalizeMarketplaceFee(input: unknown): number {
  const n = Number(input);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

export const getMarketplaceConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const config = await prisma.marketplaceconfig.findUnique({ where: { id: 'singleton' } });
    // Se ainda não existe (DB antiga), devolver defaults sem criar automaticamente
    res.json({
      config: config ?? { id: 'singleton', minSellValidityDays: 30, marketplaceFee: 0, updatedBy: null, updatedAt: new Date() },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMarketplaceConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401);

    const { minSellValidityDays, marketplaceFee } = req.body ?? {};

    const updateData: any = {};
    if (minSellValidityDays !== undefined) {
      updateData.minSellValidityDays = normalizeMinSellValidityDays(minSellValidityDays);
    }
    if (marketplaceFee !== undefined) {
      updateData.marketplaceFee = normalizeMarketplaceFee(marketplaceFee);
    }

    updateData.updatedBy = userId;

    const config = await prisma.marketplaceconfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...updateData },
      update: updateData,
    });

    res.json({ config });
  } catch (error) {
    next(error);
  }
};

