/**
 * Serviço de Fornecedores
 */

import { api } from '@/lib/api';
import { Supplier } from '@/types';

interface SuppliersResponse {
  suppliers: Supplier[];
}

interface SupplierResponse {
  supplier: Supplier;
}

interface SupplierRequestResponse {
  request: any;
  supplier?: Supplier;
}

class SupplierService {
  /**
   * Listar fornecedores do usuário
   */
  async getAll(): Promise<Supplier[]> {
    const response = await api.get<SuppliersResponse>('/suppliers');
    return response.suppliers.map(s => ({
      ...s,
      createdAt: new Date(s.createdAt),
    }));
  }

  /**
   * Obter fornecedor por ID
   */
  async getById(id: string): Promise<Supplier> {
    const response = await api.get<SupplierResponse>(`/suppliers/${id}`);
    return {
      ...response.supplier,
      createdAt: new Date(response.supplier.createdAt),
    };
  }

  /**
   * Criar novo fornecedor
   */
  async create(data: { name: string; contact?: string; whatsapp?: string; notes?: string }): Promise<Supplier> {
    const response = await api.post<SupplierResponse>('/suppliers', data);
    return {
      ...response.supplier,
      createdAt: new Date(response.supplier.createdAt),
    };
  }

  /**
   * Atualizar fornecedor
   */
  async update(id: string, data: { name?: string; contact?: string; whatsapp?: string; notes?: string }): Promise<Supplier> {
    const response = await api.patch<SupplierResponse>(`/suppliers/${id}`, data);
    return {
      ...response.supplier,
      createdAt: new Date(response.supplier.createdAt),
    };
  }

  /**
   * Deletar fornecedor
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/suppliers/${id}`);
  }

  /**
   * Listar solicitações de fornecedores
   */
  async getRequests(status?: string): Promise<any[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<{ requests: any[] }>(`/requests/suppliers${params}`);
    return response.requests.map(r => ({
      ...r,
      createdAt: new Date(r.createdAt),
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined,
      // Garantir que status seja sempre uma string válida
      status: r.status || 'pending',
    }));
  }

  /**
   * Criar solicitação de fornecedor
   */
  async createRequest(name: string): Promise<any> {
    const response = await api.post<SupplierRequestResponse>('/requests/suppliers', { name });
    return {
      ...response.request,
      createdAt: new Date(response.request.createdAt),
      reviewedAt: response.request.reviewedAt ? new Date(response.request.reviewedAt) : undefined,
    };
  }

  /**
   * Aprovar solicitação (master only)
   */
  async approveRequest(id: string): Promise<any> {
    const response = await api.patch<SupplierRequestResponse>(`/requests/suppliers/${id}/approve`, {});
    return {
      ...response.request,
      createdAt: new Date(response.request.createdAt),
      reviewedAt: response.request.reviewedAt ? new Date(response.request.reviewedAt) : undefined,
      supplier: response.supplier ? {
        ...response.supplier,
        createdAt: new Date(response.supplier.createdAt),
      } : undefined,
    };
  }

  /**
   * Rejeitar solicitação (master only)
   */
  async rejectRequest(id: string, rejectionReason: string): Promise<any> {
    const response = await api.patch<SupplierRequestResponse>(`/requests/suppliers/${id}/reject`, { rejectionReason });
    return {
      ...response.request,
      createdAt: new Date(response.request.createdAt),
      reviewedAt: response.request.reviewedAt ? new Date(response.request.reviewedAt) : undefined,
    };
  }
}

export const supplierService = new SupplierService();
