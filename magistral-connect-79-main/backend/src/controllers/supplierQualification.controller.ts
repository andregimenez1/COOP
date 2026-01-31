import { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { PrismaClient, supplierdocument_type as DocumentType, supplierdocument_reviewStatus as DocumentReviewStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

function parseYear(value: unknown): number {
  const n = Number(value);
  const year = Number.isFinite(n) ? Math.trunc(n) : new Date().getFullYear();
  return year >= 2000 && year <= 2100 ? year : new Date().getFullYear();
}

function normalizePendingUsers(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
  // MySQL JSON às vezes vem como string
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    } catch {
      return [];
    }
  }
  return [];
}

const REQUIRED_DOC_TYPES: DocumentType[] = [
  'afe',
  'ae',
  'licenca_sanitaria',
  'crt',
];

// Documentos aceitos no upload (inclui opcionais)
const ALLOWED_DOC_TYPES: DocumentType[] = [...REQUIRED_DOC_TYPES, 'questionario', 'policia_federal'];

function parseValidUntil(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
    // Espera "YYYY-MM-DD" (input date)
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const d = new Date(year, month - 1, day, 23, 59, 59, 999);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }
  return null;
}

function parseValidIndefinitely(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

async function applyValidityPolicy(type: DocumentType): Promise<
  | { validUntil: Date | null; validIndefinitely: boolean }
  | null
> {
  // Políticas aplicáveis: AE/AFE/CRT (admin pode configurar)
  if (!(['afe', 'ae', 'crt'] as DocumentType[]).includes(type)) return null;

  const policy = await prisma.supplierdocumentvaliditypolicy.findUnique({
    where: { type },
  });

  if (!policy) return null;

  if (policy.mode === 'indefinite') {
    return { validUntil: null, validIndefinitely: true };
  }

  if (policy.mode === 'months') {
    const months = policy.months || 12;
    const now = new Date();
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    // fim do dia para não "vencer" pela manhã
    d.setHours(23, 59, 59, 999);
    return { validUntil: d, validIndefinitely: false };
  }

  return null;
}

// getLatestValidityByType removido pois não é utilizado (causando aviso no TSC)

export const getSupplierQualificationRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const hasYearFilter = typeof req.query.year !== 'undefined';
    const year = hasYearFilter ? parseYear(req.query.year) : undefined;
    const requests = await prisma.supplierqualificationrequest.findMany({
      where: year ? { year } : {},
      orderBy: { requestedAt: 'desc' },
      include: { supplierdocument: true },
    });
    return res.json({ requests });
  } catch (error) {
    return next(error);
  }
};

export const createSupplierQualificationRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Função de criação de solicitação de qualificação

    const userId = req.user?.id;
    const userEmail = req.user?.email;
    if (!userId) throw new AppError('User not found', 401);

    const { supplierId, supplierName, year: yearRaw } = req.body ?? {};
    if (!supplierId || typeof supplierId !== 'string') {
      throw new AppError('supplierId é obrigatório', 400);
    }
    if (!supplierName || typeof supplierName !== 'string') {
      throw new AppError('supplierName é obrigatório', 400);
    }

    const year = parseYear(yearRaw);

    // Se já existe solicitação pendente/em progresso, apenas adiciona o usuário na lista de pendentes
    const existing = await prisma.supplierqualificationrequest.findFirst({
      where: {
        supplierId,
        year,
        status: { in: ['pending', 'in_progress'] },
      },
      include: { supplierdocument: true },
    });

    if (existing) {
      const pendingUsers = normalizePendingUsers(existing.pendingUsers);
      const nextPendingUsers = pendingUsers.includes(userId) ? pendingUsers : [...pendingUsers, userId];
      const updated = await prisma.supplierqualificationrequest.update({
        where: { id: existing.id },
        data: {
          supplierName, // manter atualizado (caso normalize)
          pendingUsers: nextPendingUsers as any,
        },
        include: { supplierdocument: true },
      });
      return res.json({ request: updated });
    }

    // Buscar nome do usuário solicitante (se existir)
    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const created = await prisma.supplierqualificationrequest.create({
      data: {
        id: randomUUID(),
        supplierId,
        supplierName,
        requestedBy: userId,
        requestedByName: requester?.name || userEmail || 'Usuário',
        year,
        status: 'pending',
        pendingUsers: [userId] as any,
      },
      include: { supplierdocument: true },
    });

    return res.status(201).json({ request: created });
  } catch (error) {
    return next(error);
  }
};

