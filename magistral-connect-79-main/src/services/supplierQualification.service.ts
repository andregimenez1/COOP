import { api } from '@/lib/api';
import type { SupplierQualificationRequest, SupplierQualification, SupplierDocument, SupplierDocumentType } from '@/types';

type ApiQualificationRequest = any;
type ApiQualification = any;

function mapRequest(r: ApiQualificationRequest): SupplierQualificationRequest {
  const pendingUsersRaw = r.pendingUsers;
  let pendingUsers: string[] = [];
  if (Array.isArray(pendingUsersRaw)) pendingUsers = pendingUsersRaw;
  else if (typeof pendingUsersRaw === 'string') {
    try {
      const parsed = JSON.parse(pendingUsersRaw);
      if (Array.isArray(parsed)) pendingUsers = parsed;
    } catch {
      pendingUsers = [];
    }
  }

  return {
    id: r.id,
    supplierId: r.supplierId,
    supplierName: r.supplierName,
    requestedBy: r.requestedBy,
    requestedByName: r.requestedByName,
    status: r.status,
    requestedAt: new Date(r.requestedAt),
    completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
    completedBy: r.completedBy ?? undefined,
    year: Number(r.year),
    documents: (r.documents || []).map((d: any) => ({
      id: d.id,
      type: d.type as SupplierDocumentType,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      uploadedAt: new Date(d.uploadedAt),
      uploadedBy: d.uploadedBy,
      validUntil: d.validUntil ? new Date(d.validUntil) : undefined,
      validIndefinitely: Boolean(d.validIndefinitely),
      reviewStatus: d.reviewStatus ?? undefined,
      reviewedAt: d.reviewedAt ? new Date(d.reviewedAt) : undefined,
      reviewedBy: d.reviewedBy ?? undefined,
      rejectionReason: d.rejectionReason ?? undefined,
    })) as SupplierDocument[],
    pendingUsers,
  };
}

function mapQualification(q: ApiQualification): SupplierQualification {
  return {
    id: q.id,
    supplierId: q.supplierId,
    supplierName: q.supplierName,
    year: Number(q.year),
    status: (q.status as any) || 'complete',
    qualifiedBy: q.qualifiedBy,
    qualifiedByName: q.qualifiedByName,
    completedAt: new Date(q.completedAt),
    expiresAt: new Date(q.expiresAt),
    documents: (q.documents || []).map((d: any) => ({
      id: d.id,
      type: d.type as SupplierDocumentType,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      uploadedAt: new Date(d.uploadedAt),
      uploadedBy: d.uploadedBy,
      validUntil: d.validUntil ? new Date(d.validUntil) : undefined,
      validIndefinitely: Boolean(d.validIndefinitely),
    })) as SupplierDocument[],
  };
}

class SupplierQualificationService {
  async getRequests(year: number): Promise<SupplierQualificationRequest[]> {
    const response = await api.get<{ requests: any[] }>(`/suppliers/qualification-requests?year=${year}`);
    return (response.requests || []).map(mapRequest);
  }

  async requestQualification(input: { supplierId: string; supplierName: string; year: number }): Promise<SupplierQualificationRequest> {
    const response = await api.post<{ request: any }>(`/suppliers/qualification-requests`, input);
    return mapRequest(response.request);
  }

  async saveProgress(input: {
    requestId: string;
    documents: Array<{
      type: SupplierDocumentType;
      fileName: string;
      fileUrl: string;
      validUntil?: string;
      validIndefinitely?: boolean;
    }>;
  }): Promise<{ request: SupplierQualificationRequest; qualification?: SupplierQualification }> {
    const response = await api.patch<{ request: any; qualification?: any }>(
      `/suppliers/qualification-requests/${input.requestId}/progress`,
      { documents: input.documents }
    );
    return {
      request: mapRequest(response.request),
      qualification: response.qualification ? mapQualification(response.qualification) : undefined,
    };
  }

  async getQualifications(year?: number): Promise<SupplierQualification[]> {
    const url = typeof year === 'number' ? `/suppliers/qualifications?year=${year}` : `/suppliers/qualifications`;
    const response = await api.get<{ qualifications: any[] }>(url);
    return (response.qualifications || []).map(mapQualification);
  }

  async approveQualificationRequest(requestId: string): Promise<SupplierQualification> {
    const response = await api.patch<{ qualification: any }>(`/suppliers/qualification-requests/${requestId}/approve`, {});
    return mapQualification(response.qualification);
  }

  async reviewQualificationDocument(input: {
    requestId: string;
    documentId: string;
    status: 'approved' | 'rejected';
    rejectionReason?: string;
  }): Promise<SupplierQualificationRequest> {
    const response = await api.patch<{ request: any }>(
      `/suppliers/qualification-requests/${input.requestId}/documents/${input.documentId}/review`,
      { status: input.status, rejectionReason: input.rejectionReason }
    );
    return mapRequest(response.request);
  }
}

export const supplierQualificationService = new SupplierQualificationService();

