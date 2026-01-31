/**
 * Serviço de autenticação
 * Integração com o backend para login, registro, etc.
 */

import { api } from '@/lib/api';
import { User } from '@/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  company?: string;
  cnpj?: string;
  razaoSocial?: string;
}

class AuthService {
  /**
   * Login no sistema
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    
    // Salvar token no localStorage junto com o usuário
    if (response.token && response.user) {
      const userWithToken = {
        ...response.user,
        token: response.token,
      };
      localStorage.setItem('magistral_auth_user', JSON.stringify(userWithToken));
    }
    
    return response;
  }

  /**
   * Registro de novo usuário
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/register', data);
    
    if (response.token && response.user) {
      const userWithToken = {
        ...response.user,
        token: response.token,
      };
      localStorage.setItem('magistral_auth_user', JSON.stringify(userWithToken));
    }
    
    return response;
  }

  /**
   * Obter usuário atual
   */
  async getCurrentUser(): Promise<User> {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.user;
  }

  /**
   * Logout (apenas limpa o localStorage)
   */
  logout(): void {
    localStorage.removeItem('magistral_auth_user');
  }

  /**
   * Verificar se há token salvo
   */
  hasToken(): boolean {
    return !!this.getToken();
  }

  /**
   * Obter token do localStorage
   */
  getToken(): string | null {
    try {
      const authUser = localStorage.getItem('magistral_auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        return user.token || null;
      }
    } catch {
      return null;
    }
    return null;
  }
}

export const authService = new AuthService();
