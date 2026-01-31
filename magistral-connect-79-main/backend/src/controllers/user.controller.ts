import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { hashPassword } from '../utils/bcrypt.js';

const prisma = new PrismaClient();

export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, company, cnpj, razaoSocial, role = 'cooperado', contribution = 0 } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Nome, e-mail e senha são obrigatórios.', 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('E-mail já cadastrado.', 409);
    }

    const hashedPassword = await hashPassword(password);
    const contributionNum = Number(contribution);
    const safeContribution = Number.isFinite(contributionNum) && contributionNum >= 0 ? contributionNum : 0;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        company: company || null,
        cnpj: cnpj || null,
        razaoSocial: razaoSocial || null,
        contribution: safeContribution,
        approved: role === 'master',
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
        contribution: true,
        currentValue: true,
        proceeds: true,
        balanceToReceive: true,
        createdAt: true,
        bannedAt: true,
      },
    });

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role, status, search } = req.query;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
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
        createdAt: true,
        bannedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

export const getPendingPayments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Buscar todos os campos (incluindo deletedUserSnapshot se existir)
    const payments = await prisma.pendingpayment.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Mapear para o formato esperado, incluindo deletedUserSnapshot se disponível
    const formattedPayments = payments.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.userName,
      company: p.company,
      cnpj: p.cnpj,
      amount: p.amount,
      reason: p.reason,
      status: p.status,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
      deletedUserSnapshot: (p as any).deletedUserSnapshot || null,
    }));

    res.json({ payments: formattedPayments });
  } catch (error) {
    next(error);
  }
};

export const markPaymentAsPaid = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const payment = await prisma.pendingpayment.findUnique({ where: { id } });
    if (!payment) {
      throw new AppError('Pagamento não encontrado', 404);
    }
    const updated = await prisma.pendingpayment.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date() },
    });
    res.json({ payment: updated });
  } catch (error) {
    next(error);
  }
};

export const revertPaymentAsPaid = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const payment = await prisma.pendingpayment.findUnique({ where: { id } });
    if (!payment) {
      throw new AppError('Pagamento não encontrado', 404);
    }
    if (payment.status !== 'paid') {
      throw new AppError('Só é possível reverter pagamento já marcado como pago.', 400);
    }
    const updated = await prisma.pendingpayment.update({
      where: { id },
      data: { status: 'pending', paidAt: null },
    });
    res.json({ payment: updated });
  } catch (error) {
    next(error);
  }
};

