import { api } from '@/lib/api';

export type SupplierDocValidityPolicyType = 'afe' | 'ae' | 'crt';
export type SupplierDocValidityPolicyMode = 'indefinite' | 'months';

export interface SupplierDocValidityPolicy {
  id: string;
  type: SupplierDocValidityPolicyType;
  mode: SupplierDocValidityPolicyMode;
  months?: number | null;
  updatedAt: string;
  updatedBy?: string | null;
}

export interface MarketplaceConfig {
  id: 'singleton';
  minSellValidityDays: number;
  marketplaceFee: number;
  updatedAt?: string;
  updatedBy?: string | null;
}

class SettingsService {
  async getSupplierDocumentValidityPolicies(): Promise<SupplierDocValidityPolicy[]> {
    const res = await api.get<{ policies: SupplierDocValidityPolicy[] }>(`/settings/supplier-document-validity`);
    return res.policies || [];
  }

  async updateSupplierDocumentValidityPolicy(input: {
    type: SupplierDocValidityPolicyType;
    mode: SupplierDocValidityPolicyMode;
    months?: number | null;
  }): Promise<SupplierDocValidityPolicy> {
    const res = await api.patch<{ policy: SupplierDocValidityPolicy }>(`/settings/supplier-document-validity`, input);
    return res.policy;
  }

  async getMarketplaceConfig(): Promise<MarketplaceConfig> {
    const res = await api.get<{ config: MarketplaceConfig }>(`/settings/marketplace`);
    return res.config;
  }

  async updateMarketplaceConfig(input: { minSellValidityDays?: number; marketplaceFee?: number }): Promise<MarketplaceConfig> {
    const res = await api.patch<{ config: MarketplaceConfig }>(`/settings/marketplace`, input);
    return res.config;
  }
}

export const settingsService = new SettingsService();

