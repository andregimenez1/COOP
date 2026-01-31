import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  FileText,
  Building2,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Users,
  X,
  Edit,
  CheckCircle,
  AlertCircle,
  Star,
  History,
  Download,
  CheckCircle2,
  Send,
  Pause,
  Play,
  QrCode,
  Copy,
  ArrowLeftRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useSubstances } from '@/contexts/SubstanceContext';
import { useLaudos } from '@/contexts/LaudoContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useFollowSubstance } from '@/hooks/use-follow-substance';
import { useFollowUser } from '@/hooks/use-follow-user';
import { isUuid, getLegacyIdsForUser, getLegacyNamesForUser, sortBackupKeysNewestFirst } from '@/lib/legacyUserMigration';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { getTransactionHistory, getOffers, createOffer, updateOffer, deleteOffer, type MarketplaceOffer } from '@/services/marketplace.service';
import { getLatestQuotationsBySubstanceIds } from '@/services/quotation.service';
import { userService, type TradingEligibilityResponse } from '@/services/user.service';
import { settingsService } from '@/services/settings.service';
import { supplierService } from '@/services/supplier.service';
import { Transaction, OfferProposal, UnsuccessfulTransactionItem } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Função auxiliar para obter data de criação (com fallback para 16/01/2026 10:00)
const getCreatedAtDate = (offer: any): Date => {
  if (offer.createdAt) {
    if (offer.createdAt instanceof Date) return offer.createdAt;
    if (typeof offer.createdAt === 'string') return new Date(offer.createdAt);
  }
  // Data padrão: 16/01/2026 às 10:00
  return new Date(2026, 0, 16, 10, 0, 0);
};

// Função auxiliar para calcular data de expiração (7 dias corridos a partir da data de criação)
const getExpirationDate = (offer: any): Date => {
  const createdAt = getCreatedAtDate(offer);
  const expiration = new Date(createdAt);
  expiration.setDate(expiration.getDate() + 7);
  return expiration;
};

// Função auxiliar para formatar data relativa
const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR');
};

