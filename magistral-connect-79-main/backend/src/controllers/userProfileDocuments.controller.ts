import { Response, NextFunction } from 'express';
import { PrismaClient, UserProfileDocumentType } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

const ALLOWED_PROFILE_DOC_TYPES: UserProfileDocumentType[] = [
  'ae',
  'afe',
  'licenca_sanitaria',
  'corpo_bombeiros',
];

function parseValidUntil(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
    // Espera "YYYY-MM-DD" (input date)
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const d = new Date(year, month - 1, day, 23, 59, 59, 999);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }
  return null;
}

function parseValidIndefinitely(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

export const getMyProfileDocuments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('User not found', 401);

    const documents = await prisma.userprofiledocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json({ documents });
  } catch (error) {
    next(error);
  }
};

export const createMyProfileDocument = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('User not found', 401);

    const { type: typeRaw, fileName, fileUrl, validUntil: validUntilRaw, validIndefinitely: validIndefinitelyRaw } =
      req.body ?? {};

    const type = typeRaw as UserProfileDocumentType;
    if (!type || !ALLOWED_PROFILE_DOC_TYPES.includes(type)) {
      throw new AppError('Tipo de documento inválido', 400);
    }
    if (!fileName || typeof fileName !== 'string') {
      throw new AppError('fileName é obrigatório', 400);
    }
    if (!fileUrl || typeof fileUrl !== 'string') {
      throw new AppError('fileUrl é obrigatório', 400);
    }

    const validUntil = parseValidUntil(validUntilRaw);
    const validIndefinitely = parseValidIndefinitely(validIndefinitelyRaw);

    if (!validUntil && !validIndefinitely) {
      throw new AppError('Informe a validade (data/mês/ano) ou marque como indeterminada.', 400);
    }

    const created = await prisma.userprofiledocument.create({
      data: {
        userId,
        type,
        fileName,
        fileUrl,
        validUntil,
        validIndefinitely,
      },
    });

    res.status(201).json({ document: created });
  } catch (error) {
    next(error);
  }
};

