import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const prisma = new PrismaClient();

export const listNews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category, status = 'approved', page = 'dashboard' } = req.query;

    const where: any = { status };

    if (category) {
      where.category = category;
    }

    if (page) {
      where.page = page;
    }

    const news = await prisma.transparencynews.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ news });
  } catch (error) {
    console.error('[listNews] Erro:', error);
    next(error);
  }
};

export const createNews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, content, category, relatedItemId } = req.body;

    if (!title || !content || !category) {
      throw new AppError('Título, conteúdo e categoria são obrigatórios', 400);
    }

    const news = await prisma.transparencynews.create({
      data: {
        title,
        content,
        category,
        relatedItemId,
        createdBy: req.user!.id,
        status: 'pending',
      },
    });

    res.json({ news });
  } catch (error) {
    console.error('[createNews] Erro:', error);
    next(error);
  }
};

export const updateNews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { title, content, category, relatedItemId } = req.body;

    const news = await prisma.transparencynews.update({
      where: { id },
      data: {
        title,
        content,
        category,
        relatedItemId,
      },
    });

    res.json({ news });
  } catch (error) {
    console.error('[updateNews] Erro:', error);
    next(error);
  }
};

export const approveNews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { approve } = req.body;

    const news = await prisma.transparencynews.update({
      where: { id },
      data: {
        status: approve ? 'approved' : 'rejected',
        approvedAt: approve ? new Date() : null,
        approvedBy: req.user!.id,
      },
    });

    res.json({ news });
  } catch (error) {
    console.error('[approveNews] Erro:', error);
    next(error);
  }
};

export const deleteNews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.transparencynews.delete({
      where: { id },
    });

    res.json({ message: 'Notícia deletada com sucesso' });
  } catch (error) {
    console.error('[deleteNews] Erro:', error);
    next(error);
  }
};

export const listVotings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const votings = await prisma.voting.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ votings });
  } catch (error) {
    console.error('[listVotings] Erro:', error);
    next(error);
  }
};

export const createVoting = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, description, options, endsAt } = req.body;

    if (!title || !description || !options || !Array.isArray(options)) {
      throw new AppError('Título, descrição e opções são obrigatórios', 400);
    }

    const voting = await prisma.voting.create({
      data: {
        title,
        description,
        options,
        endsAt: endsAt ? new Date(endsAt) : null,
        createdBy: req.user!.id,
      },
    });

    res.json({ voting });
  } catch (error) {
    console.error('[createVoting] Erro:', error);
    next(error);
  }
};

export const updateVoting = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { title, description, options, endsAt } = req.body;

    const voting = await prisma.voting.update({
      where: { id },
      data: {
        title,
        description,
        options,
        endsAt: endsAt ? new Date(endsAt) : null,
      },
    });

    res.json({ voting });
  } catch (error) {
    console.error('[updateVoting] Erro:', error);
    next(error);
  }
};

export const castVote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { option } = req.body;

    if (!option) {
      throw new AppError('Opção de voto é obrigatória', 400);
    }

    const voting = await prisma.voting.findUnique({
      where: { id },
    });

    if (!voting) {
      throw new AppError('Votação não encontrada', 404);
    }

    if (voting.endsAt && new Date() > voting.endsAt) {
      throw new AppError('Votação encerrada', 400);
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        votingId_userId: {
          votingId: id,
          userId: req.user!.id,
        },
      },
    });

    if (existingVote) {
      throw new AppError('Você já votou nesta votação', 400);
    }

    const vote = await prisma.vote.create({
      data: {
        votingId: id,
        userId: req.user!.id,
        option,
      },
    });

    res.json({ vote });
  } catch (error) {
    console.error('[castVote] Erro:', error);
    next(error);
  }
};

export const listDecisions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const decisions = await prisma.votingdecision.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ decisions });
  } catch (error) {
    console.error('[listDecisions] Erro:', error);
    next(error);
  }
};

export const createDecision = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { votingId, decision, reason } = req.body;

    if (!votingId || !decision) {
      throw new AppError('VotingId e decisão são obrigatórios', 400);
    }

    const voting = await prisma.voting.findUnique({
      where: { id: votingId },
    });

    if (!voting) {
      throw new AppError('Votação não encontrada', 404);
    }

    if (!voting.endsAt || new Date() <= voting.endsAt) {
      throw new AppError('Votação ainda está aberta', 400);
    }

    const decisionRecord = await prisma.votingdecision.create({
      data: {
        votingId,
        decision,
        reason,
        createdBy: req.user!.id,
      },
    });

    res.json({ decision: decisionRecord });
  } catch (error) {
    console.error('[createDecision] Erro:', error);
    next(error);
  }
};

export const updateDecision = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { decision, reason } = req.body;

    const decisionRecord = await prisma.votingdecision.update({
      where: { id },
      data: {
        decision,
        reason,
      },
    });

    res.json({ decision: decisionRecord });
  } catch (error) {
    console.error('[updateDecision] Erro:', error);
    next(error);
  }
};

export const deleteDecision = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.votingdecision.delete({
      where: { id },
    });

    res.json({ message: 'Decisão deletada com sucesso' });
  } catch (error) {
    console.error('[deleteDecision] Erro:', error);
    next(error);
  }
};