export const undoRemoval = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const payment = await prisma.pendingpayment.findUnique({ where: { id } });
    if (!payment) {
      throw new AppError('Pagamento não encontrado', 404);
    }
    if (payment.reason !== 'removed') {
      throw new AppError('Só é possível desfazer remoção de usuário.', 400);
    }
    if (payment.status !== 'pending') {
      throw new AppError('Não é possível desfazer: pagamento já marcado como pago.', 400);
    }

    // Buscar snapshot usando SQL raw (MySQL retorna JSON como objeto ou string)
    let snapshot: Record<string, unknown> | null = null;
    try {
      console.log(`[undoRemoval] Buscando snapshot para payment id: ${id}`);

      // Tentar buscar como JSON puro
      const result = await prisma.$queryRawUnsafe<Array<{ deletedUserSnapshot: any }>>(
        `SELECT deletedUserSnapshot FROM PendingPayment WHERE id = ?`,
        id
      );

      console.log(`[undoRemoval] Resultado da query (tipo: ${typeof result}):`, result ? 'existe' : 'null');

      if (result && result.length > 0) {
        const snapshotValue = result[0].deletedUserSnapshot;
        console.log(`[undoRemoval] Valor do snapshot (tipo: ${typeof snapshotValue}):`,
          snapshotValue ? (typeof snapshotValue === 'object' ? 'objeto' : 'string') : 'null/undefined'
        );

        if (snapshotValue !== null && snapshotValue !== undefined) {
          if (typeof snapshotValue === 'object' && !Array.isArray(snapshotValue)) {
            // MySQL retornou como objeto JSON
            snapshot = snapshotValue as Record<string, unknown>;
            console.log(`[undoRemoval] ✅ Snapshot já é objeto. Chaves:`, Object.keys(snapshot || {}));
          } else if (typeof snapshotValue === 'string' && snapshotValue.trim() !== '') {
            // MySQL retornou como string JSON
            try {
              snapshot = JSON.parse(snapshotValue);
              console.log(`[undoRemoval] ✅ Snapshot parseado com sucesso. Chaves:`, Object.keys(snapshot || {}));
            } catch (parseError) {
              console.error('[undoRemoval] ❌ Erro ao fazer parse do JSON:', parseError);
              console.error('[undoRemoval] String recebida:', snapshotValue.substring(0, 100));
            }
          } else {
            console.warn(`[undoRemoval] ⚠️ Tipo de snapshot não reconhecido:`, typeof snapshotValue);
          }
        } else {
          console.warn(`[undoRemoval] ⚠️ Snapshot é null/undefined para payment id: ${id}`);
        }
      } else {
        console.warn(`[undoRemoval] ⚠️ Nenhum resultado encontrado para payment id: ${id}`);
      }
    } catch (error: any) {
      console.error('[undoRemoval] ❌ Erro ao buscar snapshot via SQL:', error);
      console.error('[undoRemoval] Detalhes do erro:', {
        message: error.message,
        code: error.code,
      });
      // Se a coluna não existir ou houver erro, tentar buscar do objeto payment
      snapshot = (payment as any).deletedUserSnapshot || null;
      console.log(`[undoRemoval] Tentativa de buscar do objeto payment:`, snapshot ? 'encontrado' : 'não encontrado');
    }

    if (!snapshot || typeof snapshot !== 'object' || Object.keys(snapshot).length === 0) {
      console.error('[undoRemoval] ❌ Snapshot não encontrado ou vazio para payment:', id);
      console.error('[undoRemoval] Payment data:', {
        id: payment.id,
        userId: payment.userId,
        userName: payment.userName,
        reason: payment.reason,
        status: payment.status,
      });

      // Tentar verificar diretamente no banco se a coluna existe e tem valor
      try {
        const directCheck = await prisma.$queryRawUnsafe<Array<{
          hasColumn: number;
          hasValue: number;
          valueType: string;
        }>>(
          `SELECT 
            (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'PendingPayment' 
             AND COLUMN_NAME = 'deletedUserSnapshot') as hasColumn,
            (SELECT COUNT(*) FROM PendingPayment WHERE id = ? AND deletedUserSnapshot IS NOT NULL) as hasValue,
            (SELECT JSON_TYPE(deletedUserSnapshot) FROM PendingPayment WHERE id = ?) as valueType`,
          id,
          id
        );
        console.error('[undoRemoval] Verificação direta no banco:', directCheck);
      } catch (checkError) {
        console.error('[undoRemoval] Erro na verificação direta:', checkError);
      }

      throw new AppError('Não é possível refazer a remoção deste usuário porque os dados foram apagados. O snapshot necessário para restaurar o usuário não foi encontrado - isso pode ter acontecido porque o usuário foi deletado antes da implementação do sistema de snapshots ou o snapshot não foi salvo corretamente. Sem os dados do snapshot, não há como refazer a remoção.', 404);
    }

    console.log(`[undoRemoval] ✅ Snapshot encontrado com sucesso. Restaurando usuário:`, snapshot.email || snapshot.name);

    const createdAt = typeof snapshot.createdAt === 'string' ? new Date(snapshot.createdAt) : new Date();
    const bannedAt =
      snapshot.bannedAt != null && typeof snapshot.bannedAt === 'string'
        ? new Date(snapshot.bannedAt)
        : null;

    const restored = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: snapshot.id as string,
          name: snapshot.name as string,
          email: snapshot.email as string,
          password: snapshot.password as string,
          role: snapshot.role as string,
          company: (snapshot.company as string) ?? null,
          cnpj: (snapshot.cnpj as string) ?? null,
          razaoSocial: (snapshot.razaoSocial as string) ?? null,
          approved: Boolean(snapshot.approved),
          status: snapshot.status as string,
          contribution: Number(snapshot.contribution ?? 0),
          currentValue: Number(snapshot.currentValue ?? 0),
          proceeds: snapshot.proceeds != null ? Number(snapshot.proceeds) : null,
          balanceToReceive: snapshot.balanceToReceive != null ? Number(snapshot.balanceToReceive) : null,
          pixKey: (snapshot.pixKey as string) ?? null,
          pixBank: (snapshot.pixBank as string) ?? null,
          pixQrCode: (snapshot.pixQrCode as string) ?? null,
          profilePicture: (snapshot.profilePicture as string) ?? null,
          isCooperativaAdmin: Boolean(snapshot.isCooperativaAdmin),
          notifyEmailFlashDeals: Boolean(snapshot.notifyEmailFlashDeals),
          notifyEmailReservas: Boolean(snapshot.notifyEmailReservas),
          notifyEmailHubCredit: Boolean(snapshot.notifyEmailHubCredit),
          createdAt,
          bannedAt,
        },
      });
      await tx.pendingpayment.delete({ where: { id } });
      return user;
    });

    res.json({ user: restored });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const isMaster = req.user?.role === 'master';

    // Usuários só podem ver seus próprios dados, exceto masters
    if (!isMaster && id !== userId) {
      throw new AppError('Access denied', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
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

export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const isMaster = req.user?.role === 'master';

    // Usuários só podem atualizar seus próprios dados, exceto masters
    if (!isMaster && id !== userId) {
      throw new AppError('Access denied', 403);
    }

    const allowedFields = [
      'name',
      'company',
      'profilePicture',
      'cnpj',
      'razaoSocial',
      'pixKey',
      'pixBank',
    ];

    // Masters podem atualizar mais campos
    if (isMaster) {
      allowedFields.push('role', 'approved', 'contribution', 'currentValue', 'proceeds');
    }

    const updateData: any = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
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
        isCooperativaAdmin: true,
        notifyEmailFlashDeals: true,
        notifyEmailReservas: true,
        notifyEmailHubCredit: true,
        createdAt: true,
        bannedAt: true,
      },
    });
    if (!target) {
      throw new AppError('Usuário não encontrado', 404);
    }
    if (req.user?.id === id) {
      throw new AppError('Não é possível remover o próprio usuário', 403);
    }

    const deletedUserSnapshot = {
      ...target,
      createdAt: target.createdAt.toISOString(),
      bannedAt: target.bannedAt?.toISOString() ?? null,
    };

    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.substancesuggestion.deleteMany({ where: { userId: id } });
      await tx.supplierrequest.deleteMany({ where: { userId: id } });
      await tx.vote.deleteMany({ where: { userId: id } });
      await tx.purchaseitem.deleteMany({ where: { userId: id } });
      await tx.quotation.deleteMany({ where: { userId: id } });
      await tx.financialmovement.deleteMany({ where: { createdBy: id } });
      await tx.bankdatachangerequest.deleteMany({ where: { userId: id } });
      await tx.extrauserrequest.deleteMany({ where: { userId: id } });
      await tx.exitrequest.deleteMany({ where: { userId: id } });

      await tx.offerproposal.deleteMany({ where: { proposerId: id } });
      await tx.transaction.deleteMany({
        where: { OR: [{ sellerId: id }, { buyerId: id }] },
      });
      await tx.marketplaceoffer.deleteMany({ where: { userId: id } });
      await tx.rawmaterial.deleteMany({ where: { createdBy: id } });

      const supplierIds = (await tx.supplier.findMany({ where: { userId: id }, select: { id: true } })).map((s) => s.id);
      if (supplierIds.length > 0) {
        await tx.supplierqualificationrequest.deleteMany({ where: { supplierId: { in: supplierIds } } });
        await tx.supplierqualification.deleteMany({ where: { supplierId: { in: supplierIds } } });
      }
      await tx.supplier.deleteMany({ where: { userId: id } });

      const tnUpdateData = { approvedBy: null as string | null, approvedAt: null as Date | null };
      await tx.transparencynews.updateMany({
        where: { approvedBy: id },
        data: tnUpdateData,
      });
      await tx.transparencynews.deleteMany({ where: { createdBy: id } });

      // Deletar InventoryItem (ownerId e holderId)
      await tx.inventoryitem.deleteMany({
        where: { OR: [{ ownerId: id }, { holderId: id }] },
      });

      // Deletar FlashDealClaim
      await tx.flashdealclaim.deleteMany({ where: { userId: id } });

      // Deletar StrategicReserveClaim
      await tx.strategicreserveclaim.deleteMany({ where: { userId: id } });

      // Criar PendingPayment
      // Tentar criar com snapshot, se falhar, criar sem e tentar atualizar depois
      try {
        const payment = await tx.pendingpayment.create({
          data: {
            userId: target.id,
            userName: target.name,
            ...(target.company != null && { company: target.company }),
            ...(target.cnpj != null && { cnpj: target.cnpj }),
            amount: target.currentValue > 0 ? target.currentValue : 0,
            reason: 'removed',
          },
        });

        // Atualizar com o snapshot usando SQL raw
        try {
          const snapshotJson = JSON.stringify(deletedUserSnapshot);
          console.log(`[deleteUser] Tentando salvar snapshot para payment ${payment.id}. Tamanho do JSON: ${snapshotJson.length} bytes`);
          console.log(`[deleteUser] Preview do snapshot:`, {
            id: deletedUserSnapshot.id,
            name: deletedUserSnapshot.name,
            email: deletedUserSnapshot.email,
          });

          // Tentar salvar usando JSON_SET ou CAST
          await tx.$executeRawUnsafe(
            `UPDATE PendingPayment SET deletedUserSnapshot = JSON_OBJECT(
              'id', ?,
              'name', ?,
              'email', ?,
              'password', ?,
              'role', ?,
              'company', ?,
              'cnpj', ?,
              'razaoSocial', ?,
              'approved', ?,
              'status', ?,
              'contribution', ?,
              'currentValue', ?,
              'proceeds', ?,
              'balanceToReceive', ?,
              'pixKey', ?,
              'pixBank', ?,
              'pixQrCode', ?,
              'profilePicture', ?,
              'isCooperativaAdmin', ?,
              'notifyEmailFlashDeals', ?,
              'notifyEmailReservas', ?,
              'notifyEmailHubCredit', ?,
              'createdAt', ?,
              'bannedAt', ?
            ) WHERE id = ?`,
            target.id,
            target.name,
            target.email,
            target.password,
            target.role,
            target.company || null,
            target.cnpj || null,
            target.razaoSocial || null,
            target.approved ? 1 : 0,
            target.status,
            target.contribution,
            target.currentValue,
            target.proceeds || null,
            target.balanceToReceive || null,
            target.pixKey || null,
            target.pixBank || null,
            target.pixQrCode || null,
            target.profilePicture || null,
            target.isCooperativaAdmin ? 1 : 0,
            target.notifyEmailFlashDeals ? 1 : 0,
            target.notifyEmailReservas ? 1 : 0,
            target.notifyEmailHubCredit ? 1 : 0,
            target.createdAt.toISOString(),
            target.bannedAt ? target.bannedAt.toISOString() : null,
            payment.id
          );

          // Verificar se foi salvo corretamente
          const verifyResult = await tx.$queryRawUnsafe<Array<{ deletedUserSnapshot: any }>>(
            `SELECT deletedUserSnapshot FROM PendingPayment WHERE id = ?`,
            payment.id
          );

          if (verifyResult && verifyResult.length > 0 && verifyResult[0].deletedUserSnapshot) {
            console.log(`[deleteUser] ✅ Snapshot salvo e verificado com sucesso para payment ${payment.id}`);
          } else {
            console.warn(`[deleteUser] ⚠️ Snapshot não encontrado após salvar para payment ${payment.id}`);
          }
        } catch (snapshotError: any) {
          console.error('[deleteUser] ❌ Erro ao salvar snapshot:', snapshotError);
          console.error('[deleteUser] Detalhes do erro:', {
            message: snapshotError.message,
            code: snapshotError.code,
            meta: snapshotError.meta,
          });
          // Não lançar erro, apenas logar - o usuário será deletado mesmo sem snapshot
          console.warn('[deleteUser] Aviso: Snapshot não foi salvo. Desfazer remoção não estará disponível.');
        }
      } catch (error) {
        throw error;
      }

      await tx.user.delete({ where: { id } });
    });

    // Verificar se o usuário foi realmente deletado
    const verifyDeleted = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (verifyDeleted) {
      console.error(`[deleteUser] ERRO: Usuário ${id} (${verifyDeleted.email}) não foi deletado após a transação`);
      throw new AppError('Falha ao deletar usuário. O usuário ainda existe no banco de dados.', 500);
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[deleteUser] Erro ao deletar usuário:', error);
    next(error);
  }
};

