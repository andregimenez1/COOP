import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Substance, SubstanceSuggestion } from '@/types';
import { substanceService } from '@/services/substance.service';
import { useAuth } from './AuthContext';

interface SubstanceContextType {
  substances: Substance[];
  suggestions: SubstanceSuggestion[];
  isLoading: boolean;
  addSubstance: (substance: Substance) => Promise<void>;
  addSuggestion: (suggestion: SubstanceSuggestion) => Promise<void>;
  updateSuggestion: (id: string, updates: Partial<SubstanceSuggestion>) => Promise<void>;
  getSubstanceById: (id: string) => Substance | undefined;
  refreshSubstances: () => Promise<void>;
  refreshSuggestions: () => Promise<void>;
}

const SubstanceContext = createContext<SubstanceContextType | undefined>(undefined);

export function SubstanceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [substances, setSubstances] = useState<Substance[]>([]);
  const [suggestions, setSuggestions] = useState<SubstanceSuggestion[]>([]);

  const loadData = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const [apiSubstances, apiSuggestions] = await Promise.all([
        substanceService.getAll(),
        substanceService.getSuggestions(),
      ]);
      setSubstances(apiSubstances);
      setSuggestions(apiSuggestions);
    } catch (e) {
      console.error('❌ [SubstanceContext] Erro ao carregar substâncias/sugestões:', e);
      setSubstances([]);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      loadData();
    } else if (!isAuthenticated && !isAuthLoading) {
      setSubstances([]);
      setSuggestions([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    const t = setInterval(() => {
      setSuggestions((prev) => prev.filter((s) => new Date(s.expiresAt) > new Date()));
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const refreshSubstances = async () => {
    const list = await substanceService.getAll();
    setSubstances(list);
  };

  const refreshSuggestions = async () => {
    const list = await substanceService.getSuggestions();
    setSuggestions(list);
  };

  const addSubstance = async (substance: Substance) => {
    const created = await substanceService.create({
      name: substance.name,
      synonyms: substance.synonyms,
    });
    setSubstances((prev) => [...prev, created]);
  };

  const addSuggestion = async (suggestion: SubstanceSuggestion) => {
    const created = await substanceService.createSuggestion(suggestion.name);
    setSuggestions((prev) => [...prev, created]);
  };

  const updateSuggestion = async (id: string, updates: Partial<SubstanceSuggestion>) => {
    if (updates.status === 'approved') {
      const updated = await substanceService.approveSuggestion(id, updates.suggestedName);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      await refreshSubstances();
      return;
    }
    if (updates.status === 'rejected' && updates.rejectionReason) {
      const updated = await substanceService.rejectSuggestion(id, updates.rejectionReason);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return;
    }
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const getSubstanceById = (id: string) => substances.find((s) => s.id === id);

  return (
    <SubstanceContext.Provider
      value={{
        substances,
        suggestions,
        isLoading,
        addSubstance,
        addSuggestion,
        updateSuggestion,
        getSubstanceById,
        refreshSubstances,
        refreshSuggestions,
      }}
    >
      {children}
    </SubstanceContext.Provider>
  );
}

export function useSubstances() {
  const context = useContext(SubstanceContext);
  if (context === undefined) {
    throw new Error('useSubstances must be used within a SubstanceProvider');
  }
  return context;
}
