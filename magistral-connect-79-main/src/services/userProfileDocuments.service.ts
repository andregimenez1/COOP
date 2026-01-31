import { api } from '@/lib/api';
import type { UserProfileDocument, UserProfileDocumentType } from '@/types';

type ApiDoc = any;

function mapDoc(d: ApiDoc): UserProfileDocument {
  return {
    id: d.id,
    userId: d.userId,
    type: d.type as UserProfileDocumentType,
    fileName: d.fileName,
    fileUrl: d.fileUrl,
    uploadedAt: new Date(d.uploadedAt),
    validUntil: d.validUntil ? new Date(d.validUntil) : undefined,
    validIndefinitely: Boolean(d.validIndefinitely),
  };
}

class UserProfileDocumentsService {
  async getMyDocuments(): Promise<UserProfileDocument[]> {
    const response = await api.get<{ documents: any[] }>('/users/me/profile-documents');
    return (response.documents || []).map(mapDoc);
  }

  async createMyDocument(input: {
    type: UserProfileDocumentType;
    fileName: string;
    fileUrl: string;
    validUntil?: string;
    validIndefinitely?: boolean;
  }): Promise<UserProfileDocument> {
    const response = await api.post<{ document: any }>('/users/me/profile-documents', input);
    return mapDoc(response.document);
  }
}

export const userProfileDocumentsService = new UserProfileDocumentsService();

