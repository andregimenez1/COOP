/**
 * Serviço de Usuários
 */

import { api } from '@/lib/api';
import { User, PendingPayment } from '@/types';

export type PermissionKey = 'marketplace_moderate_offers';

interface UsersResponse {
  users: User[];
}

interface PendingPaymentsResponse {
  payments: Array<{
    id: string;
    userId: string;
    userName: string;
    company?: string;
    cnpj?: string;
    amount: number;
    reason: string;
    status: string;
    createdAt: string;
    paidAt?: string;
    deletedUserSnapshot?: Record<string, unknown>;
  }>;
}

interface UserResponse {
  user: User;
}

interface PermissionsResponse {
  permissions: PermissionKey[];
}

interface UserPermissionsResponse {
  userId: string;
  permissions: PermissionKey[];
}

interface AllPermissionsResponse {
  byUserId: Record<string, PermissionKey[]>;
}

export interface TradingEligibilityResponse {
  userId: string;
  ae: { status: 'valid' | 'expired' | 'pending' | 'missing'; validIndefinitely: boolean; validUntil: string | null; pendingRequestAt: string | null };
  pf: { status: 'valid' | 'expired' | 'pending' | 'missing'; validIndefinitely: boolean; validUntil: string | null; pendingRequestAt: string | null };
}

class UserService {
  /**
   * Listar usuários (master only ou próprio usuário)
   */
  async getAll(params?: { role?: string; status?: string; search?: string }): Promise<User[]> {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    
    const query = queryParams.toString();
    const url = `/users${query ? `?${query}` : ''}`;
    
    const response = await api.get<UsersResponse>(url);
    return response.users.map(u => ({
      ...u,
      createdAt: new Date(u.createdAt),
      bannedAt: u.bannedAt ? new Date(u.bannedAt) : undefined,
    }));
  }

  /**
   * Obter usuário por ID
   */
  async getById(id: string): Promise<User> {
    const response = await api.get<UserResponse>(`/users/${id}`);
    return {
      ...response.user,
      createdAt: new Date(response.user.createdAt),
      bannedAt: response.user.bannedAt ? new Date(response.user.bannedAt) : undefined,
    };
  }

  async getMyTradingEligibility(): Promise<TradingEligibilityResponse> {
    return await api.get<TradingEligibilityResponse>(`/users/me/trading-eligibility`);
  }

  async getTradingEligibility(userId: string): Promise<TradingEligibilityResponse> {
    return await api.get<TradingEligibilityResponse>(`/users/${userId}/trading-eligibility`);
  }

  async getMyPermissions(): Promise<PermissionKey[]> {
    const res = await api.get<PermissionsResponse>(`/users/me/permissions`);
    return res.permissions || [];
  }

  async getAllPermissions(): Promise<Record<string, PermissionKey[]>> {
    const res = await api.get<AllPermissionsResponse>(`/users/permissions`);
    return res.byUserId || {};
  }

  async getPermissions(userId: string): Promise<PermissionKey[]> {
    const res = await api.get<UserPermissionsResponse>(`/users/${userId}/permissions`);
    return res.permissions || [];
  }

  async setPermission(userId: string, key: PermissionKey, enabled: boolean): Promise<PermissionKey[]> {
    const res = await api.patch<UserPermissionsResponse>(`/users/${userId}/permissions`, { key, enabled });
    return res.permissions || [];
  }

  /**
   * Criar usuário (master only). Não altera o token/sessão do admin.
   */
  async create(data: {
    name: string;
    email: string;
    password: string;
    company?: string;
    cnpj?: string;
    razaoSocial?: string;
    contribution?: number;
  }): Promise<User> {
    const response = await api.post<UserResponse>('/users', data);
    return {
      ...response.user,
      createdAt: new Date(response.user.createdAt),
      bannedAt: response.user.bannedAt ? new Date(response.user.bannedAt) : undefined,
    };
  }

  /**
   * Atualizar usuário
   */
  async update(id: string, data: Partial<User>): Promise<User> {
    const response = await api.patch<UserResponse>(`/users/${id}`, data);
    return {
      ...response.user,
      createdAt: new Date(response.user.createdAt),
      bannedAt: response.user.bannedAt ? new Date(response.user.bannedAt) : undefined,
    };
  }

  /**
   * Listar valores a pagar (master only)
   */
  async getPendingPayments(): Promise<PendingPayment[]> {
    const response = await api.get<PendingPaymentsResponse>('/users/pending-payments');
    return response.payments.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.userName,
      company: p.company,
      cnpj: p.cnpj,
      amount: p.amount,
      reason: p.reason as 'removed' | 'banned' | 'exit_request',
      status: p.status as 'pending' | 'paid',
      createdAt: new Date(p.createdAt),
      paidAt: p.paidAt ? new Date(p.paidAt) : undefined,
      deletedUserSnapshot: p.deletedUserSnapshot,
    }));
  }

  /**
   * Marcar pagamento como pago (master only)
   */
  async markPaymentAsPaid(paymentId: string): Promise<void> {
    await api.patch(`/users/pending-payments/${paymentId}`);
  }

  /**
   * Reverter marcação como pago (master only).
   * Volta o pagamento para status "pendente".
   */
  async revertPaymentAsPaid(paymentId: string): Promise<void> {
    await api.patch(`/users/pending-payments/${paymentId}/revert`);
  }

  /**
   * Desfazer remoção de usuário (master only).
   * Restaura o usuário a partir do snapshot e remove o valor a pagar.
   */
  async undoRemoval(paymentId: string): Promise<User> {
    const response = await api.post<{ user: User }>(`/users/pending-payments/${paymentId}/undo`);
    return {
      ...response.user,
      createdAt: new Date(response.user.createdAt),
      bannedAt: response.user.bannedAt ? new Date(response.user.bannedAt) : undefined,
    };
  }

  /**
   * Deletar usuário (master only)
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }

  /**
   * Deletar usuário por email (master only)
   * Útil para limpar usuários órfãos que ainda existem no banco
   */
  async deleteByEmail(email: string): Promise<void> {
    await api.delete(`/users/by-email/${encodeURIComponent(email)}`);
  }

  /**
   * Banir usuário (master only)
   */
  async ban(id: string): Promise<User> {
    const response = await api.patch<UserResponse>(`/users/${id}/ban`, {});
    return {
      ...response.user,
      createdAt: new Date(response.user.createdAt),
      bannedAt: response.user.bannedAt ? new Date(response.user.bannedAt) : undefined,
    };
  }

  /**
   * Desbanir usuário (master only)
   */
  async unban(id: string): Promise<User> {
    const response = await api.patch<UserResponse>(`/users/${id}/unban`, {});
    return {
      ...response.user,
      createdAt: new Date(response.user.createdAt),
      bannedAt: response.user.bannedAt ? new Date(response.user.bannedAt) : undefined,
    };
  }
}

export const userService = new UserService();
