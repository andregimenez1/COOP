import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const prisma = new PrismaClient();

const ALLOWED_PROFILE_DOC_TYPES = [
  'ae',
  'afe',
  'licenca_sanitaria',
  'corpo_bombeiros',
  'policia_federal',
] as const;

function parseValidUntil(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
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

// Bank Data Requests
export const getBankDataRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query;
    const userId = req.user?.id;
    const isMaster = req.user?.role === 'master';

    const where: any = {};

    if (!isMaster) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const requests = await prisma.bankdatachangerequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

export const createBankDataRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const userName = req.user?.email || '';

    if (!userId) {
      throw new AppError('User not found', 404);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    console.log('[createBankDataRequest] 📤 Criando solicitação:', {
      userId,
      userName: user?.name || userName,
      body: req.body,
      newRazaoSocial: req.body.newRazaoSocial,
      currentRazaoSocial: req.body.currentRazaoSocial,
    });

    const request = await prisma.bankdatachangerequest.create({
      data: {
        userId,
        userName: user?.name || userName,
        status: 'pending', // Garantir que sempre tenha status
        ...req.body,
      },
    });

    console.log('[createBankDataRequest] ✅ Solicitação criada:', {
      id: request.id,
      newRazaoSocial: request.newRazaoSocial,
      currentRazaoSocial: request.currentRazaoSocial,
    });

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
};

export const approveBankDataRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const reviewedBy = req.user?.id;

    const request = await prisma.bankdatachangerequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Request already processed', 400);
    }

    // Atualizar dados do usuário
    const updateData: any = {};

    if (request.newPixKey && request.newPixKey.trim()) {
      updateData.pixKey = request.newPixKey.trim();
    }

    if (request.pixBank && request.pixBank.trim()) {
      updateData.pixBank = request.pixBank.trim();
    }

    if (request.newCnpj && request.newCnpj.trim()) {
      updateData.cnpj = request.newCnpj.trim();
    }

    // IMPORTANTE: Verificar se newRazaoSocial existe e não está vazio
    if (request.newRazaoSocial && request.newRazaoSocial.trim()) {
      updateData.razaoSocial = request.newRazaoSocial.trim();
      console.log(`[approveBankDataRequest] ✅ Atualizando Razão Social: "${request.newRazaoSocial.trim()}" para usuário ${request.userId}`);
    } else {
      console.log(`[approveBankDataRequest] ⚠️  newRazaoSocial não encontrado ou vazio:`, request.newRazaoSocial);
    }

    console.log('[approveBankDataRequest] 📋 Dados a atualizar:', updateData);
    console.log('[approveBankDataRequest] 📋 Solicitação completa:', {
      id: request.id,
      userId: request.userId,
      newRazaoSocial: request.newRazaoSocial,
      currentRazaoSocial: request.currentRazaoSocial,
      newCnpj: request.newCnpj,
      newPixKey: request.newPixKey,
    });

    if (Object.keys(updateData).length === 0) {
      console.warn('[approveBankDataRequest] ⚠️  Nenhum dado para atualizar!');
    }

    const updatedUser = await prisma.user.update({
      where: { id: request.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        cnpj: true,
        razaoSocial: true,
        pixKey: true,
        pixBank: true,
      },
    });

    console.log('[approveBankDataRequest] ✅ Usuário atualizado:', updatedUser);

    // Atualizar solicitação
    const updated = await prisma.bankdatachangerequest.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy,
      },
    });

    res.json({ request: updated });
  } catch (error) {
    next(error);
  }
};

export const rejectBankDataRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const reviewedBy = req.user?.id;

    if (!rejectionReason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const request = await prisma.bankdatachangerequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Request already processed', 400);
    }

    const updated = await prisma.bankdatachangerequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason,
        reviewedAt: new Date(),
        reviewedBy,
      },
    });

    res.json({ request: updated });
  } catch (error) {
    next(error);
  }
};

