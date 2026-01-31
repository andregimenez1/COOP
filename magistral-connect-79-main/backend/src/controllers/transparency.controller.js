import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

export const listNews = async (req, res, next) => {
  try {
    const { category, status = 'approved', page = 'dashboard' } = req.query;

    const where = { status };
    
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

export const createNews = async (req, res, next) => {
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
        createdBy: req.user.id,
        status: 'pending',
      },
    });

    res.json({ news });
  } catch (error) {
    console.error('[createNews] Erro:', error);
    next(error);
  }
};

export const approveNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approve } = req.body;
    
    const news = await prisma.transparencynews.update({
      where: { id },
      data: {
        status: approve ? 'approved' : 'rejected',
        approvedAt: approve ? new Date() : null,
        approvedBy: req.user.id,
      },
    });

    res.json({ news });
  } catch (error) {
    console.error('[approveNews] Erro:', error);
    next(error);
  }
};

export const castVote = async (req, res, next) => {
  try {
    const { newsId, voteType } = req.body;
    const userId = req.user.id;

    if (!newsId || !voteType) {
      throw new AppError('ID da notícia e tipo de voto são obrigatórios', 400);
    }

    if (!['like', 'dislike'].includes(voteType)) {
      throw new AppError('Tipo de voto deve ser "like" ou "dislike"', 400);
    }

    // Verificar se a notícia existe
    const news = await prisma.transparencynews.findUnique({
      where: { id: newsId },
    });

    if (!news) {
      throw new AppError('Notícia não encontrada', 404);
    }

    // Verificar se o usuário já votou nessa notícia
    const existingVote = await prisma.transparencyvote.findUnique({
      where: {
        userId_newsId: {
          userId,
          newsId,
        },
      },
    });

    if (existingVote) {
      // Atualizar voto existente
      const updatedVote = await prisma.transparencyvote.update({
        where: {
          userId_newsId: {
            userId,
            newsId,
          },
        },
        data: {
          voteType,
        },
      });
      res.json({ vote: updatedVote });
    } else {
      // Criar novo voto
      const newVote = await prisma.transparencyvote.create({
        data: {
          userId,
          newsId,
          voteType,
        },
      });
      res.json({ vote: newVote });
    }
  } catch (error) {
    console.error('[castVote] Erro:', error);
    next(error);
  }
};