export const saveSupplierQualificationProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('User not found', 401);

    const { id } = req.params;
    const { documents } = req.body ?? {};

    if (!Array.isArray(documents) || documents.length === 0) {
      throw new AppError('Envie ao menos 1 documento', 400);
    }

    const request = await prisma.supplierqualificationrequest.findUnique({
      where: { id: id as string },
      include: { supplierdocument: true },
    });
    if (!request) throw new AppError('Solicitação de qualificação não encontrada', 404);

    // Criar documentos e vincular à solicitação (não removemos documentos antigos para não perder histórico)
    await prisma.$transaction(async (tx) => {
      for (const doc of documents) {
        if (!doc || typeof doc !== 'object') continue;
        const type = (doc.type as DocumentType) || null;
        const fileName = doc.fileName as string;
        const fileUrl = doc.fileUrl as string;
        let validUntil = parseValidUntil((doc as any).validUntil);
        let validIndefinitely = parseValidIndefinitely((doc as any).validIndefinitely);
        if (!type || !ALLOWED_DOC_TYPES.includes(type)) continue;
        if (!fileName || !fileUrl) continue;

        // Se existir política (admin) para este tipo, ela prevalece (evita divergência entre cooperados)
        if (type) {
          const policyValidity = await applyValidityPolicy(type);
          if (policyValidity) {
            validUntil = policyValidity.validUntil;
            validIndefinitely = policyValidity.validIndefinitely;
          }
        }

        if (!validUntil && !validIndefinitely) {
          throw new AppError(`Informe a validade do documento (${type}) ou marque como indeterminada`, 400);
        }

        const createdDoc = await tx.supplierdocument.create({
          data: {
            id: randomUUID(),
            type,
            fileName,
            fileUrl,
            uploadedBy: userId,
            validUntil,
            validIndefinitely,
          },
        });

        await tx.supplierqualificationrequest.update({
          where: { id: request.id },
          data: { supplierdocument: { connect: { id: createdDoc.id } } },
        });
      }
    });

    // Recarregar para checar progresso
    const refreshed = await prisma.supplierqualificationrequest.findUnique({
      where: { id: id as string },
      include: { supplierdocument: true },
    });
    if (!refreshed) throw new AppError('Solicitação de qualificação não encontrada', 404);

    const presentTypes = new Set((refreshed as any).supplierdocument.map((d: any) => d.type));
    const hasAllDocs = REQUIRED_DOC_TYPES.every((t) => presentTypes.has(t));

    // Agora a qualificação só é concluída quando o ADMIN aprovar.
    // Aqui apenas marcamos status em progresso e, se já tem todos essenciais, aguardando avaliação.
    if (hasAllDocs) {
      await prisma.supplierqualificationrequest.update({
        where: { id: refreshed.id },
        data: {
          status: 'in_progress',
          awaitingAdminReview: true,
        },
      });
    } else {
      // Marcar como em progresso se já tem algum documento
      if (((refreshed as any).supplierdocument || []).length === 0) {
        await prisma.supplierqualificationrequest.update({
          where: { id: refreshed.id as string },
          data: { status: 'pending', awaitingAdminReview: false },
        });
      } else if (refreshed.status === 'pending') {
        await prisma.supplierqualificationrequest.update({
          where: { id: refreshed.id as string },
          data: { status: 'in_progress' },
        });
      }
    }

    const finalRequest = await prisma.supplierqualificationrequest.findUnique({
      where: { id: refreshed.id as string },
      include: { supplierdocument: true },
    });

    return res.json({ request: finalRequest, qualification: null });
  } catch (error) {
    return next(error);
  }
};

export const reviewSupplierQualificationDocument = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    if (role !== 'master') throw new AppError('Insufficient permissions', 403);
    const { id, documentId } = req.params as { id: string; documentId: string };
    const { status, rejectionReason } = req.body as { status: DocumentReviewStatus; rejectionReason?: string };
    if (!id || !documentId) throw new AppError('Parâmetros inválidos', 400);
    if (status !== 'approved' && status !== 'rejected') throw new AppError('status inválido', 400);
    if (status === 'rejected' && (!rejectionReason || !String(rejectionReason).trim())) {
      throw new AppError('Informe o motivo da rejeição', 400);
    }

    const request = await prisma.supplierqualificationrequest.findUnique({
      where: { id: id as string },
      include: { supplierdocument: true },
    });
    if (!request) throw new AppError('Solicitação de qualificação não encontrada', 404);

    const doc = request.supplierdocument.find((d) => d.id === documentId);
    if (!doc) throw new AppError('Documento não encontrado nesta solicitação', 404);

    await prisma.supplierdocument.update({
      where: { id: documentId as string },
      data: {
        reviewStatus: status,
        reviewedAt: new Date(),
        reviewedBy: req.user?.id,
        rejectionReason: status === 'rejected' ? String(rejectionReason).trim() : null,
      },
    });

    // Se rejeitou um documento, volta a "não aguardando avaliação" para permitir novo upload.
    if (status === 'rejected') {
      await prisma.supplierqualificationrequest.update({
        where: { id: id as string },
        data: { awaitingAdminReview: false, status: 'in_progress' },
      });
    }

    const refreshed = await prisma.supplierqualificationrequest.findUnique({
      where: { id: id as string },
      include: { supplierdocument: true },
    });

    return res.json({ request: refreshed });
  } catch (e) {
    return next(e);
  }
};

