import { useState, useEffect, useCallback } from 'react';
import { requestService } from '@/services/request.service';
import { supplierService } from '@/services/supplier.service';
import type {
  BankDataChangeRequest,
  ExtraUserRequest,
  ExitRequest,
  SupplierRequest,
  Supplier,
  UserProfileDocumentRequest,
} from '@/types';

export function useRequestsData() {
  const [bankDataRequests, setBankDataRequests] = useState<BankDataChangeRequest[]>([]);
  const [profileDocumentRequests, setProfileDocumentRequests] = useState<UserProfileDocumentRequest[]>([]);
  const [extraUsersRequests, setExtraUsersRequests] = useState<ExtraUserRequest[]>([]);
  const [exitRequests, setExitRequests] = useState<ExitRequest[]>([]);
  const [supplierRequests, setSupplierRequests] = useState<SupplierRequest[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      const [bank, profileDocs, extra, exit, suppReqs, supps] = await Promise.all([
        requestService.getBankDataRequests(),
        requestService.getProfileDocumentRequests(),
        requestService.getExtraUserRequests(),
        requestService.getExitRequests(),
        supplierService.getRequests(),
        supplierService.getAll(),
      ]);
      
      setBankDataRequests(bank);
      setProfileDocumentRequests(profileDocs);
      setExtraUsersRequests(extra);
      setExitRequests(exit);
      setSupplierRequests(suppReqs);
      setSuppliers(supps);
    } catch (e: any) {
      console.error('❌ [useRequestsData] Erro ao carregar:', e);
      setError(e?.message || 'Erro ao carregar solicitações');
      setBankDataRequests([]);
      setProfileDocumentRequests([]);
      setExtraUsersRequests([]);
      setExitRequests([]);
      setSupplierRequests([]);
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    bankDataRequests,
    setBankDataRequests,
    profileDocumentRequests,
    setProfileDocumentRequests,
    extraUsersRequests,
    setExtraUsersRequests,
    exitRequests,
    setExitRequests,
    supplierRequests,
    setSupplierRequests,
    suppliers,
    setSuppliers,
    isLoading,
    error,
    refetch: load,
  };
}
