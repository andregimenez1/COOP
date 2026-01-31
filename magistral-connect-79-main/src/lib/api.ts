/**
 * Configuração base da API
 * Todas as chamadas para o backend passam por aqui
 */

// Detectar automaticamente o hostname para funcionar em rede local
export const getApiBaseUrl = () => {
  // Se houver variável de ambiente, usar ela
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Se estiver no navegador, usar o hostname atual (funciona em rede local)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Se for localhost, usar localhost; caso contrário, usar o IP/hostname atual
    const protocol = window.location.protocol;
    const port = '3001';
    return `${protocol}//${hostname}:${port}/api`;
  }
  
  // Fallback para desenvolvimento local
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();
export { API_BASE_URL };

export interface ApiError {
  message: string;
  status?: number;
}

/**
 * Classe para fazer requisições HTTP com autenticação
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Obtém o token JWT do localStorage
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const authUser = localStorage.getItem('magistral_auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        return user.token || null;
      }
    } catch (error) {
      console.error('Erro ao obter token:', error);
    }
    return null;
  }

  /**
   * Faz uma requisição HTTP
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json; charset=utf-8',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Se não houver conteúdo, retornar vazio
      const contentType = response.headers.get('content-type');
      const text = await response.text();
      
      if (!text) {
        return {} as T;
      }

      const data = contentType?.includes('application/json') 
        ? JSON.parse(text) 
        : text;

      if (!response.ok) {
        const error: ApiError = {
          message: data.message || data.error || `Erro ${response.status}`,
          status: response.status,
        };
        throw error;
      }

      return data as T;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw {
          message: 'Erro de conexão com o servidor. Verifique se o backend está rodando.',
          status: 0,
        } as ApiError;
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Upload de arquivo
   */
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getToken();
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw {
        message: error.message || `Erro ${response.status}`,
        status: response.status,
      } as ApiError;
    }

    return response.json();
  }
}

// Instância única do cliente API
export const api = new ApiClient(API_BASE_URL);

// Tipos de resposta comuns
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
