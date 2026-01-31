import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const FOLLOWED_ITEMS_STORAGE_KEY = 'magistral_followed_items';

interface FollowedItem {
  id: string;
  name: string;
  alerts: number;
}

export function useFollowSubstance() {
  const { toast } = useToast();
  const [followedItems, setFollowedItems] = useState<FollowedItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(FOLLOWED_ITEMS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar itens seguidos:', error);
    }
    return [];
  });

  // Salvar itens seguidos no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FOLLOWED_ITEMS_STORAGE_KEY, JSON.stringify(followedItems));
      } catch (error) {
        console.error('Erro ao salvar itens seguidos:', error);
      }
    }
  }, [followedItems]);

  const isFollowingSubstance = (substanceName: string): boolean => {
    return followedItems.some((item) => item.name.toLowerCase() === substanceName.toLowerCase());
  };

  const toggleFollowSubstance = (substanceName: string) => {
    if (isFollowingSubstance(substanceName)) {
      // Deixar de seguir
      setFollowedItems((prev) => prev.filter((item) => item.name.toLowerCase() !== substanceName.toLowerCase()));
      toast({
        title: 'Deixou de seguir',
        description: `Você não receberá mais notificações sobre ${substanceName}.`,
      });
    } else {
      // Seguir
      setFollowedItems((prev) => [
        ...prev,
        { id: Date.now().toString(), name: substanceName, alerts: 0 },
      ]);
      toast({
        title: 'Seguindo matéria-prima',
        description: `Você receberá notificações sobre ${substanceName}.`,
      });
    }
  };

  return {
    isFollowingSubstance,
    toggleFollowSubstance,
    followedItems,
  };
}
