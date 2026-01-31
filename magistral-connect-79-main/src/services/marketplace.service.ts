/**
 * Serviço do Marketplace – histórico de transações, etc.
 */

import { api } from '@/lib/api';
import { MarketplaceProposalSnapshot, Transaction, UnsuccessfulTransactionItem } from '@/types';

export interface MarketplaceOffer {
  id: string;
  type: 'sell' | 'buy';
  substanceId?: string;
  substanceName?: string;
  substance?: string;
  rawMaterialId?: string;
  rawMaterialName?: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  expiryDate?: string | Date;
  maxPrice?: number;
  minExpiryDate?: string | Date;
  minValidityMonths?: number;
  acceptShortExpiry?: boolean;
  userId: string;
  userName: string;
  companyName?: string;
  status: 'active' | 'completed' | 'cancelled' | 'draft' | 'expired' | 'paused';
  createdAt: string | Date;
  updatedAt?: string | Date;
  hasPdf?: boolean;
  seller?: string;
  buyer?: string;
  isAuction?: boolean;
  startingPrice?: number;
  currentBid?: number;
  highestBidderId?: string;
  auctionEnd?: string | Date;
  bidCount?: number;
  highestbidder?: { id: string; name: string; company?: string };
}

interface OffersResponse {
  offers: MarketplaceOffer[];
}

interface OfferResponse {
  offer: MarketplaceOffer;
}

/**
 * Listar todas as ofertas ativas do marketplace
 */
export async function getOffers(): Promise<MarketplaceOffer[]> {
  const res = await api.get<OffersResponse>('/marketplace/offers');
  return (res.offers ?? []).map((offer) => {
    const displaySubstance =
      offer.substanceName ||
      offer.rawMaterialName ||
      offer.substance ||
      '';
    const displaySeller = offer.companyName || offer.userName || offer.seller || '—';
    const displayBuyer = offer.companyName || offer.userName || offer.buyer || '—';

    const normalizedMaxPrice = offer.type === 'buy' ? (offer.maxPrice ?? 0) : offer.maxPrice;
    const normalizedMinValidityMonths =
      offer.type === 'buy' ? ((offer as any).minValidityMonths ?? 6) : (offer as any).minValidityMonths;

    return {
      ...offer,
      substance: displaySubstance,
      seller: displaySeller,
      buyer: displayBuyer,
      maxPrice: normalizedMaxPrice,
      minValidityMonths: normalizedMinValidityMonths,
    };
  });
}

/**
 * Criar uma nova oferta (venda ou compra)
 */
export async function createOffer(data: Partial<MarketplaceOffer>): Promise<MarketplaceOffer> {
  const res = await api.post<OfferResponse>('/marketplace/offers', data);
  return res.offer;
}

/**
 * Atualizar uma oferta existente
 */
export async function updateOffer(id: string, data: Partial<MarketplaceOffer>): Promise<MarketplaceOffer> {
  const res = await api.patch<OfferResponse>(`/marketplace/offers/${id}`, data);
  return res.offer;
}

/**
 * Remover uma oferta
 */
export async function deleteOffer(id: string): Promise<void> {
  await api.delete(`/marketplace/offers/${id}`);
}

/**
 * Dar um lance em um leilão
 */
export async function placeBid(offerId: string, amount: number): Promise<MarketplaceOffer> {
  const res = await api.post<OfferResponse>(`/marketplace/offers/${offerId}/bid`, { amount });
  return res.offer;
}

interface TransactionHistoryResponse {
  successful: Array<
    Omit<Transaction, 'completedAt' | 'createdAt' | 'proposal'> & {
      completedAt: string;
      createdAt: string;
      proposal?: Omit<MarketplaceProposalSnapshot, 'createdAt' | 'respondedAt' | 'completedAt'> & {
        createdAt: string;
        respondedAt?: string | null;
        completedAt?: string | null;
      };
    }
  >;
  unsuccessful: Array<Omit<UnsuccessfulTransactionItem, 'createdAt' | 'respondedAt' | 'proposal'> & {
    createdAt: string;
    respondedAt?: string | null;
    proposal?: Omit<MarketplaceProposalSnapshot, 'createdAt' | 'respondedAt' | 'completedAt'> & {
      createdAt: string;
      respondedAt?: string | null;
      completedAt?: string | null;
    };
  }>;
}

function parseDate(v: string | undefined | null): Date {
  if (!v) return new Date();
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Histórico de transações do usuário: bem-sucedidas e mal-sucedidas.
 */
export async function getTransactionHistory(): Promise<{
  successful: Transaction[];
  unsuccessful: UnsuccessfulTransactionItem[];
}> {
  const res = await api.get<TransactionHistoryResponse>('/marketplace/transactions/history');
  const successful: Transaction[] = (res.successful ?? []).map((t) => ({
    ...t,
    completedAt: parseDate(t.completedAt),
    createdAt: parseDate(t.createdAt),
    proposal: t.proposal
      ? ({
        ...t.proposal,
        createdAt: parseDate(t.proposal.createdAt),
        respondedAt: t.proposal.respondedAt ? parseDate(t.proposal.respondedAt) : undefined,
        completedAt: t.proposal.completedAt ? parseDate(t.proposal.completedAt) : undefined,
      } as MarketplaceProposalSnapshot)
      : undefined,
  }));
  const unsuccessful: UnsuccessfulTransactionItem[] = (res.unsuccessful ?? []).map((u) => ({
    ...u,
    createdAt: parseDate(u.createdAt),
    respondedAt: u.respondedAt ? parseDate(u.respondedAt) : undefined,
    proposal: u.proposal
      ? ({
        ...u.proposal,
        createdAt: parseDate(u.proposal.createdAt),
        respondedAt: u.proposal.respondedAt ? parseDate(u.proposal.respondedAt) : undefined,
        completedAt: u.proposal.completedAt ? parseDate(u.proposal.completedAt) : undefined,
      } as MarketplaceProposalSnapshot)
      : undefined,
  }));
  return { successful, unsuccessful };
}
