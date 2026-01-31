/**
 * Serviço de Substâncias
 */

import { api } from '@/lib/api';
import { Substance, SubstanceSuggestion } from '@/types';

interface SubstancesResponse {
  substances: Substance[];
}

interface SubstanceResponse {
  substance: Substance;
}

interface SuggestionsResponse {
  suggestions: SubstanceSuggestion[];
}

interface SuggestionResponse {
  suggestion: SubstanceSuggestion;
}

class SubstanceService {
  /**
   * Listar todas as substâncias
   */
  async getAll(search?: string): Promise<Substance[]> {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await api.get<SubstancesResponse>(`/substances${params}`);
      return response.substances.map(s => ({
        ...s,
        createdAt: new Date(s.createdAt),
      }));
    } catch (error: any) {
      console.error('❌ [SubstanceService] Erro ao buscar substâncias:', error);
      throw error;
    }
  }

  /**
   * Obter substância por ID
   */
  async getById(id: string): Promise<Substance> {
    const response = await api.get<SubstanceResponse>(`/substances/${id}`);
    return {
      ...response.substance,
      createdAt: new Date(response.substance.createdAt),
    };
  }

  /**
   * Criar nova substância
   */
  async create(data: { name: string; synonyms?: string[] }): Promise<Substance> {
    const response = await api.post<SubstanceResponse>('/substances', data);
    return {
      ...response.substance,
      createdAt: new Date(response.substance.createdAt),
    };
  }

  /**
   * Atualizar substância
   */
  async update(
    id: string,
    data: { name?: string; synonyms?: string[]; requiresAe?: boolean; requiresPf?: boolean }
  ): Promise<Substance> {
    const response = await api.patch<SubstanceResponse>(`/substances/${id}`, data);
    return {
      ...response.substance,
      createdAt: new Date(response.substance.createdAt),
    };
  }

  /**
   * Deletar substância
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/substances/${id}`);
  }

  /**
   * Listar sugestões de substâncias
   */
  async getSuggestions(status?: string): Promise<SubstanceSuggestion[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<SuggestionsResponse>(`/requests/substances${params}`);
    return response.suggestions.map(s => ({
      ...s,
      createdAt: new Date(s.createdAt),
      expiresAt: new Date(s.expiresAt),
      approvedAt: s.approvedAt ? new Date(s.approvedAt) : undefined,
      rejectedAt: s.rejectedAt ? new Date(s.rejectedAt) : undefined,
    }));
  }

  /**
   * Criar sugestão de substância
   */
  async createSuggestion(name: string): Promise<SubstanceSuggestion> {
    const response = await api.post<SuggestionResponse>('/requests/substances', { name });
    return {
      ...response.suggestion,
      createdAt: new Date(response.suggestion.createdAt),
      expiresAt: new Date(response.suggestion.expiresAt),
      approvedAt: response.suggestion.approvedAt ? new Date(response.suggestion.approvedAt) : undefined,
      rejectedAt: response.suggestion.rejectedAt ? new Date(response.suggestion.rejectedAt) : undefined,
    };
  }

  /**
   * Aprovar sugestão (master only)
   */
  async approveSuggestion(id: string, suggestedName?: string): Promise<SubstanceSuggestion> {
    const response = await api.patch<SuggestionResponse>(`/requests/substances/${id}/approve`, { suggestedName });
    return {
      ...response.suggestion,
      createdAt: new Date(response.suggestion.createdAt),
      expiresAt: new Date(response.suggestion.expiresAt),
      approvedAt: response.suggestion.approvedAt ? new Date(response.suggestion.approvedAt) : undefined,
      rejectedAt: response.suggestion.rejectedAt ? new Date(response.suggestion.rejectedAt) : undefined,
    };
  }

  /**
   * Rejeitar sugestão (master only)
   */
  async rejectSuggestion(id: string, rejectionReason: string): Promise<SubstanceSuggestion> {
    const response = await api.patch<SuggestionResponse>(`/requests/substances/${id}/reject`, { rejectionReason });
    return {
      ...response.suggestion,
      createdAt: new Date(response.suggestion.createdAt),
      expiresAt: new Date(response.suggestion.expiresAt),
      approvedAt: response.suggestion.approvedAt ? new Date(response.suggestion.approvedAt) : undefined,
      rejectedAt: response.suggestion.rejectedAt ? new Date(response.suggestion.rejectedAt) : undefined,
    };
  }
}

export const substanceService = new SubstanceService();
