import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const prisma = new PrismaClient();

export const getSuppliers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    console.log(`[getSuppliers] 📤 Buscando fornecedores para usuário: ${req.user?.email} (${userId})`);

    // Retornar TODOS os fornecedores aprovados (compartilhados entre cooperados)
    // Os fornecedores são criados quando uma solicitação é aprovada, então todos são válidos
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' },
    });

    console.log(`[getSuppliers] ✅ Retornando ${suppliers.length} fornecedores (todos os aprovados)`);
    if (suppliers.length > 0) {
      suppliers.forEach((s, index) => {
        console.log(`[getSuppliers] Fornecedor ${index + 1}:`, {
          id: s.id,
          name: s.name,
          userId: s.userId,
        });
      });
    }

    res.json({ suppliers });
  } catch (error) {
    next(error);
  }
};

export const getSupplierById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    if (supplier.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    res.json({ supplier });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not found', 404);
    }

    const supplier = await prisma.supplier.create({
      data: {
        userId,
        name: req.body.name,
        contact: req.body.contact,
        whatsapp: req.body.whatsapp,
        notes: req.body.notes,
      },
    });

    res.status(201).json({ supplier });
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    if (supplier.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name: req.body.name,
        contact: req.body.contact,
        whatsapp: req.body.whatsapp,
        notes: req.body.notes,
      },
    });

    res.json({ supplier: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    if (supplier.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    await prisma.supplier.delete({
      where: { id },
    });

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    next(error);
  }
};
