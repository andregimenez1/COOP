import React, { createContext, useContext, ReactNode } from 'react';
import type {
  BankDataChangeRequest,
  ExtraUserRequest,
  ExitRequest,
  SupplierRequest,
  Supplier,
} from '@/types';
import { useRequestsData } from '@/hooks/use-requests-data';

type RequestsDataContextValue = ReturnType<typeof useRequestsData>;

const RequestsDataContext = createContext<RequestsDataContextValue | undefined>(undefined);

export function RequestsDataProvider({ children }: { children: ReactNode }) {
  const value = useRequestsData();
  return <RequestsDataContext.Provider value={value}>{children}</RequestsDataContext.Provider>;
}

export function useRequestsDataContext(): RequestsDataContextValue {
  const ctx = useContext(RequestsDataContext);
  if (!ctx) {
    throw new Error('useRequestsDataContext must be used within a RequestsDataProvider');
  }
  return ctx;
}