export const banUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: {
        status: 'banned',
        bannedAt: new Date(),
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const unbanUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: {
        status: 'active',
        bannedAt: null,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletar usuário por email (útil para limpar usuários órfãos)
 * DELETE /api/users/by-email/:email
 */
export const deleteUserByEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.params;

    if (!email) {
      throw new AppError('Email é obrigatório', 400);
    }

    const target = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
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
        isCooperativaAdmin: true,
        notifyEmailFlashDeals: true,
        notifyEmailReservas: true,
        notifyEmailHubCredit: true,
        createdAt: true,
        bannedAt: true,
      },
    });

    if (!target) {
      throw new AppError('Usuário não encontrado', 404);
    }

    if (req.user?.id === target.id) {
      throw new AppError('Não é possível remover o próprio usuário', 403);
    }

    const deletedUserSnapshot = {
      ...target,
      createdAt: target.createdAt.toISOString(),
      bannedAt: target.bannedAt?.toISOString() ?? null,
    };

    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId: target.id } });
      await tx.substancesuggestion.deleteMany({ where: { userId: target.id } });
      await tx.supplierrequest.deleteMany({ where: { userId: target.id } });
      await tx.vote.deleteMany({ where: { userId: target.id } });
      await tx.purchaseitem.deleteMany({ where: { userId: target.id } });
      await tx.quotation.deleteMany({ where: { userId: target.id } });
      await tx.financialmovement.deleteMany({ where: { createdBy: target.id } });
      await tx.bankdatachangerequest.deleteMany({ where: { userId: target.id } });
      await tx.extrauserrequest.deleteMany({ where: { userId: target.id } });
      await tx.exitrequest.deleteMany({ where: { userId: target.id } });

      await tx.offerproposal.deleteMany({ where: { proposerId: target.id } });
      await tx.transaction.deleteMany({
        where: { OR: [{ sellerId: target.id }, { buyerId: target.id }] },
      });
      await tx.marketplaceoffer.deleteMany({ where: { userId: target.id } });
      await tx.rawmaterial.deleteMany({ where: { createdBy: target.id } });

      const supplierIds = (await tx.supplier.findMany({ where: { userId: target.id }, select: { id: true } })).map((s) => s.id);
      if (supplierIds.length > 0) {
        await tx.supplierqualificationrequest.deleteMany({ where: { supplierId: { in: supplierIds } } });
        await tx.supplierqualification.deleteMany({ where: { supplierId: { in: supplierIds } } });
      }
      await tx.supplier.deleteMany({ where: { userId: target.id } });

      const tnUpdateData = { approvedBy: null as string | null, approvedAt: null as Date | null };
      await tx.transparencynews.updateMany({
        where: { approvedBy: target.id },
        data: tnUpdateData,
      });
      await tx.transparencynews.deleteMany({ where: { createdBy: target.id } });

      // Deletar InventoryItem (ownerId e holderId)
      await tx.inventoryitem.deleteMany({
        where: { OR: [{ ownerId: target.id }, { holderId: target.id }] },
      });

      // Deletar FlashDealClaim
      await tx.flashdealclaim.deleteMany({ where: { userId: target.id } });

      // Deletar StrategicReserveClaim
      await tx.strategicreserveclaim.deleteMany({ where: { userId: target.id } });

      // Criar PendingPayment
      // Tentar criar com snapshot, se falhar, criar sem e tentar atualizar depois
      try {
        const payment = await tx.pendingpayment.create({
          data: {
            userId: target.id,
            userName: target.name,
            ...(target.company != null && { company: target.company }),
            ...(target.cnpj != null && { cnpj: target.cnpj }),
            amount: target.currentValue > 0 ? target.currentValue : 0,
            reason: 'removed',
          },
        });

        // Atualizar com o snapshot usando SQL raw
        try {
          const snapshotJson = JSON.stringify(deletedUserSnapshot);
          console.log(`[deleteUser] Tentando salvar snapshot para payment ${payment.id}. Tamanho do JSON: ${snapshotJson.length} bytes`);
          console.log(`[deleteUser] Preview do snapshot:`, {
            id: deletedUserSnapshot.id,
            name: deletedUserSnapshot.name,
            email: deletedUserSnapshot.email,
          });

          // Tentar salvar usando JSON_SET ou CAST
          await tx.$executeRawUnsafe(
            `UPDATE PendingPayment SET deletedUserSnapshot = JSON_OBJECT(
              'id', ?,
              'name', ?,
              'email', ?,
              'password', ?,
              'role', ?,
              'company', ?,
              'cnpj', ?,
              'razaoSocial', ?,
              'approved', ?,
              'status', ?,
              'contribution', ?,
              'currentValue', ?,
              'proceeds', ?,
              'balanceToReceive', ?,
              'pixKey', ?,
              'pixBank', ?,
              'pixQrCode', ?,
              'profilePicture', ?,
              'isCooperativaAdmin', ?,
              'notifyEmailFlashDeals', ?,
              'notifyEmailReservas', ?,
              'notifyEmailHubCredit', ?,
              'createdAt', ?,
              'bannedAt', ?
            ) WHERE id = ?`,
            target.id,
            target.name,
            target.email,
            target.password,
            target.role,
            target.company || null,
            target.cnpj || null,
            target.razaoSocial || null,
            target.approved ? 1 : 0,
            target.status,
            target.contribution,
            target.currentValue,
            target.proceeds || null,
            target.balanceToReceive || null,
            target.pixKey || null,
            target.pixBank || null,
            target.pixQrCode || null,
            target.profilePicture || null,
            target.isCooperativaAdmin ? 1 : 0,
            target.notifyEmailFlashDeals ? 1 : 0,
            target.notifyEmailReservas ? 1 : 0,
            target.notifyEmailHubCredit ? 1 : 0,
            target.createdAt.toISOString(),
            target.bannedAt ? target.bannedAt.toISOString() : null,
            payment.id
          );

          // Verificar se foi salvo corretamente
          const verifyResult = await tx.$queryRawUnsafe<Array<{ deletedUserSnapshot: any }>>(
            `SELECT deletedUserSnapshot FROM PendingPayment WHERE id = ?`,
            payment.id
          );

          if (verifyResult && verifyResult.length > 0 && verifyResult[0].deletedUserSnapshot) {
            console.log(`[deleteUser] ✅ Snapshot salvo e verificado com sucesso para payment ${payment.id}`);
          } else {
            console.warn(`[deleteUser] ⚠️ Snapshot não encontrado após salvar para payment ${payment.id}`);
          }
        } catch (snapshotError: any) {
          console.error('[deleteUser] ❌ Erro ao salvar snapshot:', snapshotError);
          console.error('[deleteUser] Detalhes do erro:', {
            message: snapshotError.message,
            code: snapshotError.code,
            meta: snapshotError.meta,
          });
          // Não lançar erro, apenas logar - o usuário será deletado mesmo sem snapshot
          console.warn('[deleteUser] Aviso: Snapshot não foi salvo. Desfazer remoção não estará disponível.');
        }
      } catch (error) {
        throw error;
      }

      await tx.user.delete({ where: { id: target.id } });
    });

    // Verificar se o usuário foi realmente deletado
    const verifyDeleted = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (verifyDeleted) {
      console.error(`[deleteUserByEmail] ERRO: Usuário ${email} (${verifyDeleted.id}) não foi deletado após a transação`);
      throw new AppError('Falha ao deletar usuário. O usuário ainda existe no banco de dados.', 500);
    }

    res.json({ message: `Usuário ${email} deletado com sucesso` });
  } catch (error) {
    console.error('[deleteUserByEmail] Erro ao deletar usuário por email:', error);
    next(error);
  }
};

