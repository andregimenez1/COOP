import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';

const AUTH_STORAGE_KEY = 'magistral_auth_user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }
      if (!authService.hasToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await authService.getCurrentUser();
        const token = authService.getToken();
        setUser({
          ...currentUser,
          token,
          createdAt: new Date(currentUser.createdAt),
          bannedAt: currentUser.bannedAt ? new Date(currentUser.bannedAt) : undefined,
        } as User & { token?: string });
      } catch {
        authService.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    try {
      const toStore = {
        ...user,
        createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
        bannedAt: user.bannedAt instanceof Date ? user.bannedAt.toISOString() : user.bannedAt,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      /* persist session */
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login(email, password);
      const u = {
        ...response.user,
        token: response.token,
        createdAt: new Date(response.user.createdAt),
        bannedAt: response.user.bannedAt ? new Date(response.user.bannedAt) : undefined,
      } as User & { token?: string };
      setUser(u);
      return true;
    } catch {
      return false;
    }
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const updateUser = async (updatedUser: User) => {
    if (!updatedUser.id || !authService.hasToken()) return;
    try {
      const apiUser = await userService.update(updatedUser.id, updatedUser);
      const token = authService.getToken();
      setUser({
        ...apiUser,
        token,
        createdAt: new Date(apiUser.createdAt),
        bannedAt: apiUser.bannedAt ? new Date(apiUser.bannedAt) : undefined,
      } as User & { token?: string });
    } catch (e) {
      throw e;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