export const approveSupplierQualificationRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    if (role !== 'master') throw new AppError('Insufficient permissions', 403);
    const userId = req.user?.id;
    if (!userId) throw new AppError('User not found', 401);
    const { id } = req.params;

    const request = await prisma.supplierqualificationrequest.findUnique({
      where: { id: id as string },
      include: { supplierdocument: true },
    });
    if (!request) throw new AppError('Solicitação de qualificação não encontrada', 404);

    // Precisa estar completa (todos essenciais) e aguardando avaliação
    const supplierDocs = (request as any).supplierdocument || [];
    const presentTypes = new Set(supplierDocs.map((d: any) => d.type));
    const hasAllDocs = REQUIRED_DOC_TYPES.every((t) => presentTypes.has(t));
    if (!hasAllDocs) throw new AppError('Ainda faltam documentos essenciais', 400);
    if (!request.awaitingAdminReview) throw new AppError('Esta solicitação não está aguardando avaliação do admin', 400);

    // Exigir que para cada tipo essencial exista AO MENOS 1 doc aprovado e válido
    const now = new Date();
    const isDocValid = (d: any) =>
      Boolean(d.validIndefinitely) || (d.validUntil && new Date(d.validUntil).getTime() >= now.getTime());

    const allApproved = supplierDocs.every((d: any) => d.reviewStatus === 'approved' && isDocValid(d));
    const approvedDocs = supplierDocs.filter((d: any) => d.reviewStatus === 'approved' && isDocValid(d));
    const approvedTypes = new Set(approvedDocs.map((d: any) => d.type));
    const hasAllApproved = REQUIRED_DOC_TYPES.every((t) => approvedTypes.has(t));
    if (!hasAllApproved) {
      throw new AppError('Ainda há documento essencial sem aprovação válida (ou vencido).', 400);
    }

    // Calcular expiresAt: menor validade dentre os essenciais aprovados (indeterminada = far future)
    const farFuture = new Date(2100, 11, 31, 23, 59, 59, 999);
    const perType = REQUIRED_DOC_TYPES.map((t) => {
      const docsOfType = approvedDocs.filter((d: any) => d.type === t);
      const hasIndef = docsOfType.some((d: any) => Boolean((d as any).validIndefinitely));
      if (hasIndef) return farFuture;
      const maxValidUntil = docsOfType
        .map((d: any) => ((d as any).validUntil ? new Date((d as any).validUntil) : null))
        .filter((d: any): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
        .sort((a: any, b: any) => b.getTime() - a.getTime())[0];
      return maxValidUntil ?? farFuture;
    });
    const expiresAt = new Date(Math.min(...perType.map((d) => d.getTime())));

    const qualification = await prisma.$transaction(async (tx) => {
      const existing = await tx.supplierqualification.findFirst({
        where: { supplierId: request.supplierId, year: request.year },
        include: { supplierdocument: true },
      });

      const docIds = supplierDocs.map((d: any) => ({ id: d.id }));

      const q =
        existing ??
        (await tx.supplierqualification.create({
          data: {
            id: randomUUID(),
            supplierId: request.supplierId,
            supplierName: request.supplierName,
            year: request.year,
            status: 'complete',
            qualifiedBy: userId,
            qualifiedByName: req.user?.email || 'Admin',
            expiresAt,
            supplierdocument: { connect: docIds as any },
          },
          include: { supplierdocument: true },
        }));

      await tx.supplierqualificationrequest.update({
        where: { id: request.id as string },
        data: {
          status: 'completed',
          completedAt: new Date(),
          completedBy: userId,
          awaitingAdminReview: false,
        },
      });

      return q;
    });

    return res.json({ qualification });
  } catch (e) {
    return next(e);
  }
};

export const getSupplierQualifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const hasYearFilter = typeof req.query.year !== 'undefined';
    const year = hasYearFilter ? parseYear(req.query.year) : undefined;
    const qualifications = await prisma.supplierqualification.findMany({
      where: year ? { year } : {},
      orderBy: { completedAt: 'desc' },
      include: { supplierdocument: true },
    });
    return res.json({ qualifications });
  } catch (error) {
    return next(error);
  }
};
