import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

type Unit = 'g' | 'kg' | 'mL' | 'L';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toBase(unit: Unit, quantity: number): { kind: 'mass' | 'volume'; baseUnit: 'g' | 'mL'; baseQty: number } | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  if (unit === 'g') return { kind: 'mass', baseUnit: 'g', baseQty: quantity };
  if (unit === 'kg') return { kind: 'mass', baseUnit: 'g', baseQty: quantity * 1000 };
  if (unit === 'mL') return { kind: 'volume', baseUnit: 'mL', baseQty: quantity };
  if (unit === 'L') return { kind: 'volume', baseUnit: 'mL', baseQty: quantity * 1000 };
  return null;
}

function pickReferenceFromVariations(variations: any): {
  kind: 'mass' | 'volume';
  baseUnit: 'g' | 'mL';
  pricePerBaseUnit: number;
  variation: { quantity: number; unit: Unit; price: number; packageType?: string };
} | null {
  if (!Array.isArray(variations)) return null;
  const candidates: Array<{
    kind: 'mass' | 'volume';
    baseUnit: 'g' | 'mL';
    pricePerBaseUnit: number;
    variation: { quantity: number; unit: Unit; price: number; packageType?: string };
  }> = [];

  for (const v of variations) {
    const quantity = Number(v?.quantity);
    const unit = v?.unit as Unit;
    const price = Number(v?.price);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    if (!Number.isFinite(price) || price <= 0) continue;
    if (!['g', 'kg', 'mL', 'L'].includes(unit)) continue;

    const base = toBase(unit, quantity);
    if (!base) continue;
    const pricePerBaseUnit = price / base.baseQty;
    if (!Number.isFinite(pricePerBaseUnit) || pricePerBaseUnit <= 0) continue;

    candidates.push({
      kind: base.kind,
      baseUnit: base.baseUnit,
      pricePerBaseUnit,
      variation: {
        quantity,
        unit,
        price,
        packageType: typeof v?.packageType === 'string' ? v.packageType : undefined,
      },
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.pricePerBaseUnit - b.pricePerBaseUnit);
  return candidates[0];
}

/**
 * GET /api/quotations/latest?substanceIds=<id1>,<id2>,...
 * Retorna a última cotação (por quotationDate) de cada substância, com referência de preço.
 */
export async function getLatestQuotations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const raw = typeof req.query.substanceIds === 'string' ? req.query.substanceIds : '';
    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      throw new AppError('substanceIds é obrigatório (lista separada por vírgula).', 400);
    }
    const validIds = ids.filter(isUuid);
    if (validIds.length === 0) {
      throw new AppError('substanceIds inválido.', 400);
    }

    const rows = await prisma.quotation.findMany({
      where: { substanceId: { in: validIds } },
      orderBy: { quotationDate: 'desc' },
      select: {
        id: true,
        userId: true,
        userName: true,
        substanceId: true,
        substanceName: true,
        supplierId: true,
        supplierName: true,
        validity: true,
        variations: true,
        quotationDate: true,
        notes: true,
      },
    });

    const latestBySubstanceId = new Map<string, any>();
    for (const q of rows) {
      if (!latestBySubstanceId.has(q.substanceId)) {
        const reference = pickReferenceFromVariations(q.variations);
        latestBySubstanceId.set(q.substanceId, {
          quotation: q,
          reference: reference
            ? {
                kind: reference.kind,
                baseUnit: reference.baseUnit,
                pricePerBaseUnit: reference.pricePerBaseUnit,
                variation: reference.variation,
              }
            : null,
        });
      }
    }

    res.json({
      latest: Object.fromEntries(latestBySubstanceId.entries()),
    });
  } catch (e) {
    next(e);
  }
}