// --- Permissões por usuário (hierarquia por função) ---
const ALLOWED_PERMISSION_KEYS = ['marketplace_moderate_offers'] as const;
type PermissionKey = (typeof ALLOWED_PERMISSION_KEYS)[number];

function normalizePermissionKey(input: unknown): PermissionKey | null {
  if (typeof input !== 'string') return null;
  return (ALLOWED_PERMISSION_KEYS as readonly string[]).includes(input) ? (input as PermissionKey) : null;
}

export const getMyPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401);

    // Master tem acesso total, independentemente de cargos/permissões diretas
    if (req.user?.role === 'master') {
      return res.json({ permissions: ['*'] });
    }

    const [direct, rolePerms] = await Promise.all([
      prisma.userpermission.findMany({
        where: { userId },
        select: { key: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.usercooperativerole.findMany({
        where: { userId },
        select: { cooperativerole: { select: { cooperativerolepermission: { select: { key: true } } } } },
      }),
    ]);

    const set = new Set<string>();
    direct.forEach((p) => set.add(p.key));
    rolePerms.forEach((ur) => ur.cooperativerole.cooperativerolepermission.forEach((p) => set.add(p.key)));

    res.json({ permissions: Array.from(set.values()) });
  } catch (error) {
    next(error);
  }
};

export const getUserPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) throw new AppError('Usuário não encontrado', 404);

    const rows = await prisma.userpermission.findMany({
      where: { userId: id },
      select: { key: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ userId: id, permissions: rows.map((r) => r.key) });
  } catch (error) {
    next(error);
  }
};

