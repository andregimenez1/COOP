import { api } from '@/lib/api';
import type { Quotation, QuotationVariation } from '@/types';

type LatestQuotationItem = {
  quotation: Omit<Quotation, 'validity' | 'quotationDate'> & {
    validity: string;
    quotationDate: string;
  };
  reference: null | {
    kind: 'mass' | 'volume';
    baseUnit: 'g' | 'mL';
    pricePerBaseUnit: number;
    variation: QuotationVariation;
  };
};

type LatestQuotationsResponse = {
  latest: Record<string, LatestQuotationItem>;
};

function parseDate(v: string): Date {
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date() : d;
}

export async function getLatestQuotationsBySubstanceIds(substanceIds: string[]): Promise<
  Record<
    string,
    {
      quotation: Quotation;
      reference: LatestQuotationItem['reference'];
    }
  >
> {
  const ids = Array.from(new Set(substanceIds)).filter(Boolean);
  if (ids.length === 0) return {};

  const res = await api.get<LatestQuotationsResponse>(`/quotations/latest?substanceIds=${encodeURIComponent(ids.join(','))}`);
  const out: Record<string, { quotation: Quotation; reference: LatestQuotationItem['reference'] }> = {};

  for (const [substanceId, item] of Object.entries(res.latest || {})) {
    out[substanceId] = {
      quotation: {
        ...(item.quotation as any),
        validity: parseDate(item.quotation.validity),
        quotationDate: parseDate(item.quotation.quotationDate),
      } as Quotation,
      reference: item.reference ?? null,
    };
  }

  return out;
}

