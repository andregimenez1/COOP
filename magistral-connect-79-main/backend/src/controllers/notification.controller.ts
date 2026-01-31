import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { addSSEClient, removeSSEClient } from '../services/sse.service.js';

const prisma = new PrismaClient();

/** GET /api/notifications/events – SSE para alertas em tempo real */
export async function sseEvents(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const client = {
      res,
      userId: req.user!.id,
      role: req.user!.role,
    };
    addSSEClient(client);

    res.on('close', () => {
      removeSSEClient(client);
    });
  } catch (e) {
    next(e);
  }
}

/** GET /api/notifications/preferences – Preferências de notificação do usuário */
export async function getPreferences(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notifyEmailFlashDeals: true,
        notifyEmailReservas: true,
        notifyEmailHubCredit: true,
      },
    });
    if (!u) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({
      notifyEmailFlashDeals: u.notifyEmailFlashDeals,
      notifyEmailReservas: u.notifyEmailReservas,
      notifyEmailHubCredit: u.notifyEmailHubCredit,
    });
  } catch (e) {
    next(e);
  }
}

/** PATCH /api/notifications/preferences */
export async function updatePreferences(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { notifyEmailFlashDeals, notifyEmailReservas, notifyEmailHubCredit } = req.body as {
      notifyEmailFlashDeals?: boolean;
      notifyEmailReservas?: boolean;
      notifyEmailHubCredit?: boolean;
    };
    const data: Record<string, boolean> = {};
    if (typeof notifyEmailFlashDeals === 'boolean') data.notifyEmailFlashDeals = notifyEmailFlashDeals;
    if (typeof notifyEmailReservas === 'boolean') data.notifyEmailReservas = notifyEmailReservas;
    if (typeof notifyEmailHubCredit === 'boolean') data.notifyEmailHubCredit = notifyEmailHubCredit;
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        notifyEmailFlashDeals: true,
        notifyEmailReservas: true,
        notifyEmailHubCredit: true,
      },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

/** GET /api/notifications – Listar notificações do usuário. */
export async function listNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ notifications });
  } catch (e) {
    next(e);
  }
}

/** PATCH /api/notifications/:id/read – Marcar notificação como lida. */
export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updated = await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

/** DELETE /api/notifications/:id – Remover notificação. */
export async function deleteNotification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await prisma.notification.deleteMany({
      where: { id, userId },
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

/** POST /api/notifications – Criar nova notificação (para testes ou sistema). */
export async function createNotification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, type, title, message, relatedItemId } = req.body;
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedItemId,
      },
    });
    res.status(201).json({ notification });
  } catch (e) {
    next(e);
  }
}
