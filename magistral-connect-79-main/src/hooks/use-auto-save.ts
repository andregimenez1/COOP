import { useEffect, useRef } from 'react';

interface UseAutoSaveOptions {
  data: any;
  storageKey: string;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave({ data, storageKey, debounceMs = 2000, enabled = true }: UseAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const dataString = JSON.stringify(data);
    
    // Se os dados não mudaram, não salvar
    if (dataString === lastSavedRef.current) return;

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Criar novo timeout para salvar após debounce
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, dataString);
        lastSavedRef.current = dataString;
      } catch (error) {
        console.error('Erro ao salvar automaticamente:', error);
      }
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, storageKey, debounceMs, enabled]);

  // Função para carregar dados salvos
  const loadSavedData = (): any => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar dados salvos:', error);
    }
    return null;
  };

  // Função para limpar dados salvos
  const clearSavedData = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(storageKey);
      lastSavedRef.current = '';
    } catch (error) {
      console.error('Erro ao limpar dados salvos:', error);
    }
  };

  return { loadSavedData, clearSavedData };
}