// User Profile Document Requests (documentos do cooperado)
export const getUserProfileDocumentRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const userId = req.user?.id;
    const isMaster = req.user?.role === 'master';
    if (!userId) throw new AppError('User not found', 401);

    const where: any = {};
    if (!isMaster) where.userId = userId;
    if (status) where.status = status;

    const requests = await prisma.userprofiledocumentrequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

export const createUserProfileDocumentRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('User not found', 401);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const { type, fileName, fileUrl, validUntil: validUntilRaw, validIndefinitely: validIndefinitelyRaw } = req.body ?? {};

    if (!type || typeof type !== 'string') throw new AppError('type é obrigatório', 400);
    if (!(ALLOWED_PROFILE_DOC_TYPES as readonly string[]).includes(type)) {
      throw new AppError('Tipo de documento inválido', 400);
    }
    if (!fileName || typeof fileName !== 'string') throw new AppError('fileName é obrigatório', 400);
    if (!fileUrl || typeof fileUrl !== 'string') throw new AppError('fileUrl é obrigatório', 400);

    const validUntil = parseValidUntil(validUntilRaw);
    const validIndefinitely = parseValidIndefinitely(validIndefinitelyRaw);
    if (!validUntil && !validIndefinitely) {
      throw new AppError('Informe a validade (data/mês/ano) ou marque como indeterminada.', 400);
    }

    const request = await prisma.userprofiledocumentrequest.create({
      data: {
        userId,
        userName: user?.name || req.user?.email || '',
        type,
        fileName,
        fileUrl,
        validUntil,
        validIndefinitely,
        status: 'pending',
      } as any,
    });

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
};

export const approveUserProfileDocumentRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const reviewedBy = req.user?.id;

    const request = await prisma.userprofiledocumentrequest.findUnique({ where: { id } });
    if (!request) throw new AppError('Request not found', 404);
    if (request.status !== 'pending') throw new AppError('Request already processed', 400);

    const result = await prisma.$transaction(async (tx) => {
      // Ao aprovar, registramos como documento do perfil (válido/conta para o cooperado)
      const document = await tx.userprofiledocument.create({
        data: {
          userId: request.userId,
          type: request.type as any,
          fileName: request.fileName,
          fileUrl: request.fileUrl,
          validUntil: (request as any).validUntil ?? null,
          validIndefinitely: Boolean((request as any).validIndefinitely),
        },
      });

      const updated = await tx.userprofiledocumentrequest.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy,
        },
      });

      return { request: updated, document };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const rejectUserProfileDocumentRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const reviewedBy = req.user?.id;

    if (!rejectionReason) throw new AppError('Rejection reason is required', 400);

    const request = await prisma.userprofiledocumentrequest.findUnique({ where: { id } });
    if (!request) throw new AppError('Request not found', 404);
    if (request.status !== 'pending') throw new AppError('Request already processed', 400);

    const updated = await prisma.userprofiledocumentrequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason,
        reviewedAt: new Date(),
        reviewedBy,
      },
    });

    res.json({ request: updated });
  } catch (error) {
    next(error);
  }
};

// Extra User Requests
export const getExtraUserRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query;
    const userId = req.user?.id;
    const isMaster = req.user?.role === 'master';

    const where: any = {};

    if (!isMaster) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const requests = await prisma.extrauserrequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

export const createExtraUserRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not found', 404);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const request = await prisma.extrauserrequest.create({
      data: {
        userId,
        userName: user?.name || '',
        requestedUsers: req.body.requestedUsers,
        reason: req.body.reason,
      },
    });

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
};

export const approveExtraUserRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const reviewedBy = req.user?.id;

    const request = await prisma.extrauserrequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Request already processed', 400);
    }

    // Criar usuários extras (implementar lógica de criação)
    // Por enquanto, apenas aprovar a solicitação

    const updated = await prisma.extrauserrequest.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy,
      },
    });

    res.json({ request: updated });
  } catch (error) {
    next(error);
  }
};

