import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { RawMaterial } from '@/types';
import { sortBackupKeysNewestFirst } from '@/lib/legacyUserMigration';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

interface LaudoContextType {
  laudos: RawMaterial[];
  addLaudo: (laudo: RawMaterial) => void;
  updateLaudo: (id: string, updates: Partial<RawMaterial>) => void;
  getUserLaudos: (userId: string) => RawMaterial[];
  hasValidLaudo: (userId: string, substanceId: string) => boolean;
  getValidLaudos: (userId: string) => RawMaterial[];
  migrateLegacyCreatedBy: (legacyId: string, currentUserId: string) => boolean;
  migrateLegacyCreatedByMultiple: (legacyIds: string[], currentUserId: string) => boolean;
  restoreFromLatestBackup: (currentUserId?: string, legacyIds?: string[]) => boolean;
}

const LaudoContext = createContext<LaudoContextType | undefined>(undefined);

const LAUDOS_STORAGE_KEY = 'magistral_laudos';

export function LaudoProvider({ children }: { children: ReactNode }) {
  const [laudos, setLaudos] = useState<RawMaterial[]>(() => {
    return safeGetItem<RawMaterial[]>(LAUDOS_STORAGE_KEY, []).map((l: any) => {
      try {
        // Tentar converter datas, usando valores padrão se inválidas
        let manufacturingDate: Date;
        try {
          manufacturingDate = l.manufacturingDate 
            ? (l.manufacturingDate instanceof Date ? l.manufacturingDate : new Date(l.manufacturingDate))
            : new Date();
          if (isNaN(manufacturingDate.getTime())) {
            console.warn(`Data de fabricação inválida no laudo ${l.id}, usando data atual`);
            manufacturingDate = new Date();
          }
        } catch {
          manufacturingDate = new Date();
        }
        
        let expiryDate: Date;
        try {
          expiryDate = l.expiryDate 
            ? (l.expiryDate instanceof Date ? l.expiryDate : new Date(l.expiryDate))
            : new Date();
          if (isNaN(expiryDate.getTime())) {
            console.warn(`Data de validade inválida no laudo ${l.id}, usando data futura`);
            expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 ano no futuro
          }
        } catch {
          expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        }
        
        let createdAt: Date;
        try {
          createdAt = l.createdAt 
            ? (l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt))
            : new Date();
          if (isNaN(createdAt.getTime())) {
            createdAt = new Date();
          }
        } catch {
          createdAt = new Date();
        }
        
        let purchaseDate: Date | undefined;
        if (l.purchaseDate) {
          try {
            purchaseDate = l.purchaseDate instanceof Date ? l.purchaseDate : new Date(l.purchaseDate);
            if (isNaN(purchaseDate.getTime())) {
              purchaseDate = undefined;
            }
          } catch {
            purchaseDate = undefined;
          }
        }
        
        return {
          ...l,
          supplier: l.supplier || 'Não informado', // Fallback para laudos antigos
          manufacturingDate,
          expiryDate,
          createdAt,
          purchaseDate,
          // Limpar URLs temporárias inválidas (blob URLs não persistem)
          pdfUrl: l.pdfUrl && !l.pdfUrl.startsWith('blob:') && !l.pdfUrl.startsWith('data:') 
            ? l.pdfUrl 
            : l.pdfUrl?.startsWith('data:') 
              ? l.pdfUrl 
              : undefined, // Remover blob URLs inválidas
        };
      } catch (dateError) {
        console.error('Erro ao converter datas do laudo:', l.id, dateError);
        // Em vez de retornar null, retornar o laudo com datas padrão
        return {
          ...l,
          manufacturingDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          purchaseDate: undefined,
        };
      }
    });
  });

  // Salvar laudos no localStorage
  useEffect(() => {
    safeSetItem(LAUDOS_STORAGE_KEY, laudos);
  }, [laudos]);

  // Atualizar status de expiração (apenas uma vez na montagem, sem modificar a estrutura)
  // IMPORTANTE: Este useEffect não deve modificar os laudos, apenas calcular isExpired
  // O isExpired pode ser calculado dinamicamente nas funções que o usam
  // Removido para evitar problemas de perda de dados

  const addLaudo = (laudo: RawMaterial) => {
    setLaudos((prev) => [...prev, laudo]);
  };

  const updateLaudo = (id: string, updates: Partial<RawMaterial>) => {
    setLaudos((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  const getUserLaudos = (userId: string) => {
    return laudos.filter((l) => l.createdBy === userId);
  };

  const hasValidLaudo = (userId: string, substanceId: string): boolean => {
    const now = new Date();
    return laudos.some(
      (laudo) => {
        // Calcular isExpired dinamicamente
        const isExpired = laudo.expiryDate <= now;
        return (
          laudo.substanceId === substanceId &&
          laudo.createdBy === userId &&
          !isExpired &&
          !!laudo.pdfUrl
        );
      }
    );
  };

  const getValidLaudos = (userId: string): RawMaterial[] => {
    const now = new Date();
    return laudos.filter(
      (laudo) => {
        // Calcular isExpired dinamicamente
        const isExpired = laudo.expiryDate <= now;
        return (
          laudo.createdBy === userId &&
          !isExpired &&
          !!laudo.pdfUrl
        );
      }
    );
  };

  const migrateLegacyCreatedBy = useCallback((legacyId: string, currentUserId: string): boolean => {
    const toUpdate = laudos.filter((l) => l.createdBy === legacyId);
    if (toUpdate.length === 0) return false;
    setLaudos((prev) =>
      prev.map((l) => (l.createdBy === legacyId ? { ...l, createdBy: currentUserId } : l))
    );
    console.log(`✅ [LaudoContext] Migrados ${toUpdate.length} laudo(s) de createdBy '${legacyId}' para usuário atual.`);
    return true;
  }, [laudos]);

  const migrateLegacyCreatedByMultiple = useCallback((legacyIds: string[], currentUserId: string): boolean => {
    const idSet = new Set(legacyIds);
    const toUpdate = laudos.filter((l) => idSet.has(l.createdBy));
    if (toUpdate.length === 0) return false;
    setLaudos((prev) =>
      prev.map((l) => (idSet.has(l.createdBy) ? { ...l, createdBy: currentUserId } : l))
    );
    console.log(`✅ [LaudoContext] Migrados ${toUpdate.length} laudo(s) de createdBy [${legacyIds.join(',')}] para usuário atual.`);
    return true;
  }, [laudos]);

  const restoreFromLatestBackup = useCallback((currentUserId?: string, legacyIds?: string[]): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const rawKeys = Object.keys(localStorage).filter((k) => k.startsWith(`${LAUDOS_STORAGE_KEY}_backup_`));
      const keys = sortBackupKeysNewestFirst(rawKeys);
      if (keys.length === 0) return false;
      const stored = localStorage.getItem(keys[0]);
      if (!stored || stored === '[]' || stored === 'null') return false;
      const parsed = JSON.parse(stored) as any[];
      const withDates = parsed.map((l: any) => ({
        ...l,
        manufacturingDate: l.manufacturingDate ? (l.manufacturingDate instanceof Date ? l.manufacturingDate : new Date(l.manufacturingDate)) : new Date(),
        expiryDate: l.expiryDate ? (l.expiryDate instanceof Date ? l.expiryDate : new Date(l.expiryDate)) : new Date(),
        createdAt: l.createdAt ? (l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt)) : new Date(),
        purchaseDate: l.purchaseDate ? (l.purchaseDate instanceof Date ? l.purchaseDate : new Date(l.purchaseDate)) : undefined,
      }));
      const idSet = currentUserId && legacyIds?.length ? new Set(legacyIds) : null;
      const toSave = idSet
        ? withDates.map((l: any) => (idSet.has(l.createdBy) ? { ...l, createdBy: currentUserId } : l))
        : withDates;
      localStorage.setItem(LAUDOS_STORAGE_KEY, JSON.stringify(toSave));
      setLaudos(toSave as RawMaterial[]);
      console.log(`✅ [LaudoContext] Restaurados ${toSave.length} laudo(s) do backup: ${keys[0]}${idSet ? ' (migrados para user.id)' : ''}`);
      return true;
    } catch (e) {
      console.error('Erro ao restaurar laudos do backup:', e);
      return false;
    }
  }, []);

  return (
    <LaudoContext.Provider
      value={{
        laudos,
        addLaudo,
        updateLaudo,
        getUserLaudos,
        hasValidLaudo,
        getValidLaudos,
        migrateLegacyCreatedBy,
        migrateLegacyCreatedByMultiple,
        restoreFromLatestBackup,
      }}
    >
      {children}
    </LaudoContext.Provider>
  );
}

export function useLaudos() {
  const context = useContext(LaudoContext);
  if (context === undefined) {
    throw new Error('useLaudos must be used within a LaudoProvider');
  }
  return context;
}
