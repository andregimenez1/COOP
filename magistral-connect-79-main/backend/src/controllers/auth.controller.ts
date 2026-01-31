import { Request, Response, NextFunction } from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { AppError } from '../middleware/errorHandler.js';
import { generateToken } from '../utils/jwt.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';

const prisma = new PrismaClient();

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, role = 'padrao', company, cnpj, razaoSocial } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Name, email and password are required', 400);
    }

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, status: true },
    });

    if (existingUser) {
      // Se o usuário existe mas está inativo/banido, informar que precisa ser removido primeiro
      if (existingUser.status !== 'active') {
        throw new AppError(
          `Email já cadastrado. O usuário existe mas está ${existingUser.status === 'banned' ? 'banido' : 'inativo'}. É necessário removê-lo completamente antes de criar um novo usuário com este email.`,
          409
        );
      }
      throw new AppError('Email already registered', 409);
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        company,
        cnpj,
        razaoSocial,
        approved: role === 'master', // Masters são aprovados automaticamente
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company: true,
        cnpj: true,
        razaoSocial: true,
        approved: true,
        status: true,
        createdAt: true,
      },
    });

    // Gerar token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verificar senha
    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verificar se o usuário está ativo
    if (user.status !== 'active') {
      throw new AppError('User account is inactive', 403);
    }

    // Gerar token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Retornar dados do usuário (sem senha)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new AppError('User not found', 404);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company: true,
        cnpj: true,
        razaoSocial: true,
        approved: true,
        status: true,
        contribution: true,
        currentValue: true,
        proceeds: true,
        balanceToReceive: true,
        pixKey: true,
        pixBank: true,
        pixQrCode: true,
        profilePicture: true,
        createdAt: true,
        bannedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new AppError('Token is required', 400);
    }

    // Verificar e decodificar o token
    const { verifyToken } = await import('../utils/jwt.js');
    const decoded = verifyToken(token);

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status !== 'active') {
      throw new AppError('Invalid token', 401);
    }

    // Gerar novo token
    const newToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({ token: newToken });
  } catch (error) {
    next(error);
  }
};
