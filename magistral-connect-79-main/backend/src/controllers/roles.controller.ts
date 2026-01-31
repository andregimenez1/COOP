import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

// Por ora, o conjunto de permissões é controlado no código (evita criar chaves inválidas).
export const ALLOWED_PERMISSION_KEYS = ['marketplace_moderate_offers'] as const;
export type PermissionKey = (typeof ALLOWED_PERMISSION_KEYS)[number];

function normalizePermissionKey(input: unknown): PermissionKey | null {
  if (typeof input !== 'string') return null;
  return (ALLOWED_PERMISSION_KEYS as readonly string[]).includes(input) ? (input as PermissionKey) : null;
}

function normalizeName(input: unknown): string {
  const s = String(input ?? '').trim();
  return s;
}

function normalizeDescription(input: unknown): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  return s ? s : null;
}

export const listRoles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.cooperativerole.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        cooperativerolepermission: { select: { key: true } },
        usercooperativerole: { select: { userId: true } },
      },
    });

    res.json({
      roles: roles.map((r) => ({
        ...r,
        permissionKeys: r.cooperativerolepermission.map((p) => p.key),
        userIds: r.usercooperativerole.map((u) => u.userId),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) throw new AppError('Authentication required', 401);

    const name = normalizeName(req.body?.name);
    const description = normalizeDescription(req.body?.description);
    if (!name) throw new AppError('name é obrigatório', 400);

    const role = await prisma.cooperativerole.create({
      data: { name, description, createdBy: adminId },
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true },
    });

    res.status(201).json({ role });
  } catch (error: any) {
    // Violação unique em name
    if (error?.code === 'P2002') {
      return next(new AppError('Já existe um cargo com este nome.', 409));
    }
    next(error);
  }
};

export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    if (!adminId) throw new AppError('Authentication required', 401);

    const data: any = {};
    if (req.body?.name !== undefined) {
      const name = normalizeName(req.body?.name);
      if (!name) throw new AppError('name inválido', 400);
      data.name = name;
    }
    if (req.body?.description !== undefined) {
      data.description = normalizeDescription(req.body?.description);
    }

    const role = await prisma.cooperativerole.update({
      where: { id },
      data,
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true },
    });

    res.json({ role });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return next(new AppError('Cargo não encontrado', 404));
    }
    if (error?.code === 'P2002') {
      return next(new AppError('Já existe um cargo com este nome.', 409));
    }
    next(error);
  }
};

export const deleteRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.cooperativerole.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return next(new AppError('Cargo não encontrado', 404));
    }
    next(error);
  }
};

export const setRolePermission = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) throw new AppError('Authentication required', 401);

    const { id } = req.params; // roleId
    const key = normalizePermissionKey(req.body?.key);
    const enabled = Boolean(req.body?.enabled);
    if (!key) throw new AppError('Permissão inválida', 400);

    // Garante que o role existe
    const role = await prisma.cooperativerole.findUnique({ where: { id }, select: { id: true } });
    if (!role) throw new AppError('Cargo não encontrado', 404);

    if (enabled) {
      await prisma.cooperativerolepermission.upsert({
        where: { roleId_key: { roleId: id, key } },
        create: { roleId: id, key, createdBy: adminId },
        update: { createdBy: adminId },
      });
    } else {
      await prisma.cooperativerolepermission.deleteMany({ where: { roleId: id, key } });
    }

    const perms = await prisma.cooperativerolepermission.findMany({
      where: { roleId: id },
      select: { key: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ roleId: id, permissionKeys: perms.map((p) => p.key) });
  } catch (error) {
    next(error);
  }
};

export const addRoleMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) throw new AppError('Authentication required', 401);

    const { id } = req.params; // roleId
    const userId = String(req.body?.userId ?? '').trim();
    if (!userId) throw new AppError('userId é obrigatório', 400);

    const [role, user] = await Promise.all([
      prisma.cooperativerole.findUnique({ where: { id }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } }),
    ]);
    if (!role) throw new AppError('Cargo não encontrado', 404);
    if (!user) throw new AppError('Usuário não encontrado', 404);

    // Só faz sentido atribuir cargos a cooperados/padrão; master já é admin sistêmico.
    // Não bloqueia, mas evita confusão.
    if (user.role === 'master') {
      throw new AppError('Não é necessário atribuir cargos para administradores (master).', 400);
    }

    await prisma.usercooperativerole.upsert({
      where: { userId_roleId: { userId, roleId: id } },
      create: { userId, roleId: id, createdBy: adminId },
      update: { createdBy: adminId },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

export const removeRoleMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, userId } = req.params; // roleId, userId
    await prisma.usercooperativerole.deleteMany({ where: { roleId: id, userId } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

