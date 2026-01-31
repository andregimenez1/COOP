import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createVotingDecisionSchema = z.object({
  votingId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['financial', 'operational', 'strategic', 'regulatory']),
  decision: z.string().min(1),
  reason: z.string().optional(),
});

const updateVotingDecisionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.enum(['financial', 'operational', 'strategic', 'regulatory']).optional(),
  decision: z.string().min(1).optional(),
  reason: z.string().optional(),
  status: z.enum(['draft', 'published', 'approved', 'rejected', 'implemented']).optional(),
});

export class VotingDecisionController {
  async listDecisions(req: Request, res: Response) {
    try {
      const { votingId, status, category } = req.query;

      const where: any = {};
      if (votingId) where.votingId = votingId;
      if (status) where.status = status;
      if (category) where.category = category;

      const decisions = await prisma.votingdecision.findMany({
        where,
        include: {
          voting: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(decisions);
    } catch (error) {
      console.error('Erro ao listar decisões:', error);
      res.status(500).json({ error: 'Erro ao listar decisões' });
    }
  }

  async getDecision(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const decision = await prisma.votingdecision.findUnique({
        where: { id },
        include: {
          voting: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!decision) {
        return res.status(404).json({ error: 'Decisão não encontrada' });
      }

      res.json(decision);
    } catch (error) {
      console.error('Erro ao buscar decisão:', error);
      res.status(500).json({ error: 'Erro ao buscar decisão' });
    }
  }

  async createDecision(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const data = createVotingDecisionSchema.parse(req.body);

      // Verificar se a votação existe
      const voting = await prisma.voting.findUnique({
        where: { id: data.votingId },
      });

      if (!voting) {
        return res.status(404).json({ error: 'Votação não encontrada' });
      }

      const decision = await prisma.votingdecision.create({
        data: {
          ...data,
          createdBy: userId,
        },
        include: {
          voting: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json(decision);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: error.errors 
        });
      }
      console.error('Erro ao criar decisão:', error);
      res.status(500).json({ error: 'Erro ao criar decisão' });
    }
  }

  async updateDecision(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const data = updateVotingDecisionSchema.parse(req.body);

      // Verificar se a decisão existe e pertence ao usuário
      const existingDecision = await prisma.votingdecision.findUnique({
        where: { id },
      });

      if (!existingDecision) {
        return res.status(404).json({ error: 'Decisão não encontrada' });
      }

      if (existingDecision.createdBy !== userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Se estiver aprovando, registrar data e usuário
      if (data.status === 'approved' && existingDecision.status !== 'approved') {
        data.approvedAt = new Date();
        data.approvedBy = userId;
      }

      const decision = await prisma.votingdecision.update({
        where: { id },
        data,
        include: {
          voting: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json(decision);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: error.errors 
        });
      }
      console.error('Erro ao atualizar decisão:', error);
      res.status(500).json({ error: 'Erro ao atualizar decisão' });
    }
  }

  async deleteDecision(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verificar se a decisão existe e pertence ao usuário
      const existingDecision = await prisma.votingdecision.findUnique({
        where: { id },
      });

      if (!existingDecision) {
        return res.status(404).json({ error: 'Decisão não encontrada' });
      }

      if (existingDecision.createdBy !== userId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Não permitir exclusão de decisões aprovadas
      if (existingDecision.status === 'approved') {
        return res.status(400).json({ error: 'Não é possível excluir uma decisão aprovada' });
      }

      await prisma.votingdecision.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar decisão:', error);
      res.status(500).json({ error: 'Erro ao deletar decisão' });
    }
  }
}