const toOfferExpiryDate = (v: any): Date | null => {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const toBaseUnit = (unit: string): { kind: 'mass' | 'volume'; factor: number; baseUnit: 'g' | 'mL' } | null => {
  if (unit === 'g') return { kind: 'mass', factor: 1, baseUnit: 'g' };
  if (unit === 'kg') return { kind: 'mass', factor: 1000, baseUnit: 'g' };
  if (unit === 'mL') return { kind: 'volume', factor: 1, baseUnit: 'mL' };
  if (unit === 'L') return { kind: 'volume', factor: 1000, baseUnit: 'mL' };
  return null;
};

const getMinValidityDeadline = (minDays: number) => {
  const now = new Date();
  return new Date(now.getTime() + minDays * 24 * 60 * 60 * 1000);
};

const normalizeSupplierName = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

function AuctionTimer({ endDate }: { endDate: Date | string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const target = new Date(endDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Encerrado');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${mins}m`);
      } else {
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shadow-sm">
      <Clock className="h-3.5 w-3.5" />
      <span>{timeLeft}</span>
    </div>
  );
}

// Demo offers com datas reais
const now = new Date();
export const sellOffers = [
  {
    id: '1',
    type: 'sell' as const,
    substance: 'Vitamina C (Ácido Ascórbico)',
    quantity: 5000,
    unit: 'g' as const,
    pricePerUnit: 0.18,
    expiryDate: '2026-01-15', // Validade do produto
    hasPdf: true,
    seller: 'Roseiras (Araraquara)',
    userId: '4', // ID do usuário Roseiras
    createdAt: new Date(now.getTime() - 2 * 3600000), // 2 horas atrás
    status: 'active' as const,
  },
  {
    id: '2',
    type: 'sell' as const,
    substance: 'Vitamina C (Ácido Ascórbico)',
    quantity: 3000,
    unit: 'g' as const,
    pricePerUnit: 0.22,
    expiryDate: '2026-03-20',
    hasPdf: true,
    seller: 'Roseiras (Araraquara)',
    userId: '4', // ID do usuário Roseiras
    createdAt: new Date(now.getTime() - 4 * 3600000), // 4 horas atrás
    status: 'active' as const,
  },
  {
    id: '3',
    type: 'sell' as const,
    substance: 'Vitamina C (Ácido Ascórbico)',
    quantity: 4000,
    unit: 'g' as const,
    pricePerUnit: 0.19,
    expiryDate: '2026-02-10',
    hasPdf: true,
    seller: 'Farmagna (Araraquara)',
    userId: '5', // ID do usuário Farmagna
    createdAt: new Date(now.getTime() - 6 * 3600000), // 6 horas atrás
    status: 'active' as const,
  },
  {
    id: '4',
    type: 'sell' as const,
    substance: 'Colágeno Hidrolisado',
    quantity: 2000,
    unit: 'g' as const,
    pricePerUnit: 0.85,
    expiryDate: '2026-02-20',
    hasPdf: true,
    seller: 'Manipulação Express',
    userId: '12', // ID único para Manipulação Express
    createdAt: new Date(now.getTime() - 5 * 3600000), // 5 horas atrás
    status: 'active' as const,
  },
  {
    id: '5',
    type: 'sell' as const,
    substance: 'Ácido Hialurônico',
    quantity: 500,
    unit: 'g' as const,
    pricePerUnit: 180.0,
    expiryDate: '2025-03-10',
    hasPdf: true,
    seller: 'Farmácia Central',
    userId: '8', // ID único para Farmácia Central
    createdAt: new Date(now.getTime() - 24 * 3600000), // 1 dia atrás
    status: 'active' as const,
  },
  {
    id: '9',
    type: 'sell' as const,
    substance: 'Vitamina D3',
    quantity: 1000,
    unit: 'g' as const,
    pricePerUnit: 15.50,
    expiryDate: '2026-01-30', // Jan 30, 2026
    hasPdf: true,
    seller: 'Roseiras (Araraquara)',
    userId: '4', // ID do usuário Roseiras
    createdAt: new Date(now.getTime() - 1 * 24 * 3600000), // 1 dia atrás (ativa)
    status: 'active' as const,
  },
];

export const buyOffers = [
  {
    id: '6',
    type: 'buy' as const,
    substance: 'Magnésio Quelato',
    quantity: 1000,
    unit: 'g' as const,
    maxPrice: 0.45,
    minValidityMonths: 6, // Validade mínima em meses
    buyer: 'Farmácia Saúde+',
    userId: '9', // ID único para Farmácia Saúde+
    createdAt: new Date(now.getTime() - 3 * 3600000), // 3 horas atrás
    status: 'active' as const,
  },
  {
    id: '7',
    type: 'buy' as const,
    substance: 'Coenzima Q10',
    quantity: 200,
    unit: 'g' as const,
    maxPrice: 95.0,
    minValidityMonths: 3,
    buyer: 'Farmácia Popular',
    userId: '10', // ID único para Farmácia Popular
    createdAt: new Date(now.getTime() - 8 * 3600000), // 8 horas atrás
    status: 'active' as const,
  },
  {
    id: '8',
    type: 'buy' as const,
    substance: 'Vitamina D3',
    quantity: 500,
    unit: 'g' as const,
    maxPrice: 12.5,
    minValidityMonths: 12,
    buyer: 'Manipulação Fórmula Certa',
    userId: '11', // ID único para Manipulação Fórmula Certa
    createdAt: new Date(now.getTime() - 24 * 3600000), // 1 dia atrás
    status: 'active' as const,
  },
];

type Offer = MarketplaceOffer;

export default function Marketplace() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { substances: availableSubstances } = useSubstances();
  const { hasValidLaudo, getValidLaudos, getUserLaudos } = useLaudos();
  const { addNotification } = useNotifications();
  const { isFollowingSubstance, toggleFollowSubstance } = useFollowSubstance();
  const { isFollowingUser, toggleFollowUser } = useFollowUser();

  const [myEligibility, setMyEligibility] = useState<TradingEligibilityResponse | null>(null);
  const [myPermissions, setMyPermissions] = useState<Array<'marketplace_moderate_offers'>>([]);
  const [isSellWarningOpen, setIsSellWarningOpen] = useState(false);
  const [isControlledWarningOpen, setIsControlledWarningOpen] = useState(false);
  const [dismissedSellWarning, setDismissedSellWarning] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem('mc_marketplace_dismiss_sell_warning') === '1';
  });
  const [dismissedControlledWarning, setDismissedControlledWarning] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem('mc_marketplace_dismiss_controlled_warning') === '1';
  });
  const [minSellValidityDays, setMinSellValidityDays] = useState<number>(30);
  const [approvedSupplierNames, setApprovedSupplierNames] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!user) return;
    // Busca status de licenças (AE/PF) do usuário logado para filtrar ofertas controladas
    userService
      .getMyTradingEligibility()
      .then((r) => setMyEligibility(r))
      .catch(() => setMyEligibility(null));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    userService
      .getMyPermissions()
      .then((p) => setMyPermissions((p || []) as any))
      .catch(() => setMyPermissions([]));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    supplierService
      .getAll()
      .then((suppliers) => setApprovedSupplierNames(new Set((suppliers || []).map((s) => normalizeSupplierName(s.name)))))
      .catch(() => setApprovedSupplierNames(new Set()));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    settingsService
      .getMarketplaceConfig()
      .then((cfg) => setMinSellValidityDays(Number(cfg.minSellValidityDays ?? 30)))
      .catch(() => setMinSellValidityDays(30));
  }, [user?.id]);

  const isApprovedSupplierForLaudo = (laudo: any): boolean => {
    const name = String(laudo?.supplier ?? '').trim();
    if (!name) return false;
    return approvedSupplierNames.has(normalizeSupplierName(name));
  };

  // Função para corrigir e garantir userIds únicos nas ofertas
  const fixOfferUserIds = (offers: any[], isSellOffer: boolean): any[] => {
    // Mapeamento fixo de sellers/buyers conhecidos para userIds únicos
    const fixedUserMap: Record<string, string> = isSellOffer ? {
      'Roseiras (Araraquara)': '7',
      'Farmagna (Araraquara)': '5',
      'Natural (Araraquara)': '4',
      'Manipulação Express': '7',
      'Farmácia Central': '8',
    } : {
      'Farmácia Saúde+': '9',
      'Farmácia Popular': '10',
      'Manipulação Fórmula Certa': '11',
    };

    // Criar mapa seller/buyer -> userId baseado nas ofertas existentes
    const sellerBuyerToUserId: Record<string, string> = {};

    // Primeiro, aplicar mapeamento fixo
    Object.keys(fixedUserMap).forEach(name => {
      sellerBuyerToUserId[name] = fixedUserMap[name];
    });

    // Depois, processar ofertas para garantir consistência
    offers.forEach((o: any) => {
      const name = isSellOffer ? o.seller : o.buyer;
      if (name) {
        // Se já temos um userId mapeado para este nome, usar ele
        if (sellerBuyerToUserId[name] && o.userId && o.userId !== sellerBuyerToUserId[name]) {
          console.warn(`Corrigindo userId para ${name}: ${o.userId} -> ${sellerBuyerToUserId[name]}`);
        }
        // Se não temos mapeamento mas a oferta tem userId, usar ele
        if (!sellerBuyerToUserId[name] && o.userId) {
          sellerBuyerToUserId[name] = o.userId;
        }
        // Se ainda não temos, gerar um hash único
        if (!sellerBuyerToUserId[name]) {
          const hash = name.split('').reduce((acc: number, char: string) => {
            return ((acc << 5) - acc) + char.charCodeAt(0);
          }, 0);
          sellerBuyerToUserId[name] = `${isSellOffer ? 'seller' : 'buyer'}-${Math.abs(hash)}`;
        }
      }
    });

    // Aplicar correções às ofertas (não sobrescrever userId já migrado para UUID do backend)
    return offers.map((o: any) => {
      if (isUuid(o.userId)) return { ...o };
      const name = isSellOffer ? o.seller : o.buyer;
      const correctUserId = name ? sellerBuyerToUserId[name] : o.userId;
      return { ...o, userId: correctUserId || o.userId };
    });
  };

  // Verificar se o usuário tem permissão para acessar o marketplace
  if (!user || (!hasRole(['cooperado']) && !hasRole(['master']))) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="card-pharmaceutical">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Acesso Restrito</h3>
            <p className="mt-1 text-center text-muted-foreground">
              Apenas usuários cooperados podem acessar o marketplace.
              <br />
              Solicite acesso de Cooperado ao administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [offerType, setOfferType] = useState<'sell' | 'buy' | 'both'>('sell');

  // Verificar se deve abrir dialog de venda ao carregar (vindo de laudos)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const substanceId = urlParams.get('substanceId');
    const laudoId = urlParams.get('laudoId');

    if (action === 'sell' || action === 'new') {
      if (substanceId && user) {
        // Encontrar a substância
        const substance = availableSubstances.find(s => s.id === substanceId);
        if (substance) {
          setSelectedSubstanceForOffer({ id: substance.id, name: substance.name });
          setEditSubstance(substance.name);
          setEditSubstanceSearch(substance.name);
          setOfferType('sell');
          setIsDialogOpen(true);
          setPendingSellUrlCheck({ substanceId });

          // Se veio com laudoId, preencher dados do laudo específico
          if (laudoId && user) {
            const userLaudos = getUserLaudos(user.id);
            const laudo = userLaudos.find(l => l.id === laudoId);
            if (laudo && laudo.substanceId === substanceId) {
              // Preencher data de validade do laudo específico
              if (laudo.expiryDate) {
                const expiryDateStr = laudo.expiryDate.toISOString().split('T')[0];
                setEditExpiryDate(expiryDateStr);
              }
            }
          }

          // Limpar URL
          window.history.replaceState({}, '', '/marketplace');
        }
      } else {
        // Abrir diálogo genérico de nova oferta
        setIsDialogOpen(true);
        window.history.replaceState({}, '', '/marketplace');
      }
    }
  }, [user, availableSubstances, getUserLaudos]);

  const [pendingSellUrlCheck, setPendingSellUrlCheck] = useState<{ substanceId: string } | null>(null);
  const [filterSeller, setFilterSeller] = useState('');
  const [filterMinQuantity, setFilterMinQuantity] = useState('');
  const [filterMaxQuantity, setFilterMaxQuantity] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [selectedProposalForDetails, setSelectedProposalForDetails] = useState<OfferProposal | null>(null);
  const [proposalDetailsPaymentType, setProposalDetailsPaymentType] = useState<'money' | 'products' | 'mixed'>('money');
  const [proposalDetailsCashAmount, setProposalDetailsCashAmount] = useState<string>('');
  const [proposalDetailsSubstanceSearch, setProposalDetailsSubstanceSearch] = useState<string>('');
  const [selectedProposalDetailsSubstance, setSelectedProposalDetailsSubstance] = useState<any>(null);
  const [proposalDetailsQuantity, setProposalDetailsQuantity] = useState<string>('');
  const [proposalDetailsUnit, setProposalDetailsUnit] = useState<'g' | 'mL' | 'kg' | 'L'>('g');
  const [selectedProposalDetailsLaudo, setSelectedProposalDetailsLaudo] = useState<any>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [proposalQuantity, setProposalQuantity] = useState<number[]>([0]);
  const [proposalQuantityInput, setProposalQuantityInput] = useState<string>('');
  const [proposalProductExpiry, setProposalProductExpiry] = useState<string>('');
  const [minValidityMonths, setMinValidityMonths] = useState<string>('6');
  // Estados para acordo (dinheiro + matéria-prima)
  const [isAgreement, setIsAgreement] = useState(false);
  const [agreementCashAmount, setAgreementCashAmount] = useState<string>('');
  const [agreementSubstanceSearch, setAgreementSubstanceSearch] = useState('');
  const [selectedAgreementSubstance, setSelectedAgreementSubstance] = useState<{ id: string; name: string } | null>(null);
  const [agreementQuantity, setAgreementQuantity] = useState<string>('');
  const [agreementUnit, setAgreementUnit] = useState<'g' | 'mL' | 'kg' | 'L'>('g');
  const [selectedAgreementLaudo, setSelectedAgreementLaudo] = useState<{ id: string; substanceId: string; substanceName: string } | null>(null);
  // Carregar ofertas do localStorage
  const [offers, setOffers] = useState<Offer[]>([]);
  const [buyOffersState, setBuyOffersState] = useState<Offer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);

  // Auction states
  const [isAuction, setIsAuction] = useState(false);
  const [startingPrice, setStartingPrice] = useState('');
  const [auctionDurationDays, setAuctionDurationDays] = useState('10');
  const [bidAmount, setBidAmount] = useState('');
  const [isBidDialogOpen, setIsBidDialogOpen] = useState(false);
  const [offerToBid, setOfferToBid] = useState<Offer | null>(null);
  const [isPlacingBid, setIsPlacingBid] = useState(false);

  const handlePlaceBid = async () => {
    if (!offerToBid || !bidAmount) return;

    try {
      setIsPlacingBid(true);
      const amount = parseFloat(bidAmount);

      const response = await fetch(`/api/offers/${offerToBid.id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        throw new Error('Falha ao registrar lance');
      }

      toast({
        title: 'Lance realizado com sucesso!',
        description: `Seu lance de ${formatCurrency(amount)} foi registrado.`,
      });

      setIsBidDialogOpen(false);
      setBidAmount('');
      loadOffers(); // Refresh offers to see the new current bid
    } catch (error) {
      console.error('Erro ao dar lance:', error);
      toast({
        title: 'Erro ao realizar lance',
        description: 'Não foi possível registrar seu lance. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsPlacingBid(false);
    }
  };

  // Carregar ofertas da API
  const loadOffers = async () => {
    try {
      setIsLoadingOffers(true);
      const allOffers = await getOffers();

      // Mapear ofertas da API e adicionar campos seller/buyer para compatibilidade com a UI
      // Prioridade: company (empresa) > companyName > seller existente > user.name > userName
      const sellItems = allOffers.filter(o => o.type === 'sell').map(o => ({
        ...o,
        createdAt: new Date(o.createdAt),
        expiryDate: o.expiryDate ? new Date(o.expiryDate) : undefined,
        minExpiryDate: o.minExpiryDate ? new Date(o.minExpiryDate) : undefined,
        updatedAt: o.updatedAt ? new Date(o.updatedAt) : undefined,
        // Adicionar seller para compatibilidade com a UI (priorizar empresa)
        seller: (o as any).user?.company || (o as any).companyName || (o as any).seller || (o as any).user?.name || (o as any).userName || '',
        substance: (o as any).substanceName || (o as any).substance || '',
      })) as Offer[];

      const buyItems = allOffers.filter(o => o.type === 'buy').map(o => ({
        ...o,
        createdAt: new Date(o.createdAt),
        expiryDate: o.expiryDate ? new Date(o.expiryDate) : undefined,
        minExpiryDate: o.minExpiryDate ? new Date(o.minExpiryDate) : undefined,
        updatedAt: o.updatedAt ? new Date(o.updatedAt) : undefined,
        // Adicionar buyer para compatibilidade com a UI (priorizar empresa)
        buyer: (o as any).user?.company || (o as any).companyName || (o as any).buyer || (o as any).user?.name || (o as any).userName || '',
        substance: (o as any).substanceName || (o as any).substance || '',
      })) as Offer[];

      // MIGRATION: Migrar ofertas do localStorage que ainda não estão no banco
      // Executa apenas uma vez por sessão do navegador (persistente via sessionStorage)
      const MIGRATION_KEY = 'magistral_marketplace_migration_done';
      const migrationDone = typeof window !== 'undefined' && sessionStorage.getItem(MIGRATION_KEY) === 'true';

      if (typeof window !== 'undefined' && !migrationDone) {
        sessionStorage.setItem(MIGRATION_KEY, 'true'); // Marcar que já tentamos migração

        const STORAGE_KEY_SELL = 'magistral_marketplace_sell_offers';
        const STORAGE_KEY_BUY = 'magistral_marketplace_buy_offers';
        const localSell = safeGetItem<Offer[]>(STORAGE_KEY_SELL, []);
        const localBuy = safeGetItem<Offer[]>(STORAGE_KEY_BUY, []);

        const combinedLocal = [...localSell, ...localBuy];
        if (combinedLocal.length > 0) {
          // Filtrar apenas as que ainda não estão no banco (pelo ID original ou combinação única)
          const dbIds = new Set(allOffers.map(o => (o as any).originalId || o.id));
          const toMigrate = combinedLocal.filter(off => !dbIds.has(String(off.id)));

          if (toMigrate.length > 0) {
            console.log(`📦 [Marketplace] Migrando ${toMigrate.length} ofertas do localStorage para o banco...`);

            // Status válidos para migração
            const VALID_STATUSES = new Set(['active', 'completed', 'cancelled', 'draft']);
            const normalizeStatus = (status: unknown): 'active' | 'completed' | 'cancelled' | 'draft' => {
              if (typeof status === 'string' && VALID_STATUSES.has(status)) {
                return status as 'active' | 'completed' | 'cancelled' | 'draft';
              }
              if (status === 'paused') return 'draft';
              if (status === 'expired') return 'active';
              return 'active';
            };

            for (const off of toMigrate) {
              try {
                // Validar dados essenciais antes de enviar
                const quantity = Number(off.quantity);
                const pricePerUnit = Number((off as any).pricePerUnit || 0);
                const maxPrice = (off as any).maxPrice != null ? Number((off as any).maxPrice) : null;

                if (isNaN(quantity) || quantity <= 0) {
                  console.warn('⚠️ Oferta ignorada na migração: quantidade inválida', off);
                  continue;
                }
                if (!off.unit || off.unit.trim() === '') {
                  console.warn('⚠️ Oferta ignorada na migração: unidade inválida', off);
                  continue;
                }

                const substance = availableSubstances.find(s =>
                  s.name.toLowerCase() === (off.substance || '').toLowerCase()
                );

                // Preparar payload normalizado (sem rawMaterialId para evitar erros de FK)
                const payload: any = {
                  type: off.type,
                  substanceId: substance?.id || null,
                  substanceName: off.substance || '',
                  quantity,
                  unit: off.unit,
                  pricePerUnit: off.type === 'sell' ? pricePerUnit : 0,
                  maxPrice: off.type === 'buy' ? maxPrice : null,
                  expiryDate: (off as any).expiryDate || null,
                  isAuction: off.type === 'sell' ? (off as any).isAuction : false,
                  startingPrice: (off.type === 'sell' && (off as any).isAuction) ? parseFloat((off as any).startingPrice) : undefined,
                  auctionEnd: (off.type === 'sell' && (off as any).isAuction) ? (off as any).auctionEnd : undefined,
                  minExpiryDate: (off as any).minExpiryDate || null,
                  acceptShortExpiry: Boolean((off as any).acceptShortExpiry),
                  status: normalizeStatus((off as any).status),
                  // Não enviar rawMaterialId para evitar erro de FK
                  rawMaterialId: null,
                  rawMaterialName: (off as any).rawMaterialName || null,
                };

                await createOffer(payload);
              } catch (err) {
                console.error('Falha ao migrar oferta:', off.substance, err);
                // Continuar com as próximas ofertas em vez de parar tudo
              }
            }
            // Limpar localStorage após migração bem-sucedida para evitar re-migração
            console.log('✅ [Marketplace] Migração concluída. Limpando localStorage...');
            try {
              localStorage.removeItem(STORAGE_KEY_SELL);
              localStorage.removeItem(STORAGE_KEY_BUY);
              console.log('✅ [Marketplace] localStorage limpo.');
            } catch (e) {
              console.warn('⚠️ [Marketplace] Falha ao limpar localStorage:', e);
            }

            // Recarregar após migração
            const reloaded = await getOffers();
            setOffers(reloaded.filter(o => o.type === 'sell').map(o => ({
              ...o,
              createdAt: new Date(o.createdAt),
              expiryDate: o.expiryDate ? new Date(o.expiryDate) : undefined,
              seller: (o as any).user?.company || (o as any).companyName || (o as any).seller || (o as any).user?.name || (o as any).userName || '',
              substance: (o as any).substanceName || (o as any).substance || '',
            })) as any);
            setBuyOffersState(reloaded.filter(o => o.type === 'buy').map(o => ({
              ...o,
              createdAt: new Date(o.createdAt),
              expiryDate: o.expiryDate ? new Date(o.expiryDate) : undefined,
              buyer: (o as any).user?.company || (o as any).companyName || (o as any).buyer || (o as any).user?.name || (o as any).userName || '',
              substance: (o as any).substanceName || (o as any).substance || '',
            })) as any);
            return;
          }
        }
      }

      setOffers(sellItems);
      setBuyOffersState(buyItems);
    } catch (error) {
      console.error('❌ [Marketplace] Erro ao carregar ofertas:', error);
    } finally {
      setIsLoadingOffers(false);
    }
  };

  useEffect(() => {
    if (user && availableSubstances.length > 0) {
      loadOffers();
    }
  }, [user, availableSubstances]);

  // Sincronizar ofertas quando atualizado externamente (via evento personalizado)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleSync = () => {
      loadOffers();
    };
    window.addEventListener('magistral-offers-updated', handleSync);
    return () => {
      window.removeEventListener('magistral-offers-updated', handleSync);
    };
  }, []);

  // Salvar ofertas no localStorage com proteção - REMOVIDO EM FAVOR DO BANCO DE DADOS
  /*
  const lastSavedOffersRef = useRef<string>('');
  const lastSavedBuyOffersRef = useRef<string>('');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const STORAGE_KEY = 'magistral_marketplace_sell_offers';
      const currentDataStr = JSON.stringify(offers);
      if (currentDataStr === lastSavedOffersRef.current) return;
      if (safeSetItem(STORAGE_KEY, offers)) {
        lastSavedOffersRef.current = currentDataStr;
      }
    }
  }, [offers]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const STORAGE_KEY = 'magistral_marketplace_buy_offers';
      const currentDataStr = JSON.stringify(buyOffersState);
      if (currentDataStr === lastSavedBuyOffersRef.current) return;
      if (safeSetItem(STORAGE_KEY, buyOffersState)) {
        lastSavedBuyOffersRef.current = currentDataStr;
      }
    }
  }, [buyOffersState]);
  */

  /*
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const STORAGE_KEY = 'magistral_marketplace_buy_offers';
      try {
        const existing = localStorage.getItem(STORAGE_KEY);
        const existingData = existing ? JSON.parse(existing) : [];
        
        // PROTEÇÃO: Não sobrescrever dados existentes com array vazio
        if (existingData.length > 0 && buyOffersState.length === 0 && buyOffersState !== buyOffers) {
          console.warn('⚠️ [Marketplace] Tentativa de salvar array vazio quando havia ofertas de compra! Criando backup e mantendo dados existentes.');
          const backupKey = `${STORAGE_KEY}_backup_${Date.now()}`;
          localStorage.setItem(backupKey, existing);
          console.warn(`Backup criado em: ${backupKey}. Dados existentes preservados.`);
          return; // Não sobrescrever
        }
        
        // Fazer backup antes de salvar
        if (existing && existingData.length > 0) {
          const backupKey = `${STORAGE_KEY}_backup_${Date.now()}`;
          localStorage.setItem(backupKey, existing);
        }
        
        // Salvar ofertas apenas se houver dados ou se não havia dados antes
        if (buyOffersState.length > 0 || !existing) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(buyOffersState));
        }
      } catch (error) {
        console.error('❌ [Marketplace] Erro ao salvar ofertas de compra:', error);
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          console.warn('Quota do localStorage excedida. Tentando limpar backups antigos...');
          try {
            const keys = Object.keys(localStorage);
            const backupKeys = keys.filter(k => k.startsWith(`${STORAGE_KEY}_backup_`));
            backupKeys.sort().slice(0, -3).forEach(key => localStorage.removeItem(key));
            if (buyOffersState.length > 0) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(buyOffersState));
            }
          } catch (retryError) {
            console.error('Erro ao tentar salvar novamente:', retryError);
          }
        }
      }
    }
  }, [buyOffersState]);
  */

  // Estado para propostas
  const [proposals, setProposals] = useState<OfferProposal[]>(() => {
    if (typeof window === 'undefined') return [];
    const STORAGE_KEY = 'magistral_offer_proposals';
    try {
      let stored = localStorage.getItem(STORAGE_KEY);

      // Se não há dados principais, tentar restaurar do backup mais recente
      if (!stored || stored === '[]' || stored === 'null') {
        const rawKeys = Object.keys(localStorage).filter(k => k.startsWith(`${STORAGE_KEY}_backup_`));
        const backupKeys = sortBackupKeysNewestFirst(rawKeys);
        if (backupKeys.length > 0) {
          const latestBackup = backupKeys[0];
          stored = localStorage.getItem(latestBackup);
          if (stored && stored !== '[]' && stored !== 'null') {
            localStorage.setItem(STORAGE_KEY, stored);
          }
        }
      }

      if (stored && stored !== '[]' && stored !== 'null') {
        const parsed = JSON.parse(stored);
        return parsed.map((p: any) => {
          try {
            return {
              ...p,
              createdAt: p.createdAt ? (p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)) : new Date(),
              respondedAt: p.respondedAt ? (p.respondedAt instanceof Date ? p.respondedAt : new Date(p.respondedAt)) : undefined,
              productExpiryDate: p.productExpiryDate ? (p.productExpiryDate instanceof Date ? p.productExpiryDate : new Date(p.productExpiryDate)) : undefined,
            };
          } catch (dateError) {
            console.error('Erro ao converter datas da proposta:', p.id, dateError);
            return {
              ...p,
              createdAt: new Date(),
              respondedAt: undefined,
              productExpiryDate: undefined,
            };
          }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar propostas:', error);
      // Tentar fazer backup antes de perder dados
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const backupKey = `${STORAGE_KEY}_backup_${Date.now()}`;
          localStorage.setItem(backupKey, stored);
          console.warn(`Backup das propostas criado em: ${backupKey}`);
        }
      } catch (backupError) {
        console.error('Erro ao criar backup das propostas:', backupError);
      }
    }
    return [];
  });

  // Migração: atualizar proposerId de propostas antigas quando o usuário mudou de ID (Natural = ex-Roseiras)
  useEffect(() => {
    if (!user) return;
    const legacyNames = getLegacyNamesForUser(user.name, user.company);
    const nameSet = new Set([...(legacyNames || []), user.name, user.company].filter(Boolean));

    setProposals(prev => {
      const needsUpdate = prev.some((p) =>
        (nameSet.has(p.proposerName || '') || nameSet.has(p.proposerCompany || '')) && p.proposerId !== user.id
      );
      if (!needsUpdate) return prev;
      return prev.map((p) => {
        const match = nameSet.has(p.proposerName || '') || nameSet.has(p.proposerCompany || '');
        if (match && p.proposerId !== user.id) return { ...p, proposerId: user.id };
        return p;
      });
    });
  }, [user?.id, user?.name, user?.company]);

  // Salvar propostas no localStorage com proteção
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const STORAGE_KEY = 'magistral_offer_proposals';
      try {
        const existing = localStorage.getItem(STORAGE_KEY);
        const existingData = existing ? JSON.parse(existing) : [];

        // PROTEÇÃO: Não sobrescrever dados existentes com array vazio
        if (existingData.length > 0 && proposals.length === 0) {
          console.warn('⚠️ [Marketplace] Tentativa de salvar array vazio quando havia propostas! Criando backup e mantendo dados existentes.');
          const backupKey = `${STORAGE_KEY}_backup_${Date.now()}`;
          localStorage.setItem(backupKey, existing);
          console.warn(`Backup criado em: ${backupKey}. Dados existentes preservados.`);
          return; // Não sobrescrever
        }

        // Fazer backup antes de salvar (apenas se houver dados existentes)
        if (existing && existingData.length > 0) {
          const backupKey = `${STORAGE_KEY}_backup_${Date.now()}`;
          localStorage.setItem(backupKey, existing);
        }

        // Salvar propostas apenas se houver dados ou se não havia dados antes
        if (proposals.length > 0 || !existing) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
        }
      } catch (error) {
        console.error('❌ [Marketplace] Erro ao salvar propostas:', error);
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          console.warn('Quota do localStorage excedida. Tentando limpar backups antigos...');
          try {
            const keys = Object.keys(localStorage);
            const backupKeys = keys.filter(k => k.startsWith(`${STORAGE_KEY}_backup_`));
            backupKeys.sort().slice(0, -3).forEach(key => localStorage.removeItem(key));
            if (proposals.length > 0) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
            }
          } catch (retryError) {
            console.error('Erro ao tentar salvar novamente:', retryError);
          }
        }
      }
    }
  }, [proposals]);

  // Estado para transações (histórico)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (typeof window === 'undefined') return [];
    const STORAGE_KEY = 'magistral_transactions';
    try {
      let stored = localStorage.getItem(STORAGE_KEY);

      // Se não há dados principais, tentar restaurar do backup mais recente
      if (!stored || stored === '[]' || stored === 'null') {
        const keys = Object.keys(localStorage);
        const backupKeys = keys
          .filter(k => k.startsWith(`${STORAGE_KEY}_backup_`))
          .sort()
          .reverse(); // Mais recente primeiro

        if (backupKeys.length > 0) {
          const latestBackup = backupKeys[0];
          stored = localStorage.getItem(latestBackup);
          if (stored && stored !== '[]' && stored !== 'null') {
            localStorage.setItem(STORAGE_KEY, stored);
          }
        }
      }

      if (stored && stored !== '[]' && stored !== 'null') {
        const parsed = JSON.parse(stored);
        return parsed.map((t: any) => {
          try {
            return {
              ...t,
              createdAt: t.createdAt ? (t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)) : new Date(),
              completedAt: t.completedAt ? (t.completedAt instanceof Date ? t.completedAt : new Date(t.completedAt)) : new Date(),
            };
          } catch (dateError) {
            console.error('Erro ao converter datas da transação:', t.id, dateError);
            return {
              ...t,
              createdAt: new Date(),
              completedAt: new Date(),
            };
          }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      // Tentar fazer backup antes de perder dados
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const backupKey = `${STORAGE_KEY}_backup_${Date.now()}`;
          localStorage.setItem(backupKey, stored);
          console.warn(`Backup das transações criado em: ${backupKey}`);
        }
      } catch (backupError) {
        console.error('Erro ao criar backup das transações:', backupError);
      }
    }
    return [];
  });

  // Salvar transações no localStorage com proteção
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const STORAGE_KEY = 'magistral_transactions';
      safeSetItem(STORAGE_KEY, transactions);
    }
  }, [transactions]);

  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);
  const [offerToEdit, setOfferToEdit] = useState<Offer | null>(null);
  const [editSubstance, setEditSubstance] = useState('');
  const [editSubstanceSearch, setEditSubstanceSearch] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState<'g' | 'mL' | 'kg' | 'L'>('g');
  const [editPrice, setEditPrice] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editBuyQuantity, setEditBuyQuantity] = useState('');
  const [editBuyUnit, setEditBuyUnit] = useState<'g' | 'mL' | 'kg' | 'L'>('g');
  const [editBuyPrice, setEditBuyPrice] = useState('');
  const [duplicateOffer, setDuplicateOffer] = useState<{ offer: Offer; newQuantity: number } | null>(null);
  const [selectedSubstanceForOffer, setSelectedSubstanceForOffer] = useState<{ id: string; name: string } | null>(null);
  const [existingOfferDialog, setExistingOfferDialog] = useState<{
    open: boolean;
    substance: { id: string; name: string } | null;
    existingOffers: Offer[];
    fromUrl?: boolean;
  }>({ open: false, substance: null, existingOffers: [] });
  // Ao abrir por URL (Laudos → Vender): avisar se já tem anúncio ativo do mesmo produto
  useEffect(() => {
    if (!pendingSellUrlCheck || !user || !isDialogOpen) return;
    const substance = availableSubstances.find((s) => s.id === pendingSellUrlCheck.substanceId);
    if (!substance) {
      setPendingSellUrlCheck(null);
      return;
    }
    const existing = offers.filter((o) => {
      if (o.type !== 'sell') return false;
      if ((o as any).userId !== user.id) return false;
      if (o.status !== 'active') return false;
      const sid = (o as any).substanceId;
      return (sid && sid === substance.id) || o.substance.toLowerCase() === substance.name.toLowerCase();
    });
    setPendingSellUrlCheck(null);
    if (existing.length > 0) {
      setExistingOfferDialog({
        open: true,
        substance: { id: substance.id, name: substance.name },
        existingOffers: existing,
        fromUrl: true,
      });
    }
  }, [pendingSellUrlCheck, user, availableSubstances, offers, isDialogOpen]);
  const { toast } = useToast();

  // Histórico de transações (API): bem-sucedidas e mal-sucedidas
  const [historySuccessful, setHistorySuccessful] = useState<Transaction[]>([]);
  const [historyUnsuccessful, setHistoryUnsuccessful] = useState<UnsuccessfulTransactionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyDetailsOpen, setHistoryDetailsOpen] = useState(false);
  const [historyDetailsItem, setHistoryDetailsItem] = useState<
    | { kind: 'successful'; item: Transaction }
    | { kind: 'unsuccessful'; item: UnsuccessfulTransactionItem }
    | null
  >(null);

  // Última cotação (para alerta de sobrepreço)
  const [latestQuotations, setLatestQuotations] = useState<
    Record<string, { quotation: any; reference: any }>
  >({});
  const [latestQuotationsLoading, setLatestQuotationsLoading] = useState(false);
  const latestQuotationsKeyRef = useRef<string>('');
  const [isLatestQuotationDialogOpen, setIsLatestQuotationDialogOpen] = useState(false);
  const [selectedLatestQuotation, setSelectedLatestQuotation] = useState<{
    offerKind: 'sell' | 'buy';
    substanceName: string;
    offerPricePerUnit: number;
    offerUnit: string;
    quotation: any;
    reference: any;
  } | null>(null);
  useEffect(() => {
    if (!user) {
      setHistorySuccessful([]);
      setHistoryUnsuccessful([]);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    getTransactionHistory()
      .then(({ successful, unsuccessful }) => {
        if (cancelled) return;
        setHistorySuccessful(successful);
        setHistoryUnsuccessful(unsuccessful);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setHistoryError(err?.message ?? 'Erro ao carregar histórico.');
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Carregar últimas cotações das substâncias que aparecem nas ofertas (venda/compra)
  useEffect(() => {
    if (!user) return;
    const ids = new Set<string>();
    for (const o of offers as any[]) {
      const sid = o?.substanceId || (o as any)?.substanceId;
      if (typeof sid === 'string' && sid) ids.add(sid);
    }
    for (const o of (buyOffersState as any[]) ?? []) {
      const sid = o?.substanceId || (o as any)?.substanceId;
      if (typeof sid === 'string' && sid) ids.add(sid);
    }
    // Fallback por nome (ofertas antigas): tenta mapear para substanceId
    for (const o of offers as any[]) {
      if (o?.substanceId) continue;
      const name = typeof o?.substance === 'string' ? o.substance : '';
      if (!name) continue;
      const s = availableSubstances.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (s?.id) ids.add(s.id);
    }
    for (const o of (buyOffersState as any[]) ?? []) {
      if (o?.substanceId) continue;
      const name = typeof o?.substance === 'string' ? o.substance : '';
      if (!name) continue;
      const s = availableSubstances.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (s?.id) ids.add(s.id);
    }

    const key = Array.from(ids).sort().join(',');
    if (!key) return;
    if (latestQuotationsKeyRef.current === key) return;
    latestQuotationsKeyRef.current = key;

    let cancelled = false;
    setLatestQuotationsLoading(true);
    getLatestQuotationsBySubstanceIds(Array.from(ids))
      .then((m) => {
        if (cancelled) return;
        setLatestQuotations(m as any);
      })
      .catch(() => {
        if (cancelled) return;
        setLatestQuotations({});
      })
      .finally(() => {
        if (!cancelled) setLatestQuotationsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, offers, buyOffersState, availableSubstances]);

  // Verificar se rascunhos podem ser publicados (quando laudo for cadastrado)
  // Efeito para garantir que todas as ofertas tenham userIds corretos ao carregar
  useEffect(() => {
    if (typeof window === 'undefined' || offers.length === 0) return;

    // Corrigir ofertas de venda
    setOffers((prev) => {
      if (prev.length === 0) return prev;
      const corrected = fixOfferUserIds(prev, true);
      const hasChanges = corrected.some((o, i) => {
        const prevOffer = prev[i];
        return !prevOffer || o.userId !== prevOffer.userId;
      });
      if (hasChanges) {
        // Salvar no localStorage
        try {
          localStorage.setItem('magistral_marketplace_sell_offers', JSON.stringify(corrected));
        } catch (error) {
          console.error('Erro ao salvar ofertas corrigidas:', error);
        }
        return corrected;
      }
      return prev;
    });
  }, [offers.length]); // Executar quando ofertas forem carregadas

  useEffect(() => {
    if (typeof window === 'undefined' || buyOffersState.length === 0) return;

    // Corrigir ofertas de compra
    setBuyOffersState((prev) => {
      if (prev.length === 0) return prev;
      const corrected = fixOfferUserIds(prev, false);
      const hasChanges = corrected.some((o, i) => {
        const prevOffer = prev[i];
        return !prevOffer || o.userId !== prevOffer.userId;
      });
      if (hasChanges) {
        // Salvar no localStorage
        try {
          localStorage.setItem('magistral_marketplace_buy_offers', JSON.stringify(corrected));
        } catch (error) {
          console.error('Erro ao salvar ofertas corrigidas:', error);
        }
        return corrected;
      }
      return prev;
    });
  }, [buyOffersState.length]); // Executar quando ofertas de compra forem carregadas

  const migrationDoneForUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || migrationDoneForUserIdRef.current === user.id) return;
    const legacyIds = getLegacyIdsForUser(user.name, user.company);
    const legacyNames = getLegacyNamesForUser(user.name, user.company);
    migrationDoneForUserIdRef.current = user.id;
    if (legacyIds.length === 0 && legacyNames.length === 0) return;
    const idSet = new Set(legacyIds);
    const nameSet = new Set(legacyNames);
    let sellChanged = false;
    const updatedSell = offers.map((o: any) => {
      if (o.type !== 'sell') return o;
      const mine = nameSet.has(o.seller) || idSet.has(o.userId) || o.seller === user.name || o.seller === user.company;
      if (mine && o.userId !== user.id) {
        sellChanged = true;
        return { ...o, userId: user.id };
      }
      return o;
    });
    if (sellChanged) setOffers(updatedSell);
    let buyChanged = false;
    const updatedBuy = buyOffersState.map((o: any) => {
      if (o.type !== 'buy') return o;
      const mine = nameSet.has(o.buyer) || idSet.has(o.userId) || o.buyer === user.name || o.buyer === user.company;
      if (mine && o.userId !== user.id) {
        buyChanged = true;
        return { ...o, userId: user.id };
      }
      return o;
    });
    if (buyChanged) setBuyOffersState(updatedBuy);
    if (sellChanged || buyChanged) {
      toast({ title: 'Dados recuperados', description: 'Suas ofertas foram vinculadas ao seu usuário.' });
    }
  }, [user, offers, buyOffersState, toast]);

  const restoreOffersFromBackup = () => {
    if (typeof window === 'undefined') return;
    migrationDoneForUserIdRef.current = null;
    const parseDates = (o: any) => {
      try {
        return {
          ...o,
          createdAt: o.createdAt ? (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt)) : new Date(),
          expiryDate: o.expiryDate ? (o.expiryDate instanceof Date ? o.expiryDate : new Date(o.expiryDate)) : undefined,
          minExpiryDate: o.minExpiryDate ? (o.minExpiryDate instanceof Date ? o.minExpiryDate : new Date(o.minExpiryDate)) : undefined,
          updatedAt: o.updatedAt ? (o.updatedAt instanceof Date ? o.updatedAt : new Date(o.updatedAt)) : undefined,
        };
      } catch {
        return { ...o, createdAt: new Date(), expiryDate: undefined, minExpiryDate: undefined, updatedAt: undefined };
      }
    };
    let restored = false;
    const sellKey = 'magistral_marketplace_sell_offers';
    const sellRawKeys = Object.keys(localStorage).filter((k) => k.startsWith(`${sellKey}_backup_`));
    const sellBackups = sortBackupKeysNewestFirst(sellRawKeys);
    if (sellBackups.length > 0) {
      const raw = localStorage.getItem(sellBackups[0]);
      if (raw && raw !== '[]' && raw !== 'null') {
        try {
          const parsed = JSON.parse(raw).map(parseDates);
          const corrected = fixOfferUserIds(parsed, true);
          localStorage.setItem(sellKey, JSON.stringify(corrected));
          setOffers(corrected);
          restored = true;
        } catch (e) {
          console.error('Erro ao restaurar ofertas de venda:', e);
        }
      }
    }
    const buyKey = 'magistral_marketplace_buy_offers';
    const buyRawKeys = Object.keys(localStorage).filter((k) => k.startsWith(`${buyKey}_backup_`));
    const buyBackups = sortBackupKeysNewestFirst(buyRawKeys);
    if (buyBackups.length > 0) {
      const raw = localStorage.getItem(buyBackups[0]);
      if (raw && raw !== '[]' && raw !== 'null') {
        try {
          const parsed = JSON.parse(raw).map(parseDates);
          const corrected = fixOfferUserIds(parsed, false);
          localStorage.setItem(buyKey, JSON.stringify(corrected));
          setBuyOffersState(corrected);
          restored = true;
        } catch (e) {
          console.error('Erro ao restaurar ofertas de compra:', e);
        }
      }
    }
    if (restored) toast({ title: 'Backup restaurado', description: 'Ofertas restauradas do último backup. Migração será aplicada em seguida.' });
    else toast({ title: 'Nenhum backup', description: 'Não há backup de ofertas disponível.', variant: 'destructive' });
  };

  // Este efeito verifica periodicamente se rascunhos podem ser publicados
  useEffect(() => {
    if (!user) return;

    const checkDrafts = () => {
      setOffers((prev) => {
        const updated = [...prev];
        let hasChanges = false;

        // Verificar rascunhos de venda
        const draftSellOffersToCheck = updated.filter(
          (o) => o.status === 'draft' && o.type === 'sell' && o.userId === user.id
        );

        draftSellOffersToCheck.forEach((draft) => {
          const substanceId = (draft as any).substanceId;
          if (substanceId) {
            const validLaudos = getValidLaudos(user.id);
            const deadline = getMinValidityDeadline(minSellValidityDays);

            const hasLaudoWith30Days = validLaudos.some(laudo =>
              laudo.substanceId === substanceId &&
              laudo.expiryDate > deadline &&
              isApprovedSupplierForLaudo(laudo)
            );

            if (hasLaudoWith30Days) {
              const index = updated.findIndex((o) => o.id === draft.id);
              if (index !== -1 && updated[index].status === 'draft') {
                updated[index] = { ...updated[index], status: 'active' as const, hasPdf: true };
                hasChanges = true;

                toast({
                  title: 'Oferta publicada automaticamente',
                  description: `A oferta de ${draft.substance} foi publicada após validação do laudo.`,
                });
              }
            }
          }
        });

        return hasChanges ? updated : prev;
      });
    };

    // Verificar imediatamente
    checkDrafts();

    // Verificar a cada 5 segundos (para quando laudo for cadastrado)
    const interval = setInterval(checkDrafts, 5000);

    return () => clearInterval(interval);
  }, [user?.id, hasValidLaudo, minSellValidityDays]); // Quando usuário, validação, ou regra mudar

  // Preencher automaticamente os dados do laudo quando a substância é selecionada para venda
  useEffect(() => {
    if ((offerType === 'sell' || offerType === 'both') && selectedSubstanceForOffer && user && !offerToEdit) {
      // Buscar o laudo mais recente e válido dessa substância
      const userLaudos = getUserLaudos(user.id);
      const deadline = getMinValidityDeadline(minSellValidityDays);

      // Filtrar laudos válidos dessa substância com pelo menos X dias de validade
      const validLaudosForSubstance = userLaudos
        .filter(laudo =>
          laudo.substanceId === selectedSubstanceForOffer.id &&
          laudo.expiryDate > deadline &&
          laudo.pdfUrl &&
          !laudo.pdfUrl.startsWith('blob:')
        )
        .sort((a, b) => b.expiryDate.getTime() - a.expiryDate.getTime()); // Mais recente primeiro

      if (validLaudosForSubstance.length > 0) {
        const laudo = validLaudosForSubstance[0]; // Pegar o mais recente

        // Preencher data de validade automaticamente
        if (laudo.expiryDate) {
          const expiryDateStr = laudo.expiryDate.toISOString().split('T')[0];
          setEditExpiryDate(expiryDateStr);
        }
      }
    }
  }, [selectedSubstanceForOffer, offerType, user, getUserLaudos, offerToEdit, minSellValidityDays]);

  // Normalizar texto para busca
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Buscar substâncias
  const searchSubstancesForOffer = (query: string) => {
    if (!user) return [];

    let filtered: typeof availableSubstances = [];

    // Se for oferta de VENDA ou DUPLA (comprar e vender), filtrar apenas substâncias com laudo válido (X+ dias)
    if (offerType === 'sell' || offerType === 'both') {
      // Obter laudos válidos do usuário com pelo menos X dias de validade
      const validLaudos = getValidLaudos(user.id);
      const deadline = getMinValidityDeadline(minSellValidityDays);

      // Filtrar apenas laudos com X+ dias de validade e fornecedor aprovado
      const laudosWith30Days = validLaudos.filter(laudo => {
        return laudo.expiryDate > deadline && isApprovedSupplierForLaudo(laudo);
      });

      // Obter IDs das substâncias que o usuário tem com laudo válido (X+ dias)
      const validSubstanceIds = new Set(laudosWith30Days.map(laudo => laudo.substanceId));

      // Filtrar substâncias disponíveis: apenas as que o usuário tem com laudo válido
      filtered = availableSubstances.filter((substance) => {
        return validSubstanceIds.has(substance.id);
      });
    } else {
      // Se for oferta de COMPRA, mostrar todas as substâncias disponíveis
      filtered = availableSubstances;
    }

    // Se há query, aplicar filtro de busca
    if (query.trim()) {
      const normalizedQuery = normalizeText(query);
      filtered = filtered.filter((substance) => {
        const normalizedName = normalizeText(substance.name);
        if (normalizedName.includes(normalizedQuery)) return true;
        if (substance.synonyms) {
          return substance.synonyms.some((synonym) =>
            normalizeText(synonym).includes(normalizedQuery)
          );
        }
        return false;
      });
    }

    return filtered.slice(0, 10);
  };

  const filteredSubstancesForOffer = searchSubstancesForOffer(editSubstanceSearch);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOfferExpired = (offer: Offer): boolean => {
    const expiration = getExpirationDate(offer);
    return new Date() > expiration;
  };

  // Calcular distância de Levenshtein simplificada (para busca fuzzy)
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    // Inicializa a primeira linha e coluna
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    // Preenche a matriz
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // Substituição
            matrix[i][j - 1] + 1, // Inserção
            matrix[i - 1][j] + 1 // Deleção
          );
        }
      }
    }

    return matrix[len2][len1];
  };

  // Verificar se a busca corresponde à substância (com tolerância a erros)
  const matchesSearch = (substance: string, query: string): boolean => {
    if (!query.trim()) return true;

    const normalizedQuery = normalizeText(query);
    const normalizedSubstance = normalizeText(substance);

    // 1. Busca exata normalizada (ignora acentos)
    if (normalizedSubstance.includes(normalizedQuery)) {
      return true;
    }

    // 2. Busca por palavras individuais
    const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length >= 2);
    if (queryWords.length > 0) {
      const allWordsMatch = queryWords.every((word) =>
        normalizedSubstance.includes(word)
      );
      if (allWordsMatch) return true;
    }

    // 3. Busca fuzzy - verifica se há correspondência aproximada
    // Para cada palavra da query, verifica similaridade com palavras da substância
    const substanceWords = normalizedSubstance.split(/\s+/);
    const queryWordsForFuzzy = normalizedQuery.split(/\s+/).filter((w) => w.length >= 3);

    if (queryWordsForFuzzy.length > 0) {
      for (const queryWord of queryWordsForFuzzy) {
        for (const substanceWord of substanceWords) {
          if (substanceWord.length >= 3) {
            // Calcula distância de Levenshtein
            const distance = levenshteinDistance(queryWord, substanceWord);
            const maxLen = Math.max(queryWord.length, substanceWord.length);
            const similarity = 1 - distance / maxLen;

            // Se a similaridade for maior que 70%, considera uma correspondência
            if (similarity > 0.7) {
              return true;
            }

            // Também verifica se uma palavra contém a outra (com tolerância)
            if (
              (queryWord.length >= 4 && substanceWord.includes(queryWord.substring(0, Math.max(3, queryWord.length - 1)))) ||
              (substanceWord.length >= 4 && queryWord.includes(substanceWord.substring(0, Math.max(3, substanceWord.length - 1))))
            ) {
              return true;
            }
          }
        }
      }
    }

    // 4. Busca por substring com tolerância (para casos como "colaageno" -> "colageno")
    if (normalizedQuery.length >= 4) {
      // Remove caracteres duplicados e verifica novamente
      const removeDuplicates = (str: string) => str.replace(/(.)\1+/g, '$1');
      const queryNoDupes = removeDuplicates(normalizedQuery);
      const substanceNoDupes = removeDuplicates(normalizedSubstance);

      if (substanceNoDupes.includes(queryNoDupes) || queryNoDupes.includes(substanceNoDupes.substring(0, queryNoDupes.length))) {
        return true;
      }
    }

    return false;
  };

  // Marcar ofertas como expiradas após 7 dias (apenas se realmente expiradas)
  useEffect(() => {
    const now = new Date();
    setOffers((prev) =>
      prev.map((offer) => {
        const offerUserId = (offer as any).userId; // Preservar userId
        // Não atualizar ofertas pausadas ou que já foram marcadas como expiradas manualmente
        // ou que foram prorrogadas recentemente
        if (offer.status === 'paused') {
          return { ...offer, userId: offerUserId }; // Manter pausada
        }
        if (offer.status === 'active') {
          const expirationDate = getExpirationDate(offer);
          if (now > expirationDate) {
            return { ...offer, status: 'expired' as const, userId: offerUserId };
          }
        }
        // Se a oferta está expirada mas a data de expiração ainda não passou, reativar
        if (offer.status === 'expired') {
          const expirationDate = getExpirationDate(offer);
          if (now <= expirationDate) {
            return { ...offer, status: 'active' as const, userId: offerUserId };
          }
        }
        return { ...offer, userId: offerUserId }; // Garantir que userId esteja presente
      })
    );
    setBuyOffersState((prev) =>
      prev.map((offer) => {
        const offerUserId = (offer as any).userId; // Preservar userId
        if (offer.status === 'active') {
          const expirationDate = getExpirationDate(offer);
          if (now > expirationDate) {
            return { ...offer, status: 'expired' as const, userId: offerUserId };
          }
        }
        // Se a oferta está expirada mas a data de expiração ainda não passou, reativar
        if (offer.status === 'expired') {
          const expirationDate = getExpirationDate(offer);
          if (now <= expirationDate) {
            return { ...offer, status: 'active' as const, userId: offerUserId };
          }
        }
        return { ...offer, userId: offerUserId }; // Garantir que userId esteja presente
      })
    );
  }, []);

  // Filtrar apenas ofertas ativas (não rascunhos, não expiradas)
  // Ofertas ativas (venda/compra). Não atribuir userId por nome — apenas migration legada faz isso.
  const canViewControlledOffer = (offer: any) => {
    // Preferência: ocultar ofertas controladas quando não há licença válida
    const s = availableSubstances.find((x) => x.name === offer.substance);
    if (!s) return true;
    if (!myEligibility) return true; // fallback: não esconder antes de carregar
    if (s.requiresAe && myEligibility.ae?.status !== 'valid') return false;
    if (s.requiresPf && myEligibility.pf?.status !== 'valid') return false;
    return true;
  };

  const activeSellOffers = offers.filter(
    (offer) =>
      offer.status === 'active' &&
      offer.type === 'sell' &&
      canViewControlledOffer(offer)
  );
  const activeBuyOffers = buyOffersState.filter(
    (offer) =>
      offer.status === 'active' &&
      offer.type === 'buy' &&
      canViewControlledOffer(offer)
  );

  // Função para verificar se uma oferta pertence ao usuário logado
  const isMyOffer = (offer: any): boolean => {
    if (!user) return false;
    // 1. Verificar por ID (prioridade - dados já migrados)
    // Garantir comparação como string para evitar problemas de tipo (ex: '4' vs 4)
    if (String(offer.userId) === String(user.id)) return true;

    // 2. Fallback por nome/empresa (para dados legados ainda não migrados no estado)
    const legacyNames = getLegacyNamesForUser(user.name, user.company);
    const nameSet = new Set([...(legacyNames || []), user.name, user.company].filter(Boolean).map(n => n.toLowerCase()));
    const name = (offer.type === 'sell' ? offer.seller : offer.buyer)?.toLowerCase();

    const matchedByName = !!name && nameSet.has(name);
    if (matchedByName) return true;

    // 3. Verificar por role 'master' (admin vê tudo)
    // if (hasRole(['master'])) return true; 

    return false;
  };

  // Filtrar ofertas do usuário atual (ativas)
  const myActiveSellOffers = offers.filter(
    (offer) => offer.status === 'active' && isMyOffer(offer)
  );
  const myActiveBuyOffers = buyOffersState.filter(
    (offer) => offer.status === 'active' && isMyOffer(offer)
  );

  // Filtrar ofertas expiradas do usuário atual
  const expiredSellOffers = offers.filter(
    (offer) => offer.status === 'expired' && isMyOffer(offer)
  );
  const expiredBuyOffers = buyOffersState.filter(
    (offer) => offer.status === 'expired' && isMyOffer(offer)
  );

  // Filtrar ofertas pausadas do usuário atual
  const pausedSellOffers = offers.filter(
    (offer) => offer.status === 'paused' && isMyOffer(offer)
  );
  const pausedBuyOffers = buyOffersState.filter(
    (offer) => offer.status === 'paused' && isMyOffer(offer)
  );

  // Filtrar todas as ofertas expiradas (de todos os autores)
  const allExpiredSellOffers = offers.filter((offer) => offer.status === 'expired');
  const allExpiredBuyOffers = buyOffersState.filter((offer) => offer.status === 'expired');

  // Filtrar rascunhos do usuário atual
  const draftSellOffers = offers.filter(
    (offer) => offer.status === 'draft' && isMyOffer(offer)
  );
  const draftBuyOffers = buyOffersState.filter(
    (offer) => offer.status === 'draft' && isMyOffer(offer)
  );

  // Função para aplicar filtros
  const applyFilters = (offerList: Offer[]) => {
    return offerList.filter((offer) => {
      // Filtro por vendedor/comprador
      if (filterSeller) {
        const sellerOrBuyer = offer.type === 'sell'
          ? (offer as typeof sellOffers[0]).seller
          : (offer as typeof buyOffers[0]).buyer;
        if (!sellerOrBuyer.toLowerCase().includes(filterSeller.toLowerCase())) {
          return false;
        }
      }

      // Filtro por quantidade mínima
      if (filterMinQuantity) {
        const minQty = parseInt(filterMinQuantity);
        if (offer.quantity < minQty) {
          return false;
        }
      }

      // Filtro por quantidade máxima
      if (filterMaxQuantity) {
        const maxQty = parseInt(filterMaxQuantity);
        if (offer.quantity > maxQty) {
          return false;
        }
      }

      // Filtro por preço mínimo
      if (filterMinPrice) {
        const minPrice = parseFloat(filterMinPrice);
        const offerPrice = offer.type === 'sell'
          ? (offer as typeof sellOffers[0]).pricePerUnit
          : (offer as typeof buyOffers[0]).maxPrice!;
        if (offerPrice < minPrice) {
          return false;
        }
      }

      // Filtro por preço máximo
      if (filterMaxPrice) {
        const maxPrice = parseFloat(filterMaxPrice);
        const offerPrice = offer.type === 'sell'
          ? (offer as typeof sellOffers[0]).pricePerUnit
          : (offer as typeof buyOffers[0]).maxPrice!;
        if (offerPrice > maxPrice) {
          return false;
        }
      }

      return true;
    });
  };

  // Filtrar ofertas baseado na busca com tolerância a erros (apenas ativas)
  const filteredSellOffers = applyFilters(
    activeSellOffers.filter((offer) => matchesSearch(offer.substance, searchQuery))
  ).sort((a, b) => {
    const expA = getExpirationDate(a).getTime();
    const expB = getExpirationDate(b).getTime();
    return expA - expB; // Ordem crescente de prazo
  });

  const filteredBuyOffers = applyFilters(
    activeBuyOffers.filter((offer) => matchesSearch(offer.substance, searchQuery))
  ).sort((a, b) => {
    const expA = getExpirationDate(a).getTime();
    const expB = getExpirationDate(b).getTime();
    return expA - expB; // Ordem crescente de prazo
  });

  // Ordenar ofertas expiradas (por data de criação, mais recentes primeiro)
  const sortedExpiredSellOffers = [...expiredSellOffers].sort((a, b) =>
    getCreatedAtDate(b).getTime() - getCreatedAtDate(a).getTime()
  );
  const sortedExpiredBuyOffers = [...expiredBuyOffers].sort((a, b) =>
    getCreatedAtDate(b).getTime() - getCreatedAtDate(a).getTime()
  );

  // Verificar se o usuário pode editar/remover a oferta
  const canEditOffer = (offer: Offer): boolean => {
    if (!user) return false;
    const canModerate = hasRole(['master']) || myPermissions.includes('marketplace_moderate_offers');
    // Moderadores (e master) podem editar/remover qualquer oferta
    if (canModerate) return true;
    // Apenas cooperados podem editar suas próprias ofertas
    if (!hasRole(['cooperado'])) return false;
    const offerUserId = (offer as any).userId;
    // Exigir userId explícito e igual ao usuário logado — nunca inferir por seller/buyer
    if (!offerUserId || typeof offerUserId !== 'string') return false;
    return offerUserId === user.id;
  };

  // Verificar se o usuário pode criar ofertas
  const canCreateOffer = (): boolean => {
    if (!user) return false;
    // Apenas cooperados podem criar ofertas (compra ou venda)
    return hasRole(['cooperado']);
  };

  // Verificar se pode criar oferta de VENDA especificamente
  const canCreateSellOffer = (): boolean => {
    if (!user) return false;
    if (!hasRole(['cooperado'])) return false;

    // Verificar se o usuário tem pelo menos um produto cadastrado com laudo válido (X+ dias) e fornecedor aprovado
    const validLaudos = getValidLaudos(user.id);
    const deadline = getMinValidityDeadline(minSellValidityDays);

    const hasValidLaudoWith30Days = validLaudos.some(laudo => {
      return laudo.expiryDate > deadline && isApprovedSupplierForLaudo(laudo);
    });

    return hasValidLaudoWith30Days;
  };

  // Verificar se o usuário pode fazer propostas
  const canMakeProposal = (): boolean => {
    if (!user) return false;
    // Master não pode fazer propostas, apenas cooperados
    if (hasRole(['master'])) return false;
    return hasRole(['cooperado']);
  };

  // Prorrogar oferta expirada por mais 7 dias
  const handleExtendOffer = (offer: Offer) => {
    const newCreatedAt = new Date(); // Data atual
    const offerUserId = (offer as any).userId; // Preservar userId

    if (offer.type === 'sell') {
      setOffers((prev) =>
        prev.map((o) =>
          o.id === offer.id
            ? { ...o, createdAt: newCreatedAt, status: 'active' as const, userId: offerUserId || (o as any).userId }
            : o
        )
      );
      toast({
        title: 'Oferta prorrogada',
        description: 'A oferta foi prorrogada por mais 7 dias e está ativa novamente.',
      });
    } else {
      setBuyOffersState((prev) =>
        prev.map((o) =>
          o.id === offer.id
            ? { ...o, createdAt: newCreatedAt, status: 'active' as const, userId: offerUserId || (o as any).userId }
            : o
        )
      );
      toast({
        title: 'Oferta prorrogada',
        description: 'A oferta foi prorrogada por mais 7 dias e está ativa novamente.',
      });
    }
  };

  // Remover oferta
  const handleDeleteOffer = async (offer: Offer) => {
    try {
      await deleteOffer(offer.id);
      toast({
        title: 'Oferta removida',
        description: `A oferta de ${offer.type === 'sell' ? 'venda' : 'compra'} foi removida com sucesso.`,
      });
      setOfferToDelete(null);
      await loadOffers();
    } catch (err) {
      console.error('❌ [Marketplace] Erro ao remover oferta:', err);
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover a oferta do banco de dados.',
        variant: 'destructive',
      });
    }
  };

  // Pausar oferta
  const handlePauseOffer = async (offer: Offer) => {
    try {
      await updateOffer(offer.id, { status: 'paused' });
      toast({
        title: 'Oferta pausada',
        description: 'A oferta foi pausada e não aparecerá mais nas ofertas ativas.',
      });
      await loadOffers();
    } catch (err) {
      console.error('❌ [Marketplace] Erro ao pausar oferta:', err);
      toast({
        title: 'Erro ao pausar',
        description: 'Não foi possível pausar a oferta no banco de dados.',
        variant: 'destructive',
      });
    }
  };

  // Editar oferta (abrir dialog de edição)
  const handleEditOffer = (offer: Offer) => {
    setOfferToEdit(offer);
    setOfferType(offer.type);

    // Preencher campos com dados da oferta - com fallbacks seguros
    setEditSubstance(offer.substance || '');
    setEditSubstanceSearch(offer.substance || '');
    const substance = availableSubstances.find((s) => s.name === offer.substance);
    if (substance) {
      setSelectedSubstanceForOffer({ id: substance.id, name: substance.name });
    }
    setEditQuantity(String(offer.quantity ?? ''));
    setEditUnit((offer.unit as any) || 'g');

    if (offer.type === 'sell') {
      const sellOffer = offer as MarketplaceOffer;
      setEditPrice(String(sellOffer.pricePerUnit ?? ''));
      setEditExpiryDate(
        sellOffer.expiryDate instanceof Date
          ? sellOffer.expiryDate.toISOString().split('T')[0]
          : typeof sellOffer.expiryDate === 'string' && sellOffer.expiryDate.includes('T')
            ? sellOffer.expiryDate.split('T')[0]
            : String(sellOffer.expiryDate || '')
      );
      setIsAuction(sellOffer.isAuction || false);
      setStartingPrice(String(sellOffer.startingPrice || ''));
      if (sellOffer.auctionEnd) {
        const durationMs = new Date(sellOffer.auctionEnd).getTime() - getCreatedAtDate(sellOffer).getTime();
        setAuctionDurationDays(String(Math.ceil(durationMs / (1000 * 60 * 60 * 24))));
      }
    } else {
      const buyOffer = offer as MarketplaceOffer;
      setEditPrice(String(buyOffer.maxPrice ?? ''));
      setMinValidityMonths(String(buyOffer.minValidityMonths ?? 6));
    }

    setIsDialogOpen(true);
  };

  // Verificar se o preço tem salto mínimo de 5% em relação às ofertas existentes
  const hasMinimumPriceJump = (substance: string, price: number, type: 'sell' | 'buy'): boolean => {
    const existingOffers = type === 'sell' ? offers : buyOffersState;
    const userOffers = existingOffers.filter((o) =>
      o.substance.toLowerCase() === substance.toLowerCase() &&
      (o as any).userId === user?.id
    );

    if (userOffers.length === 0) return true; // Primeira oferta, sempre permitida

    // Verificar se há diferença mínima de 5% em relação a qualquer oferta existente
    for (const offer of userOffers) {
      const existingPrice = type === 'sell'
        ? (offer as typeof sellOffers[0]).pricePerUnit
        : (offer as typeof buyOffers[0]).maxPrice!;

      const priceDiff = Math.abs(price - existingPrice);
      const minJump = existingPrice * 0.05; // 5% do preço existente

      if (priceDiff < minJump) {
        return false;
      }
    }

    return true;
  };

  // Verificar se existe oferta duplicada (mesma substância e preço similar dentro de 5%)
  const findDuplicateOffer = (substance: string, price: number, type: 'sell' | 'buy'): Offer | null => {
    const existingOffers = type === 'sell' ? offers : buyOffersState;

    return existingOffers.find((o) => {
      if ((o as any).userId !== user?.id) return false; // Apenas ofertas do próprio usuário
      if (o.substance.toLowerCase() !== substance.toLowerCase()) return false;
      if (o.type !== type) return false;

      const existingPrice = type === 'sell'
        ? (o as typeof sellOffers[0]).pricePerUnit
        : (o as typeof buyOffers[0]).maxPrice!;

      // Verificar se o preço está dentro de 5% (considera duplicado)
      const priceDiff = Math.abs(price - existingPrice);
      const tolerance = existingPrice * 0.05; // 5% de tolerância

      return priceDiff <= tolerance;
    }) || null;
  };

  // Ofertas de venda ativas do usuário para uma substância (para aviso "já tem anúncio")
  const getActiveSellOffersForSubstance = (substanceId: string, substanceName: string): Offer[] => {
    return offers.filter((o) => {
      if (o.type !== 'sell') return false;
      if ((o as any).userId !== user?.id) return false;
      if (o.status !== 'active') return false;
      const sid = (o as any).substanceId;
      const matchById = sid && sid === substanceId;
      const matchByName = o.substance.toLowerCase() === substanceName.toLowerCase();
      return matchById || matchByName;
    });
  };

  // Ao selecionar substância para venda: avisar se já tem anúncio ativo (editar ou criar mais um)
  const checkExistingOfferAndSelect = (substance: { id: string; name: string }) => {
    if ((offerType !== 'sell' && offerType !== 'both') || offerToEdit) {
      setSelectedSubstanceForOffer(substance);
      setEditSubstance(substance.name);
      setEditSubstanceSearch(substance.name);
      return;
    }
    const existing = getActiveSellOffersForSubstance(substance.id, substance.name);
    if (existing.length === 0) {
      setSelectedSubstanceForOffer(substance);
      setEditSubstance(substance.name);
      setEditSubstanceSearch(substance.name);
      return;
    }
    setExistingOfferDialog({
      open: true,
      substance: { id: substance.id, name: substance.name },
      existingOffers: existing,
      fromUrl: false,
    });
  };

  // Salvar oferta (criar ou editar)
  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (offerToEdit) {
        // Se estiver editando um rascunho, verificar se agora tem laudo válido com X+ dias
        if (offerToEdit.status === 'draft' && offerType === 'sell' && selectedSubstanceForOffer && user) {
          const validLaudos = getValidLaudos(user.id);
          const deadline = getMinValidityDeadline(minSellValidityDays);

          const hasLaudoWith30Days = validLaudos.some(laudo =>
            laudo.substanceId === selectedSubstanceForOffer.id &&
            laudo.expiryDate > deadline
          );

          if (hasLaudoWith30Days) {
            // Atualizar status para active
            await updateOffer(offerToEdit.id, {
              substanceName: editSubstance,
              quantity: parseInt(editQuantity),
              pricePerUnit: parseFloat(editPrice),
              expiryDate: editExpiryDate,
              status: 'active',
              isAuction: isAuction,
              startingPrice: isAuction ? parseFloat(startingPrice) : undefined,
              auctionEnd: isAuction ? new Date(Date.now() + parseInt(auctionDurationDays) * 24 * 60 * 60 * 1000).toISOString() : undefined,
            });

            toast({
              title: 'Oferta publicada',
              description: 'A oferta foi publicada com sucesso após validação do laudo.',
            });

            setOfferToEdit(null);
            setEditSubstance('');
            setEditSubstanceSearch('');
            setSelectedSubstanceForOffer(null);
            setEditQuantity('');
            setEditPrice('');
            setEditExpiryDate('');
            setIsAuction(false);
            setStartingPrice('');
            setAuctionDurationDays('10');
            setIsDialogOpen(false);
            await loadOffers();
            return;
          }
        }
        // Editar oferta existente
        const updateData: any = {
          quantity: parseInt(editQuantity),
          pricePerUnit: parseFloat(editPrice),
          expiryDate: editExpiryDate,
          isAuction: isAuction,
          startingPrice: isAuction ? parseFloat(startingPrice) : undefined,
          auctionEnd: isAuction ? new Date(Date.now() + parseInt(auctionDurationDays) * 24 * 60 * 60 * 1000).toISOString() : undefined,
        };

        if (offerType === 'buy') {
          updateData.maxPrice = parseFloat(editPrice);
        }

        await updateOffer(offerToEdit.id, updateData);

        toast({
          title: 'Oferta atualizada',
          description: `A oferta de ${offerType === 'sell' ? 'venda' : 'compra'} foi atualizada com sucesso.`,
        });

        setOfferToEdit(null);
        setIsAuction(false);
        setStartingPrice('');
        setAuctionDurationDays('10');
        setIsDialogOpen(false);
        await loadOffers();
      } else {
        // Criar nova oferta - verificar validações
        if (!user) {
          toast({
            title: 'Erro',
            description: 'Você precisa estar logado para criar ofertas.',
            variant: 'destructive',
          });
          return;
        }

        // --- Oferta dupla (comprar e vender ao mesmo tempo) ---
        if (offerType === 'both') {
          if (!selectedSubstanceForOffer) {
            toast({ title: 'Erro', description: 'Selecione uma matéria-prima da lista.', variant: 'destructive' });
            return;
          }
          const sellQty = parseInt(editQuantity);
          const sellPrice = parseFloat(editPrice);
          const buyQty = parseInt(editBuyQuantity);
          const buyPrice = parseFloat(editBuyPrice);

          if (isNaN(sellQty) || sellQty <= 0 || isNaN(sellPrice) || sellPrice <= 0) {
            toast({ title: 'Erro', description: 'Preencha quantidade e preço da oferta de venda.', variant: 'destructive' });
            return;
          }
          if (isNaN(buyQty) || buyQty <= 0 || isNaN(buyPrice) || buyPrice <= 0) {
            toast({ title: 'Erro', description: 'Preencha quantidade e preço da oferta de compra.', variant: 'destructive' });
            return;
          }

          const validLaudos = getValidLaudos(user!.id);
          const deadline = getMinValidityDeadline(minSellValidityDays);
          const hasValidLaudo = validLaudos.some(
            (l) => l.substanceId === selectedSubstanceForOffer.id && l.expiryDate > deadline
          );

          if (!hasValidLaudo) {
            toast({
              title: 'Laudo necessário',
              description: `Para oferta dupla é preciso ter laudo válido (${minSellValidityDays}+ dias) da matéria-prima. Cadastre na página Laudos.`,
              variant: 'destructive',
            });
            return;
          }

          // Criar oferta de venda
          await createOffer({
            type: 'sell',
            substanceId: selectedSubstanceForOffer.id,
            substanceName: selectedSubstanceForOffer.name,
            quantity: sellQty,
            unit: editUnit,
            pricePerUnit: sellPrice,
            expiryDate: editExpiryDate,
            isAuction: isAuction,
            startingPrice: isAuction ? parseFloat(startingPrice) : undefined,
            auctionEnd: isAuction ? new Date(Date.now() + parseInt(auctionDurationDays) * 24 * 60 * 60 * 1000).toISOString() : undefined,
            status: 'active',
          });

          // Criar oferta de compra
          await createOffer({
            type: 'buy',
            substanceId: selectedSubstanceForOffer.id,
            substanceName: selectedSubstanceForOffer.name,
            quantity: buyQty,
            unit: editBuyUnit,
            maxPrice: buyPrice,
            status: 'active',
          });

          toast({
            title: 'Ofertas criadas',
            description: 'As ofertas de compra e venda foram publicadas simultaneamente.',
          });
        }
        // --- Oferta de Venda ---
        else if (offerType === 'sell') {
          if (!selectedSubstanceForOffer) {
            toast({ title: 'Erro', description: 'Selecione uma matéria-prima da lista.', variant: 'destructive' });
            return;
          }
          const qty = parseInt(editQuantity);
          const price = parseFloat(editPrice);
          if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
            toast({ title: 'Erro', description: 'Preencha quantidade e preço corretamente.', variant: 'destructive' });
            return;
          }

          const validLaudos = getValidLaudos(user!.id);
          const deadline = getMinValidityDeadline(minSellValidityDays);
          const laudoRelacionado = validLaudos.find(
            (l) => l.substanceId === selectedSubstanceForOffer.id && l.expiryDate > deadline
          );

          if (!laudoRelacionado) {
            // Se não tem laudo válido, salvar como rascunho
            await createOffer({
              type: 'sell',
              substanceId: selectedSubstanceForOffer.id,
              substanceName: selectedSubstanceForOffer.name,
              quantity: qty,
              unit: editUnit,
              pricePerUnit: price,
              expiryDate: editExpiryDate,
              status: 'draft',
            });

            toast({
              title: 'Salvo como rascunho',
              description: `Como você não possui um laudo válido com mais de ${minSellValidityDays} dias, a oferta foi salva como rascunho.`,
            });
          } else {
            await createOffer({
              type: 'sell',
              substanceId: selectedSubstanceForOffer.id,
              substanceName: selectedSubstanceForOffer.name,
              rawMaterialId: laudoRelacionado.id,
              quantity: qty,
              unit: editUnit,
              pricePerUnit: price,
              expiryDate: editExpiryDate,
              status: 'active',
            });

            toast({
              title: 'Oferta publicada',
              description: 'Sua oferta de venda foi publicada com sucesso.',
            });
          }
        }
        // --- Oferta de Compra ---
        else {
          if (!selectedSubstanceForOffer) {
            toast({ title: 'Erro', description: 'Selecione uma matéria-prima da lista.', variant: 'destructive' });
            return;
          }
          const qty = parseInt(editQuantity);
          const price = parseFloat(editPrice);
          if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
            toast({ title: 'Erro', description: 'Preencha quantidade e preço corretamente.', variant: 'destructive' });
            return;
          }

          await createOffer({
            type: 'buy',
            substanceId: selectedSubstanceForOffer.id,
            substanceName: selectedSubstanceForOffer.name,
            quantity: qty,
            unit: editUnit,
            maxPrice: price,
            status: 'active',
          });

          toast({
            title: 'Oferta publicada',
            description: 'Sua oferta de compra foi publicada com sucesso.',
          });
        }

        // Limpar campos
        setEditSubstance('');
        setEditSubstanceSearch('');
        setSelectedSubstanceForOffer(null);
        setEditQuantity('');
        setEditPrice('');
        setEditExpiryDate('');
        setIsDialogOpen(false);
        await loadOffers();
      }
    } catch (err) {
      console.error('❌ [Marketplace] Erro ao salvar oferta:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a oferta no banco de dados.',
        variant: 'destructive',
      });
    }
  };

  // Confirmar aumento de quantidade em oferta duplicada
  const handleConfirmDuplicateOffer = () => {
    if (!duplicateOffer) return;

    const { offer, newQuantity } = duplicateOffer;
    const totalQuantity = offer.quantity + newQuantity;

    if (offer.type === 'sell') {
      setOffers((prev) =>
        prev.map((o) =>
          o.id === offer.id ? { ...o, quantity: totalQuantity } : o
        )
      );
    } else {
      setBuyOffersState((prev) =>
        prev.map((o) =>
          o.id === offer.id ? { ...o, quantity: totalQuantity } : o
        )
      );
    }

    toast({
      title: 'Quantidade atualizada',
      description: `A quantidade da oferta foi aumentada para ${totalQuantity.toLocaleString()} ${offer.unit}.`,
    });

    // Limpar campos e fechar dialogs
    setDuplicateOffer(null);
    setEditSubstance('');
    setEditQuantity('');
    setEditPrice('');
    setEditExpiryDate('');
    setIsDialogOpen(false);
  };

  // Abrir dialog de proposta
  const handleOpenProposal = (offer: Offer) => {
    // Verificar se o usuário pode fazer propostas
    if (!canMakeProposal()) {
      toast({
        title: 'Acesso restrito',
        description: 'Apenas cooperados podem fazer propostas.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se a oferta está expirada
    if (isOfferExpired(offer)) {
      toast({
        title: 'Oferta expirada',
        description: 'Esta oferta expirou e não aceita mais propostas.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedOffer(offer);
    const maxQuantity = offer.quantity;
    setProposalQuantity([Math.min(100, maxQuantity)]);
    setProposalQuantityInput(Math.min(100, maxQuantity).toString());
    setProposalProductExpiry('');
    setIsAgreement(false);
    setAgreementCashAmount('');
    setAgreementSubstanceSearch('');
    setSelectedAgreementSubstance(null);
    setAgreementQuantity('');
    setAgreementUnit('g');
    setSelectedAgreementLaudo(null);
    setIsProposalDialogOpen(true);
  };

  // Atualizar quantidade via slider
  const handleSliderChange = (value: number[]) => {
    setProposalQuantity(value);
    setProposalQuantityInput(value[0].toString());
  };

  // Atualizar quantidade via input
  const handleInputChange = (value: string) => {
    setProposalQuantityInput(value);
    const numValue = parseInt(value) || 0;
    if (selectedOffer) {
      const maxQuantity = selectedOffer.quantity;
      const clampedValue = Math.min(Math.max(0, numValue), maxQuantity);
      setProposalQuantity([clampedValue]);
      if (clampedValue !== numValue) {
        setProposalQuantityInput(clampedValue.toString());
      }
    }
  };

  // Enviar proposta
  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOffer) return;

    const quantity = proposalQuantity[0];
    if (quantity <= 0) {
      toast({
        title: 'Erro',
        description: 'A quantidade deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    if (quantity > selectedOffer.quantity) {
      toast({
        title: 'Erro',
        description: `A quantidade não pode ser maior que ${selectedOffer.quantity.toLocaleString()} ${selectedOffer.unit}.`,
        variant: 'destructive',
      });
      return;
    }

    // Validação de validade mínima para ofertas de compra
    if (selectedOffer.type === 'buy') {
      const buyOffer = selectedOffer as typeof buyOffers[0];
      if (!proposalProductExpiry) {
        toast({
          title: 'Erro',
          description: 'É necessário informar a data de validade do produto que você está oferecendo.',
          variant: 'destructive',
        });
        return;
      }

      const expiryDate = new Date(proposalProductExpiry);
      const today = new Date();
      const monthsUntilExpiry = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (monthsUntilExpiry < buyOffer.minValidityMonths) {
        toast({
          title: 'Erro',
          description: `O produto oferecido precisa ter pelo menos ${buyOffer.minValidityMonths} ${buyOffer.minValidityMonths === 1 ? 'mês' : 'meses'} de validade. O produto informado tem aproximadamente ${Math.floor(monthsUntilExpiry)} ${Math.floor(monthsUntilExpiry) === 1 ? 'mês' : 'meses'} de validade.`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Determinar tipo de ação e mensagem
    const isSellOffer = selectedOffer.type === 'sell';
    const actionType = isSellOffer ? 'compra' : 'venda';

    // Type guard para acessar propriedades específicas
    let offerOwner: string;
    let pricePerUnit: number;

    if (isSellOffer) {
      const sellOffer = selectedOffer as typeof sellOffers[0];
      offerOwner = sellOffer.seller;
      pricePerUnit = sellOffer.pricePerUnit;
    } else {
      const buyOffer = selectedOffer as typeof buyOffers[0];
      offerOwner = buyOffer.buyer;
      pricePerUnit = buyOffer.maxPrice;
    }

    // Validação de acordo (apenas para ofertas de venda)
    if (isSellOffer && isAgreement) {
      if (!agreementCashAmount || parseFloat(agreementCashAmount) <= 0) {
        toast({
          title: 'Erro',
          description: 'O valor em dinheiro do acordo deve ser maior que zero.',
          variant: 'destructive',
        });
        return;
      }

      if (!selectedAgreementSubstance || !selectedAgreementLaudo) {
        toast({
          title: 'Erro',
          description: 'É necessário selecionar uma matéria-prima com laudo cadastrado para o acordo.',
          variant: 'destructive',
        });
        return;
      }

      if (!agreementQuantity || parseFloat(agreementQuantity) <= 0) {
        toast({
          title: 'Erro',
          description: 'A quantidade da matéria-prima do acordo deve ser maior que zero.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validação regulatória (controlados AE/PF)
    if (!user) return;

    // Substância principal da oferta (mock usa nome em selectedOffer.substance)
    const offerSubstanceName = (selectedOffer as any).substance;
    const offerSubstance = (availableSubstances as any[]).find((s) => s.name === offerSubstanceName);
    if (offerSubstance && (offerSubstance.requiresAe || offerSubstance.requiresPf)) {
      try {
        const me = await userService.getMyTradingEligibility();
        if (offerSubstance.requiresAe && me.ae.status !== 'valid') {
          toast({
            title: 'Licença necessária (AE)',
            description: 'Você só pode negociar esta matéria-prima controlada com AE aprovada e válida no seu Perfil.',
            variant: 'destructive',
          });
          return;
        }
        if (offerSubstance.requiresPf && me.pf.status !== 'valid') {
          toast({
            title: 'Licença necessária (PF)',
            description: 'Você só pode negociar esta matéria-prima controlada com PF aprovada e válida no seu Perfil.',
            variant: 'destructive',
          });
          return;
        }
      } catch (e) {
        // Fallback or log
      }
    }

    const totalValue = quantity * pricePerUnit;
    const cashAmount = isAgreement && isSellOffer ? parseFloat(agreementCashAmount) : undefined;

    // Validar que o acordo não excede o valor total
    if (isAgreement && isSellOffer && cashAmount && cashAmount >= totalValue) {
      toast({
        title: 'Erro',
        description: 'O valor em dinheiro do acordo deve ser menor que o valor total da proposta.',
        variant: 'destructive',
      });
      return;
    }

    // Se houver acordo com matéria-prima (trade), validar licenças do outro cooperado para receber controlados
    if (isSellOffer && isAgreement && selectedAgreementSubstance) {
      const offerOwnerId = (selectedOffer as any).userId as string;
      const trade = selectedAgreementSubstance as any;
      const needsAe = !!trade.requiresAe;
      const needsPf = !!trade.requiresPf;

      // Regra: ambos (quem entrega e quem recebe) precisam ter licença válida
      if (needsAe || needsPf) {
        try {
          const me = await userService.getMyTradingEligibility();
          if (needsAe && me.ae.status !== 'valid') {
            toast({
              title: 'Licença necessária (AE)',
              description: 'Este acordo envolve matéria-prima controlada (AE) e exige que você tenha AE aprovada e válida no Perfil.',
              variant: 'destructive',
            });
            return;
          }
          if (needsPf && me.pf.status !== 'valid') {
            toast({
              title: 'Licença necessária (PF)',
              description: 'Este acordo envolve matéria-prima controlada (PF) e exige que você tenha PF aprovada e válida no Perfil.',
              variant: 'destructive',
            });
            return;
          }
        } catch {
          // fallback
        }
      }

      // Só conseguimos checar se o userId já é UUID (backend)
      if (isUuid(offerOwnerId) && (needsAe || needsPf)) {
        try {
          const ownerElig = await userService.getTradingEligibility(offerOwnerId);
          if (needsAe && ownerElig.ae.status !== 'valid') {
            toast({
              title: 'O outro cooperado não pode receber AE',
              description:
                'Este acordo envolve matéria-prima controlada (AE), mas o outro cooperado não tem AE aprovada e válida no Perfil.',
              variant: 'destructive',
            });
            return;
          }
          if (needsPf && ownerElig.pf.status !== 'valid') {
            toast({
              title: 'O outro cooperado não pode receber PF',
              description:
                'Este acordo envolve matéria-prima controlada (PF), mas o outro cooperado não tem PF aprovada e válida no Perfil.',
              variant: 'destructive',
            });
            return;
          }
        } catch {
          // Se falhar, segue (validação definitiva fica no backend quando integrado)
        }
      }
    }

    const newProposal: OfferProposal = {
      id: `proposal-${Date.now()}`,
      offerId: selectedOffer.id,
      offerType: selectedOffer.type,
      proposerId: user.id,
      proposerName: user.name,
      proposerCompany: user.company,
      quantity,
      unit: selectedOffer.unit as any,
      productExpiryDate: proposalProductExpiry ? new Date(proposalProductExpiry) : undefined,
      status: 'pending',
      createdAt: new Date(),
      // Campos de acordo
      isAgreement: isAgreement && isSellOffer ? true : undefined,
      cashAmount: cashAmount,
      tradeSubstanceId: isAgreement && isSellOffer ? selectedAgreementSubstance.id : undefined,
      tradeSubstanceName: isAgreement && isSellOffer ? selectedAgreementSubstance.name : undefined,
      tradeQuantity: isAgreement && isSellOffer ? parseFloat(agreementQuantity) : undefined,
      tradeUnit: isAgreement && isSellOffer ? agreementUnit : undefined,
      tradeLaudoId: isAgreement && isSellOffer ? selectedAgreementLaudo.id : undefined,
    };

    // Salvar proposta
    setProposals((prev) => [...prev, newProposal]);

    // Enviar notificação para o autor da oferta
    const offerOwnerId = selectedOffer.userId;
    if (offerOwnerId && offerOwnerId !== user.id) {
      const agreementText = isAgreement && isSellOffer
        ? ` com acordo: ${formatCurrency(cashAmount || 0)} em dinheiro + ${parseFloat(agreementQuantity).toLocaleString()} ${agreementUnit} de ${selectedAgreementSubstance?.name}`
        : '';

      addNotification({
        userId: offerOwnerId,
        type: 'proposal_received',
        title: 'Nova proposta recebida',
        message: `${user.name} tem interesse em ${actionType === 'compra' ? 'comprar' : 'vender'} ${quantity.toLocaleString()} ${selectedOffer.unit} de ${selectedOffer.substance}${agreementText}`,
        link: '/marketplace',
        relatedId: newProposal.id,
      });
    }

    const agreementDescription = isAgreement && isSellOffer
      ? ` com acordo: ${formatCurrency(cashAmount || 0)} em dinheiro + ${parseFloat(agreementQuantity).toLocaleString()} ${agreementUnit} de ${selectedAgreementSubstance?.name}`
      : '';

    toast({
      title: 'Proposta enviada!',
      description: `Sua proposta de ${actionType} de ${quantity.toLocaleString()} ${selectedOffer.unit} de ${selectedOffer.substance}${agreementDescription} foi enviada para ${offerOwner}.`,
    });

    // Fechar dialog e resetar
    setIsProposalDialogOpen(false);
    setSelectedOffer(null);
    setProposalQuantity([0]);
    setProposalQuantityInput('');
    setProposalProductExpiry('');
    setIsAgreement(false);
    setAgreementCashAmount('');
    setAgreementSubstanceSearch('');
    setSelectedAgreementSubstance(null);
    setAgreementQuantity('');
    setAgreementUnit('g');
    setSelectedAgreementLaudo(null);
  };

  // Verificar se o usuário tem laudos mas sem atingir a validade mínima para vender
  const hasLaudosButNot30Days = (): boolean => {
    if (!user) return false;
    const validLaudos = getValidLaudos(user.id);
    if (validLaudos.length === 0) return false;

    const deadline = getMinValidityDeadline(minSellValidityDays);

    const hasLaudoWith30Days = validLaudos.some(laudo => {
      return laudo.expiryDate > deadline && isApprovedSupplierForLaudo(laudo);
    });

    return !hasLaudoWith30Days; // Tem laudos, mas nenhum com dias suficientes
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
          <p className="text-muted-foreground text-sm">
            Ofertas de compra e venda entre cooperados
          </p>
        </div>
        {canCreateOffer() && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Nova Oferta
              </Button>
            </DialogTrigger>
            <DialogContent className={offerType === 'both' ? 'sm:max-w-[580px] max-h-[90vh] overflow-y-auto' : 'sm:max-w-[500px]'}>
              <DialogHeader>
                <DialogTitle>
                  {offerToEdit ? 'Editar Oferta' : offerType === 'both' ? 'Oferta dupla (comprar e vender)' : 'Criar Nova Oferta'}
                </DialogTitle>
                <DialogDescription>
                  {offerToEdit ? 'Edite os dados da oferta' : offerType === 'both' ? 'Crie ao mesmo tempo uma oferta de venda e uma de compra para usar do ativo.' : 'Publique uma oferta de compra ou venda'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveOffer} className="space-y-4 py-4">
                {/* Offer Type Selection */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={offerType === 'sell' ? 'default' : 'outline'}
                    className={offerType === 'sell' ? 'flex-1 min-w-[100px] gradient-primary text-primary-foreground' : 'flex-1 min-w-[100px]'}
                    onClick={() => {
                      setOfferType('sell');
                      if (!canCreateSellOffer()) {
                        setSelectedSubstanceForOffer(null);
                        setEditSubstance('');
                        setEditSubstanceSearch('');
                      }
                    }}
                    disabled={!canCreateSellOffer()}
                    title={!canCreateSellOffer() ? `Você precisa ter produtos com laudo válido (${minSellValidityDays}+ dias) para criar ofertas de venda` : ''}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Vender
                  </Button>
                  <Button
                    type="button"
                    variant={offerType === 'buy' ? 'default' : 'outline'}
                    className={offerType === 'buy' ? 'flex-1 min-w-[100px] gradient-accent text-accent-foreground' : 'flex-1 min-w-[100px]'}
                    onClick={() => {
                      setOfferType('buy');
                      setSelectedSubstanceForOffer(null);
                      setEditSubstance('');
                      setEditSubstanceSearch('');
                    }}
                  >
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Comprar
                  </Button>
                  {!offerToEdit && (
                    <Button
                      type="button"
                      variant={offerType === 'both' ? 'default' : 'outline'}
                      className={offerType === 'both' ? 'flex-1 min-w-[100px] border-primary bg-primary/10 text-primary hover:bg-primary/20' : 'flex-1 min-w-[100px]'}
                      onClick={() => {
                        setOfferType('both');
                        if (!canCreateSellOffer()) {
                          setSelectedSubstanceForOffer(null);
                          setEditSubstance('');
                          setEditSubstanceSearch('');
                        }
                      }}
                      disabled={!canCreateSellOffer()}
                      title={!canCreateSellOffer() ? `Você precisa ter laudo válido (${minSellValidityDays}+ dias) para criar oferta dupla (comprar e vender)` : 'Criar oferta de compra e de venda ao mesmo tempo para usar do ativo'}
                    >
                      <ArrowLeftRight className="mr-2 h-4 w-4" />
                      Comprar e vender
                    </Button>
                  )}
                </div>

                {/* Mensagem se tentar criar oferta de venda (ou dupla) sem laudo */}
                {(offerType === 'sell' || offerType === 'both') && !canCreateSellOffer() && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          Para criar ofertas de venda, você precisa ter pelo menos um produto cadastrado com laudo válido por pelo menos {minSellValidityDays} dias e com fornecedor aprovado.
                          Você pode criar ofertas de compra normalmente.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Substância *</Label>
                  <div className="space-y-2">
                    {!offerToEdit && (
                      <>
                        <Input
                          value={editSubstanceSearch}
                          onChange={(e) => {
                            setEditSubstanceSearch(e.target.value);
                            if (!e.target.value) {
                              setSelectedSubstanceForOffer(null);
                              setEditSubstance('');
                            }
                          }}
                          placeholder="Buscar matéria-prima..."
                          required
                        />
                        {editSubstanceSearch && filteredSubstancesForOffer.length > 0 && !selectedSubstanceForOffer && (
                          <div className="max-h-48 overflow-y-auto rounded-lg border bg-background">
                            {filteredSubstancesForOffer.map((substance) => (
                              <button
                                key={substance.id}
                                type="button"
                                onClick={() => {
                                  checkExistingOfferAndSelect({ id: substance.id, name: substance.name });
                                  // Os dados do laudo serão preenchidos automaticamente pelo useEffect
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors"
                              >
                                <p className="font-medium">{substance.name}</p>
                                {substance.synonyms && substance.synonyms.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Sinônimos: {substance.synonyms.slice(0, 2).join(', ')}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {selectedSubstanceForOffer && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{selectedSubstanceForOffer.name}</p>
                            {(offerType === 'sell' || offerType === 'both') && user && (() => {
                              const validLaudos = getValidLaudos(user.id);
                              const deadline = getMinValidityDeadline(minSellValidityDays);

                              const hasLaudoWith30Days = validLaudos.some(laudo =>
                                laudo.substanceId === selectedSubstanceForOffer.id &&
                                laudo.expiryDate > deadline &&
                                isApprovedSupplierForLaudo(laudo)
                              );

                              // Buscar o laudo mais recente para mostrar informações
                              const userLaudos = getUserLaudos(user.id);
                              const laudosWith30Days = userLaudos.filter(laudo =>
                                laudo.substanceId === selectedSubstanceForOffer.id &&
                                laudo.expiryDate > deadline &&
                                isApprovedSupplierForLaudo(laudo) &&
                                laudo.pdfUrl &&
                                !laudo.pdfUrl.startsWith('blob:')
                              );

                              const latestLaudo = hasLaudoWith30Days && laudosWith30Days.length > 0
                                ? laudosWith30Days.sort((a, b) => b.expiryDate.getTime() - a.expiryDate.getTime())[0]
                                : null;

                              return (
                                <div className="mt-2 space-y-1">
                                  <p className={`text-xs flex items-center gap-1 ${hasLaudoWith30Days
                                    ? 'text-green-600'
                                    : 'text-destructive'
                                    }`}>
                                    {hasLaudoWith30Days ? (
                                      <>
                                        <CheckCircle className="h-3 w-3" />
                                        Você tem laudo válido desta matéria-prima ({minSellValidityDays}+ dias) e fornecedor aprovado
                                      </>
                                    ) : (
                                      <>
                                        <AlertCircle className="h-3 w-3" />
                                        Você precisa de um laudo válido por pelo menos {minSellValidityDays} dias e com fornecedor aprovado para vender
                                      </>
                                    )}
                                  </p>
                                  {latestLaudo && hasLaudoWith30Days && (
                                    <div className="text-xs text-muted-foreground space-y-0.5 pl-4 mt-2 border-l-2 border-primary/20">
                                      <div><span className="font-medium">Lote:</span> {latestLaudo.batch}</div>
                                      {latestLaudo.supplier && <div><span className="font-medium">Fornecedor:</span> {latestLaudo.supplier}</div>}
                                      {latestLaudo.manufacturer && <div><span className="font-medium">Fabricante:</span> {latestLaudo.manufacturer}</div>}
                                      <div><span className="font-medium">Fabricação:</span> {latestLaudo.manufacturingDate.toLocaleDateString('pt-BR')}</div>
                                      <div><span className="font-medium">Validade:</span> {latestLaudo.expiryDate.toLocaleDateString('pt-BR')}</div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          {!offerToEdit && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSubstanceForOffer(null);
                                setEditSubstance('');
                                setEditSubstanceSearch('');
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {offerType === 'both' ? (
                  <>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                      <h4 className="font-medium flex items-center gap-2 text-primary">
                        <TrendingUp className="h-4 w-4" />
                        Oferta de venda
                      </h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Quantidade a vender</Label>
                          <Input type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} placeholder="Ex: 1000" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Unidade</Label>
                          <Select value={editUnit} onValueChange={(v: 'g' | 'mL' | 'kg' | 'L') => setEditUnit(v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="g">Gramas (g)</SelectItem>
                              <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                              <SelectItem value="mL">Mililitros (mL)</SelectItem>
                              <SelectItem value="L">Litros (L)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Preço por unidade (R$)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                          <Input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="0,00" className="pl-10" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Data de validade do produto</Label>
                        <Input type="date" value={editExpiryDate} onChange={(e) => setEditExpiryDate(e.target.value)} required />
                      </div>

                      <div className="flex items-center space-x-2 py-1">
                        <Checkbox id="isAuctionBoth" checked={isAuction} onCheckedChange={(checked) => setIsAuction(!!checked)} />
                        <Label htmlFor="isAuctionBoth" className="cursor-pointer font-medium text-primary flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Transformar em Leilão (10 a 30 dias)
                        </Label>
                      </div>

                      {isAuction && (
                        <div className="grid gap-4 sm:grid-cols-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="space-y-2">
                            <Label>Preço Inicial (R$)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                              <Input type="number" step="0.01" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} placeholder="0,00" className="pl-10" required />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Duração do Leilão</Label>
                            <Select value={auctionDurationDays} onValueChange={setAuctionDurationDays}>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10 dias</SelectItem>
                                <SelectItem value="15">15 dias</SelectItem>
                                <SelectItem value="20">20 dias</SelectItem>
                                <SelectItem value="25">25 dias</SelectItem>
                                <SelectItem value="30">30 dias</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-4">
                      <h4 className="font-medium flex items-center gap-2 text-accent">
                        <TrendingDown className="h-4 w-4" />
                        Oferta de compra
                      </h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Quantidade a comprar</Label>
                          <Input type="number" value={editBuyQuantity} onChange={(e) => setEditBuyQuantity(e.target.value)} placeholder="Ex: 1000" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Unidade</Label>
                          <Select value={editBuyUnit} onValueChange={(v: 'g' | 'mL' | 'kg' | 'L') => setEditBuyUnit(v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="g">Gramas (g)</SelectItem>
                              <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                              <SelectItem value="mL">Mililitros (mL)</SelectItem>
                              <SelectItem value="L">Litros (L)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Preço máximo aceito (R$)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                          <Input type="number" step="0.01" value={editBuyPrice} onChange={(e) => setEditBuyPrice(e.target.value)} placeholder="0,00" className="pl-10" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Validade mínima exigida (meses)</Label>
                        <Select value={minValidityMonths} onValueChange={setMinValidityMonths}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 mês</SelectItem>
                            <SelectItem value="3">3 meses</SelectItem>
                            <SelectItem value="6">6 meses</SelectItem>
                            <SelectItem value="12">12 meses</SelectItem>
                            <SelectItem value="18">18 meses</SelectItem>
                            <SelectItem value="24">24 meses</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Quem for vender precisa oferecer produto com pelo menos {minValidityMonths} {minValidityMonths === '1' ? 'mês' : 'meses'} de validade
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">
                        <FileText className="mr-1.5 inline-block h-4 w-4" />
                        Para vender, o laudo PDF deve estar anexado ao cadastro da matéria-prima.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Quantidade</Label>
                        <Input type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} placeholder="Ex: 1000" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Unidade</Label>
                        <Select value={editUnit} onValueChange={(value: 'g' | 'mL' | 'kg' | 'L') => setEditUnit(value)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="g">Gramas (g)</SelectItem>
                            <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                            <SelectItem value="mL">Mililitros (mL)</SelectItem>
                            <SelectItem value="L">Litros (L)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{offerType === 'sell' ? 'Preço por Unidade' : 'Preço Máximo Aceito'}</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="0,00" className="pl-10" required />
                      </div>
                    </div>
                    {offerType === 'sell' ? (
                      <div className="space-y-2">
                        <Label>Data de Validade do Produto</Label>
                        <Input type="date" value={editExpiryDate} onChange={(e) => setEditExpiryDate(e.target.value)} required />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Validade Mínima Exigida (em meses)</Label>
                        <Select value={minValidityMonths} onValueChange={setMinValidityMonths}>
                          <SelectTrigger><SelectValue placeholder="Selecione a validade mínima" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 mês</SelectItem>
                            <SelectItem value="3">3 meses</SelectItem>
                            <SelectItem value="6">6 meses</SelectItem>
                            <SelectItem value="12">12 meses</SelectItem>
                            <SelectItem value="18">18 meses</SelectItem>
                            <SelectItem value="24">24 meses</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Quem for vender precisa oferecer produto com pelo menos {minValidityMonths} {minValidityMonths === '1' ? 'mês' : 'meses'} de validade
                        </p>
                      </div>
                    )}
                    {offerType === 'sell' && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-sm text-muted-foreground">
                          <FileText className="mr-1.5 inline-block h-4 w-4" />
                          Para vender, o laudo PDF deve estar anexado ao cadastro da matéria-prima.
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setOfferToEdit(null);
                      setEditSubstance('');
                      setEditSubstanceSearch('');
                      setSelectedSubstanceForOffer(null);
                      setEditQuantity('');
                      setEditPrice('');
                      setEditExpiryDate('');
                      setEditBuyQuantity('');
                      setEditBuyUnit('g');
                      setEditBuyPrice('');
                      setIsAuction(false);
                      setStartingPrice('');
                      setAuctionDurationDays('10');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className={offerType === 'sell' || offerType === 'both' ? 'gradient-primary text-primary-foreground' : 'gradient-accent text-accent-foreground'}
                  >
                    {offerToEdit ? 'Salvar Alterações' : offerType === 'both' ? 'Publicar ofertas' : 'Publicar Oferta'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog: você já tem anúncio ativo deste produto — Editar ou Criar mais um */}
        <Dialog
          open={existingOfferDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              const wasFromUrl = existingOfferDialog.fromUrl;
              const hadSubstance = existingOfferDialog.substance;
              setExistingOfferDialog({ open: false, substance: null, existingOffers: [] });
              if (wasFromUrl && hadSubstance) {
                setSelectedSubstanceForOffer(null);
                setEditSubstance('');
                setEditSubstanceSearch('');
              }
            }
          }}
        >
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Você já tem anúncio ativo deste produto
              </DialogTitle>
              <DialogDescription>
                {existingOfferDialog.substance && (
                  <>
                    Você já possui {existingOfferDialog.existingOffers.length} anúncio(s) ativo(s) de{' '}
                    <strong>{existingOfferDialog.substance.name}</strong>. Deseja editar o anúncio existente ou criar mais um?
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                className="w-full gradient-primary text-primary-foreground"
                onClick={() => {
                  if (existingOfferDialog.existingOffers.length > 0) {
                    const toEdit = [...existingOfferDialog.existingOffers].sort(
                      (a, b) => getCreatedAtDate(b).getTime() - getCreatedAtDate(a).getTime()
                    )[0];
                    handleEditOffer(toEdit);
                  }
                  setExistingOfferDialog({ open: false, substance: null, existingOffers: [] });
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar anúncio existente
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (existingOfferDialog.substance && !existingOfferDialog.fromUrl) {
                    setSelectedSubstanceForOffer(existingOfferDialog.substance);
                    setEditSubstance(existingOfferDialog.substance.name);
                    setEditSubstanceSearch(existingOfferDialog.substance.name);
                  }
                  setExistingOfferDialog({ open: false, substance: null, existingOffers: [] });
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar mais um anúncio
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  if (existingOfferDialog.fromUrl && existingOfferDialog.substance) {
                    setSelectedSubstanceForOffer(null);
                    setEditSubstance('');
                    setEditSubstanceSearch('');
                  }
                  setExistingOfferDialog({ open: false, substance: null, existingOffers: [] });
                }}
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mensagem informativa se não pode criar ofertas de VENDA */}
      {!dismissedSellWarning && !canCreateSellOffer() && user && hasRole(['cooperado']) && (
        <Alert className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 py-1.5 px-3">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <AlertTitle className="text-sm mb-0">Venda indisponível</AlertTitle>
              <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                Para vender, você precisa de laudo válido ({minSellValidityDays}+ dias) e com fornecedor aprovado.
              </AlertDescription>
              <Collapsible open={isSellWarningOpen} onOpenChange={setIsSellWarningOpen}>
                <CollapsibleContent>
                  <div className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                    {hasLaudosButNot30Days()
                      ? `Você tem laudos válidos, mas nenhum com ${minSellValidityDays}+ dias e fornecedor aprovado. Você pode criar ofertas de compra normalmente.`
                      : `Você precisa cadastrar pelo menos um produto com laudo válido (com pelo menos ${minSellValidityDays} dias de validade) e fornecedor aprovado. Você pode criar ofertas de compra normalmente.`}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs border-amber-300 text-amber-900 hover:bg-amber-100 dark:hover:bg-amber-950/40"
                      onClick={() => navigate('/laudos')}
                    >
                      Ir para Laudos
                    </Button>
                  </div>
                </CollapsibleContent>
                <div className="mt-1 flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-950/40"
                    >
                      {isSellWarningOpen ? 'Ocultar detalhes' : 'Detalhes'}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </Collapsible>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-950/40"
              onClick={() => {
                setDismissedSellWarning(true);
                if (typeof window !== 'undefined') {
                  window.sessionStorage.setItem('mc_marketplace_dismiss_sell_warning', '1');
                }
              }}
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      )}

      {/* Aviso: licenças necessárias para controlados (AE/PF) */}
      {!dismissedControlledWarning &&
        myEligibility &&
        (myEligibility.ae.status !== 'valid' || myEligibility.pf.status !== 'valid') && (
          <Alert className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 py-1.5 px-3 min-h-0 flex items-center gap-2 [&>svg]:relative [&>svg]:left-0 [&>svg]:top-0 [&>svg~*]:pl-0">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-0">
              <AlertTitle className="text-[11px] mb-0 font-bold whitespace-nowrap leading-none self-center">
                Controlados (AE/PF):
              </AlertTitle>
              <AlertDescription className="text-[11px] leading-none text-amber-800 dark:text-amber-200 self-center">
                Ofertas ocultas por falta de licença.
              </AlertDescription>

              <Collapsible open={isControlledWarningOpen} onOpenChange={setIsControlledWarningOpen} className="flex flex-wrap items-center gap-1">
                <CollapsibleTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-200/50 dark:text-amber-100 dark:hover:bg-amber-950/40"
                  >
                    {isControlledWarningOpen ? 'Ocultar' : 'Detalhes'}
                  </Button>
                </CollapsibleTrigger>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-200/50 dark:text-amber-100 dark:hover:bg-amber-950/40"
                  onClick={() => navigate('/perfil')}
                >
                  Meu Perfil
                </Button>

                <CollapsibleContent className="w-full basis-full">
                  <div className="py-1 space-y-0.5 text-[10px] text-amber-800 dark:text-amber-200 border-t border-amber-200/50 mt-1">
                    {myEligibility.ae.status !== 'valid' && (
                      <p>
                        <span className="font-medium">AE (ANVISA)</span>: {myEligibility.ae.status === 'pending' ? 'pendente' : myEligibility.ae.status === 'missing' ? 'ausente' : 'vencida'}
                      </p>
                    )}
                    {myEligibility.pf.status !== 'valid' && (
                      <p>
                        <span className="font-medium">PF</span>: {myEligibility.pf.status === 'pending' ? 'pendente' : myEligibility.pf.status === 'missing' ? 'ausente' : 'vencida'}
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-amber-900/40 hover:text-amber-900 hover:bg-amber-200/50 dark:text-amber-100/40 dark:hover:text-amber-100 ml-auto"
                onClick={() => {
                  setDismissedControlledWarning(true);
                  if (typeof window !== 'undefined') {
                    window.sessionStorage.setItem('mc_marketplace_dismiss_controlled_warning', '1');
                  }
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </Alert>
        )}

      {/* Search */}
      <Card className="card-pharmaceutical shadow-sm">
        <CardContent className="p-2">
          <div className="space-y-1.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar substância..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>

            {/* Filtros Expansíveis */}
            <div className="border rounded-md">
              <Button
                variant="ghost"
                className="w-full justify-between py-1 px-3 h-8"
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="font-medium text-xs">Filtros</span>
                </div>
                {isFiltersExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>

              {isFiltersExpanded && (
                <div className="border-t p-1.5 bg-muted/5">
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="space-y-1 w-[140px]">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground/70">Vendedor/Comprador</Label>
                      <Input
                        placeholder="Nome"
                        value={filterSeller}
                        onChange={(e) => setFilterSeller(e.target.value)}
                        className="h-7 text-[11px]"
                      />
                    </div>
                    <div className="space-y-1 w-[80px]">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground/70">Qtd Mín</Label>
                      <Input
                        type="number"
                        placeholder="Mín"
                        value={filterMinQuantity}
                        onChange={(e) => setFilterMinQuantity(e.target.value)}
                        className="h-7 text-[11px]"
                      />
                    </div>
                    <div className="space-y-1 w-[80px]">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground/70">Qtd Máx</Label>
                      <Input
                        type="number"
                        placeholder="Máx"
                        value={filterMaxQuantity}
                        onChange={(e) => setFilterMaxQuantity(e.target.value)}
                        className="h-7 text-[11px]"
                      />
                    </div>
                    <div className="space-y-1 w-[90px]">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground/70">Preço Mín</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={filterMinPrice}
                        onChange={(e) => setFilterMinPrice(e.target.value)}
                        className="h-7 text-[11px]"
                      />
                    </div>
                    <div className="space-y-1 w-[90px]">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground/70">Preço Máx</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={filterMaxPrice}
                        onChange={(e) => setFilterMaxPrice(e.target.value)}
                        className="h-7 text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilterSeller('');
                          setFilterMinQuantity('');
                          setFilterMaxQuantity('');
                          setFilterMinPrice('');
                          setFilterMaxPrice('');
                        }}
                        className="h-7 text-[11px] px-2"
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="sell" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
          <TabsTrigger value="sell" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
            <TrendingUp className="h-4 w-4" />
            Ofertas de Venda ({filteredSellOffers.length})
          </TabsTrigger>
          <TabsTrigger value="buy" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground border">
            <TrendingDown className="h-4 w-4" />
            Ofertas de Compra ({filteredBuyOffers.length})
          </TabsTrigger>
          {user && (() => {
            const receivedProposals = proposals.filter(p => {
              const allOffers = [...offers, ...buyOffersState];
              const offer = allOffers.find(o => o.id === p.offerId);
              return offer && isMyOffer(offer) && p.status === 'pending';
            });
            return receivedProposals.length > 0;
          })() && (
              <TabsTrigger value="received" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
                <ShoppingCart className="h-4 w-4" />
                Propostas sobre minhas ofertas ({proposals.filter(p => {
                  const allOffers = [...offers, ...buyOffersState];
                  const offer = allOffers.find(o => o.id === p.offerId);
                  return offer && isMyOffer(offer) && p.status === 'pending';
                }).length})
              </TabsTrigger>
            )}
          {user && proposals.filter(p =>
            p.proposerId === user.id ||
            p.proposerName === user.name ||
            p.proposerCompany === user.company
          ).length > 0 && (
              <TabsTrigger value="sent-proposals" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
                <Send className="h-4 w-4" />
                Minhas Negociações ({proposals.filter(p =>
                  p.proposerId === user.id ||
                  p.proposerName === user.name ||
                  p.proposerCompany === user.company
                ).length})
              </TabsTrigger>
            )}
          {user && (myActiveSellOffers.length > 0 || myActiveBuyOffers.length > 0 ||
            pausedSellOffers.length > 0 || pausedBuyOffers.length > 0 ||
            expiredSellOffers.length > 0 || expiredBuyOffers.length > 0) && (
              <TabsTrigger value="my-offers" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
                <Package className="h-4 w-4" />
                Minhas Ofertas ({myActiveSellOffers.length + myActiveBuyOffers.length + pausedSellOffers.length + pausedBuyOffers.length + expiredSellOffers.length + expiredBuyOffers.length})
              </TabsTrigger>
            )}
          {(allExpiredSellOffers.length > 0 || allExpiredBuyOffers.length > 0) && (
            <TabsTrigger value="expired-all" className="gap-2 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground border">
              <AlertCircle className="h-4 w-4" />
              Ofertas Expiradas ({allExpiredSellOffers.length + allExpiredBuyOffers.length})
            </TabsTrigger>
          )}
          {(draftSellOffers.length > 0 || draftBuyOffers.length > 0) && (
            <TabsTrigger value="drafts" className="gap-2 data-[state=active]:bg-warning data-[state=active]:text-warning-foreground border">
              <FileText className="h-4 w-4" />
              Rascunhos ({draftSellOffers.length + draftBuyOffers.length})
            </TabsTrigger>
          )}
          {user && (
            <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
              <History className="h-4 w-4" />
              Histórico ({historySuccessful.length + historyUnsuccessful.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Sell Offers */}
        <TabsContent value="sell" className="space-y-4">
          <Card className="card-pharmaceutical overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[675px] w-full table-fixed">
                <TableHeader className="w-full">
                  <TableRow className="table-header hover:bg-muted/50 w-full">
                    <TableHead className="w-[140px] text-[11px] py-1.5">Substância</TableHead>
                    <TableHead className="w-[100px] text-[11px] py-1.5">Vendedor</TableHead>
                    <TableHead className="w-[70px] text-[11px] py-1.5">Qtd</TableHead>
                    <TableHead className="w-[80px] text-[11px] py-1.5">Preço</TableHead>
                    <TableHead className="w-[85px] text-[11px] py-1.5">Validade</TableHead>
                    <TableHead className="w-[75px] text-[11px] py-1.5">Expira</TableHead>
                    <TableHead className="text-right w-[95px] text-[11px] py-1.5">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSellOffers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma oferta de venda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSellOffers.map((offer) => {
                      const expirationDate = getExpirationDate(offer);
                      const isExpired = isOfferExpired(offer);

                      const offerSubstanceId =
                        (offer as any).substanceId ||
                        availableSubstances.find((s) => s.name.toLowerCase() === offer.substance.toLowerCase())?.id;
                      const last = offerSubstanceId ? (latestQuotations as any)[offerSubstanceId] : undefined;
                      const expiry = toOfferExpiryDate((offer as any).expiryDate);
                      const daysToExpiry = expiry ? (expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) : null;
                      const isLongValidity = daysToExpiry != null && daysToExpiry > 365;
                      const offerUnitBase = toBaseUnit(offer.unit);
                      const offerPricePerBaseUnit =
                        offerUnitBase && (offer as any).pricePerUnit != null
                          ? Number((offer as any).pricePerUnit) / offerUnitBase.factor
                          : null;
                      const isOverpriced =
                        isLongValidity &&
                        offerPricePerBaseUnit != null &&
                        last?.reference?.pricePerBaseUnit &&
                        last?.reference?.kind === offerUnitBase?.kind &&
                        offerPricePerBaseUnit > Number(last.reference.pricePerBaseUnit) * 1.15;

                      return (
                        <TableRow key={offer.id} className="animate-fade-in">
                          <TableCell className="py-1">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFollowSubstance(offer.substance)}
                                className={`h-5 w-5 p-0 ${isFollowingSubstance(offer.substance) ? 'text-warning' : ''}`}
                                title={isFollowingSubstance(offer.substance) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                              >
                                <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(offer.substance) ? 'fill-warning' : ''}`} />
                              </Button>
                              <span className="text-[11px] font-medium leading-tight line-clamp-2">{offer.substance}</span>
                              {(offer as any).rawMaterialId && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-orange-400 bg-orange-50 text-orange-700 whitespace-nowrap">
                                  Excesso
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center gap-1">
                              {user && (offer as any).userId !== user.id ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const offerUserId = (offer as any).userId;
                                    if (offerUserId) toggleFollowUser(offerUserId, offer.seller);
                                  }}
                                  className={`h-5 w-5 p-0 ${(offer as any).userId && isFollowingUser((offer as any).userId) ? 'text-primary' : ''}`}
                                  title={(offer as any).userId ? (isFollowingUser((offer as any).userId) ? 'Deixar de seguir' : 'Seguir cooperado') : 'Cooperado sem ID'}
                                >
                                  <Users className={`h-3.5 w-3.5 ${(offer as any).userId && isFollowingUser((offer as any).userId) ? 'fill-primary' : ''}`} />
                                </Button>
                              ) : (
                                <div className="h-5 w-5 flex items-center justify-center">
                                  <Users className="h-3.5 w-3.5 opacity-0" />
                                </div>
                              )}
                              <span className="text-[11px] text-muted-foreground truncate block">{offer.seller}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1">
                            <span className="text-[11px] font-semibold whitespace-nowrap">
                              {offer.quantity.toLocaleString()}{offer.unit}
                            </span>
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-primary whitespace-nowrap">
                                {offer.isAuction
                                  ? formatCurrency(offer.currentBid || offer.startingPrice || 0)
                                  : formatCurrency(offer.pricePerUnit)}
                              </span>
                              {offer.isAuction && (
                                <div className="flex flex-col gap-0.5">
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-amber-100 text-amber-800 border-amber-200">
                                    Leilão • {offer.bidCount || 0} lances
                                  </Badge>
                                  {offer.auctionEnd && <AuctionTimer endDate={offer.auctionEnd} />}
                                </div>
                              )}
                              {isOverpriced && (
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-400 text-amber-700">
                                    <AlertCircle className="mr-0.5 h-3 w-3" />
                                    +15% vs última cotação
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-4 px-1 text-[10px] text-amber-800 hover:bg-amber-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (!last?.quotation) return;
                                      setSelectedLatestQuotation({
                                        offerKind: 'sell',
                                        substanceName: offer.substance,
                                        offerPricePerUnit: (offer as any).pricePerUnit,
                                        offerUnit: offer.unit,
                                        quotation: last.quotation,
                                        reference: last.reference,
                                      });
                                      setIsLatestQuotationDialogOpen(true);
                                    }}
                                  >
                                    Ver
                                  </Button>
                                </div>
                              )}
                              {latestQuotationsLoading && (
                                <span className="text-[9px] text-muted-foreground/70">Carregando cotação...</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-1">
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              {formatDate(offer.expiryDate)}
                            </span>
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center gap-0.5">
                              <span className={`text-[11px] whitespace-nowrap ${isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                {formatDate(expirationDate)}
                              </span>
                              {isExpired && (
                                <Badge variant="destructive" className="text-[9px] px-0.5 py-0 h-3">Exp</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-1">
                            <div className="flex items-center justify-end gap-0.5">
                              {canEditOffer(offer) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handlePauseOffer(offer);
                                    }}
                                    className="h-6 w-6 p-0"
                                    title="Pausar oferta"
                                  >
                                    <Pause className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditOffer(offer)}
                                    className="h-6 w-6 p-0"
                                    title="Editar"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setOfferToDelete(offer)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    title="Remover"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {(!user || (offer as any).userId !== user.id) && !isExpired && (
                                offer.isAuction ? (
                                  <Button
                                    size="sm"
                                    className="gradient-primary text-primary-foreground text-[10px] px-1.5 h-6 flex items-center gap-1"
                                    onClick={() => {
                                      setOfferToBid(offer);
                                      const minBid = (offer.currentBid || offer.startingPrice || 0) * 1.01;
                                      setBidAmount(minBid.toFixed(2));
                                      setIsBidDialogOpen(true);
                                    }}
                                  >
                                    <TrendingUp className="h-3 w-3" />
                                    Dar Lance
                                  </Button>
                                ) : (
                                  canMakeProposal() && (
                                    <Button
                                      size="sm"
                                      className="gradient-primary text-primary-foreground text-[10px] px-1.5 h-6"
                                      onClick={() => {
                                        setSelectedOffer(offer);
                                        setIsProposalDialogOpen(true);
                                      }}
                                    >
                                      Fazer Proposta
                                    </Button>
                                  )
                                )
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Buy Offers */}
        <TabsContent value="buy" className="space-y-4">
          <Card className="card-pharmaceutical overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[675px] w-full table-fixed">
                <TableHeader className="w-full">
                  <TableRow className="table-header hover:bg-muted/50 w-full">
                    <TableHead className="w-[140px] text-[11px] py-1.5">Substância</TableHead>
                    <TableHead className="w-[100px] text-[11px] py-1.5">Comprador</TableHead>
                    <TableHead className="w-[70px] text-[11px] py-1.5">Qtd</TableHead>
                    <TableHead className="w-[80px] text-[11px] py-1.5">Preço Máx</TableHead>
                    <TableHead className="w-[85px] text-[11px] py-1.5 font-semibold">Val. Mín</TableHead>
                    <TableHead className="w-[75px] text-[11px] py-1.5">Expira</TableHead>
                    <TableHead className="text-right w-[95px] text-[11px] py-1.5">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBuyOffers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma oferta de compra encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBuyOffers.map((offer) => {
                      const expirationDate = getExpirationDate(offer);
                      const isExpired = isOfferExpired(offer);

                      const offerSubstanceId =
                        (offer as any).substanceId ||
                        availableSubstances.find((s) => s.name.toLowerCase() === offer.substance.toLowerCase())?.id;
                      const last = offerSubstanceId ? (latestQuotations as any)[offerSubstanceId] : undefined;
                      const minMonths = Number((offer as any).minValidityMonths ?? 0);
                      const isShortDesiredValidity = Number.isFinite(minMonths) && minMonths > 0 && minMonths < 12;
                      const offerUnitBase = toBaseUnit(offer.unit);
                      const offerMaxPricePerBaseUnit =
                        offerUnitBase && (offer as any).maxPrice != null
                          ? Number((offer as any).maxPrice) / offerUnitBase.factor
                          : null;
                      const isUnderpriced =
                        isShortDesiredValidity &&
                        offerMaxPricePerBaseUnit != null &&
                        last?.reference?.pricePerBaseUnit &&
                        last?.reference?.kind === offerUnitBase?.kind &&
                        offerMaxPricePerBaseUnit <= Number(last.reference.pricePerBaseUnit) * 0.75;

                      return (
                        <TableRow key={offer.id} className="animate-fade-in">
                          <TableCell className="py-1">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFollowSubstance(offer.substance)}
                                className={`h-5 w-5 p-0 ${isFollowingSubstance(offer.substance) ? 'text-warning' : ''}`}
                                title={isFollowingSubstance(offer.substance) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                              >
                                <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(offer.substance) ? 'fill-warning' : ''}`} />
                              </Button>
                              <span className="text-[11px] font-medium leading-tight line-clamp-2">{offer.substance}</span>
                              {(offer as any).rawMaterialId && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-orange-400 bg-orange-50 text-orange-700 whitespace-nowrap">
                                  Excesso
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center gap-1">
                              {user && (offer as any).userId !== user.id ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const offerUserId = (offer as any).userId;
                                    if (offerUserId) toggleFollowUser(offerUserId, offer.buyer);
                                  }}
                                  className={`h-5 w-5 p-0 ${(offer as any).userId && isFollowingUser((offer as any).userId) ? 'text-primary' : ''}`}
                                  title={(offer as any).userId ? (isFollowingUser((offer as any).userId) ? 'Deixar de seguir' : 'Seguir cooperado') : 'Cooperado sem ID'}
                                >
                                  <Users className={`h-3.5 w-3.5 ${(offer as any).userId && isFollowingUser((offer as any).userId) ? 'fill-primary' : ''}`} />
                                </Button>
                              ) : (
                                <div className="h-5 w-5 flex items-center justify-center">
                                  <Users className="h-3.5 w-3.5 opacity-0" />
                                </div>
                              )}
                              <span className="text-[11px] text-muted-foreground truncate block">{offer.buyer}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1">
                            <span className="text-[11px] font-semibold whitespace-nowrap">
                              {offer.quantity.toLocaleString()}{offer.unit}
                            </span>
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-accent whitespace-nowrap">
                                {formatCurrency(offer.maxPrice!)}
                              </span>
                              {isUnderpriced && (
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-400 text-amber-700">
                                    <AlertCircle className="mr-0.5 h-3 w-3" />
                                    -25% vs última cotação
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-4 px-1 text-[10px] text-amber-800 hover:bg-amber-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (!last?.quotation) return;
                                      setSelectedLatestQuotation({
                                        offerKind: 'buy',
                                        substanceName: offer.substance,
                                        offerPricePerUnit: (offer as any).maxPrice,
                                        offerUnit: offer.unit,
                                        quotation: last.quotation,
                                        reference: last.reference,
                                      });
                                      setIsLatestQuotationDialogOpen(true);
                                    }}
                                  >
                                    Ver
                                  </Button>
                                </div>
                              )}
                              {latestQuotationsLoading && (
                                <span className="text-[9px] text-muted-foreground/70">Carregando cotação...</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-1">
                            <Badge variant="outline" className="text-[10px] px-1 py-0.5 h-5 font-semibold border-primary/30 text-primary whitespace-nowrap">
                              {offer.minValidityMonths}{offer.minValidityMonths === 1 ? 'm' : 'm'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center gap-0.5">
                              <span className={`text-[11px] whitespace-nowrap ${isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                {formatDate(expirationDate)}
                              </span>
                              {isExpired && (
                                <Badge variant="destructive" className="text-[9px] px-0.5 py-0 h-3">Exp</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-1">
                            <div className="flex items-center justify-end gap-0.5">
                              {canEditOffer(offer) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      const offerIdToPause = offer.id;
                                      // Verificar o tipo da oferta e atualizar o estado correto
                                      if (offer.type === 'sell') {
                                        setOffers((prev) =>
                                          prev.map((o) =>
                                            o.id === offerIdToPause
                                              ? { ...o, status: 'paused' as const }
                                              : o
                                          )
                                        );
                                      } else {
                                        // Se for oferta de compra, atualizar o estado de compra
                                        setBuyOffersState((prev) =>
                                          prev.map((o) =>
                                            o.id === offerIdToPause
                                              ? { ...o, status: 'paused' as const }
                                              : o
                                          )
                                        );
                                      }
                                      toast({
                                        title: 'Oferta pausada',
                                        description: 'A oferta foi pausada e não aparecerá mais nas ofertas ativas.',
                                      });
                                    }}
                                    className="h-6 w-6 p-0"
                                    title="Pausar oferta"
                                  >
                                    <Pause className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditOffer(offer)}
                                    className="h-6 w-6 p-0"
                                    title="Editar"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setOfferToDelete(offer)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    title="Remover"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {(!user || (offer as any).userId !== user.id) && !isExpired && canMakeProposal() && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-accent text-accent hover:bg-accent/10 text-[10px] px-1.5 h-6"
                                  onClick={() => handleOpenProposal(offer)}
                                  disabled={isExpired || !canMakeProposal()}
                                  title={!canMakeProposal() ? 'Apenas cooperados podem fazer propostas' : ''}
                                >
                                  Oferecer
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Ofertas Recebidas */}
        <TabsContent value="received" className="space-y-4">
          {user && (() => {
            const allOffers = [...offers, ...buyOffersState];
            const receivedProposals = proposals
              .filter(p => {
                const offer = allOffers.find(o => o.id === p.offerId);
                return offer && isMyOffer(offer);
              })
              .sort((a, b) => getCreatedAtDate(b).getTime() - getCreatedAtDate(a).getTime());

            if (receivedProposals.length === 0) {
              return (
                <Card className="card-pharmaceutical">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhuma proposta recebida</h3>
                    <p className="mt-1 text-center text-muted-foreground">
                      Quando alguém tiver interesse em suas ofertas, aparecerá aqui
                    </p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {receivedProposals.map((proposal) => {
                  const offer = allOffers.find(o => o.id === proposal.offerId);
                  // Se a oferta não existir, ainda mostrar a proposta com mensagem informativa
                  if (!offer) {
                    return (
                      <Card key={proposal.id} className="card-pharmaceutical">
                        <CardHeader className="pb-2 pt-3 px-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm font-semibold leading-tight">Proposta (Oferta Removida)</CardTitle>
                              <CardDescription className="text-xs mt-0.5">
                                A oferta relacionada a esta proposta foi removida
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-[10px] shrink-0">
                              Pendente
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 px-3 pb-3">
                          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2">
                            <p className="text-xs text-destructive">
                              A oferta relacionada a esta proposta não foi encontrada. Ela pode ter sido removida ou expirada.
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Proponente</p>
                              <p className="text-xs font-semibold">
                                {proposal.proposerName}
                                {proposal.proposerCompany && ` • ${proposal.proposerCompany}`}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Quantidade</p>
                              <p className="text-sm font-semibold">
                                {proposal.quantity.toLocaleString()} {proposal.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Data</p>
                              <p className="text-xs">
                                {proposal.createdAt.toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  const isPending = proposal.status === 'pending';
                  const isSellOffer = offer.type === 'sell';

                  return (
                    <Card
                      key={proposal.id}
                      className="card-pharmaceutical cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={(e) => {
                        // Não abrir se clicar em botões ou links
                        if ((e.target as HTMLElement).closest('button, a')) {
                          return;
                        }
                        setSelectedProposalForDetails(proposal);
                        // Calcular valores iniciais
                        if (offer) {
                          const totalValue = proposal.quantity * (isSellOffer ? (offer as typeof sellOffers[0]).pricePerUnit : (offer as typeof buyOffers[0]).maxPrice!);
                          if (proposal.isAgreement && proposal.cashAmount) {
                            setProposalDetailsPaymentType('mixed');
                            setProposalDetailsCashAmount(proposal.cashAmount.toString());
                          } else {
                            setProposalDetailsPaymentType('money');
                            setProposalDetailsCashAmount(totalValue.toString());
                          }
                        }
                      }}
                    >
                      <CardHeader className="pb-2 pt-3 px-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-semibold leading-tight">
                              {isSellOffer ? 'Proposta de Compra' : 'Proposta de Venda'}
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5 line-clamp-1">
                              {offer.substance} • {proposal.proposerName}
                              {proposal.proposerCompany && ` • ${proposal.proposerCompany}`}
                            </CardDescription>
                          </div>
                          <Badge
                            variant={isPending ? "outline" : proposal.status === 'accepted' ? "default" : "destructive"}
                            className={`text-[10px] shrink-0 ${isPending ? "border-yellow-500 text-yellow-600" : ""}`}
                          >
                            {isPending ? 'Pendente' : proposal.status === 'accepted' ? 'Aceita' : proposal.status === 'rejected' ? 'Recusada' : 'Contraproposta'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 px-3 pb-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Quantidade</p>
                            <p className="text-sm font-semibold">
                              {proposal.quantity.toLocaleString()} {proposal.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Data</p>
                            <p className="text-xs">
                              {proposal.createdAt.toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          {proposal.productExpiryDate && (
                            <div>
                              <p className="text-xs text-muted-foreground">Validade</p>
                              <p className="text-xs">
                                {proposal.productExpiryDate.toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          )}
                          {proposal.counterProposalQuantity && (
                            <div>
                              <p className="text-xs text-muted-foreground">Contraproposta</p>
                              <p className="text-xs">
                                {proposal.counterProposalQuantity.toLocaleString()} {proposal.unit}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Exibição de Acordo */}
                        {proposal.isAgreement && (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-primary border-primary text-[10px]">
                                Acordo Proposto
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Dinheiro (PIX):</p>
                                <p className="text-sm font-semibold text-green-600">
                                  {formatCurrency(proposal.cashAmount || 0)}
                                </p>
                              </div>
                              {proposal.tradeSubstanceName && proposal.tradeQuantity && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Matéria-prima:</p>
                                  <p className="text-xs font-semibold line-clamp-1">
                                    {proposal.tradeQuantity.toLocaleString()} {proposal.tradeUnit} de {proposal.tradeSubstanceName}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="pt-1 border-t">
                              <p className="text-[10px] text-muted-foreground">
                                Total: {formatCurrency(
                                  proposal.quantity * (isSellOffer ? (offer as typeof sellOffers[0]).pricePerUnit : (offer as typeof buyOffers[0]).maxPrice!)
                                )}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Motivo da rejeição */}
                        {proposal.status === 'rejected' && proposal.rejectionReason && (
                          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2">
                            <p className="text-xs font-medium text-destructive">Motivo da rejeição:</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{proposal.rejectionReason}</p>
                          </div>
                        )}

                        {isPending && (
                          <div className="flex gap-1.5 pt-2">
                            <Button
                              size="sm"
                              className="flex-1 gradient-primary text-primary-foreground h-7 text-xs"
                              onClick={() => {
                                // Aceitar proposta
                                setProposals((prev) =>
                                  prev.map((p) => {
                                    if (p.id === proposal.id) {
                                      const updated = {
                                        ...p,
                                        status: 'accepted' as const,
                                        respondedAt: new Date(),
                                        substanceId: offer.substanceId || (offer as any).substanceId,
                                        substanceName: offer.substance,
                                      };
                                      return updated;
                                    }
                                    return p;
                                  })
                                );
                                toast({
                                  title: 'Proposta aceita',
                                  description: `A proposta de ${proposal.proposerName} foi aceita.`,
                                });
                              }}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Aceitar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-destructive hover:text-destructive h-7 text-xs"
                              onClick={() => {
                                // Abrir dialog para recusar com motivo
                                const rejectionReason = proposal.isAgreement
                                  ? 'Só aceito dinheiro'
                                  : undefined;

                                setProposals((prev) =>
                                  prev.map((p) =>
                                    p.id === proposal.id
                                      ? {
                                        ...p,
                                        status: 'rejected' as const,
                                        respondedAt: new Date(),
                                        rejectionReason: rejectionReason,
                                      }
                                      : p
                                  )
                                );
                                toast({
                                  title: 'Proposta recusada',
                                  description: proposal.isAgreement
                                    ? `A proposta de ${proposal.proposerName} foi recusada. Você indicou que só aceita dinheiro.`
                                    : `A proposta de ${proposal.proposerName} foi recusada.`,
                                });
                              }}
                            >
                              <X className="mr-1 h-3 w-3" />
                              {proposal.isAgreement ? 'Recusar (Só aceito dinheiro)' : 'Recusar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-7 text-xs"
                              onClick={() => {
                                // Abrir dialog de contraproposta
                                // TODO: Implementar dialog de contraproposta
                                toast({
                                  title: 'Contraproposta',
                                  description: 'Funcionalidade de contraproposta em desenvolvimento.',
                                });
                              }}
                            >
                              <Edit className="mr-1 h-3 w-3" />
                              Contraproposta
                            </Button>
                          </div>
                        )}

                        {/* QR Code PIX para pagamento (quando proposta foi aceita e é oferta de venda) */}
                        {proposal.status === 'accepted' && isSellOffer && offer && !proposal.completedByProposer && (() => {
                          // Buscar dados do vendedor para obter chave PIX
                          const sellerId = (offer as typeof sellOffers[0]).userId;
                          let sellerPixKey: string | undefined;
                          let sellerPixBank: string | undefined;

                          // Tentar buscar do localStorage de usuários
                          try {
                            const usersStored = localStorage.getItem('magistral_users');
                            if (usersStored) {
                              const parsed = JSON.parse(usersStored);
                              const seller = parsed.find((u: any) => u.id === sellerId);
                              if (seller) {
                                sellerPixKey = seller.pixKey;
                                sellerPixBank = seller.pixBank;
                              }
                            }
                          } catch (e) {
                            console.error('Erro ao buscar dados do vendedor:', e);
                          }

                          // Se não encontrou, tentar do contexto de autenticação (se for o próprio usuário)
                          if (!sellerPixKey && sellerId === user?.id) {
                            sellerPixKey = user.pixKey;
                            sellerPixBank = user.pixBank;
                          }

                          if (!sellerPixKey) return null;

                          const totalValue = proposal.quantity * (offer as typeof sellOffers[0]).pricePerUnit;
                          const cashAmount = proposal.isAgreement && proposal.cashAmount ? proposal.cashAmount : totalValue;

                          // Gerar QR Code PIX
                          const generatePixQrCode = (pixKey: string, amount: number): string => {
                            const payload = {
                              pixKey,
                              amount: amount.toFixed(2),
                              description: `Pagamento: ${proposal.quantity.toLocaleString()} ${proposal.unit} de ${offer.substance} - ${proposal.proposerName}`,
                            };
                            const qrData = JSON.stringify(payload);
                            return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
                          };

                          return (
                            <div className="pt-2 border-t space-y-2">
                              <div className="rounded-lg border bg-primary/5 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-medium flex items-center gap-1.5">
                                    <QrCode className="h-3.5 w-3.5" />
                                    Pagamento PIX
                                  </Label>
                                  <Badge variant="outline" className="text-xs">
                                    {formatCurrency(cashAmount)}
                                  </Badge>
                                </div>
                                {sellerPixBank && (
                                  <p className="text-xs text-muted-foreground">
                                    Banco: {sellerPixBank}
                                  </p>
                                )}
                                <div className="flex justify-center bg-white p-2 rounded border">
                                  <img
                                    src={generatePixQrCode(sellerPixKey, cashAmount)}
                                    alt="QR Code PIX"
                                    className="w-32 h-32"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 rounded bg-muted p-1.5">
                                    <p className="text-[10px] text-muted-foreground">Chave PIX</p>
                                    <p className="text-xs font-mono break-all">{sellerPixKey}</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      navigator.clipboard.writeText(sellerPixKey);
                                      toast({
                                        title: 'Chave PIX copiada',
                                        description: 'A chave PIX foi copiada para a área de transferência.',
                                      });
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <p className="text-[10px] text-center text-muted-foreground">
                                  Escaneie o QR Code ou copie a chave PIX para fazer o pagamento
                                </p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Botões para marcar como concluída (quando proposta foi aceita) */}
                        {proposal.status === 'accepted' && (
                          <div className="pt-2 border-t space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-medium">Concluída:</p>
                                {proposal.completedByOfferOwner && (
                                  <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] h-4">
                                    <CheckCircle className="mr-0.5 h-2.5 w-2.5" />
                                    Você
                                  </Badge>
                                )}
                                {proposal.completedByProposer && (
                                  <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] h-4">
                                    <CheckCircle className="mr-0.5 h-2.5 w-2.5" />
                                    {proposal.proposerName}
                                  </Badge>
                                )}
                              </div>
                              {!proposal.completedByOfferOwner && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs"
                                  onClick={() => {
                                    const allOffers = [...offers, ...buyOffersState];
                                    const offer = allOffers.find(o => o.id === proposal.offerId);
                                    if (!offer) return;

                                    const isCompleted = proposal.completedByProposer;

                                    setProposals((prev) => {
                                      const updated = prev.map((p) => {
                                        if (p.id === proposal.id) {
                                          const newProposal = {
                                            ...p,
                                            completedByOfferOwner: true,
                                            completedAt: isCompleted ? new Date() : p.completedAt,
                                          };

                                          // Se ambos marcaram, criar transação
                                          if (isCompleted) {
                                            const transaction: Transaction = {
                                              id: Date.now().toString(),
                                              proposalId: proposal.id,
                                              offerId: offer.id,
                                              offerType: offer.type,
                                              substanceId: proposal.substanceId || offer.substanceId || (offer as any).substanceId || '',
                                              substanceName: proposal.substanceName || offer.substance,
                                              quantity: proposal.quantity,
                                              unit: proposal.unit,
                                              pricePerUnit: offer.type === 'sell' ? (offer as any).pricePerUnit : undefined,
                                              totalPrice: offer.type === 'sell' ? (offer as any).pricePerUnit * proposal.quantity : undefined,
                                              sellerId: offer.type === 'sell' ? (offer as any).userId : proposal.proposerId,
                                              sellerName: offer.type === 'sell' ? (offer.seller || offer.buyer || '') : proposal.proposerName,
                                              buyerId: offer.type === 'sell' ? proposal.proposerId : (offer as any).userId,
                                              buyerName: offer.type === 'sell' ? proposal.proposerName : (offer.seller || offer.buyer || ''),
                                              laudoId: proposal.laudoId,
                                              laudoPdfUrl: proposal.laudoId ? (() => {
                                                // Buscar laudo do comprador
                                                const buyerLaudos = getUserLaudos(offer.type === 'sell' ? proposal.proposerId : (offer as any).userId);
                                                const laudo = buyerLaudos.find((l: any) => l.id === proposal.laudoId);
                                                return laudo?.pdfUrl;
                                              })() : undefined,
                                              laudoFileName: proposal.laudoId ? (() => {
                                                const buyerLaudos = getUserLaudos(offer.type === 'sell' ? proposal.proposerId : (offer as any).userId);
                                                const laudo = buyerLaudos.find((l: any) => l.id === proposal.laudoId);
                                                return laudo?.pdfFileName;
                                              })() : undefined,
                                              completedAt: new Date(),
                                              createdAt: proposal.createdAt,
                                            };
                                            setTransactions((prev) => [...prev, transaction]);
                                          }

                                          return newProposal;
                                        }
                                        return p;
                                      });
                                      return updated;
                                    });

                                    toast({
                                      title: isCompleted ? 'Transação concluída!' : 'Marcado como concluída',
                                      description: isCompleted
                                        ? 'Ambos marcaram como concluída. A transação foi adicionada ao histórico.'
                                        : 'Aguarde o outro usuário marcar como concluída.',
                                    });
                                  }}
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Concluir
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>

        {/* Aba de Propostas Enviadas */}
        {user && (
          <TabsContent value="sent-proposals" className="space-y-4">
            {(() => {
              const sentProposals = proposals
                .filter(p => {
                  // Verificar por ID primeiro
                  if (p.proposerId === user.id) return true;
                  // Fallback: verificar por nome/company se o ID não corresponder
                  if (p.proposerName === user.name || p.proposerCompany === user.company) {
                    return true;
                  }
                  return false;
                })
                .sort((a, b) => getCreatedAtDate(b).getTime() - getCreatedAtDate(a).getTime());

              if (sentProposals.length === 0) {
                return (
                  <Card className="card-pharmaceutical">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 text-lg font-semibold">Nenhuma negociação iniciada</h3>
                      <p className="mt-1 text-center text-muted-foreground">
                        Suas negociações aparecerão aqui
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              const allOffers = [...offers, ...buyOffersState];

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sentProposals.map((proposal) => {
                    const offer = allOffers.find(o => o.id === proposal.offerId);
                    const isAccepted = proposal.status === 'accepted';
                    const isSellOffer = offer ? offer.type === 'sell' : proposal.offerType === 'sell';

                    return (
                      <Card
                        key={proposal.id}
                        className="card-pharmaceutical cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={(e) => {
                          // Não abrir se clicar em botões ou links
                          const target = e.target as HTMLElement;
                          if (target.closest('button, a, [role="button"]')) {
                            return;
                          }
                          setSelectedProposalForDetails(proposal);
                          // Calcular valores iniciais
                          if (offer) {
                            const totalValue = proposal.quantity * (isSellOffer ? (offer as typeof sellOffers[0]).pricePerUnit : (offer as typeof buyOffers[0]).maxPrice!);
                            if (proposal.isAgreement && proposal.cashAmount) {
                              setProposalDetailsPaymentType('mixed');
                              setProposalDetailsCashAmount(proposal.cashAmount.toString());
                            } else {
                              setProposalDetailsPaymentType('money');
                              setProposalDetailsCashAmount(totalValue.toString());
                            }
                          }
                        }}
                      >
                        <CardHeader className="pb-2 pt-3 px-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm font-semibold leading-tight">
                                {isSellOffer ? 'Proposta de Compra' : 'Proposta de Venda'}
                              </CardTitle>
                              <CardDescription className="text-xs mt-0.5 line-clamp-1">
                                {offer ? (
                                  <>
                                    {offer.substance} • {isSellOffer ? (offer as typeof sellOffers[0]).seller : (offer as typeof buyOffers[0]).buyer}
                                  </>
                                ) : (
                                  <>
                                    {proposal.substanceName || 'Matéria-prima não especificada'} • Oferta removida
                                  </>
                                )}
                              </CardDescription>
                            </div>
                            <Badge
                              variant={proposal.status === 'pending' ? "outline" : proposal.status === 'accepted' ? "default" : "destructive"}
                              className={`text-[10px] shrink-0 ${proposal.status === 'pending' ? "border-yellow-500 text-yellow-600" : ""}`}
                            >
                              {proposal.status === 'pending' ? 'Pendente' : proposal.status === 'accepted' ? 'Aceita' : proposal.status === 'rejected' ? 'Recusada' : 'Contraproposta'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 px-3 pb-3">
                          {!offer && (
                            <div className="rounded-lg border border-warning/20 bg-warning/5 p-2 mb-2">
                              <p className="text-xs text-warning-foreground">
                                ⚠️ A oferta relacionada não foi encontrada. Ela pode ter sido removida ou expirada.
                              </p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Matéria-prima</p>
                              <p className="text-sm font-semibold line-clamp-1">
                                {offer ? offer.substance : (proposal.substanceName || 'Não especificada')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Quantidade</p>
                              <p className="text-sm font-semibold">
                                {proposal.quantity.toLocaleString()} {proposal.unit}
                              </p>
                            </div>
                            {offer && (
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {isSellOffer ? 'Vendedor' : 'Comprador'}
                                </p>
                                <p className="text-xs font-medium line-clamp-1">
                                  {isSellOffer ? (offer as typeof sellOffers[0]).seller : (offer as typeof buyOffers[0]).buyer}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-muted-foreground">Data</p>
                              <p className="text-xs">
                                {proposal.createdAt.toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            {offer && (
                              <div>
                                <p className="text-xs text-muted-foreground">Preço</p>
                                <p className="text-sm font-semibold text-primary">
                                  {formatCurrency(
                                    isSellOffer
                                      ? (offer as typeof sellOffers[0]).pricePerUnit
                                      : (offer as typeof buyOffers[0]).maxPrice!
                                  )}/{proposal.unit}
                                </p>
                              </div>
                            )}
                            {offer && (
                              <div>
                                <p className="text-xs text-muted-foreground">Valor Total</p>
                                <p className="text-sm font-semibold text-green-600">
                                  {formatCurrency(
                                    proposal.quantity * (
                                      isSellOffer
                                        ? (offer as typeof sellOffers[0]).pricePerUnit
                                        : (offer as typeof buyOffers[0]).maxPrice!
                                    )
                                  )}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Exibição de Acordo */}
                          {proposal.isAgreement && (
                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-primary border-primary text-[10px]">
                                  Acordo Proposto
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs text-muted-foreground">Dinheiro (PIX):</p>
                                  <p className="text-sm font-semibold text-green-600">
                                    {formatCurrency(proposal.cashAmount || 0)}
                                  </p>
                                </div>
                                {proposal.tradeSubstanceName && proposal.tradeQuantity && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Matéria-prima:</p>
                                    <p className="text-xs font-semibold line-clamp-1">
                                      {proposal.tradeQuantity.toLocaleString()} {proposal.tradeUnit} de {proposal.tradeSubstanceName}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {offer && (
                                <div className="pt-1 border-t">
                                  <p className="text-[10px] text-muted-foreground">
                                    Total: {formatCurrency(
                                      proposal.quantity * (isSellOffer ? (offer as typeof sellOffers[0]).pricePerUnit : (offer as typeof buyOffers[0]).maxPrice!)
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Motivo da rejeição */}
                          {proposal.status === 'rejected' && proposal.rejectionReason && (
                            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2">
                              <p className="text-xs font-medium text-destructive">Motivo da rejeição:</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{proposal.rejectionReason}</p>
                            </div>
                          )}

                          {/* Botão para marcar como concluída (quando proposta foi aceita) */}
                          {isAccepted && offer && (
                            <div className="pt-2 border-t space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-medium">Concluída:</p>
                                  {proposal.completedByProposer && (
                                    <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] h-4">
                                      <CheckCircle className="mr-0.5 h-2.5 w-2.5" />
                                      Você
                                    </Badge>
                                  )}
                                  {proposal.completedByOfferOwner && (
                                    <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] h-4">
                                      <CheckCircle className="mr-0.5 h-2.5 w-2.5" />
                                      {isSellOffer ? offer.seller : offer.buyer}
                                    </Badge>
                                  )}
                                </div>
                                {!proposal.completedByProposer && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const isCompleted = proposal.completedByOfferOwner;

                                      setProposals((prev) => {
                                        const updated = prev.map((p) => {
                                          if (p.id === proposal.id) {
                                            const newProposal = {
                                              ...p,
                                              completedByProposer: true,
                                              completedAt: isCompleted ? new Date() : p.completedAt,
                                            };

                                            // Se ambos marcaram, criar transação
                                            if (isCompleted && offer) {
                                              const transaction: Transaction = {
                                                id: Date.now().toString(),
                                                proposalId: proposal.id,
                                                offerId: offer.id,
                                                offerType: offer.type,
                                                substanceId: proposal.substanceId || offer.substanceId || (offer as any).substanceId || '',
                                                substanceName: proposal.substanceName || offer.substance,
                                                quantity: proposal.quantity,
                                                unit: proposal.unit,
                                                pricePerUnit: offer.type === 'sell' ? (offer as any).pricePerUnit : undefined,
                                                totalPrice: offer.type === 'sell' ? (offer as any).pricePerUnit * proposal.quantity : undefined,
                                                sellerId: offer.type === 'sell' ? (offer as any).userId : proposal.proposerId,
                                                sellerName: offer.type === 'sell' ? (offer.seller || offer.buyer || '') : proposal.proposerName,
                                                buyerId: offer.type === 'sell' ? proposal.proposerId : (offer as any).userId,
                                                buyerName: offer.type === 'sell' ? proposal.proposerName : (offer.seller || offer.buyer || ''),
                                                laudoId: proposal.laudoId,
                                                laudoPdfUrl: proposal.laudoId ? (() => {
                                                  const buyerLaudos = getUserLaudos(offer.type === 'sell' ? proposal.proposerId : (offer as any).userId);
                                                  const laudo = buyerLaudos.find((l: any) => l.id === proposal.laudoId);
                                                  return laudo?.pdfUrl;
                                                })() : undefined,
                                                laudoFileName: proposal.laudoId ? (() => {
                                                  const buyerLaudos = getUserLaudos(offer.type === 'sell' ? proposal.proposerId : (offer as any).userId);
                                                  const laudo = buyerLaudos.find((l: any) => l.id === proposal.laudoId);
                                                  return laudo?.pdfFileName;
                                                })() : undefined,
                                                completedAt: new Date(),
                                                createdAt: proposal.createdAt,
                                              };
                                              setTransactions((prev) => [...prev, transaction]);
                                            }

                                            return newProposal;
                                          }
                                          return p;
                                        });
                                        return updated;
                                      });

                                      toast({
                                        title: isCompleted ? 'Transação concluída!' : 'Marcado como concluída',
                                        description: isCompleted
                                          ? 'Ambos marcaram como concluída. A transação foi adicionada ao histórico.'
                                          : 'Aguarde o outro usuário marcar como concluída.',
                                      });
                                    }}
                                  >
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Concluir
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>
        )}

        {/* Aba de Histórico de Transações */}
        {user && (
          <TabsContent value="history" className="space-y-4">
            {historyLoading ? (
              <Card className="card-pharmaceutical">
                <CardContent className="py-10 text-center text-muted-foreground">Carregando histórico...</CardContent>
              </Card>
            ) : historyError ? (
              <Card className="card-pharmaceutical">
                <CardContent className="py-10 text-center text-destructive">{historyError}</CardContent>
              </Card>
            ) : (historySuccessful.length + historyUnsuccessful.length) === 0 ? (
              <Card className="card-pharmaceutical">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhuma transação concluída</h3>
                  <p className="mt-1 text-center text-muted-foreground">Suas negociações aceitas ou recusadas aparecerão aqui</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="card-pharmaceutical overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-[980px] w-full table-fixed">
                    <TableHeader>
                      <TableRow className="table-header hover:bg-muted/50">
                        <TableHead className="w-[110px] text-[11px] py-1.5">Status</TableHead>
                        <TableHead className="w-[200px] text-[11px] py-1.5">Data</TableHead>
                        <TableHead className="w-[220px] text-[11px] py-1.5">Matéria-prima</TableHead>
                        <TableHead className="w-[130px] text-[11px] py-1.5">Quantidade</TableHead>
                        <TableHead className="w-[200px] text-[11px] py-1.5">Outra parte</TableHead>
                        <TableHead className="w-[140px] text-[11px] py-1.5">Resultado</TableHead>
                        <TableHead className="text-right w-[140px] text-[11px] py-1.5">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const rows: Array<
                          | { kind: 'successful'; at: Date; substanceName: string; quantityText: string; otherParty: string; resultLabel: string; id: string; item: Transaction }
                          | { kind: 'unsuccessful'; at: Date; substanceName: string; quantityText: string; otherParty: string; resultLabel: string; id: string; item: UnsuccessfulTransactionItem }
                        > = [];

                        for (const t of historySuccessful) {
                          const isSeller = t.sellerId === user.id;
                          const otherParty = isSeller ? t.buyerName : t.sellerName;
                          rows.push({
                            kind: 'successful',
                            id: `success-${t.id}`,
                            at: t.completedAt,
                            substanceName: t.substanceName,
                            quantityText: `${t.quantity.toLocaleString()} ${t.unit}`,
                            otherParty,
                            resultLabel: 'Concluída',
                            item: t,
                          });
                        }

                        for (const u of historyUnsuccessful) {
                          rows.push({
                            kind: 'unsuccessful',
                            id: `rejected-${u.id}`,
                            at: u.respondedAt ?? u.createdAt,
                            substanceName: u.substanceName,
                            quantityText: `${u.quantity.toLocaleString()} ${u.unit}`,
                            otherParty: u.otherPartyName,
                            resultLabel: 'Recusada',
                            item: u,
                          });
                        }

                        rows.sort((a, b) => b.at.getTime() - a.at.getTime());

                        return rows.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              {r.kind === 'successful' ? (
                                <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                  OK
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-red-300 text-red-700">
                                  <X className="mr-1 h-3.5 w-3.5" />
                                  Falhou
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.at.toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </TableCell>
                            <TableCell className="font-medium truncate">{r.substanceName}</TableCell>
                            <TableCell className="text-sm">{r.quantityText}</TableCell>
                            <TableCell className="text-sm truncate">{r.otherParty}</TableCell>
                            <TableCell>
                              {r.kind === 'successful' ? (
                                <span className="text-emerald-700 text-sm font-medium">Bem-sucedida</span>
                              ) : (
                                <span className="text-red-700 text-sm font-medium">Mal-sucedida</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (r.kind === 'successful') {
                                    setHistoryDetailsItem({ kind: 'successful', item: r.item });
                                  } else {
                                    setHistoryDetailsItem({ kind: 'unsuccessful', item: r.item });
                                  }
                                  setHistoryDetailsOpen(true);
                                }}
                              >
                                Ver detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            <Dialog
              open={historyDetailsOpen}
              onOpenChange={(open) => {
                setHistoryDetailsOpen(open);
                if (!open) setHistoryDetailsItem(null);
              }}
            >
              <DialogContent className="sm:max-w-[740px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Detalhes da negociação</DialogTitle>
                  <DialogDescription>Último estado da proposta (o que foi oferecido em troca do quê).</DialogDescription>
                </DialogHeader>

                {(() => {
                  if (!historyDetailsItem || !user) return null;

                  const isSuccess = historyDetailsItem.kind === 'successful';
                  const proposal = historyDetailsItem.item.proposal;

                  const titleLine = isSuccess
                    ? 'Transação concluída'
                    : 'Proposta recusada';

                  const meIsBuyer =
                    historyDetailsItem.kind === 'successful'
                      ? historyDetailsItem.item.buyerId === user.id
                      : historyDetailsItem.item.role === 'proposer'
                        ? historyDetailsItem.item.offerType === 'sell'
                          ? true
                          : false
                        : historyDetailsItem.item.offerType === 'sell'
                          ? false
                          : true;

                  const substanceName =
                    historyDetailsItem.kind === 'successful'
                      ? historyDetailsItem.item.substanceName
                      : historyDetailsItem.item.substanceName;

                  const quantity =
                    historyDetailsItem.kind === 'successful'
                      ? historyDetailsItem.item.quantity
                      : historyDetailsItem.item.quantity;

                  const unit =
                    historyDetailsItem.kind === 'successful'
                      ? historyDetailsItem.item.unit
                      : (historyDetailsItem.item.unit as any);

                  const cashText = (() => {
                    if (proposal?.cashAmount != null) {
                      return `R$ ${proposal.cashAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    }
                    if (historyDetailsItem.kind === 'successful' && historyDetailsItem.item.totalPrice != null) {
                      return `R$ ${historyDetailsItem.item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    }
                    return '—';
                  })();

                  const tradeText = proposal?.tradeSubstanceName
                    ? `${proposal.tradeSubstanceName} • ${proposal.tradeQuantity?.toLocaleString() ?? '—'} ${proposal.tradeUnit ?? ''}`.trim()
                    : null;

                  const youReceive = meIsBuyer
                    ? [{ label: 'Matéria-prima', value: `${substanceName} • ${quantity.toLocaleString()} ${unit}` }]
                    : [
                      { label: 'Dinheiro (PIX)', value: cashText },
                      ...(tradeText ? [{ label: 'Matéria-prima (acordo)', value: tradeText }] : []),
                    ];

                  const youGive = meIsBuyer
                    ? [
                      { label: 'Dinheiro (PIX)', value: cashText },
                      ...(tradeText ? [{ label: 'Matéria-prima (acordo)', value: tradeText }] : []),
                    ]
                    : [{ label: 'Matéria-prima', value: `${substanceName} • ${quantity.toLocaleString()} ${unit}` }];

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {isSuccess ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                          ) : (
                            <X className="h-5 w-5 text-red-700" />
                          )}
                          <p className="font-medium">{titleLine}</p>
                        </div>
                        {historyDetailsItem.kind === 'successful' && historyDetailsItem.item.completedAt && (
                          <Badge variant="outline" className="text-xs">
                            {historyDetailsItem.item.completedAt.toLocaleDateString('pt-BR')}
                          </Badge>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Card className="card-pharmaceutical">
                          <CardHeader className="p-3">
                            <CardTitle className="text-sm">Você oferece</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0 space-y-2">
                            {youGive.map((x) => (
                              <div key={x.label}>
                                <p className="text-xs text-muted-foreground">{x.label}</p>
                                <p className="text-sm font-medium">{x.value}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        <Card className="card-pharmaceutical">
                          <CardHeader className="p-3">
                            <CardTitle className="text-sm">Você recebe</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0 space-y-2">
                            {youReceive.map((x) => (
                              <div key={x.label}>
                                <p className="text-xs text-muted-foreground">{x.label}</p>
                                <p className="text-sm font-medium">{x.value}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </div>

                      {!isSuccess && historyDetailsItem.kind === 'unsuccessful' && historyDetailsItem.item.rejectionReason && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3">
                          <p className="text-xs font-medium text-red-700 mb-1">Motivo da recusa</p>
                          <p className="text-sm text-red-700">{historyDetailsItem.item.rejectionReason}</p>
                        </div>
                      )}

                      {historyDetailsItem.kind === 'successful' && historyDetailsItem.item.laudoPdfUrl && (
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            onClick={() => window.open(historyDetailsItem.item.laudoPdfUrl!, '_blank', 'noopener,noreferrer')}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            {historyDetailsItem.item.laudoFileName || 'Ver laudo'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        <TabsContent value="my-offers" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dados sumiram?{' '}
            <button type="button" onClick={restoreOffersFromBackup} className="text-primary underline hover:no-underline">
              Restaurar último backup de ofertas
            </button>
          </p>
          <Tabs
            defaultValue={
              (myActiveSellOffers.length + myActiveBuyOffers.length) > 0 ? "active" :
                (pausedSellOffers.length + pausedBuyOffers.length) > 0 ? "paused" :
                  (expiredSellOffers.length + expiredBuyOffers.length) > 0 ? "expired" : "active"
            }
            className="space-y-4"
          >
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="active" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Ativas ({myActiveSellOffers.length + myActiveBuyOffers.length})
              </TabsTrigger>
              <TabsTrigger value="paused" className="gap-2">
                <Pause className="h-4 w-4" />
                Pausadas ({pausedSellOffers.length + pausedBuyOffers.length})
              </TabsTrigger>
              <TabsTrigger value="expired" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Expiradas ({expiredSellOffers.length + expiredBuyOffers.length})
              </TabsTrigger>
            </TabsList>

            {/* Ofertas Ativas */}
            <TabsContent value="active" className="space-y-4">
              {myActiveSellOffers.length > 0 && (
                <Card className="card-pharmaceutical overflow-hidden">
                  <CardHeader className="p-2">
                    <CardTitle className="text-base">Minhas Ofertas de Venda Ativas</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[675px] w-full table-fixed">
                      <TableHeader>
                        <TableRow className="table-header hover:bg-muted/50">
                          <TableHead className="w-[140px] text-[11px] py-1.5">Substância</TableHead>
                          <TableHead className="w-[100px] text-[11px] py-1.5">Vendedor</TableHead>
                          <TableHead className="w-[70px] text-[11px] py-1.5">Qtd</TableHead>
                          <TableHead className="w-[80px] text-[11px] py-1.5">Preço</TableHead>
                          <TableHead className="w-[85px] text-[11px] py-1.5">Validade</TableHead>
                          <TableHead className="w-[75px] text-[11px] py-1.5">Expira</TableHead>
                          <TableHead className="text-right w-[95px] text-[11px] py-1.5">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myActiveSellOffers
                          .sort((a, b) => {
                            const expA = getExpirationDate(a).getTime();
                            const expB = getExpirationDate(b).getTime();
                            return expA - expB;
                          })
                          .map((offer) => {
                            const expirationDate = getExpirationDate(offer);
                            const isExpired = isOfferExpired(offer);
                            return (
                              <TableRow key={offer.id} className="animate-fade-in">
                                <TableCell className="py-1">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleFollowSubstance(offer.substance)}
                                      className={`h-5 w-5 p-0 ${isFollowingSubstance(offer.substance) ? 'text-warning' : ''}`}
                                      title={isFollowingSubstance(offer.substance) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                                    >
                                      <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(offer.substance) ? 'fill-warning' : ''}`} />
                                    </Button>
                                    <span className="text-[11px] font-medium leading-tight line-clamp-2">{offer.substance}</span>
                                    {(offer as any).rawMaterialId && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-orange-400 bg-orange-50 text-orange-700 whitespace-nowrap ml-1">
                                        Excesso
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-1">
                                  <div className="flex items-center gap-1">
                                    <div className="h-5 w-5 flex items-center justify-center">
                                      <Users className="h-3.5 w-3.5 opacity-0" />
                                    </div>
                                    <span className="text-[11px] text-muted-foreground truncate block">{(offer as typeof sellOffers[0]).seller}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-[11px] font-semibold whitespace-nowrap">
                                    {offer.quantity.toLocaleString()}{offer.unit}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-[11px] font-semibold text-primary whitespace-nowrap">
                                    {formatCurrency((offer as typeof sellOffers[0]).pricePerUnit)}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    {formatDate((offer as typeof sellOffers[0]).expiryDate)}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <div className="flex items-center gap-0.5">
                                    <span className={`text-[11px] whitespace-nowrap ${isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                      {formatDate(expirationDate)}
                                    </span>
                                    {isExpired && (
                                      <Badge variant="destructive" className="text-[9px] px-0.5 py-0 h-3">Exp</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-1">
                                  <div className="flex items-center justify-end gap-0.5">
                                    {canEditOffer(offer) && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setOffers((prev) =>
                                              prev.map((o) =>
                                                o.id === offer.id
                                                  ? { ...o, status: 'paused' as const }
                                                  : o
                                              )
                                            );
                                            toast({
                                              title: 'Oferta pausada',
                                              description: 'A oferta foi pausada e não aparecerá mais nas ofertas ativas.',
                                            });
                                          }}
                                          className="h-6 w-6 p-0"
                                          title="Pausar oferta"
                                        >
                                          <Pause className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEditOffer(offer)}
                                          className="h-6 w-6 p-0"
                                          title="Editar"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setOfferToDelete(offer)}
                                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                          title="Remover"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
              {myActiveBuyOffers.length > 0 && (
                <Card className="card-pharmaceutical overflow-hidden">
                  <CardHeader className="p-2">
                    <CardTitle className="text-base">Minhas Ofertas de Compra Ativas</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[675px] w-full table-fixed">
                      <TableHeader>
                        <TableRow className="table-header hover:bg-muted/50">
                          <TableHead className="w-[140px] text-[11px] py-1.5">Substância</TableHead>
                          <TableHead className="w-[100px] text-[11px] py-1.5">Comprador</TableHead>
                          <TableHead className="w-[70px] text-[11px] py-1.5">Qtd</TableHead>
                          <TableHead className="w-[80px] text-[11px] py-1.5">Preço Máx</TableHead>
                          <TableHead className="w-[85px] text-[11px] py-1.5 font-semibold">Val. Mín</TableHead>
                          <TableHead className="w-[75px] text-[11px] py-1.5">Expira</TableHead>
                          <TableHead className="text-right w-[95px] text-[11px] py-1.5">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myActiveBuyOffers
                          .sort((a, b) => {
                            const expA = getExpirationDate(a).getTime();
                            const expB = getExpirationDate(b).getTime();
                            return expA - expB;
                          })
                          .map((offer) => {
                            const expirationDate = getExpirationDate(offer);
                            const isExpired = isOfferExpired(offer);
                            return (
                              <TableRow key={offer.id} className="animate-fade-in">
                                <TableCell className="py-1">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleFollowSubstance(offer.substance)}
                                      className={`h-5 w-5 p-0 ${isFollowingSubstance(offer.substance) ? 'text-warning' : ''}`}
                                      title={isFollowingSubstance(offer.substance) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                                    >
                                      <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(offer.substance) ? 'fill-warning' : ''}`} />
                                    </Button>
                                    <span className="text-[11px] font-medium leading-tight line-clamp-2">{offer.substance}</span>
                                    {(offer as any).rawMaterialId && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-orange-400 bg-orange-50 text-orange-700 whitespace-nowrap ml-1">
                                        Excesso
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-1">
                                  <div className="flex items-center gap-1">
                                    <div className="h-5 w-5 flex items-center justify-center">
                                      <Users className="h-3.5 w-3.5 opacity-0" />
                                    </div>
                                    <span className="text-[11px] text-muted-foreground truncate block">{(offer as typeof buyOffers[0]).buyer}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-[11px] font-semibold whitespace-nowrap">
                                    {offer.quantity.toLocaleString()}{offer.unit}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-[11px] font-semibold text-accent whitespace-nowrap">
                                    {formatCurrency((offer as typeof buyOffers[0]).maxPrice!)}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <Badge variant="outline" className="text-[10px] px-1 py-0.5 h-5 font-semibold border-primary/30 text-primary whitespace-nowrap">
                                    {(offer as typeof buyOffers[0]).minValidityMonths}m
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-1">
                                  <div className="flex items-center gap-0.5">
                                    <span className={`text-[11px] whitespace-nowrap ${isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                      {formatDate(expirationDate)}
                                    </span>
                                    {isExpired && (
                                      <Badge variant="destructive" className="text-[9px] px-0.5 py-0 h-3">Exp</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-1">
                                  <div className="flex items-center justify-end gap-0.5">
                                    {canEditOffer(offer) && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setBuyOffersState((prev) =>
                                              prev.map((o) =>
                                                o.id === offer.id
                                                  ? { ...o, status: 'paused' as const }
                                                  : o
                                              )
                                            );
                                            toast({
                                              title: 'Oferta pausada',
                                              description: 'A oferta foi pausada e não aparecerá mais nas ofertas ativas.',
                                            });
                                          }}
                                          className="h-6 w-6 p-0"
                                          title="Pausar oferta"
                                        >
                                          <Pause className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEditOffer(offer)}
                                          className="h-6 w-6 p-0"
                                          title="Editar"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setOfferToDelete(offer)}
                                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                          title="Remover"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
              {myActiveSellOffers.length === 0 && myActiveBuyOffers.length === 0 && (
                <Card className="card-pharmaceutical">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Você não possui ofertas ativas
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Ofertas Pausadas */}
            <TabsContent value="paused" className="space-y-4">
              {(() => {
                const sortedPausedSellOffers = pausedSellOffers.sort((a, b) =>
                  getCreatedAtDate(b).getTime() - getCreatedAtDate(a).getTime()
                );
                const sortedPausedBuyOffers = [...pausedBuyOffers].sort((a, b) =>
                  getCreatedAtDate(b).getTime() - getCreatedAtDate(a).getTime()
                );

                if (sortedPausedSellOffers.length === 0 && sortedPausedBuyOffers.length === 0) {
                  return (
                    <Card className="card-pharmaceutical">
                      <CardContent className="py-8 text-center text-muted-foreground">
                        Você não possui ofertas pausadas
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <>
                    {sortedPausedSellOffers.length > 0 && (
                      <Card className="card-pharmaceutical overflow-hidden">
                        <CardHeader>
                          <CardTitle className="text-base">Ofertas de Venda Pausadas</CardTitle>
                        </CardHeader>
                        <div className="overflow-x-auto">
                          <Table className="min-w-[675px] w-full table-fixed">
                            <TableHeader>
                              <TableRow className="table-header hover:bg-muted/50">
                                <TableHead className="w-[140px] text-[11px] py-1.5">Substância</TableHead>
                                <TableHead className="w-[100px] text-[11px] py-1.5">Vendedor</TableHead>
                                <TableHead className="w-[70px] text-[11px] py-1.5">Qtd</TableHead>
                                <TableHead className="w-[80px] text-[11px] py-1.5">Preço</TableHead>
                                <TableHead className="w-[85px] text-[11px] py-1.5">Validade</TableHead>
                                <TableHead className="text-right w-[140px] text-[11px] py-1.5">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedPausedSellOffers.map((offer) => (
                                <TableRow key={offer.id} className="animate-fade-in">
                                  <TableCell className="py-1">
                                    <span className="text-[11px] font-medium leading-tight line-clamp-2">{offer.substance}</span>
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <span className="text-[11px] text-muted-foreground truncate block">{(offer as typeof sellOffers[0]).seller}</span>
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <span className="text-[11px] font-semibold whitespace-nowrap">
                                      {offer.quantity.toLocaleString()}{offer.unit}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <span className="text-[11px] font-semibold text-primary whitespace-nowrap">
                                      {formatCurrency((offer as typeof sellOffers[0]).pricePerUnit)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                      {formatDate((offer as typeof sellOffers[0]).expiryDate)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right py-1">
                                    <div className="flex items-center justify-end gap-0.5">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setOffers((prev) =>
                                            prev.map((o) =>
                                              o.id === offer.id
                                                ? { ...o, status: 'active' as const }
                                                : o
                                            )
                                          );
                                          toast({
                                            title: 'Oferta reativada',
                                            description: 'A oferta foi reativada e está disponível novamente.',
                                          });
                                        }}
                                        className="h-6 text-[10px] px-1.5"
                                        title="Reativar oferta"
                                      >
                                        <Play className="h-3 w-3 mr-1" />
                                        Reativar
                                      </Button>
                                      {canEditOffer(offer) && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditOffer(offer)}
                                            className="h-6 w-6 p-0"
                                            title="Editar"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setOfferToDelete(offer)}
                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                            title="Remover"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>
                    )}

                    {sortedPausedBuyOffers.length > 0 && (
                      <Card className="card-pharmaceutical overflow-hidden">
                        <CardHeader>
                          <CardTitle className="text-base">Ofertas de Compra Pausadas</CardTitle>
                        </CardHeader>
                        <div className="overflow-x-auto">
                          <Table className="min-w-[675px] w-full table-fixed">
                            <TableHeader>
                              <TableRow className="table-header hover:bg-muted/50">
                                <TableHead className="w-[140px] text-[11px] py-1.5">Substância</TableHead>
                                <TableHead className="w-[100px] text-[11px] py-1.5">Comprador</TableHead>
                                <TableHead className="w-[70px] text-[11px] py-1.5">Qtd</TableHead>
                                <TableHead className="w-[80px] text-[11px] py-1.5">Preço Máx</TableHead>
                                <TableHead className="w-[85px] text-[11px] py-1.5 font-semibold">Val. Mín</TableHead>
                                <TableHead className="text-right w-[140px] text-[11px] py-1.5">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedPausedBuyOffers.map((offer) => (
                                <TableRow key={offer.id} className="animate-fade-in">
                                  <TableCell className="py-1">
                                    <span className="text-[11px] font-medium leading-tight line-clamp-2">{offer.substance}</span>
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <span className="text-[11px] text-muted-foreground truncate block">{offer.buyer}</span>
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <span className="text-[11px] font-semibold whitespace-nowrap">
                                      {offer.quantity.toLocaleString()}{offer.unit}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <span className="text-[11px] font-semibold text-accent whitespace-nowrap">
                                      {formatCurrency(offer.maxPrice!)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <Badge variant="outline" className="text-[10px] px-1 py-0.5 h-5 font-semibold border-primary/30 text-primary whitespace-nowrap">
                                      {offer.minValidityMonths}{offer.minValidityMonths === 1 ? 'm' : 'm'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right py-1">
                                    <div className="flex items-center justify-end gap-0.5">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setBuyOffersState((prev) =>
                                            prev.map((o) =>
                                              o.id === offer.id
                                                ? { ...o, status: 'active' as const }
                                                : o
                                            )
                                          );
                                          toast({
                                            title: 'Oferta reativada',
                                            description: 'A oferta foi reativada e está disponível novamente.',
                                          });
                                        }}
                                        className="h-6 text-[10px] px-1.5"
                                        title="Reativar oferta"
                                      >
                                        <Play className="h-3 w-3 mr-1" />
                                        Reativar
                                      </Button>
                                      {canEditOffer(offer) && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditOffer(offer)}
                                            className="h-6 w-6 p-0"
                                            title="Editar"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setOfferToDelete(offer)}
                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                            title="Remover"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>
                    )}
                  </>
                );
              })()}
            </TabsContent>

            {/* Ofertas Expiradas */}

            <TabsContent value="expired" className="space-y-4">
              {sortedExpiredSellOffers.length > 0 && (
                <Card className="card-pharmaceutical overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base">Ofertas de Venda Expiradas</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[675px] w-full table-fixed">
                      <TableHeader>
                        <TableRow className="table-header hover:bg-muted/50">
                          <TableHead className="w-[140px] text-[11px] py-1.5">Substância</TableHead>
                          <TableHead className="w-[100px] text-[11px] py-1.5">Vendedor</TableHead>
                          <TableHead className="w-[70px] text-[11px] py-1.5">Qtd</TableHead>
                          <TableHead className="w-[80px] text-[11px] py-1.5">Preço</TableHead>
                          <TableHead className="w-[85px] text-[11px] py-1.5">Validade</TableHead>
                          <TableHead className="w-[75px] text-[11px] py-1.5">Expirou em</TableHead>
                          <TableHead className="text-right w-[140px] text-[11px] py-1.5">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedExpiredSellOffers.map((offer) => {
                          const expirationDate = getExpirationDate(offer);
                          return (
                            <TableRow key={offer.id} className="animate-fade-in opacity-60">
                              <TableCell className="py-1">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleFollowSubstance(offer.substance)}
                                    className={`h-5 w-5 p-0 ${isFollowingSubstance(offer.substance) ? 'text-warning' : ''}`}
                                    title={isFollowingSubstance(offer.substance) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                                  >
                                    <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(offer.substance) ? 'fill-warning' : ''}`} />
                                  </Button>
                                  <span className="text-[11px] font-medium leading-tight line-clamp-2">{offer.substance}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-1">
                                <div className="flex items-center gap-1">
                                  <div className="h-5 w-5 flex items-center justify-center">
                                    <Users className="h-3.5 w-3.5 opacity-0" />
                                  </div>
                                  <span className="text-[11px] text-muted-foreground truncate block">{(offer as typeof sellOffers[0]).seller}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-1">
                                <span className="text-[11px] font-semibold whitespace-nowrap">
                                  {offer.quantity.toLocaleString()}{offer.unit}
                                </span>
                              </TableCell>
                              <TableCell className="py-1">
                                <span className="text-[11px] font-semibold text-primary whitespace-nowrap">
                                  {formatCurrency((offer as typeof sellOffers[0]).pricePerUnit)}
                                </span>
                              </TableCell>
                              <TableCell className="py-1">
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                  {formatDate((offer as typeof sellOffers[0]).expiryDate)}
                                </span>
                              </TableCell>
                              <TableCell className="py-1">
                                <span className="text-[11px] text-destructive whitespace-nowrap">
                                  {formatDate(expirationDate)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right py-1">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleExtendOffer(offer)}
                                    className="h-6 text-[10px] px-2 border-primary/30 text-primary hover:bg-primary/10"
                                    title="Prorrogar por mais 7 dias"
                                  >
                                    <RotateCw className="h-3 w-3 mr-1" />
                                    Prorrogar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setOfferToDelete(offer)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    title="Remover"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
              {sortedExpiredBuyOffers.length > 0 && (
                <Card className="card-pharmaceutical overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base">Ofertas de Compra Expiradas</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[675px] w-full table-fixed">
                      <TableHeader>
                        <TableRow className="table-header hover:bg-muted/50">
                          <TableHead className="w-[140px] text-[11px] py-1.5">Substância</TableHead>
                          <TableHead className="w-[100px] text-[11px] py-1.5">Comprador</TableHead>
                          <TableHead className="w-[70px] text-[11px] py-1.5">Qtd</TableHead>
                          <TableHead className="w-[80px] text-[11px] py-1.5">Preço Máx</TableHead>
                          <TableHead className="w-[85px] text-[11px] py-1.5 font-semibold">Val. Mín</TableHead>
                          <TableHead className="w-[75px] text-[11px] py-1.5">Expirou em</TableHead>
                          <TableHead className="text-right w-[140px] text-[11px] py-1.5">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedExpiredBuyOffers.map((offer) => {
                          const expirationDate = getExpirationDate(offer);
                          return (
                            <TableRow key={offer.id} className="animate-fade-in opacity-60">
                              <TableCell className="py-1">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleFollowSubstance(offer.substance)}
                                    className={`h-5 w-5 p-0 ${isFollowingSubstance(offer.substance) ? 'text-warning' : ''}`}
                                    title={isFollowingSubstance(offer.substance) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                                  >
                                    <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(offer.substance) ? 'fill-warning' : ''}`} />
                                  </Button>
                                  <span className="text-[11px] font-medium leading-tight line-clamp-2">{offer.substance}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-1">
                                <span className="text-[11px] text-muted-foreground truncate block">{(offer as typeof buyOffers[0]).buyer}</span>
                              </TableCell>
                              <TableCell className="py-1">
                                <span className="text-[11px] font-semibold whitespace-nowrap">
                                  {offer.quantity.toLocaleString()}{offer.unit}
                                </span>
                              </TableCell>
                              <TableCell className="py-1">
                                <span className="text-[11px] font-semibold text-accent whitespace-nowrap">
                                  {formatCurrency((offer as typeof buyOffers[0]).maxPrice!)}
                                </span>
                              </TableCell>
                              <TableCell className="py-1">
                                <Badge variant="outline" className="text-[10px] px-1 py-0.5 h-5 font-semibold border-primary/30 text-primary whitespace-nowrap">
                                  {(offer as typeof buyOffers[0]).minValidityMonths}m
                                </Badge>
                              </TableCell>
                              <TableCell className="py-1">
                                <span className="text-[11px] text-destructive whitespace-nowrap">
                                  {formatDate(expirationDate)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right py-1">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleExtendOffer(offer)}
                                    className="h-6 text-[10px] px-2 border-primary/30 text-primary hover:bg-primary/10"
                                    title="Prorrogar por mais 7 dias"
                                  >
                                    <RotateCw className="h-3 w-3 mr-1" />
                                    Prorrogar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setOfferToDelete(offer)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    title="Remover"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
              {sortedExpiredSellOffers.length === 0 && sortedExpiredBuyOffers.length === 0 && (
                <Card className="card-pharmaceutical">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Você não possui ofertas expiradas
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Ofertas Expiradas (Todos) Tab */}
        {(allExpiredSellOffers.length > 0 || allExpiredBuyOffers.length > 0) && (
          <TabsContent value="expired-all" className="space-y-4">
            {allExpiredSellOffers
              .sort((a, b) => getCreatedAtDate(b).getTime() - getCreatedAtDate(a).getTime())
              .length > 0 && (
                <Card className="card-pharmaceutical overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base">Ofertas de Venda Expiradas</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[675px] w-full table-fixed">
                      <TableHeader>
                        <TableRow className="table-header hover:bg-muted/50">
                          <TableHead className="w-[140px] text-[11px] py-1.5">Substância</TableHead>
                          <TableHead className="w-[100px] text-[11px] py-1.5">Vendedor</TableHead>
                          <TableHead className="w-[70px] text-[11px] py-1.5">Qtd</TableHead>
                          <TableHead className="w-[80px] text-[11px] py-1.5">Preço</TableHead>
                          <TableHead className="w-[85px] text-[11px] py-1.5">Validade</TableHead>
                          <TableHead className="w-[75px] text-[11px] py-1.5">Expirou em</TableHead>
                          <TableHead className="text-right w-[95px] text-[11px] py-1.5">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allExpiredSellOffers
                          .sort((a, b) => {
                            const dateA = getCreatedAtDate(a);
                            const dateB = getCreatedAtDate(b);
                            return dateB.getTime() - dateA.getTime();
                          })
                          .map((offer) => {
                            const expirationDate = getExpirationDate(offer);
                            const isOwner = user && (offer as any).userId === user.id;
                            return (
                              <TableRow key={offer.id} className="animate-fade-in opacity-60">
                                <TableCell className="py-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-medium leading-tight line-clamp-2">{offer.substance}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleFollowSubstance(offer.substance)}
                                      className={`h-5 w-5 p-0 ${isFollowingSubstance(offer.substance) ? 'text-warning' : ''}`}
                                      title={isFollowingSubstance(offer.substance) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                                    >
                                      <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(offer.substance) ? 'fill-warning' : ''}`} />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="py-1">
                                  <div className="flex items-center gap-1">
                                    <div className="h-5 w-5 flex items-center justify-center">
                                      <Users className="h-3.5 w-3.5 opacity-0" />
                                    </div>
                                    <span className="text-[11px] text-muted-foreground truncate block">{(offer as typeof sellOffers[0]).seller}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-[11px] font-semibold whitespace-nowrap">
                                    {offer.quantity.toLocaleString()}{offer.unit}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-[11px] font-semibold text-primary whitespace-nowrap">
                                    {formatCurrency((offer as typeof sellOffers[0]).pricePerUnit)}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    {formatDate((offer as typeof sellOffers[0]).expiryDate)}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-[11px] text-destructive whitespace-nowrap">
                                    {formatDate(expirationDate)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right py-1">
                                  <div className="flex items-center justify-end gap-0.5">
                                    {isOwner && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setOfferToDelete(offer)}
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                        title="Remover"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            {allExpiredBuyOffers
              .sort((a, b) => getCreatedAtDate(b).getTime() - getCreatedAtDate(a).getTime())
              .length > 0 && (
                <Card className="card-pharmaceutical overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base">Ofertas de Compra Expiradas</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[675px] w-full table-fixed">
                      <TableHeader>
                        <TableRow className="table-header hover:bg-muted/50">
                          <TableHead className="w-[140px] text-[11px] py-1.5">Substância</TableHead>
                          <TableHead className="w-[100px] text-[11px] py-1.5">Comprador</TableHead>
                          <TableHead className="w-[70px] text-[11px] py-1.5">Qtd</TableHead>
                          <TableHead className="w-[80px] text-[11px] py-1.5">Preço Máx</TableHead>
                          <TableHead className="w-[85px] text-[11px] py-1.5 font-semibold">Val. Mín</TableHead>
                          <TableHead className="w-[75px] text-[11px] py-1.5">Expirou em</TableHead>
                          <TableHead className="text-right w-[95px] text-[11px] py-1.5">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allExpiredBuyOffers
                          .sort((a, b) => {
                            const dateA = getCreatedAtDate(a);
                            const dateB = getCreatedAtDate(b);
                            return dateB.getTime() - dateA.getTime();
                          })
                          .map((offer) => {
                            const expirationDate = getExpirationDate(offer);
                            const isOwner = user && (offer as any).userId === user.id;
                            return (
                              <TableRow key={offer.id} className="animate-fade-in opacity-60">
                                <TableCell className="py-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-medium leading-tight line-clamp-2">{offer.substance}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleFollowSubstance(offer.substance)}
                                      className={`h-5 w-5 p-0 ${isFollowingSubstance(offer.substance) ? 'text-warning' : ''}`}
                                      title={isFollowingSubstance(offer.substance) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                                    >
                                      <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(offer.substance) ? 'fill-warning' : ''}`} />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="py-1">
                                  <div className="flex items-center gap-1">
                                    <div className="h-5 w-5 flex items-center justify-center">
                                      <Users className="h-3.5 w-3.5 opacity-0" />
                                    </div>
                                    <span className="text-[11px] text-muted-foreground truncate block">{(offer as typeof buyOffers[0]).buyer}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-[11px] font-semibold whitespace-nowrap">
                                    {offer.quantity.toLocaleString()}{offer.unit}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-[11px] font-semibold text-accent whitespace-nowrap">
                                    {formatCurrency((offer as typeof buyOffers[0]).maxPrice!)}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <Badge variant="outline" className="text-[10px] px-1 py-0.5 h-5 font-semibold border-primary/30 text-primary whitespace-nowrap">
                                    {(offer as typeof buyOffers[0]).minValidityMonths}m
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-[11px] text-destructive whitespace-nowrap">
                                    {formatDate(expirationDate)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right py-1">
                                  <div className="flex items-center justify-end gap-0.5">
                                    {isOwner && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setOfferToDelete(offer)}
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                        title="Remover"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            {allExpiredSellOffers.length === 0 && allExpiredBuyOffers.length === 0 && (
              <Card className="card-pharmaceutical">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma oferta expirada encontrada
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Rascunhos Tab */}
        {(draftSellOffers.length > 0 || draftBuyOffers.length > 0) && (
          <TabsContent value="drafts" className="space-y-4">
            <Card className="card-pharmaceutical">
              <CardHeader>
                <CardTitle className="text-lg">Rascunhos de Ofertas</CardTitle>
                <CardDescription>
                  Complete o cadastro do laudo na página de Laudos para publicar estas ofertas
                </CardDescription>
              </CardHeader>
            </Card>

            {draftSellOffers.length > 0 && (
              <Card className="card-pharmaceutical overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base">Ofertas de Venda em Rascunho</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow className="table-header hover:bg-muted/50">
                        <TableHead className="w-[200px] text-xs">Substância</TableHead>
                        <TableHead className="w-[100px] text-xs">Quantidade</TableHead>
                        <TableHead className="w-[120px] text-xs">Preço/Unidade</TableHead>
                        <TableHead className="w-[90px] text-xs">Status</TableHead>
                        <TableHead className="text-right w-[140px] text-xs">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draftSellOffers.map((offer) => (
                        <TableRow key={offer.id} className="animate-fade-in">
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFollowSubstance(offer.substance)}
                                className={`h-5 w-5 p-0 ${isFollowingSubstance(offer.substance) ? 'text-warning' : ''}`}
                                title={isFollowingSubstance(offer.substance) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                              >
                                <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(offer.substance) ? 'fill-warning' : ''}`} />
                              </Button>
                              <span className="text-xs font-medium">{offer.substance}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-xs whitespace-nowrap">
                              {offer.quantity.toLocaleString()} {offer.unit}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-xs whitespace-nowrap">
                              {formatCurrency((offer as typeof sellOffers[0]).pricePerUnit)}/{offer.unit}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="border-warning text-warning text-[10px] px-1.5 py-0">
                              Rascunho
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Retomar rascunho
                                  const substance = availableSubstances.find(
                                    (s) => s.name === offer.substance || (offer as any).substanceId === s.id
                                  );
                                  if (substance) {
                                    setSelectedSubstanceForOffer({ id: substance.id, name: substance.name });
                                    setEditSubstanceSearch(substance.name);
                                    setEditSubstance(substance.name);
                                  }
                                  setOfferType('sell');
                                  setEditQuantity(offer.quantity.toString());
                                  setEditUnit(offer.unit as any);
                                  setEditPrice((offer as typeof sellOffers[0]).pricePerUnit.toString());
                                  const expDate = (offer as typeof sellOffers[0]).expiryDate;
                                  setEditExpiryDate(
                                    expDate instanceof Date
                                      ? expDate.toISOString().split('T')[0]
                                      : typeof expDate === 'string' && expDate.includes('T')
                                        ? expDate.split('T')[0]
                                        : expDate || ''
                                  );
                                  setOfferToEdit(offer);
                                  setIsDialogOpen(true);
                                }}
                                className="h-7 text-xs px-2"
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Retomar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setOfferToDelete(offer)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {draftBuyOffers.length > 0 && (
              <Card className="card-pharmaceutical overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base">Ofertas de Compra em Rascunho</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow className="table-header hover:bg-muted/50">
                        <TableHead className="w-[200px] text-xs">Substância</TableHead>
                        <TableHead className="w-[100px] text-xs">Quantidade</TableHead>
                        <TableHead className="w-[120px] text-xs">Preço Máximo</TableHead>
                        <TableHead className="w-[90px] text-xs">Status</TableHead>
                        <TableHead className="text-right w-[140px] text-xs">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draftBuyOffers.map((offer) => (
                        <TableRow key={offer.id} className="animate-fade-in">
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFollowSubstance(offer.substance)}
                                className={`h-5 w-5 p-0 ${isFollowingSubstance(offer.substance) ? 'text-warning' : ''}`}
                                title={isFollowingSubstance(offer.substance) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                              >
                                <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(offer.substance) ? 'fill-warning' : ''}`} />
                              </Button>
                              <span className="text-xs font-medium">{offer.substance}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-xs whitespace-nowrap">
                              {offer.quantity.toLocaleString()} {offer.unit}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-xs whitespace-nowrap">
                              {formatCurrency((offer as typeof buyOffers[0]).maxPrice!)}/{offer.unit}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="border-warning text-warning text-[10px] px-1.5 py-0">
                              Rascunho
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Retomar rascunho
                                  const substance = availableSubstances.find(
                                    (s) => s.name === offer.substance || (offer as any).substanceId === s.id
                                  );
                                  if (substance) {
                                    setSelectedSubstanceForOffer({ id: substance.id, name: substance.name });
                                    setEditSubstanceSearch(substance.name);
                                    setEditSubstance(substance.name);
                                  }
                                  setOfferType('buy');
                                  setEditQuantity(offer.quantity.toString());
                                  setEditUnit(offer.unit as any);
                                  setEditPrice((offer as typeof buyOffers[0]).maxPrice!.toString());
                                  setMinValidityMonths((offer as typeof buyOffers[0]).minValidityMonths?.toString() || '6');
                                  setOfferToEdit(offer);
                                  setIsDialogOpen(true);
                                }}
                                className="h-7 text-xs px-2"
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Retomar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setOfferToDelete(offer)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog: última cotação (comparação de preço) */}
      <Dialog
        open={isLatestQuotationDialogOpen}
        onOpenChange={(open) => {
          setIsLatestQuotationDialogOpen(open);
          if (!open) setSelectedLatestQuotation(null);
        }}
      >
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Última cotação</DialogTitle>
            <DialogDescription>
              Comparação da oferta com a última cotação registrada.
            </DialogDescription>
          </DialogHeader>

          {selectedLatestQuotation ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-sm font-medium">{selectedLatestQuotation.substanceName}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedLatestQuotation.offerKind === 'buy' ? 'Oferta de compra (até):' : 'Oferta:'}{' '}
                  {formatCurrency(selectedLatestQuotation.offerPricePerUnit)}/{selectedLatestQuotation.offerUnit}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="card-pharmaceutical">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">Cotação</CardTitle>
                    <CardDescription className="text-xs">
                      {selectedLatestQuotation.quotation?.supplierName ?? 'Fornecedor'} •{' '}
                      {selectedLatestQuotation.quotation?.quotationDate
                        ? formatDate(new Date(selectedLatestQuotation.quotation.quotationDate))
                        : '—'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    <div className="text-xs">
                      <span className="text-muted-foreground">Validade da cotação: </span>
                      <span className="font-medium">
                        {selectedLatestQuotation.quotation?.validity
                          ? formatDate(new Date(selectedLatestQuotation.quotation.validity))
                          : '—'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Variações (qtd / preço)</p>
                      {(selectedLatestQuotation.quotation?.variations || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhuma variação registrada.</p>
                      ) : (
                        <div className="space-y-1">
                          {(selectedLatestQuotation.quotation?.variations || []).map((v: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                              <span className="font-medium">
                                {v.quantity} {v.unit}
                              </span>
                              <span className="text-green-700 font-semibold">{formatCurrency(v.price)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-pharmaceutical">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">Referência</CardTitle>
                    <CardDescription className="text-xs">
                      Menor preço por unidade-base da última cotação (para comparação)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    {selectedLatestQuotation.reference ? (
                      <>
                        <div className="text-xs">
                          <span className="text-muted-foreground">Preço por {selectedLatestQuotation.reference.baseUnit}: </span>
                          <span className="font-semibold">
                            {formatCurrency(selectedLatestQuotation.reference.pricePerBaseUnit)}/{selectedLatestQuotation.reference.baseUnit}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Baseado em: {selectedLatestQuotation.reference.variation.quantity}{' '}
                          {selectedLatestQuotation.reference.variation.unit} • {formatCurrency(selectedLatestQuotation.reference.variation.price)}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem referência calculável (variações inválidas ou ausentes).</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione uma oferta para ver a última cotação.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Proposta */}
      <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedOffer?.type === 'sell' ? 'Fazer Proposta de Compra' : 'Oferecer Produto para Venda'}
            </DialogTitle>
            <DialogDescription>
              {selectedOffer?.type === 'sell'
                ? `Informe a quantidade que deseja comprar de ${selectedOffer?.substance}`
                : `Informe a quantidade que você pode vender de ${selectedOffer?.substance}`}
            </DialogDescription>
          </DialogHeader>
          {selectedOffer && (
            <form onSubmit={handleSubmitProposal} className="space-y-6 py-4">
              {/* Informações da Oferta */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Substância:</span>
                  <span className="text-sm">{selectedOffer.substance}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quantidade disponível:</span>
                  <span className="text-sm">
                    {selectedOffer.quantity.toLocaleString()} {selectedOffer.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedOffer.type === 'sell' ? 'Preço por unidade:' : 'Preço máximo:'}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {formatCurrency(
                      selectedOffer.type === 'sell'
                        ? (selectedOffer as typeof sellOffers[0]).pricePerUnit
                        : (selectedOffer as typeof buyOffers[0]).maxPrice!
                    )}
                  </span>
                </div>
                {selectedOffer.type === 'buy' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Validade mínima exigida:</span>
                    <span className="text-sm">
                      <Badge variant="outline" className="text-xs">
                        {(selectedOffer as typeof buyOffers[0]).minValidityMonths} {(selectedOffer as typeof buyOffers[0]).minValidityMonths === 1 ? 'mês' : 'meses'}
                      </Badge>
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Vendedor/Comprador:</span>
                  <span className="text-sm">
                    {selectedOffer.type === 'sell'
                      ? (selectedOffer as typeof sellOffers[0]).seller
                      : (selectedOffer as typeof buyOffers[0]).buyer}
                  </span>
                </div>
              </div>

              {/* Seleção de Quantidade */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantidade que deseja {selectedOffer.type === 'sell' ? 'comprar' : 'vender'} ({selectedOffer.unit})
                  </Label>
                  <div className="space-y-3">
                    {/* Slider */}
                    <div className="px-2">
                      <Slider
                        id="quantity"
                        min={0}
                        max={selectedOffer.quantity}
                        step={selectedOffer.quantity >= 1000 ? 10 : 1}
                        value={proposalQuantity}
                        onValueChange={handleSliderChange}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0</span>
                        <span>{selectedOffer.quantity.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Input numérico */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={selectedOffer.quantity}
                        value={proposalQuantityInput}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder="Digite a quantidade"
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {selectedOffer.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Campo de Validade do Produto (apenas para ofertas de compra) */}
                {selectedOffer.type === 'buy' && (
                  <div className="space-y-2">
                    <Label htmlFor="productExpiry">
                      Data de Validade do Produto <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="productExpiry"
                      type="date"
                      value={proposalProductExpiry}
                      onChange={(e) => setProposalProductExpiry(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      O produto deve ter pelo menos {(selectedOffer as typeof buyOffers[0]).minValidityMonths} {(selectedOffer as typeof buyOffers[0]).minValidityMonths === 1 ? 'mês' : 'meses'} de validade
                    </p>
                  </div>
                )}

                {/* Opção de Acordo (apenas para ofertas de venda) */}
                {selectedOffer.type === 'sell' && (
                  <div className="space-y-4 pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isAgreement"
                        checked={isAgreement}
                        onCheckedChange={(checked) => setIsAgreement(checked === true)}
                      />
                      <Label htmlFor="isAgreement" className="text-sm font-medium cursor-pointer">
                        Fazer acordo (parte em dinheiro + parte em matéria-prima)
                      </Label>
                    </div>

                    {isAgreement && (
                      <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                        {/* Valor em dinheiro */}
                        <div className="space-y-2">
                          <Label htmlFor="cashAmount">
                            Valor em dinheiro (PIX) <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              R$
                            </span>
                            <Input
                              id="cashAmount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={agreementCashAmount}
                              onChange={(e) => setAgreementCashAmount(e.target.value)}
                              placeholder="0,00"
                              className="pl-10"
                              required={isAgreement}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Valor que será pago via PIX (deve ser menor que o valor total)
                          </p>
                        </div>

                        {/* Seleção de matéria-prima */}
                        <div className="space-y-2">
                          <Label htmlFor="agreementSubstance">
                            Matéria-prima para troca (com laudo cadastrado) <span className="text-destructive">*</span>
                          </Label>
                          <div className="space-y-2">
                            {selectedAgreementSubstance ? (
                              <div className="relative">
                                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 pr-10">
                                  <p className="font-medium text-sm">{selectedAgreementSubstance.name}</p>
                                  {selectedAgreementLaudo && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Laudo: {selectedAgreementLaudo.substanceName}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                                  onClick={() => {
                                    setSelectedAgreementSubstance(null);
                                    setSelectedAgreementLaudo(null);
                                    setAgreementSubstanceSearch('');
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Input
                                  id="agreementSubstance"
                                  placeholder="Buscar matéria-prima com laudo..."
                                  value={agreementSubstanceSearch}
                                  onChange={(e) => setAgreementSubstanceSearch(e.target.value)}
                                  required={isAgreement}
                                />
                                {agreementSubstanceSearch && (() => {
                                  // Buscar matérias-primas com laudos válidos do usuário
                                  const userLaudos = user ? getUserLaudos(user.id) : [];
                                  const validLaudos = userLaudos.filter((l: any) =>
                                    !l.isExpired &&
                                    l.expiryDate > new Date() &&
                                    l.pdfUrl &&
                                    l.substanceName.toLowerCase().includes(agreementSubstanceSearch.toLowerCase())
                                  );

                                  if (validLaudos.length > 0) {
                                    return (
                                      <div className="max-h-48 overflow-y-auto rounded-lg border bg-background">
                                        {validLaudos.map((laudo: any) => {
                                          const substance = availableSubstances.find(s => s.id === laudo.substanceId);
                                          if (!substance) return null;

                                          return (
                                            <button
                                              key={laudo.id}
                                              type="button"
                                              onClick={() => {
                                                setSelectedAgreementSubstance({ id: substance.id, name: substance.name });
                                                setSelectedAgreementLaudo({
                                                  id: laudo.id,
                                                  substanceId: substance.id,
                                                  substanceName: substance.name
                                                });
                                                setAgreementSubstanceSearch(substance.name);
                                              }}
                                              className="w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors"
                                            >
                                              <p className="font-medium">{substance.name}</p>
                                              <p className="text-xs text-muted-foreground">
                                                Lote: {laudo.batch} • Validade: {laudo.expiryDate.toLocaleDateString('pt-BR')}
                                              </p>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Quantidade da matéria-prima */}
                        {selectedAgreementSubstance && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="agreementQuantity">
                                Quantidade <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="agreementQuantity"
                                type="number"
                                min="0"
                                step="0.01"
                                value={agreementQuantity}
                                onChange={(e) => setAgreementQuantity(e.target.value)}
                                placeholder="0"
                                required={isAgreement}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="agreementUnit">Unidade</Label>
                              <Select value={agreementUnit} onValueChange={(value: 'g' | 'mL' | 'kg' | 'L') => setAgreementUnit(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="g">Gramas (g)</SelectItem>
                                  <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                                  <SelectItem value="mL">Mililitros (mL)</SelectItem>
                                  <SelectItem value="L">Litros (L)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Resumo da Proposta */}
                {proposalQuantity[0] > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                    <p className="text-sm font-medium">Resumo da Proposta:</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Quantidade:</span>
                      <span className="font-semibold">
                        {proposalQuantity[0].toLocaleString()} {selectedOffer.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {selectedOffer.type === 'sell' ? 'Preço unitário:' : 'Preço máximo:'}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(
                          selectedOffer.type === 'sell'
                            ? (selectedOffer as typeof sellOffers[0]).pricePerUnit
                            : (selectedOffer as typeof buyOffers[0]).maxPrice!
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-base font-bold text-primary pt-2 border-t">
                      <span>Valor Total:</span>
                      <span>
                        {formatCurrency(
                          proposalQuantity[0] * (
                            selectedOffer.type === 'sell'
                              ? (selectedOffer as typeof sellOffers[0]).pricePerUnit
                              : (selectedOffer as typeof buyOffers[0]).maxPrice!
                          )
                        )}
                      </span>
                    </div>

                    {/* Resumo do Acordo */}
                    {isAgreement && selectedOffer.type === 'sell' && agreementCashAmount && selectedAgreementSubstance && agreementQuantity && (
                      <div className="pt-3 mt-3 border-t space-y-2">
                        <p className="text-sm font-medium text-primary">Acordo Proposto:</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Em dinheiro (PIX):</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(parseFloat(agreementCashAmount) || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Em matéria-prima:</span>
                          <span className="font-semibold">
                            {parseFloat(agreementQuantity).toLocaleString()} {agreementUnit} de {selectedAgreementSubstance.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <span>Diferença:</span>
                          <span>
                            {formatCurrency(
                              (proposalQuantity[0] * (selectedOffer as typeof sellOffers[0]).pricePerUnit) - (parseFloat(agreementCashAmount) || 0)
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsProposalDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className={selectedOffer.type === 'sell'
                    ? 'gradient-primary text-primary-foreground'
                    : 'gradient-accent text-accent-foreground'}
                  disabled={proposalQuantity[0] <= 0}
                >
                  Enviar Proposta
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Remoção */}
      <AlertDialog open={!!offerToDelete} onOpenChange={(open) => !open && setOfferToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta oferta? Esta ação não pode ser desfeita.
              {offerToDelete && (
                <div className="mt-2 rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">{offerToDelete.substance}</p>
                  <p className="text-sm text-muted-foreground">
                    {offerToDelete.type === 'sell'
                      ? `Venda: ${offerToDelete.quantity.toLocaleString()} ${offerToDelete.unit} por ${formatCurrency((offerToDelete as typeof sellOffers[0]).pricePerUnit)}/${offerToDelete.unit}`
                      : `Compra: ${offerToDelete.quantity.toLocaleString()} ${offerToDelete.unit} até ${formatCurrency((offerToDelete as typeof buyOffers[0]).maxPrice!)}/${offerToDelete.unit}`}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => offerToDelete && handleDeleteOffer(offerToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Oferta Duplicada */}
      <AlertDialog open={!!duplicateOffer} onOpenChange={(open) => !open && setDuplicateOffer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oferta Similar Encontrada</AlertDialogTitle>
            <AlertDialogDescription>
              Você já possui uma oferta de {offerType === 'sell' ? 'venda' : 'compra'} para esta mesma matéria-prima com preço similar.
              {duplicateOffer && (
                <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Substância:</span>
                    <span className="text-sm">{duplicateOffer.offer.substance}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Preço:</span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(
                        offerType === 'sell'
                          ? (duplicateOffer.offer as typeof sellOffers[0]).pricePerUnit
                          : (duplicateOffer.offer as typeof buyOffers[0]).maxPrice!
                      )}
                      /{duplicateOffer.offer.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Quantidade atual:</span>
                    <span className="text-sm">{duplicateOffer.offer.quantity.toLocaleString()} {duplicateOffer.offer.unit}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Quantidade adicional:</span>
                    <span className="text-sm font-semibold text-primary">
                      +{duplicateOffer.newQuantity.toLocaleString()} {duplicateOffer.offer.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2 mt-2">
                    <span className="text-sm font-bold">Nova quantidade total:</span>
                    <span className="text-sm font-bold text-primary">
                      {(duplicateOffer.offer.quantity + duplicateOffer.newQuantity).toLocaleString()} {duplicateOffer.offer.unit}
                    </span>
                  </div>
                </div>
              )}
              <p className="mt-3 text-sm">
                Deseja aumentar a quantidade da oferta existente ao invés de criar uma nova?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDuplicateOffer(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDuplicateOffer}
              className="gradient-primary text-primary-foreground"
            >
              Sim, aumentar quantidade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Detalhes da Proposta */}
      <Dialog open={!!selectedProposalForDetails} onOpenChange={(open) => !open && setSelectedProposalForDetails(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto p-3">
          {selectedProposalForDetails && (() => {
            const proposal = selectedProposalForDetails;
            const allOffers = [...offers, ...buyOffersState];
            const offer = allOffers.find(o => o.id === proposal.offerId);
            if (!offer) return null;

            const isSellOffer = offer.type === 'sell';
            const totalValue = proposal.quantity * (isSellOffer ? (offer as typeof sellOffers[0]).pricePerUnit : (offer as typeof buyOffers[0]).maxPrice!);
            const isCurrentUserProposer = proposal.proposerId === user?.id;
            const otherUserId = isCurrentUserProposer ? (offer as any).userId : proposal.proposerId;
            const otherUserName = isCurrentUserProposer
              ? (isSellOffer ? (offer as typeof sellOffers[0]).seller : (offer as typeof buyOffers[0]).buyer)
              : proposal.proposerName;
            const otherUserCompany = isCurrentUserProposer
              ? undefined
              : proposal.proposerCompany;

            // Laudos do usuário atual
            const userLaudos = getUserLaudos(user?.id || '');
            const validUserLaudos = userLaudos.filter((l: any) => l.pdfUrl && !l.isExpired);

            // Buscar ofertas ativas do outro cooperado
            const otherUserOffers = [...offers, ...buyOffersState].filter((o: any) => {
              const offerUserId = (o as any).userId;
              return offerUserId === otherUserId && o.status === 'active';
            });

            // Função para verificar se a validade do laudo atende aos critérios da oferta
            const checkValidityMatch = (laudo: any, offer: any): { valid: boolean; reason?: string } => {
              if (offer.type === 'buy') {
                const minValidityMonths = (offer as typeof buyOffers[0]).minValidityMonths || 0;
                if (minValidityMonths > 0) {
                  const now = new Date();
                  const expiryDate = new Date(laudo.expiryDate);
                  const monthsUntilExpiry = Math.floor(
                    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
                  );

                  if (monthsUntilExpiry < minValidityMonths) {
                    return {
                      valid: false,
                      reason: `Validade mais curta do que o desejado (${minValidityMonths} meses)`
                    };
                  }
                }
              }
              return { valid: true };
            };

            // Encontrar correspondências entre ofertas do outro usuário e laudos do usuário atual
            const matchingProducts: Array<{
              offer: any;
              laudo: any;
              substanceName: string;
            }> = [];

            const invalidValidityProducts: Array<{
              offer: any;
              laudo: any;
              substanceName: string;
              reason: string;
            }> = [];

            otherUserOffers.forEach((otherOffer: any) => {
              // Buscar laudos do usuário atual que correspondem à matéria-prima da oferta
              const matchingLaudos = validUserLaudos.filter((laudo: any) => {
                // Comparar nomes de matéria-prima (case-insensitive, normalizado)
                const offerSubstance = otherOffer.substance.toLowerCase().trim();
                const laudoSubstance = laudo.substanceName.toLowerCase().trim();
                return offerSubstance === laudoSubstance ||
                  laudoSubstance.includes(offerSubstance) ||
                  offerSubstance.includes(laudoSubstance);
              });

              matchingLaudos.forEach((laudo: any) => {
                const validityCheck = checkValidityMatch(laudo, otherOffer);
                if (validityCheck.valid) {
                  matchingProducts.push({
                    offer: otherOffer,
                    laudo: laudo,
                    substanceName: laudo.substanceName
                  });
                } else {
                  invalidValidityProducts.push({
                    offer: otherOffer,
                    laudo: laudo,
                    substanceName: laudo.substanceName,
                    reason: validityCheck.reason || 'Validade não atende aos critérios'
                  });
                }
              });
            });

            // Calcular valor restante se misto
            const cashAmountNum = parseFloat(proposalDetailsCashAmount) || 0;
            const remainingValue = totalValue - cashAmountNum;

            return (
              <>
                <DialogHeader className="pb-1">
                  <DialogTitle className="text-base">Detalhes da Proposta</DialogTitle>
                  <DialogDescription className="text-xs">
                    {isSellOffer ? 'Proposta de Compra' : 'Proposta de Venda'} • {offer.substance}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-2 mt-0">
                  {/* Lado Esquerdo - Usuário Atual */}
                  <div className="space-y-1.5 border-r pr-2">
                    <div>
                      <h3 className="text-xs font-semibold">{user?.name || user?.company}</h3>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          if (isCurrentUserProposer) {
                            // Se o usuário é o proponente
                            return isSellOffer ? 'Você está comprando' : 'Você está vendendo';
                          } else {
                            // Se o usuário está recebendo a proposta
                            return isSellOffer ? 'Você está vendendo' : 'Você está comprando';
                          }
                        })()}
                      </p>
                    </div>

                    {/* Card do Produto */}
                    <Card className="p-1">
                      <CardHeader className="pb-0.5 pt-0.5 px-1">
                        <CardTitle className="text-[11px] font-medium">Produto da Transação</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-0.5 pt-0 px-1 pb-1">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Matéria-prima</p>
                          <p className="text-[10px] font-semibold">{offer.substance}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Quantidade</p>
                          <p className="text-[10px] font-semibold">
                            {proposal.quantity.toLocaleString()} {proposal.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Valor Total</p>
                          <p className="text-xs font-bold text-primary">
                            {formatCurrency(totalValue)}
                          </p>
                        </div>
                        {isSellOffer && (offer as typeof sellOffers[0]).expiryDate && (
                          <div>
                            <p className="text-[10px] text-muted-foreground">Validade</p>
                            <p className="text-[10px]">
                              {formatDate((offer as typeof sellOffers[0]).expiryDate)}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Forma de Pagamento */}
                    <Card className="p-1">
                      <CardHeader className="pb-0.5 pt-0.5 px-1">
                        <CardTitle className="text-[11px] font-medium">Forma de Pagamento</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 pt-0 px-1 pb-1">
                        <div className="space-y-0.5">
                          <Label className="text-[10px]">Selecione a forma de pagamento</Label>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="radio"
                                id="payment-money"
                                name="payment-type"
                                checked={proposalDetailsPaymentType === 'money'}
                                onChange={() => {
                                  setProposalDetailsPaymentType('money');
                                  setProposalDetailsCashAmount(totalValue.toString());
                                  setSelectedProposalDetailsSubstance(null);
                                  setProposalDetailsQuantity('');
                                  setSelectedProposalDetailsLaudo(null);
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <Label htmlFor="payment-money" className="cursor-pointer text-xs">
                                Apenas dinheiro (PIX)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="radio"
                                id="payment-products"
                                name="payment-type"
                                checked={proposalDetailsPaymentType === 'products'}
                                onChange={() => {
                                  setProposalDetailsPaymentType('products');
                                  setProposalDetailsCashAmount('0');
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <Label htmlFor="payment-products" className="cursor-pointer text-xs">
                                Apenas produtos (matérias-primas)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="radio"
                                id="payment-mixed"
                                name="payment-type"
                                checked={proposalDetailsPaymentType === 'mixed'}
                                onChange={() => {
                                  setProposalDetailsPaymentType('mixed');
                                  setProposalDetailsCashAmount((totalValue * 0.5).toString());
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <Label htmlFor="payment-mixed" className="cursor-pointer text-xs">
                                Misto (dinheiro + produtos)
                              </Label>
                            </div>
                          </div>
                        </div>

                        {/* Valor em dinheiro */}
                        {(proposalDetailsPaymentType === 'money' || proposalDetailsPaymentType === 'mixed') && (
                          <div className="space-y-1">
                            <Label htmlFor="cash-amount" className="text-xs">Valor em dinheiro (PIX)</Label>
                            <Input
                              id="cash-amount"
                              type="number"
                              step="0.01"
                              min="0"
                              max={totalValue}
                              value={proposalDetailsCashAmount}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                if (val <= totalValue) {
                                  setProposalDetailsCashAmount(e.target.value);
                                }
                              }}
                              placeholder="0.00"
                              className="h-7 text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                              Máx: {formatCurrency(totalValue)}
                            </p>
                          </div>
                        )}

                        {/* Seleção de produtos */}
                        {(proposalDetailsPaymentType === 'products' || proposalDetailsPaymentType === 'mixed') && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Matérias-primas disponíveis para troca</Label>

                            {matchingProducts.length > 0 ? (
                              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {matchingProducts.map((match) => {
                                  const isSelected = selectedProposalDetailsLaudo?.id === match.laudo.id;
                                  return (
                                    <Card
                                      key={`${match.offer.id}-${match.laudo.id}`}
                                      className={`p-1 cursor-pointer transition-colors ${isSelected
                                        ? 'border-primary bg-primary/5'
                                        : 'hover:bg-muted/50'
                                        }`}
                                      onClick={() => {
                                        setSelectedProposalDetailsLaudo(match.laudo);
                                        setSelectedProposalDetailsSubstance({
                                          id: match.laudo.substanceId,
                                          name: match.substanceName,
                                        });
                                        // Preencher unidade da oferta
                                        setProposalDetailsUnit(match.offer.unit);
                                      }}
                                    >
                                      <div className="space-y-0.5">
                                        <div className="flex items-start justify-between gap-1">
                                          <p className="text-[10px] font-semibold leading-tight">{match.substanceName}</p>
                                          {isSelected && (
                                            <Badge variant="outline" className="text-[9px] px-0.5 py-0 border-primary text-primary h-3.5">
                                              Sel.
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-0.5 text-[9px] text-muted-foreground">
                                          <div><span className="font-medium">Lote:</span> {match.laudo.batch}</div>
                                          <div><span className="font-medium">Val:</span> {formatDate(match.laudo.expiryDate)}</div>
                                        </div>
                                        {match.offer.type === 'buy' && (
                                          <div className="text-[9px] text-muted-foreground">
                                            <span className="font-medium">Compra:</span> até {formatCurrency((match.offer as typeof buyOffers[0]).maxPrice!)}/{match.offer.unit}
                                          </div>
                                        )}
                                        {match.offer.type === 'sell' && (
                                          <div className="text-[9px] text-muted-foreground">
                                            <span className="font-medium">Venda:</span> {formatCurrency((match.offer as typeof sellOffers[0]).pricePerUnit)}/{match.offer.unit}
                                          </div>
                                        )}
                                      </div>
                                    </Card>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed p-1.5 text-center">
                                {otherUserOffers.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground">
                                    O outro cooperado não possui ofertas abertas no momento.
                                  </p>
                                ) : validUserLaudos.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground">
                                    Você não possui laudos cadastrados que correspondam às ofertas do outro cooperado.
                                  </p>
                                ) : invalidValidityProducts.length > 0 && matchingProducts.length === 0 ? (
                                  <div className="space-y-0.5">
                                    <p className="text-[10px] text-muted-foreground">
                                      Você possui laudos das matérias-primas que o outro cooperado busca, mas a validade está mais curta do que o desejado.
                                    </p>
                                    {invalidValidityProducts.map((invalid, idx) => (
                                      <p key={idx} className="text-[9px] text-destructive">
                                        • {invalid.substanceName}: {invalid.reason}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground">
                                    Nenhuma matéria-prima disponível corresponde às ofertas do outro cooperado.
                                  </p>
                                )}
                              </div>
                            )}

                            {selectedProposalDetailsSubstance && selectedProposalDetailsLaudo && (
                              <>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px]">Quantidade</Label>
                                  <div className="flex gap-1">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={proposalDetailsQuantity}
                                      onChange={(e) => setProposalDetailsQuantity(e.target.value)}
                                      placeholder="0"
                                      className="h-6 text-xs"
                                    />
                                    <Select
                                      value={proposalDetailsUnit}
                                      onValueChange={(val: 'g' | 'mL' | 'kg' | 'L') => setProposalDetailsUnit(val)}
                                    >
                                      <SelectTrigger className="w-16 h-6 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="g">g</SelectItem>
                                        <SelectItem value="mL">mL</SelectItem>
                                        <SelectItem value="kg">kg</SelectItem>
                                        <SelectItem value="L">L</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {proposalDetailsPaymentType === 'mixed' && (
                                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-1">
                                    <p className="text-[10px] text-muted-foreground">
                                      Valor restante: {formatCurrency(remainingValue)}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Resumo */}
                        <div className="rounded-lg border p-1 space-y-0.5">
                          <p className="text-[11px] font-semibold">Resumo do Pagamento</p>
                          <div className="space-y-0.5 text-[10px]">
                            {proposalDetailsPaymentType === 'money' && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Dinheiro (PIX):</span>
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(cashAmountNum)}
                                </span>
                              </div>
                            )}
                            {proposalDetailsPaymentType === 'products' && selectedProposalDetailsSubstance && (
                              <div className="space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Produto:</span>
                                  <span className="font-semibold">
                                    {proposalDetailsQuantity || '0'} {proposalDetailsUnit} de {selectedProposalDetailsSubstance.name}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  Valor a ser calculado com base no preço de mercado
                                </p>
                              </div>
                            )}
                            {proposalDetailsPaymentType === 'mixed' && (
                              <div className="space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Dinheiro (PIX):</span>
                                  <span className="font-semibold text-green-600">
                                    {formatCurrency(cashAmountNum)}
                                  </span>
                                </div>
                                {selectedProposalDetailsSubstance && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Produto:</span>
                                    <span className="font-semibold">
                                      {proposalDetailsQuantity || '0'} {proposalDetailsUnit} de {selectedProposalDetailsSubstance.name}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between border-t pt-0.5 mt-0.5">
                                  <span className="font-semibold">Total:</span>
                                  <span className="font-bold text-primary">
                                    {formatCurrency(totalValue)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Lado Direito - Outro Cooperado */}
                  <div className="space-y-1 pl-1.5">
                    <div>
                      <h3 className="text-xs font-semibold">
                        {otherUserName}
                        {otherUserCompany && ` • ${otherUserCompany}`}
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        {isCurrentUserProposer ? 'Recebendo sua proposta' : 'Propondo para você'}
                      </p>
                    </div>

                    {/* Card da Oferta */}
                    <Card className="p-1">
                      <CardHeader className="pb-0.5 pt-0.5 px-1">
                        <CardTitle className="text-[11px] font-medium">Oferta {isSellOffer ? 'de Venda' : 'de Compra'}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-0.5 pt-0 px-1 pb-1">
                        <div>
                          <p className="text-xs text-muted-foreground">Matéria-prima</p>
                          <p className="text-xs font-semibold">{offer.substance}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Quantidade Disponível</p>
                          <p className="text-xs font-semibold">
                            {offer.quantity.toLocaleString()} {offer.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {isSellOffer ? 'Preço Unitário' : 'Preço Máximo'}
                          </p>
                          <p className="text-sm font-bold text-primary">
                            {formatCurrency(
                              isSellOffer
                                ? (offer as typeof sellOffers[0]).pricePerUnit
                                : (offer as typeof buyOffers[0]).maxPrice!
                            )}
                            /{offer.unit}
                          </p>
                        </div>
                        {isSellOffer && (offer as typeof sellOffers[0]).expiryDate && (
                          <div>
                            <p className="text-xs text-muted-foreground">Validade do Produto</p>
                            <p className="text-xs">
                              {formatDate((offer as typeof sellOffers[0]).expiryDate)}
                            </p>
                          </div>
                        )}
                        {!isSellOffer && (offer as typeof buyOffers[0]).minValidityMonths && (
                          <div>
                            <p className="text-xs text-muted-foreground">Validade Mínima</p>
                            <Badge variant="outline" className="text-[10px]">
                              {(offer as typeof buyOffers[0]).minValidityMonths} meses
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Informações da Proposta */}
                    <Card className="p-1">
                      <CardHeader className="pb-0.5 pt-0.5 px-1">
                        <CardTitle className="text-[11px] font-medium">Detalhes da Proposta</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-0.5 pt-0 px-1 pb-1">
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge
                            variant={proposal.status === 'pending' ? "outline" : proposal.status === 'accepted' ? "default" : "destructive"}
                            className={proposal.status === 'pending' ? "border-yellow-500 text-yellow-600 text-[10px]" : "text-[10px]"}
                          >
                            {proposal.status === 'pending' ? 'Pendente' : proposal.status === 'accepted' ? 'Aceita' : proposal.status === 'rejected' ? 'Recusada' : 'Contraproposta'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Quantidade Proposta</p>
                          <p className="text-xs font-semibold">
                            {proposal.quantity.toLocaleString()} {proposal.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Data da Proposta</p>
                          <p className="text-xs">
                            {proposal.createdAt.toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {proposal.isAgreement && (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-1 space-y-0.5">
                            <p className="text-[11px] font-semibold text-primary">Acordo Original</p>
                            <div className="text-[10px] space-y-0.5">
                              <div className="flex justify-between">
                                <span>Dinheiro:</span>
                                <span className="font-semibold">{formatCurrency(proposal.cashAmount || 0)}</span>
                              </div>
                              {proposal.tradeSubstanceName && (
                                <div className="flex justify-between">
                                  <span>Produto:</span>
                                  <span className="font-semibold">
                                    {proposal.tradeQuantity?.toLocaleString()} {proposal.tradeUnit} de {proposal.tradeSubstanceName}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="flex justify-end gap-1 mt-1 pt-1 border-t">
                  <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setSelectedProposalForDetails(null)}>
                    Fechar
                  </Button>
                  {proposal.status === 'pending' && (
                    <Button
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        // Aqui você pode implementar a lógica para salvar as alterações
                        toast({
                          title: 'Alterações salvas',
                          description: 'As alterações na proposta foram salvas.',
                        });
                        setSelectedProposalForDetails(null);
                      }}
                    >
                      Salvar Alterações
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Bid Dialog */}
      <Dialog open={isBidDialogOpen} onOpenChange={setIsBidDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Dar um lance no leilão
            </DialogTitle>
            <DialogDescription>
              {offerToBid && (
                <>
                  Você está dando um lance para: <strong>{offerToBid.substance}</strong>
                  <br />
                  Lance atual: <strong className="text-primary">{formatCurrency(offerToBid.currentBid || offerToBid.startingPrice || 0)}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bidAmount">Valor do seu lance (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  id="bidAmount"
                  type="number"
                  step="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="0,00"
                  className="pl-10 text-lg font-semibold"
                />
              </div>
              {offerToBid && (
                <p className="text-xs text-muted-foreground">
                  O lance deve ser maior que {formatCurrency((offerToBid.currentBid || offerToBid.startingPrice || 0) * 1.01)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBidDialogOpen(false)}>Cancelar</Button>
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={handlePlaceBid}
              disabled={isPlacingBid || !bidAmount || parseFloat(bidAmount) <= (offerToBid?.currentBid || offerToBid?.startingPrice || 0)}
            >
              {isPlacingBid ? 'Processando...' : 'Confirmar Lance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
