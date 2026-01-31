import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getCooperativaAdmin } from '../services/marketplace.service.js';
import { onHubCreditDeposited } from '../services/notificationTriggers.js';

const prisma = new PrismaClient();

/** POST /api/financial/hub-credit – Registrar depósito de crédito Hub (aluguel prateleira). Cooperativa/Admin. */
export async function depositHubCredit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const createdById = req.user!.id;
    const cooperativa = await getCooperativaAdmin();
    const isAdmin = cooperativa?.id === createdById;
    const isMaster = req.user!.role === 'master';
    if (!isAdmin && !isMaster) {
      throw new AppError('Apenas Cooperativa ou administrador podem registrar depósito de crédito Hub.', 403);
    }
    const { userId, amount, description } = req.body as {
      userId: string;
      amount: number;
      description?: string;
    };
    if (!userId || amount == null || typeof amount !== 'number' || amount <= 0) {
      throw new AppError('userId e amount (positivo) obrigatórios', 400);
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });
    if (!user) throw new AppError('Usuário não encontrado', 404);

    const movement = await prisma.financialmovement.create({
      data: {
        type: 'hub_credit',
        userId: user.id,
        userName: user.name,
        amount,
        description: description ?? 'Crédito Hub Logístico (aluguel de prateleira)',
        createdBy: createdById,
      },
    });

    await onHubCreditDeposited(userId, amount).catch((err) =>
      console.error('[financial] onHubCreditDeposited:', err)
    );

    res.status(201).json({ movement });
  } catch (e) {
    next(e);
  }
}

/** GET /api/financial/movements – Listar movimentos financeiros. Admin vê tudo; Cooperado vê apenas os seus. */
export async function listMovements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const isMaster = req.user!.role === 'master';

    const movements = await prisma.financialmovement.findMany({
      where: isMaster ? undefined : { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ movements });
  } catch (e) {
    next(e);
  }
}

/** POST /api/financial/movements – Criar movimento financeiro manual (Admin). */
export async function createMovement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'master') {
      throw new AppError('Apenas administrador pode criar movimentos financeiros manuais', 403);
    }

    const { type, userId, userName, amount, description, relatedItemId } = req.body;

    const movement = await prisma.financialmovement.create({
      data: {
        type,
        userId,
        userName,
        amount: Number(amount),
        description,
        relatedItemId,
        createdBy: req.user!.id,
      },
    });

    res.status(201).json({ movement });
  } catch (e) {
    next(e);
  }
}