export const getAllUserPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.userpermission.findMany({
      select: { userId: true, key: true },
      orderBy: [{ userId: 'asc' }, { createdAt: 'asc' }],
    });

    const byUserId: Record<string, string[]> = {};
    for (const r of rows) {
      if (!byUserId[r.userId]) byUserId[r.userId] = [];
      byUserId[r.userId].push(r.key);
    }

    res.json({ byUserId });
  } catch (error) {
    next(error);
  }
};

export const updateUserPermission = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) throw new AppError('Authentication required', 401);

    const { id } = req.params;
    const key = normalizePermissionKey(req.body?.key);
    const enabled = Boolean(req.body?.enabled);

    if (!key) throw new AppError('Permissão inválida', 400);

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) throw new AppError('Usuário não encontrado', 404);

    // Não permitir que alguém remova a possibilidade do próprio master operar (master já tem acesso por role)
    // Permissões são para cooperados/hierarquia; manter simples: pode atribuir para qualquer, mas é opcional.
    if (enabled) {
      await prisma.userpermission.upsert({
        where: { userId_key: { userId: id, key } },
        create: { userId: id, key, createdBy: adminId },
        update: { createdBy: adminId },
      });
    } else {
      await prisma.userpermission.deleteMany({ where: { userId: id, key } });
    }

    const rows = await prisma.userpermission.findMany({
      where: { userId: id },
      select: { key: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ userId: id, permissions: rows.map((r) => r.key) });
  } catch (error) {
    next(error);
  }
};