export const rejectExtraUserRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const reviewedBy = req.user?.id;

    if (!rejectionReason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const request = await prisma.extrauserrequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Request already processed', 400);
    }

    const updated = await prisma.extrauserrequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason,
        reviewedAt: new Date(),
        reviewedBy,
      },
    });

    res.json({ request: updated });
  } catch (error) {
    next(error);
  }
};

// Exit Requests
export const getExitRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query;
    const userId = req.user?.id;
    const isMaster = req.user?.role === 'master';

    const where: any = {};

    if (!isMaster) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const requests = await prisma.exitrequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

export const createExitRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not found', 404);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, company: true, cnpj: true, currentValue: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const request = await prisma.exitrequest.create({
      data: {
        userId,
        userName: user.name,
        company: user.company,
        cnpj: user.cnpj,
        currentValue: user.currentValue,
        reason: req.body.reason,
      },
    });

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
};

export const approveExitRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const reviewedBy = req.user?.id;

    const request = await prisma.exitrequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Request already processed', 400);
    }

    // Criar registro de pagamento pendente
    await prisma.pendingpayment.create({
      data: {
        userId: request.userId,
        userName: request.userName,
        company: request.company,
        cnpj: request.cnpj,
        amount: request.currentValue,
        reason: 'exit_request',
      },
    });

    // Atualizar status do usuário
    await prisma.user.update({
      where: { id: request.userId },
      data: { status: 'inactive' },
    });

    const updated = await prisma.exitrequest.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy,
      },
    });

    res.json({ request: updated });
  } catch (error) {
    next(error);
  }
};

export const rejectExitRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const reviewedBy = req.user?.id;

    if (!rejectionReason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const request = await prisma.exitrequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Request already processed', 400);
    }

    const updated = await prisma.exitrequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason,
        reviewedAt: new Date(),
        reviewedBy,
      },
    });

    res.json({ request: updated });
  } catch (error) {
    next(error);
  }
};

// Supplier Requests
export const getSupplierRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query;
    const userId = req.user?.id;
    const isMaster = req.user?.role === 'master';

    const where: any = {};

    if (!isMaster) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    // Se for master, verificar todas as solicitações no banco antes de filtrar
    if (isMaster) {
      const timestamp = new Date().toISOString();
      const allRequests = await prisma.supplierrequest.findMany({
        orderBy: { createdAt: 'desc' },
      });
      console.log(`\n========== [${timestamp}] getSupplierRequests (MASTER) ==========`);
      console.log(`🔍 Total de solicitações no banco: ${allRequests.length}`);
      allRequests.forEach((r, index) => {
        console.log(`📋 Solicitação ${index + 1}:`, {
          id: r.id,
          name: r.name,
          userName: r.userName,
          userId: r.userId,
          status: r.status,
          createdAt: r.createdAt,
        });
      });
      console.log('==================================================\n');
    }

    const requests = await prisma.supplierrequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    console.log(`[getSupplierRequests] 📋 Retornando ${requests.length} solicitações de fornecedores`);
    console.log(`[getSupplierRequests] Usuário: ${req.user?.email}, Role: ${req.user?.role}, isMaster: ${isMaster}`);
    console.log(`[getSupplierRequests] Filtro aplicado:`, where);
    if (requests.length > 0) {
      requests.forEach((r, index) => {
        console.log(`[getSupplierRequests] Solicitação ${index + 1}:`, {
          id: r.id,
          name: r.name,
          userName: r.userName,
          userId: r.userId,
          status: r.status,
          statusType: typeof r.status,
        });
      });
    }

    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

