import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const prisma = new PrismaClient();

export const getSubstances = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const substances = await prisma.substance.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    console.log(`[getSubstances] 📋 Retornando ${substances.length} substâncias`);
    if (substances.length > 0) {
      console.log(`[getSubstances] Primeiras 5:`, substances.slice(0, 5).map(s => s.name));
    }

    res.json({ substances });
  } catch (error) {
    next(error);
  }
};

export const getSubstanceById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const substance = await prisma.substance.findUnique({
      where: { id },
    });

    if (!substance) {
      throw new AppError('Substance not found', 404);
    }

    res.json({ substance });
  } catch (error) {
    next(error);
  }
};

export const createSubstance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const createdBy = req.user?.id;

    const substance = await prisma.substance.create({
      data: {
        name: req.body.name,
        synonyms: req.body.synonyms || [],
        requiresAe: Boolean(req.body.requiresAe),
        requiresPf: Boolean(req.body.requiresPf),
        createdBy,
      },
    });

    res.status(201).json({ substance });
  } catch (error) {
    next(error);
  }
};

export const updateSubstance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const role = req.user?.role || '';

    const substance = await prisma.substance.findUnique({
      where: { id },
    });

    if (!substance) {
      throw new AppError('Substance not found', 404);
    }

    // Apenas master pode alterar flags regulatórias
    const wantsRegulatoryChange =
      typeof req.body.requiresAe !== 'undefined' || typeof req.body.requiresPf !== 'undefined';
    if (wantsRegulatoryChange && role !== 'master') {
      throw new AppError('Insufficient permissions', 403);
    }

    const updated = await prisma.substance.update({
      where: { id },
      data: {
        name: req.body.name,
        synonyms: req.body.synonyms,
        ...(role === 'master'
          ? {
              requiresAe: typeof req.body.requiresAe === 'boolean' ? req.body.requiresAe : undefined,
              requiresPf: typeof req.body.requiresPf === 'boolean' ? req.body.requiresPf : undefined,
            }
          : {}),
      },
    });

    res.json({ substance: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteSubstance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.substance.delete({
      where: { id },
    });

    res.json({ message: 'Substance deleted successfully' });
  } catch (error) {
    next(error);
  }
};
