import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const prisma = new PrismaClient();

// --- FOLLOW SUBSTANCES ---

/** GET /api/follow/substances – Listar matérias-primas seguidas */
export async function listFollowedSubstances(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const followed = await prisma.followedSubstance.findMany({
      where: { userId },
      include: { substance: true },
    });
    res.json({ followed });
  } catch (e) {
    next(e);
  }
}

/** POST /api/follow/substances – Seguir uma matéria-prima */
export async function followSubstance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { substanceId, name } = req.body;

    const follow = await prisma.followedSubstance.upsert({
      where: {
        userId_name: { userId, name },
      },
      update: {
        substanceId: substanceId || undefined,
      },
      create: {
        userId,
        substanceId: substanceId || null,
        name,
      },
    });

    res.status(201).json({ follow });
  } catch (e) {
    next(e);
  }
}

/** DELETE /api/follow/substances/:name – Deixar de seguir uma matéria-prima */
export async function unfollowSubstance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { name } = req.params;

    await prisma.followedSubstance.delete({
      where: {
        userId_name: { userId, name },
      },
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

// --- FOLLOW USERS ---

/** GET /api/follow/users – Listar usuários seguidos */
export async function listFollowedUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const followed = await prisma.followedUser.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: { id: true, name: true, company: true, profilePicture: true },
        },
      },
    });
    res.json({ followed });
  } catch (e) {
    next(e);
  }
}

/** POST /api/follow/users – Seguir um usuário */
export async function followUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const followerId = req.user!.id;
    const { followingId } = req.body;

    if (followerId === followingId) {
      throw new AppError('Você não pode seguir a si mesmo', 400);
    }

    const follow = await prisma.followedUser.upsert({
      where: {
        followerId_followingId: { followerId, followingId },
      },
      update: {},
      create: {
        followerId,
        followingId,
      },
    });

    res.status(201).json({ follow });
  } catch (e) {
    next(e);
  }
}

/** DELETE /api/follow/users/:id – Deixar de seguir um usuário */
export async function unfollowUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const followerId = req.user!.id;
    const { id: followingId } = req.params;

    await prisma.followedUser.delete({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}
