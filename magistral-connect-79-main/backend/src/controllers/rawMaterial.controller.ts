import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const prisma = new PrismaClient();

/** GET /api/raw-materials – Listar laudos. Admin vê tudo; Cooperado vê apenas os seus. */
export async function listRawMaterials(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const isMaster = req.user!.role === 'master';

    const rawMaterials = await prisma.rawMaterial.findMany({
      where: isMaster ? undefined : { createdBy: userId },
      include: {
        substance: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ rawMaterials });
  } catch (e) {
    next(e);
  }
}

/** POST /api/raw-materials – Criar novo laudo. */
export async function createRawMaterial(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const {
      substanceId,
      substanceName,
      batch,
      supplier,
      manufacturer,
      manufacturingDate,
      expiryDate,
      pdfUrl,
      pdfFileName,
      purchaseDate,
      purchaseQuantity,
      purchaseUnit,
      purchasePrice,
    } = req.body;

    const rawMaterial = await prisma.rawMaterial.create({
      data: {
        substanceId,
        substanceName,
        batch,
        supplier,
        manufacturer,
        manufacturingDate: new Date(manufacturingDate),
        expiryDate: new Date(expiryDate),
        pdfUrl,
        pdfFileName,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseQuantity: purchaseQuantity ? Number(purchaseQuantity) : null,
        purchaseUnit,
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        createdBy: userId,
      },
      include: {
        substance: true,
      }
    });

    res.status(201).json({ rawMaterial });
  } catch (e) {
    next(e);
  }
}

/** PATCH /api/raw-materials/:id – Atualizar laudo. */
export async function updateRawMaterial(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const existing = await prisma.rawMaterial.findUnique({ where: { id } });
    
    if (!existing) throw new AppError('Laudo não encontrado', 404);
    if (existing.createdBy !== userId && req.user!.role !== 'master') {
      throw new AppError('Sem permissão para editar este laudo', 403);
    }

    const data = { ...req.body };
    if (data.manufacturingDate) data.manufacturingDate = new Date(data.manufacturingDate);
    if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);
    if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
    if (data.purchaseQuantity) data.purchaseQuantity = Number(data.purchaseQuantity);
    if (data.purchasePrice) data.purchasePrice = Number(data.purchasePrice);

    const updated = await prisma.rawMaterial.update({
      where: { id },
      data,
      include: {
        substance: true,
      }
    });

    res.json({ rawMaterial: updated });
  } catch (e) {
    next(e);
  }
}

/** DELETE /api/raw-materials/:id – Remover laudo. */
export async function deleteRawMaterial(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const existing = await prisma.rawMaterial.findUnique({ where: { id } });

    if (!existing) throw new AppError('Laudo não encontrado', 404);
    if (existing.createdBy !== userId && req.user!.role !== 'master') {
      throw new AppError('Sem permissão para remover este laudo', 403);
    }

    await prisma.rawMaterial.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}
