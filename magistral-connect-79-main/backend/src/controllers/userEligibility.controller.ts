import { Response, NextFunction } from 'express';
import { PrismaClient, userprofiledocument_type as UserProfileDocumentType } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

type EligibilityStatus = 'valid' | 'expired' | 'pending' | 'missing';

function pickBestDoc(docs: Array<{ validUntil: Date | null; validIndefinitely: boolean }>) {
  const now = new Date();
  const hasIndefinite = docs.some((d) => d.validIndefinitely);
  if (hasIndefinite) {
    return { status: 'valid' as EligibilityStatus, validIndefinitely: true, validUntil: null as Date | null };
  }
  const maxValidUntil = docs
    .map((d) => d.validUntil)
    .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  if (!maxValidUntil) return { status: 'missing' as EligibilityStatus, validIndefinitely: false, validUntil: null as Date | null };
  if (maxValidUntil.getTime() >= now.getTime()) {
    return { status: 'valid' as EligibilityStatus, validIndefinitely: false, validUntil: maxValidUntil };
  }
  return { status: 'expired' as EligibilityStatus, validIndefinitely: false, validUntil: maxValidUntil };
}

async function getEligibilityFor(userId: string) {
  const [aeDocs, pfDocs, aePending, pfPending] = await Promise.all([
    prisma.userprofiledocument.findMany({ where: { userId, type: 'ae' }, orderBy: { uploadedAt: 'desc' } }),
    prisma.userprofiledocument.findMany({ where: { userId, type: 'policia_federal' as UserProfileDocumentType }, orderBy: { uploadedAt: 'desc' } }),
    prisma.userprofiledocumentrequest.findFirst({
      where: { userId, type: 'ae', status: 'pending' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.userprofiledocumentrequest.findFirst({
      where: { userId, type: 'policia_federal' as UserProfileDocumentType, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const ae = pickBestDoc(aeDocs.map((d) => ({ validUntil: (d as any).validUntil ?? null, validIndefinitely: Boolean((d as any).validIndefinitely) })));
  const pf = pickBestDoc(pfDocs.map((d) => ({ validUntil: (d as any).validUntil ?? null, validIndefinitely: Boolean((d as any).validIndefinitely) })));

  const aeStatus: EligibilityStatus = ae.status === 'missing' && aePending ? 'pending' : ae.status;
  const pfStatus: EligibilityStatus = pf.status === 'missing' && pfPending ? 'pending' : pf.status;

  return {
    userId,
    ae: {
      status: aeStatus,
      validIndefinitely: ae.validIndefinitely,
      validUntil: ae.validUntil ? ae.validUntil.toISOString() : null,
      pendingRequestAt: aePending ? aePending.createdAt.toISOString() : null,
    },
    pf: {
      status: pfStatus,
      validIndefinitely: pf.validIndefinitely,
      validUntil: pf.validUntil ? pf.validUntil.toISOString() : null,
      pendingRequestAt: pfPending ? pfPending.createdAt.toISOString() : null,
    },
  };
}

export const getMyTradingEligibility = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('User not found', 401);
    res.json(await getEligibilityFor(userId));
  } catch (e) {
    next(e);
  }
};

export const getUserTradingEligibility = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requesterId = req.user?.id;
    if (!requesterId) throw new AppError('User not found', 401);

    const { id } = req.params;
    if (!id) throw new AppError('id é obrigatório', 400);

    // Não expõe PDFs nem detalhes sensíveis: apenas status de elegibilidade.
    res.json(await getEligibilityFor(id));
  } catch (e) {
    next(e);
  }
};