export const createSupplierRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not found', 404);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, company: true },
    });

    const timestamp = new Date().toISOString();
    console.log(`\n========== [${timestamp}] createSupplierRequest ==========`);
    console.log('📤 Criando solicitação:', {
      userId,
      userName: user?.name,
      company: user?.company,
      supplierName: req.body.name,
    });
    console.log('==================================================\n');

    const request = await prisma.supplierrequest.create({
      data: {
        userId,
        userName: user?.name || '',
        company: user?.company,
        name: req.body.name,
        status: 'pending', // Garantir que sempre tenha status
      },
    });

    console.log(`\n========== [${timestamp}] createSupplierRequest - SUCESSO ==========`);
    console.log('✅ Solicitação criada:', {
      id: request.id,
      name: request.name,
      userId: request.userId,
      userName: request.userName,
      company: request.company,
      status: request.status,
      createdAt: request.createdAt,
    });

    // Verificar se a solicitação foi realmente salva
    const verify = await prisma.supplierrequest.findUnique({
      where: { id: request.id },
    });
    console.log('🔍 Verificação no banco:', {
      found: !!verify,
      status: verify?.status,
      id: verify?.id,
    });
    console.log('==================================================\n');

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
};

export const approveSupplierRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const reviewedBy = req.user?.id;

    const request = await prisma.supplierrequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Request already processed', 400);
    }

    // Criar fornecedor
    const supplier = await prisma.supplier.create({
      data: {
        userId: request.userId,
        name: request.name,
      },
    });

    const updated = await prisma.supplierrequest.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy,
        supplierId: supplier.id,
      },
    });

    res.json({ request: updated, supplier });
  } catch (error) {
    next(error);
  }
};

export const rejectSupplierRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const reviewedBy = req.user?.id;

    if (!rejectionReason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const request = await prisma.supplierrequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Request already processed', 400);
    }

    const updated = await prisma.supplierrequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason,
        reviewedAt: new Date(),
        reviewedBy,
      },
    });

    res.json({ request: updated });
  } catch (error) {
    next(error);
  }
};

// Substance Suggestions
export const getSubstanceSuggestions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query;
    const userId = req.user?.id;
    const isMaster = req.user?.role === 'master';

    const where: any = {};

    if (!isMaster) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const suggestions = await prisma.substancesuggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
};

export const createSubstanceSuggestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not found', 404);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const suggestion = await prisma.substancesuggestion.create({
      data: {
        userId,
        userName: user?.name || '',
        name: req.body.name,
        expiresAt,
      },
    });

    res.status(201).json({ suggestion });
  } catch (error) {
    next(error);
  }
};

export const approveSubstanceSuggestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { suggestedName } = req.body;
    const reviewedBy = req.user?.id;

    const suggestion = await prisma.substancesuggestion.findUnique({
      where: { id },
    });

    if (!suggestion) {
      throw new AppError('Suggestion not found', 404);
    }

    if (suggestion.status !== 'pending') {
      throw new AppError('Suggestion already processed', 400);
    }

    // Criar substância
    const substance = await prisma.substance.create({
      data: {
        name: suggestedName || suggestion.name,
        createdBy: reviewedBy,
      },
    });

    const updated = await prisma.substancesuggestion.update({
      where: { id },
      data: {
        status: 'approved',
        suggestedName: suggestedName || suggestion.name,
        approvedAt: new Date(),
      },
    });

    res.json({ suggestion: updated, substance });
  } catch (error) {
    next(error);
  }
};

export const rejectSubstanceSuggestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const reviewedBy = req.user?.id;

    if (!rejectionReason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const suggestion = await prisma.substancesuggestion.findUnique({
      where: { id },
    });

    if (!suggestion) {
      throw new AppError('Suggestion not found', 404);
    }

    if (suggestion.status !== 'pending') {
      throw new AppError('Suggestion already processed', 400);
    }

    const updated = await prisma.substancesuggestion.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason,
        rejectedAt: new Date(),
      },
    });

    res.json({ suggestion: updated });
  } catch (error) {
    next(error);
  }
};
