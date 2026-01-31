import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const FOLLOWED_USERS_STORAGE_KEY = 'magistral_followed_users';

interface FollowedUser {
  id: string;
  name: string;
  userId: string;
}

export function useFollowUser() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(FOLLOWED_USERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Remover duplicatas baseado em userId (manter apenas o primeiro)
        const uniqueUsers: FollowedUser[] = [];
        const seenUserIds = new Set<string>();
        
        parsed.forEach((u: FollowedUser) => {
          if (u.userId && !seenUserIds.has(u.userId)) {
            seenUserIds.add(u.userId);
            uniqueUsers.push(u);
          }
        });
        
        // Se houve duplicatas, salvar a versão limpa
        if (uniqueUsers.length !== parsed.length) {
          localStorage.setItem(FOLLOWED_USERS_STORAGE_KEY, JSON.stringify(uniqueUsers));
        }
        
        return uniqueUsers;
      }
    } catch (error) {
      console.error('Erro ao carregar cooperados seguidos:', error);
    }
    return [];
  });

  // Salvar cooperados seguidos no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FOLLOWED_USERS_STORAGE_KEY, JSON.stringify(followedUsers));
      } catch (error) {
        console.error('Erro ao salvar cooperados seguidos:', error);
      }
    }
  }, [followedUsers]);

  // Atualizar lista de seguidores dos cooperados seguidos
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      followedUsers.forEach((followed) => {
        // Validar que o userId é único e válido
        if (!followed.userId || typeof followed.userId !== 'string') {
          console.error('userId inválido encontrado:', followed);
          return;
        }
        
        const followersKey = `magistral_user_followers_${followed.userId}`;
        try {
          const currentFollowers = JSON.parse(localStorage.getItem(followersKey) || '[]');
          if (!currentFollowers.includes(user.id)) {
            localStorage.setItem(followersKey, JSON.stringify([...currentFollowers, user.id]));
          }
        } catch (error) {
          console.error('Erro ao atualizar seguidores:', error);
        }
      });
    }
  }, [followedUsers, user]);

  const isFollowingUser = (userId: string): boolean => {
    return followedUsers.some((u) => u.userId === userId);
  };

  const toggleFollowUser = (userId: string, userName: string) => {
    if (!user || !userId || userId === user.id) return; // Não pode seguir a si mesmo e userId deve existir

    // Validar que userId é uma string válida
    if (typeof userId !== 'string' || userId.trim() === '') {
      console.error('userId inválido ao tentar seguir:', userId, 'userName:', userName);
      return;
    }

    // Normalizar userId (remover espaços)
    const normalizedUserId = userId.trim();

    if (isFollowingUser(normalizedUserId)) {
      // Deixar de seguir - remover TODAS as ocorrências deste userId (por segurança)
      setFollowedUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== normalizedUserId);
        // Verificar se realmente removeu
        if (filtered.length === prev.length) {
          console.warn('Tentativa de remover usuário que não estava na lista:', normalizedUserId);
        }
        return filtered;
      });

      // Remover da lista de seguidores do usuário seguido
      const followersKey = `magistral_user_followers_${normalizedUserId}`;
      try {
        const currentFollowers = JSON.parse(localStorage.getItem(followersKey) || '[]');
        const updatedFollowers = currentFollowers.filter((id: string) => id !== user.id);
        localStorage.setItem(followersKey, JSON.stringify(updatedFollowers));
      } catch (error) {
        console.error('Erro ao remover seguidor:', error);
      }

      toast({
        title: 'Deixou de seguir',
        description: `Você não receberá mais notificações sobre ofertas de ${userName}.`,
      });
    } else {
      // Verificar se já está seguindo este userId (evitar duplicatas)
      const alreadyFollowing = followedUsers.some((u) => u.userId === normalizedUserId);
      if (alreadyFollowing) {
        toast({
          title: 'Já está seguindo',
          description: `Você já está seguindo ${userName}.`,
        });
        return;
      }

      // Seguir - usar userId único como identificador principal
      setFollowedUsers((prev) => {
        // Remover QUALQUER entrada duplicada com o mesmo userId (por segurança máxima)
        const filtered = prev.filter((u) => u.userId !== normalizedUserId);
        
        // Verificar se há outros usuários com o mesmo nome (pode indicar problema)
        const sameNameUsers = prev.filter((u) => u.name === userName && u.userId !== normalizedUserId);
        if (sameNameUsers.length > 0) {
          console.warn(`Encontrados ${sameNameUsers.length} usuários com o mesmo nome "${userName}" mas userIds diferentes:`, sameNameUsers);
        }
        
        const newUser = { id: Date.now().toString(), name: userName, userId: normalizedUserId };
        const newList = [...filtered, newUser];
        
        // Verificação final: garantir que não há duplicatas
        const userIds = newList.map(u => u.userId);
        const uniqueUserIds = new Set(userIds);
        if (userIds.length !== uniqueUserIds.size) {
          console.error('Duplicatas detectadas após adicionar! Removendo duplicatas...', { userId: normalizedUserId, userName, lista: newList });
          // Remover duplicatas mantendo apenas o primeiro de cada userId
          const deduplicated: FollowedUser[] = [];
          const seen = new Set<string>();
          newList.forEach((u) => {
            if (!seen.has(u.userId)) {
              seen.add(u.userId);
              deduplicated.push(u);
            }
          });
          return deduplicated;
        }
        
        return newList;
      });

      // Adicionar à lista de seguidores do usuário seguido
      const followersKey = `magistral_user_followers_${normalizedUserId}`;
      try {
        const currentFollowers = JSON.parse(localStorage.getItem(followersKey) || '[]');
        if (!currentFollowers.includes(user.id)) {
          localStorage.setItem(followersKey, JSON.stringify([...currentFollowers, user.id]));
        }
      } catch (error) {
        console.error('Erro ao adicionar seguidor:', error);
      }

      toast({
        title: 'Seguindo cooperado',
        description: `Você receberá notificações sobre novas ofertas de ${userName}.`,
      });
    }
  };

  return {
    isFollowingUser,
    toggleFollowUser,
    followedUsers,
  };
}
