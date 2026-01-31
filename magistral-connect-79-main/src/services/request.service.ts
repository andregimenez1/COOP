/**
 * Serviço de Solicitações
 */

import { api } from '@/lib/api';
import { BankDataChangeRequest, ExtraUserRequest, ExitRequest, SupplierRequest, UserProfileDocumentRequest } from '@/types';

interface RequestsResponse<T> {
  requests: T[];
}

interface RequestResponse<T> {
  request: T;
}

class RequestService {
  // Bank Data Requests
  async getBankDataRequests(status?: string): Promise<BankDataChangeRequest[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<RequestsResponse<BankDataChangeRequest>>(`/requests/bank-data${params}`);
    return response.requests.map(r => ({
      ...r,
      createdAt: new Date(r.createdAt),
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined,
    }));
  }

  async createBankDataRequest(data: Partial<BankDataChangeRequest>): Promise<BankDataChangeRequest> {
    const response = await api.post<RequestResponse<BankDataChangeRequest>>('/requests/bank-data', data);
    return {
      ...response.request,
      createdAt: new Date(response.request.createdAt),
      reviewedAt: response.request.reviewedAt ? new Date(response.request.reviewedAt) : undefined,
    };
  }

  async approveBankDataRequest(id: string): Promise<BankDataChangeRequest> {
    const response = await api.patch<RequestResponse<BankDataChangeRequest>>(`/requests/bank-data/${id}/approve`, {});
    return {
      ...response.request,
      createdAt: new Date(response.request.createdAt),
      reviewedAt: response.request.reviewedAt ? new Date(response.request.reviewedAt) : undefined,
    };
  }

  async rejectBankDataRequest(id: string, rejectionReason: string): Promise<BankDataChangeRequest> {
    const response = await api.patch<RequestResponse<BankDataChangeRequest>>(`/requests/bank-data/${id}/reject`, { rejectionReason });
    return {
      ...response.request,
      createdAt: new Date(response.request.createdAt),
      reviewedAt: response.request.reviewedAt ? new Date(response.request.reviewedAt) : undefined,
    };
  }

  // User Profile Document Requests (Documentos do cooperado)
  async getProfileDocumentRequests(status?: string): Promise<UserProfileDocumentRequest[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<RequestsResponse<UserProfileDocumentRequest>>(`/requests/profile-documents${params}`);
    return response.requests.map((r) => ({
      ...r,
      createdAt: new Date((r as any).createdAt),
      reviewedAt: (r as any).reviewedAt ? new Date((r as any).reviewedAt) : undefined,
      validUntil: (r as any).validUntil ? new Date((r as any).validUntil) : undefined,
    }));
  }

  async createProfileDocumentRequest(data: {
    type: any;
    fileName: string;
    fileUrl: string;
    validUntil?: string;
    validIndefinitely?: boolean;
  }): Promise<UserProfileDocumentRequest> {
    const response = await api.post<RequestResponse<UserProfileDocumentRequest>>('/requests/profile-documents', data);
    const r: any = response.request as any;
    return {
      ...(r as UserProfileDocumentRequest),
      createdAt: new Date(r.createdAt),
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined,
      validUntil: r.validUntil ? new Date(r.validUntil) : undefined,
    };
  }

  async approveProfileDocumentRequest(id: string): Promise<UserProfileDocumentRequest> {
    const response = await api.patch<{ request: any }>(`/requests/profile-documents/${id}/approve`, {});
    const r: any = response.request;
    return {
      ...(r as UserProfileDocumentRequest),
      createdAt: new Date(r.createdAt),
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined,
      validUntil: r.validUntil ? new Date(r.validUntil) : undefined,
    };
  }

  async rejectProfileDocumentRequest(id: string, rejectionReason: string): Promise<UserProfileDocumentRequest> {
    const response = await api.patch<RequestResponse<UserProfileDocumentRequest>>(
      `/requests/profile-documents/${id}/reject`,
      { rejectionReason }
    );
    const r: any = response.request as any;
    return {
      ...(r as UserProfileDocumentRequest),
      createdAt: new Date(r.createdAt),
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined,
      validUntil: r.validUntil ? new Date(r.validUntil) : undefined,
    };
  }

  // Extra User Requests
  async getExtraUserRequests(status?: string): Promise<ExtraUserRequest[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<RequestsResponse<ExtraUserRequest>>(`/requests/extra-users${params}`);
    return response.requests.map(r => ({
      ...r,
      createdAt: new Date(r.createdAt),
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined,
    }));
  }

  async createExtraUserRequest(data: { requestedUsers: any[]; reason?: string }): Promise<ExtraUserRequest> {
    const response = await api.post<RequestResponse<ExtraUserRequest>>('/requests/extra-users', data);
    return {
      ...response.request,
      createdAt: new Date(response.request.createdAt),
      reviewedAt: response.request.reviewedAt ? new Date(response.request.reviewedAt) : undefined,
    };
  }

  async approveExtraUserRequest(id: string): Promise<ExtraUserRequest> {
    const response = await api.patch<RequestResponse<ExtraUserRequest>>(`/requests/extra-users/${id}/approve`, {});
    return {
      ...response.request,
      createdAt: new Date(response.request.createdAt),
      reviewedAt: response.request.reviewedAt ? new Date(response.request.reviewedAt) : undefined,
    };
  }

  async rejectExtraUserRequest(id: string, rejectionReason: string): Promise<ExtraUserRequest> {
    const response = await api.patch<RequestResponse<ExtraUserRequest>>(`/requests/extra-users/${id}/reject`, { rejectionReason });
    return {
      ...response.request,
      createdAt: new Date(response.request.createdAt),
      reviewedAt: response.request.reviewedAt ? new Date(response.request.reviewedAt) : undefined,
    };
  }

  // Exit Requests
  async getExitRequests(status?: string): Promise<ExitRequest[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<RequestsResponse<ExitRequest>>(`/requests/exit${params}`);
    return response.requests.map(r => ({
      ...r,
      createdAt: new Date(r.createdAt),
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : undefined,
    }));
  }

  async createExitRequest(data: { reason?: string }): Promise<ExitRequest> {
    const response = await api.post<RequestResponse<ExitRequest>>('/requests/exit', data);
    return {
      ...response.request,
      createdAt: new Date(response.request.createdAt),
      reviewedAt: response.request.reviewedAt ? new Date(response.request.reviewedAt) : undefined,
    };
  }

  async approveExitRequest(id: string): Promise<ExitRequest> {
    const response = await api.patch<RequestResponse<ExitRequest>>(`/requests/exit/${id}/approve`, {});
    return {
      ...response.request,
      createdAt: new Date(response.request.createdAt),
      reviewedAt: response.request.reviewedAt ? new Date(response.request.reviewedAt) : undefined,
    };
  }

  async rejectExitRequest(id: string, rejectionReason: string): Promise<ExitRequest> {
    const response = await api.patch<RequestResponse<ExitRequest>>(`/requests/exit/${id}/reject`, { rejectionReason });
    return {
      ...response.request,
      createdAt: new Date(response.request.createdAt),
      reviewedAt: response.request.reviewedAt ? new Date(response.request.reviewedAt) : undefined,
    };
  }
}

export const requestService = new RequestService();
