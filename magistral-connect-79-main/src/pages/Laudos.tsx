import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Upload,
  Eye,
  Calendar,
  Building2,
  Package,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Download,
  DollarSign,
  Edit2,
  Star,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useSubstances } from '@/contexts/SubstanceContext';
import { useLaudos } from '@/contexts/LaudoContext';
import { getLegacyIdsForUser } from '@/lib/legacyUserMigration';
import { safeSetItem } from '@/lib/safeStorage';
import { useNotifications } from '@/contexts/NotificationContext';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import { RawMaterial, SupplierRequest, Supplier } from '@/types';
import { supplierService } from '@/services/supplier.service';
import { substanceService } from '@/services/substance.service';
import { settingsService } from '@/services/settings.service';
import { 
  createOffer as createMarketplaceOffer, 
  getOffers as getMarketplaceOffers,
  updateOffer as updateMarketplaceOffer,
  deleteOffer as deleteMarketplaceOffer
} from '@/services/marketplace.service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Função para normalizar texto (remover acentos, etc)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Função para verificar se duas strings são similares (ignorando pontuação e espaços)
const isOnlyPunctuationDifference = (str1: string, str2: string): boolean => {
  const normalized1 = normalizeText(str1);
  const normalized2 = normalizeText(str2);
  return normalized1 === normalized2;
};

// Demo laudos - em produção viria da API
const initialLaudos: RawMaterial[] = [
  {
    id: '1',
    substanceId: '1',
    substanceName: 'Vitamina C (Ácido Ascórbico)',
    batch: '2024-VC-001',
    supplier: 'Galena',
    manufacturer: 'DSM Nutritional Products',
    manufacturingDate: new Date('2024-01-15'),
    expiryDate: new Date('2026-01-15'),
    pdfUrl: '/laudos/vitamina-c-001.pdf',
    pdfFileName: 'laudo-vitamina-c-001.pdf',
    createdBy: '4',
    createdAt: new Date('2024-01-20'),
    isExpired: false,
  },
  {
    id: '2',
    substanceId: '2',
    substanceName: 'Colágeno Hidrolisado',
    batch: '2024-CH-045',
    supplier: 'Fagron',
    manufacturer: 'Rousselot',
    manufacturingDate: new Date('2024-02-20'),
    expiryDate: new Date('2026-02-20'),
    pdfUrl: '/laudos/colageno-045.pdf',
    pdfFileName: 'laudo-colageno-045.pdf',
    createdBy: '4',
    createdAt: new Date('2024-02-25'),
    isExpired: false,
  },
];

// Sugestões de matérias-primas
const initialSuggestions: SubstanceSuggestion[] = [];

export default function Laudos() {
  const { user, hasRole } = useAuth();
  const { substances: availableSubstances, suggestions, addSuggestion, refreshSubstances } = useSubstances();
  const { addLaudo, getUserLaudos, hasValidLaudo, updateLaudo, migrateLegacyCreatedByMultiple, restoreFromLatestBackup } = useLaudos();
  const { addNotification } = useNotifications();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const migrationDoneForUserRef = useRef<string | null>(null);
  
  // Estado para itens seguidos
  const [followedItems, setFollowedItems] = useState<Array<{ id: string; name: string; alerts: number }>>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('magistral_followed_items');
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
      safeSetItem('magistral_followed_items', followedItems);
    }
  }, [followedItems]);

  // Migrar laudos com createdBy legado para user.id (Natural = ex-Roseiras: '4' e '7'; Farmagna: '5'; novo Roseiras sem legado)
  useEffect(() => {
    if (!user || migrationDoneForUserRef.current === user.id) return;
    const legacyIds = getLegacyIdsForUser(user.name, user.company);
    migrationDoneForUserRef.current = user.id;
    if (legacyIds.length === 0) return;
    const ok = migrateLegacyCreatedByMultiple(legacyIds, user.id);
    if (ok) toast({ title: 'Dados recuperados', description: 'Seus laudos foram vinculados ao seu usuário.' });
  }, [user, migrateLegacyCreatedByMultiple, toast]);
  
  const handleRestoreLaudosBackup = () => {
    const legacyIds = getLegacyIdsForUser(user?.name, user?.company);
    if (restoreFromLatestBackup(user?.id, legacyIds.length ? legacyIds : undefined)) {
      toast({ title: 'Backup restaurado', description: 'Laudos restaurados do último backup e vinculados ao seu usuário.' });
    } else {
      toast({ title: 'Nenhum backup', description: 'Não há backup de laudos disponível.', variant: 'destructive' });
    }
  };

  // Funções para seguir/deixar de seguir
  const isFollowingSubstance = (substanceName: string): boolean => {
    return followedItems.some((item) => item.name.toLowerCase() === substanceName.toLowerCase());
  };
  
  const toggleFollowSubstance = (substanceName: string) => {
    if (isFollowingSubstance(substanceName)) {
      setFollowedItems((prev) => prev.filter((item) => item.name.toLowerCase() !== substanceName.toLowerCase()));
      toast({
        title: 'Deixou de seguir',
        description: `Você não receberá mais notificações sobre ${substanceName}.`,
      });
    } else {
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

  const updateSubstanceRegulation = async (substanceId: string, patch: { requiresAe?: boolean; requiresPf?: boolean }) => {
    try {
      await substanceService.update(substanceId, patch);
      await refreshSubstances();
      toast({ title: 'Atualizado', description: 'Configuração regulatória da substância salva.' });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Não foi possível salvar a configuração.',
        variant: 'destructive',
      });
    }
  };
  
  // Filtrar apenas laudos do usuário atual
  const userLaudos = user ? getUserLaudos(user.id) : [];
  
  // Classificar matérias-primas por status
  const classifySubstances = () => {
    if (!user) return { active: [], drafts: [], notRegistered: [] };
    
    const active: Array<{ substance: Substance; laudo: RawMaterial }> = [];
    const drafts: Array<{ substance: Substance; laudo?: RawMaterial }> = [];
    const notRegistered: Substance[] = [];
    
    availableSubstances.forEach((substance) => {
      const substanceLaudos = userLaudos.filter((l) => l.substanceId === substance.id);
      
      if (substanceLaudos.length === 0) {
        // Não cadastrada
        notRegistered.push(substance);
      } else {
        // Verificar se tem laudo completo (ativa) ou incompleto (rascunho)
        const completeLaudo = substanceLaudos.find((l) => 
          l.manufacturingDate &&
          l.expiryDate &&
          l.supplier &&
          l.pdfUrl &&
          !l.isExpired &&
          l.expiryDate > new Date()
        );
        
        if (completeLaudo) {
          active.push({ substance, laudo: completeLaudo });
        } else {
          // Rascunho - tem laudo mas falta alguma informação
          const draftLaudo = substanceLaudos[0];
          drafts.push({ substance, laudo: draftLaudo });
        }
      }
    });
    
    return { active, drafts, notRegistered };
  };
  
  const { active, drafts, notRegistered } = classifySubstances();
  
  // Carregar fornecedores da API
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  
  // Carregar fornecedores da API
  useEffect(() => {
    const loadSuppliersFromAPI = async () => {
      if (!user) return;
      
      try {
        setIsLoadingSuppliers(true);
        console.log('🔄 [Laudos] Carregando fornecedores da API...', {
          userId: user.id,
          userName: user.name,
        });
        const suppliers = await supplierService.getAll();
        console.log('✅ [Laudos] Fornecedores carregados:', suppliers.length);
        console.log('📋 [Laudos] Lista de fornecedores:', suppliers.map(s => ({
          id: s.id,
          name: s.name,
          userId: s.userId,
        })));
        setAvailableSuppliers(suppliers);
      } catch (error) {
        console.error('❌ [Laudos] Erro ao carregar fornecedores:', error);
        setAvailableSuppliers([]);
      } finally {
        setIsLoadingSuppliers(false);
      }
    };
    
    loadSuppliersFromAPI();
  }, [user]);
  
  // Buscar fornecedores
  const searchSuppliers = (query: string): Supplier[] => {
    if (!query.trim()) return availableSuppliers.slice(0, 10);
    const normalizedQuery = normalizeText(query);
    return availableSuppliers.filter((supplier) => {
      const normalizedName = normalizeText(supplier.name);
      return normalizedName.includes(normalizedQuery);
    }).slice(0, 10);
  };
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const [selectedSubstance, setSelectedSubstance] = useState<Substance | null>(null);
  const [laudoToDelete, setLaudoToDelete] = useState<RawMaterial | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingLaudoId, setEditingLaudoId] = useState<string | null>(null);
  const [viewingLaudo, setViewingLaudo] = useState<RawMaterial | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [substanceSearch, setSubstanceSearch] = useState('');
  const [formBatch, setFormBatch] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formSupplierSearch, setFormSupplierSearch] = useState('');
  
  const filteredSuppliers = searchSuppliers(formSupplierSearch);
  const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; name: string } | null>(null);
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formMfgDate, setFormMfgDate] = useState('');
  const [formExpDate, setFormExpDate] = useState('');
  const [formPdfFile, setFormPdfFile] = useState<File | null>(null);
  const [suggestionName, setSuggestionName] = useState('');
  // Campos opcionais de compra
  const [formPurchaseDate, setFormPurchaseDate] = useState('');
  const [formPurchaseQuantity, setFormPurchaseQuantity] = useState('');
  const [formPurchaseUnit, setFormPurchaseUnit] = useState<'g' | 'mL' | 'kg' | 'L' | 'un'>('g');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  
  // Novos estados para excesso e marketplace
  const [formExcessQuantity, setFormExcessQuantity] = useState('');
  const [formExcessUnit, setFormExcessUnit] = useState<'g' | 'mL' | 'kg' | 'L' | 'un'>('g');
  const [isMarketplaceOfferActive, setIsMarketplaceOfferActive] = useState(false);
  const [isManualOfferPrice, setIsManualOfferPrice] = useState(false);
  const [formManualPrice, setFormManualPrice] = useState('');
  const [allowLiquidation, setAllowLiquidation] = useState(false);
  const [marketplaceFee, setMarketplaceFee] = useState<number>(0);
  
  // Estados para conflito de oferta no marketplace
  const [isOfferConflictDialogOpen, setIsOfferConflictDialogOpen] = useState(false);
  const [pendingLaudoData, setPendingLaudoData] = useState<any>(null);
  
  // Ofertas do marketplace (carregadas do banco de dados)
  const [marketplaceOffers, setMarketplaceOffers] = useState<any[]>([]);
  
  // Carregar ofertas do marketplace do banco de dados
  useEffect(() => {
    const loadMarketplaceOffers = async () => {
      try {
        const offers = await getMarketplaceOffers();
        setMarketplaceOffers(offers);
      } catch (err) {
        console.error("Erro ao carregar ofertas do marketplace:", err);
      }
    };
    loadMarketplaceOffers();
    
    // Escutar evento de atualização de ofertas
    const handleOffersUpdated = () => {
      loadMarketplaceOffers();
    };
    window.addEventListener('magistral-offers-updated', handleOffersUpdated);
    return () => {
      window.removeEventListener('magistral-offers-updated', handleOffersUpdated);
    };
  }, []);
  
  useEffect(() => {
    settingsService.getMarketplaceConfig()
      .then(cfg => {
        if (cfg && cfg.marketplaceFee !== undefined) {
          setMarketplaceFee(cfg.marketplaceFee);
        }
      })
      .catch(err => console.error("Erro ao carregar taxa do marketplace:", err));
  }, []);

  const calculatedCostPrice = (() => {
    if (!formPurchasePrice || !formPurchaseQuantity) return '0.0000';
    let q = parseFloat(formPurchaseQuantity);
    if (formPurchaseUnit === 'kg' || formPurchaseUnit === 'L') q *= 1000;
    if (q === 0) return '0.0000';
    return (parseFloat(formPurchasePrice) / q).toFixed(4);
  })();
  
  const isSupplierApprovedByName = (name?: string | null): boolean => {
    if (!name || !name.trim()) return false;
    const n = normalizeText(name);
    return availableSuppliers.some((s) => normalizeText(s.name) === n);
  };

  const ensureSupplierRequestForName = async (name: string): Promise<'created' | 'already' | 'failed'> => {
    const trimmed = name.trim();
    if (!trimmed) return 'failed';
    try {
      // Evitar duplicar solicitações: checar pendentes do próprio usuário
      const pending = await supplierService.getRequests('pending');
      const normalized = normalizeText(trimmed);
      const alreadyPending = (pending || []).some((r: any) => normalizeText(r?.name || '') === normalized);
      if (alreadyPending) return 'already';
      await supplierService.createRequest(trimmed);
      return 'created';
    } catch (e) {
      return 'failed';
    }
  };

  // Filtros
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'expired' | 'expiring'>('all');
  
  // Dados do formulário para salvamento automático
  const laudoFormData = {
    selectedSubstanceId: selectedSubstance?.id,
    selectedSubstanceName: selectedSubstance?.name,
    substanceSearch,
    formBatch,
    formSupplier,
    formSupplierSearch,
    selectedSupplierId: selectedSupplier?.id,
    selectedSupplierName: selectedSupplier?.name,
    formManufacturer,
    formMfgDate,
    formExpDate,
    formPurchaseDate,
    formPurchaseQuantity,
    formPurchaseUnit,
    formPurchasePrice,
    formExcessQuantity,
    formExcessUnit,
    isMarketplaceOfferActive,
    isManualOfferPrice,
    formManualPrice,
  };
  
  // Salvamento automático do formulário de laudo
  const { loadSavedData: loadLaudoDraft, clearSavedData: clearLaudoDraft } = useAutoSave({
    data: laudoFormData,
    storageKey: `laudo_form_draft_${user?.id || 'anonymous'}`,
    debounceMs: 1500,
    enabled: isDialogOpen,
  });

  // Verificar se deve abrir o diálogo ao carregar (via query param)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setIsDialogOpen(true);
      // Limpar parâmetro da URL sem recarregar a página
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  
  // Carregar rascunho ao abrir o dialog
  useEffect(() => {
    if (isDialogOpen) {
      const saved = loadLaudoDraft();
      if (saved) {
        if (saved.selectedSubstanceId && saved.selectedSubstanceName) {
          const substance = availableSubstances.find((s) => s.id === saved.selectedSubstanceId);
          if (substance) {
            setSelectedSubstance(substance);
            setSubstanceSearch(saved.selectedSubstanceName);
          }
        }
        setFormBatch(saved.formBatch || '');
        setFormSupplierSearch(saved.formSupplierSearch || '');
        if (saved.selectedSupplierId && saved.selectedSupplierName) {
          setSelectedSupplier({ id: saved.selectedSupplierId, name: saved.selectedSupplierName });
          setFormSupplier(saved.selectedSupplierName);
        } else {
          setFormSupplier(saved.formSupplier || '');
        }
        setFormManufacturer(saved.formManufacturer || '');
        setFormMfgDate(saved.formMfgDate || '');
        setFormExpDate(saved.formExpDate || '');
        setFormPurchaseDate(saved.formPurchaseDate || '');
        setFormPurchaseQuantity(saved.formPurchaseQuantity || '');
        setFormPurchaseUnit(saved.formPurchaseUnit || 'g');
        setFormPurchasePrice(saved.formPurchasePrice || '');
        setFormExcessQuantity(saved.formExcessQuantity || '');
        setFormExcessUnit(saved.formExcessUnit || 'g');
        setIsMarketplaceOfferActive(saved.isMarketplaceOfferActive || false);
        setIsManualOfferPrice(saved.isManualOfferPrice || false);
        setFormManualPrice(saved.formManualPrice || '');
      }
    } else {
      // Limpar editingLaudoId quando fechar o dialog
      setEditingLaudoId(null);
    }
  }, [isDialogOpen]);

  // Buscar matérias-primas com busca inteligente
  const searchSubstances = (query: string): Substance[] => {
    if (!query.trim()) return availableSubstances;
    
    const normalizedQuery = normalizeText(query);
    
    return availableSubstances.filter((substance) => {
      const normalizedName = normalizeText(substance.name);
      if (normalizedName.includes(normalizedQuery)) return true;
      
      // Buscar em sinônimos
      if (substance.synonyms) {
        return substance.synonyms.some((synonym) =>
          normalizeText(synonym).includes(normalizedQuery)
        );
      }
      return false;
    });
  };

  const filteredSubstances = searchSubstances(substanceSearch);

  // Filtrar laudos
  const filteredLaudos = userLaudos.filter((laudo) => {
    const matchesSearch =
      laudo.substanceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      laudo.batch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (laudo.supplier && laudo.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (laudo.manufacturer && laudo.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (laudo.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    switch (filterStatus) {
      case 'valid':
        return daysUntilExpiry > 30 && !laudo.isExpired;
      case 'expiring':
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      case 'expired':
        return laudo.isExpired || daysUntilExpiry <= 0;
      default:
        return true;
    }
  });

  // Verificar se laudo está vencido
  const checkExpiry = (expiryDate: Date): boolean => {
    return new Date() > expiryDate;
  };

  // Obter status do laudo
  const getLaudoStatus = (laudo: RawMaterial) => {
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (laudo.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (laudo.isExpired || daysUntilExpiry <= 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return 'valid';
  };

  // Verificar se pode vender (tem laudo válido)
  const canSell = (substanceId: string): boolean => {
    if (!user) return false;
    return hasValidLaudo(user.id, substanceId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return (
          <div className="flex items-center gap-1.5">
            <Badge className="status-badge status-active">Apto</Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="top" align="end" className="max-w-[200px]">
                  <p className="break-words">
                    Apto para comercializar: cadastro completo, laudo válido e dentro da validade
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      case 'expiring':
        return <Badge className="status-badge status-pending">Vencendo</Badge>;
      case 'expired':
        return <Badge className="status-badge status-expired">Vencido</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Converter base64 para blob URL
  const base64ToBlobUrl = (base64: string): string => {
    try {
      // Remover o prefixo data:application/pdf;base64, se houver
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Erro ao converter base64 para blob:', error);
      return '';
    }
  };

  const handleDownloadPDF = async (laudo: RawMaterial) => {
    if (!laudo.pdfUrl) {
      toast({
        title: 'Erro',
        description: 'PDF não encontrado.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      let blob: Blob;
      
      // Se for base64, converter para blob
      if (laudo.pdfUrl.startsWith('data:application/pdf')) {
        // Remover o prefixo data:application/pdf;base64, se houver
        const base64Data = laudo.pdfUrl.includes(',') ? laudo.pdfUrl.split(',')[1] : laudo.pdfUrl;
        
        // Converter base64 para bytes
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: 'application/pdf' });
      } else if (laudo.pdfUrl.startsWith('http://') || laudo.pdfUrl.startsWith('https://')) {
        // Se for URL HTTP/HTTPS, fazer fetch
        const response = await fetch(laudo.pdfUrl);
        blob = await response.blob();
      } else if (laudo.pdfUrl.startsWith('blob:')) {
        // Se for blob URL, fazer fetch
        const response = await fetch(laudo.pdfUrl);
        blob = await response.blob();
      } else {
        toast({
          title: 'Erro',
          description: 'Formato de PDF não suportado.',
          variant: 'destructive',
        });
        return;
      }
      
      // Se já temos base64, usar endpoint do backend para download seguro
      if (laudo.pdfUrl.startsWith('data:application/pdf')) {
        const { api } = await import('@/lib/api');
        
        // Obter token de autenticação
        const authUser = localStorage.getItem('magistral_auth_user');
        if (!authUser) {
          toast({
            title: 'Erro',
            description: 'É necessário estar autenticado para baixar o PDF.',
            variant: 'destructive',
          });
          return;
        }
        
        const token = JSON.parse(authUser).token;
        if (!token) {
          toast({
            title: 'Erro',
            description: 'Token de autenticação não encontrado.',
            variant: 'destructive',
          });
          return;
        }
        
        // Obter URL base da API
        const getApiBaseUrl = () => {
          if (import.meta.env.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
          }
          if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const protocol = window.location.protocol;
            return `${protocol}//${hostname}:3001/api`;
          }
          return 'http://localhost:3001/api';
        };
        
        const apiBaseUrl = getApiBaseUrl();
        const downloadUrl = apiBaseUrl.replace('/api', '/api/files/pdf/download');
        
        // Fazer requisição POST para o endpoint de download
        const response = await fetch(downloadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            pdfData: laudo.pdfUrl,
            fileName: laudo.pdfFileName || `laudo-${laudo.batch}.pdf`,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        // Obter o blob da resposta
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Criar link e fazer download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = laudo.pdfFileName || `laudo-${laudo.batch}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        
        toast({
          title: 'Download iniciado',
          description: 'O arquivo PDF está sendo baixado.',
        });
        return;
      }
      
      // Para outros formatos, tentar File System Access API primeiro (Chrome)
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: laudo.pdfFileName || `laudo-${laudo.batch}.pdf`,
            types: [{
              description: 'PDF files',
              accept: { 'application/pdf': ['.pdf'] }
            }]
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          toast({
            title: 'Download concluído',
            description: 'O arquivo PDF foi salvo com sucesso.',
          });
          return;
        } catch (saveError: any) {
          // Se o usuário cancelar, não mostrar erro
          if (saveError.name === 'AbortError') {
            return; // Usuário cancelou
          }
          // Para outros erros, continuar com fallback
        }
      }
      
      // Fallback: converter blob para data URL (mais seguro que blob URL)
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = laudo.pdfFileName || `laudo-${laudo.batch}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: 'Download iniciado',
          description: 'O arquivo PDF está sendo baixado.',
        });
      };
      reader.onerror = () => {
        // Último recurso: usar blob URL
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = laudo.pdfFileName || `laudo-${laudo.batch}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        
        toast({
          title: 'Download iniciado',
          description: 'O arquivo PDF está sendo baixado.',
        });
      };
      reader.readAsDataURL(blob);
      
      toast({
        title: 'Download iniciado',
        description: 'O arquivo PDF está sendo baixado.',
      });
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar o PDF. Verifique sua conexão.',
        variant: 'destructive',
      });
    }
  };

  // Função para editar laudo
  const handleEditLaudo = (laudo: RawMaterial) => {
    const substance = availableSubstances.find(s => s.id === laudo.substanceId);
    if (!substance) {
      toast({
        title: 'Erro',
        description: 'Matéria-prima não encontrada.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedSubstance(substance);
    setSubstanceSearch(substance.name);
    setFormBatch(laudo.batch);
    setFormSupplier(laudo.supplier || '');
    setFormSupplierSearch(laudo.supplier || '');
    if (laudo.supplier) {
      const supplierObj = availableSuppliers.find(s => s.name === laudo.supplier);
      if (supplierObj) {
        setSelectedSupplier({ id: supplierObj.id, name: supplierObj.name });
      }
    }
    setFormManufacturer(laudo.manufacturer || '');
    setFormMfgDate(laudo.manufacturingDate ? laudo.manufacturingDate.toISOString().split('T')[0] : '');
    setFormExpDate(laudo.expiryDate ? laudo.expiryDate.toISOString().split('T')[0] : '');
    setFormPurchaseDate(laudo.purchaseDate ? laudo.purchaseDate.toISOString().split('T')[0] : '');
    setFormPurchaseQuantity(laudo.purchaseQuantity?.toString() || '');
    setFormPurchaseUnit(laudo.purchaseUnit || 'g');
    setFormPurchasePrice(laudo.purchasePrice?.toString() || '');
    
    // Buscar oferta de excesso vigente para este laudo
    const existingExcessOffer = getExistingOfferForLaudo(laudo.id);
    if (existingExcessOffer) {
      // Preencher com dados da oferta vigente
      setFormExcessQuantity(existingExcessOffer.quantity?.toString() || '');
      setFormExcessUnit(existingExcessOffer.unit || laudo.excessUnit || laudo.purchaseUnit || 'g');
      setIsMarketplaceOfferActive(true);
      setIsManualOfferPrice(existingExcessOffer.pricePerUnit > 0 && laudo.isManualOfferPrice);
      setFormManualPrice(existingExcessOffer.pricePerUnit?.toString() || laudo.manualPricePerUnit?.toString() || '');
    } else {
      // Usar dados salvos no laudo
      setFormExcessQuantity(laudo.excessQuantity?.toString() || '');
      setFormExcessUnit(laudo.excessUnit || laudo.purchaseUnit || 'g');
      setIsMarketplaceOfferActive(laudo.isMarketplaceOfferActive || false);
      setIsManualOfferPrice(laudo.isManualOfferPrice || false);
      setFormManualPrice(laudo.manualPricePerUnit?.toString() || '');
    }
    
    setAllowLiquidation(laudo.allowLiquidation || false);
    
    // Marcar que estamos editando
    setEditingLaudoId(laudo.id);
    setIsDialogOpen(true);
  };

  // Função para remover laudo
  const handleDeleteLaudo = () => {
    if (!laudoToDelete) return;
    
    // Remover do localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('magistral_laudos');
        if (stored) {
          const parsed = JSON.parse(stored);
          const filtered = parsed.filter((l: any) => l.id !== laudoToDelete.id);
          localStorage.setItem('magistral_laudos', JSON.stringify(filtered));
        }
      } catch (error) {
        console.error('Erro ao remover laudo:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível remover o laudo.',
          variant: 'destructive',
        });
        setLaudoToDelete(null);
        setIsDeleteDialogOpen(false);
        return;
      }
    }
    
    toast({
      title: 'Laudo removido',
      description: 'O laudo foi removido com sucesso. Você pode adicionar um novo laudo.',
    });
    
    setLaudoToDelete(null);
    setIsDeleteDialogOpen(false);
    
    // Recarregar a página para atualizar os dados
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Erro',
          description: 'Apenas arquivos PDF são permitidos.',
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: 'O arquivo deve ter no máximo 10MB.',
          variant: 'destructive',
        });
        return;
      }
      setFormPdfFile(file);
    }
  };

  // Buscar oferta existente para este laudo específico (rawMaterialId)
  const getExistingOfferForLaudo = (laudoId: string) => {
    return marketplaceOffers.find((o: any) => 
      o.userId === user?.id && 
      o.rawMaterialId === laudoId && 
      o.status === 'active' &&
      o.type === 'sell'
    );
  };

  // Verificar se um laudo tem oferta de excesso vigente
  const hasExcessOffer = (laudoId: string): boolean => {
    return !!getExistingOfferForLaudo(laudoId);
  };

  // Gerenciar oferta de excesso: criar, atualizar ou deletar
  // Retorna: 'created' | 'updated' | 'deleted' | 'none' | 'error'
  const manageExcessOffer = async (laudo: RawMaterial): Promise<'created' | 'updated' | 'deleted' | 'none' | 'error'> => {
    try {
      // Recarregar ofertas do marketplace antes de verificar (garante dados atualizados)
      let freshOffers: any[] = [];
      try {
        freshOffers = await getMarketplaceOffers();
      } catch (err) {
        console.error('❌ [Laudos] Erro ao carregar ofertas atualizadas:', err);
        freshOffers = marketplaceOffers;
      }
      
      // Buscar oferta existente para este laudo (por rawMaterialId)
      const existingOffer = freshOffers.find((o: any) => 
        o.userId === user?.id && 
        o.rawMaterialId === laudo.id && 
        o.status === 'active' &&
        o.type === 'sell'
      );
      
      console.log('🔍 [Laudos] Verificando oferta existente para laudo:', laudo.id);
      console.log('🔍 [Laudos] Ofertas disponíveis:', freshOffers.length);
      console.log('🔍 [Laudos] Oferta encontrada:', existingOffer);
      
      const hasExcess = laudo.isMarketplaceOfferActive && laudo.excessQuantity && laudo.excessQuantity > 0;

      // Se não tem excesso e existe oferta → DELETAR
      if (!hasExcess && existingOffer) {
        console.log('🗑️ [Laudos] Removendo oferta de excesso:', existingOffer.id);
        await deleteMarketplaceOffer(existingOffer.id);
        window.dispatchEvent(new CustomEvent('magistral-offers-updated'));
        console.log('✅ [Laudos] Oferta removida com sucesso');
        return 'deleted';
      }

      // Se não tem excesso e não existe oferta → NADA A FAZER
      if (!hasExcess && !existingOffer) {
        return 'none';
      }

      // Calcular preço por unidade
      let pricePerUnit = 0;
      if (laudo.isManualOfferPrice && laudo.manualPricePerUnit) {
        pricePerUnit = laudo.manualPricePerUnit;
      } else if (laudo.purchasePrice && laudo.purchaseQuantity) {
        let q = laudo.purchaseQuantity;
        if (laudo.purchaseUnit === 'kg' || laudo.purchaseUnit === 'L') q *= 1000;
        pricePerUnit = laudo.purchasePrice / q;
      }

      // Se tem excesso e existe oferta → ATUALIZAR
      if (hasExcess && existingOffer) {
        console.log('📝 [Laudos] Atualizando oferta de excesso:', existingOffer.id);
        await updateMarketplaceOffer(existingOffer.id, {
          quantity: laudo.excessQuantity,
          unit: laudo.excessUnit || 'g',
          pricePerUnit: pricePerUnit,
          expiryDate: laudo.expiryDate,
        });
        window.dispatchEvent(new CustomEvent('magistral-offers-updated'));
        console.log('✅ [Laudos] Oferta atualizada com sucesso');
        return 'updated';
      }

      // Se tem excesso e não existe oferta → CRIAR
      if (hasExcess && !existingOffer) {
        const offerData = {
          type: 'sell' as const,
          rawMaterialId: laudo.id,
          rawMaterialName: laudo.substanceName,
          substanceId: laudo.substanceId,
          substanceName: laudo.substanceName,
          quantity: laudo.excessQuantity!,
          unit: laudo.excessUnit || 'g',
          pricePerUnit: pricePerUnit,
          expiryDate: laudo.expiryDate,
          status: 'active' as const,
        };

        console.log('📦 [Laudos] Criando oferta de excesso:', offerData);
        await createMarketplaceOffer(offerData);
        window.dispatchEvent(new CustomEvent('magistral-offers-updated'));
        console.log('✅ [Laudos] Oferta criada com sucesso');
        return 'created';
      }

      return 'none';
    } catch (error) {
      console.error('❌ [Laudos] Erro ao gerenciar oferta de excesso:', error);
      return 'error';
    }
  };

  const getExistingOfferForSubstance = (substanceId: string, currentLaudoId?: string) => {
    try {
      // Usar ofertas carregadas do banco de dados
      return marketplaceOffers.find((o: any) => 
        o.userId === user?.id && 
        o.substanceId === substanceId && 
        o.status === 'active' && 
        o.rawMaterialId !== currentLaudoId
      );
    } catch {
      return null;
    }
  };

  const resetForm = () => {
    clearLaudoDraft();
    setSelectedSubstance(null);
    setSubstanceSearch('');
    setFormBatch('');
    setFormSupplier('');
    setFormSupplierSearch('');
    setSelectedSupplier(null);
    setFormManufacturer('');
    setFormMfgDate('');
    setFormExpDate('');
    setFormPdfFile(null);
    setFormPurchaseDate('');
    setFormPurchaseQuantity('');
    setFormPurchaseUnit('g');
    setFormPurchasePrice('');
    setFormExcessQuantity('');
    setFormExcessUnit('g');
    setIsMarketplaceOfferActive(false);
    setIsManualOfferPrice(false);
    setFormManualPrice('');
    setAllowLiquidation(false);
    setEditingLaudoId(null);
    setIsDialogOpen(false);
    setPendingLaudoData(null);
  };

  const performSaveLaudo = async (
    laudoData: RawMaterial, 
    forceReplaceOfferId?: string, 
    skipMarketplace?: boolean,
    supplierApproved: boolean = true,
    supplierRequestStatus: 'created' | 'already' | 'failed' | null = null
  ) => {
    if (editingLaudoId) {
      updateLaudo(editingLaudoId, laudoData);
    } else {
      addLaudo(laudoData);
    }
    
    // Gerenciar oferta de excesso: criar, atualizar ou deletar
    let offerResult: 'created' | 'updated' | 'deleted' | 'none' | 'error' = 'none';
    if (!skipMarketplace) {
      offerResult = await manageExcessOffer(laudoData);
    }
    
    // Construir descrição da notificação baseada no resultado
    let description = '';
    if (supplierApproved) {
      switch (offerResult) {
        case 'created':
          description = 'O laudo foi salvo e uma oferta de venda por excesso foi criada no marketplace.';
          break;
        case 'updated':
          description = 'O laudo foi salvo e a oferta de venda por excesso foi atualizada no marketplace.';
          break;
        case 'deleted':
          description = 'O laudo foi salvo e a oferta de venda por excesso foi removida do marketplace.';
          break;
        case 'error':
          description = 'O laudo foi salvo, mas houve um erro ao gerenciar a oferta no marketplace.';
          break;
        default:
          description = 'O laudo foi salvo com sucesso.';
      }
    } else {
      description = supplierRequestStatus === 'failed'
        ? 'O laudo foi cadastrado, mas o fornecedor ainda não está aprovado. Não foi possível enviar a solicitação automaticamente.'
        : 'O laudo foi cadastrado, mas o fornecedor ainda não está aprovado. A negociação ficará bloqueada até a aprovação.';
    }

    toast({
      title: editingLaudoId ? 'Laudo atualizado' : 'Laudo cadastrado',
      description: description,
    });

    resetForm();
  };

  const handleCreateLaudo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSubstance) {
      toast({
        title: 'Erro',
        description: 'Selecione uma matéria-prima.',
        variant: 'destructive',
      });
      return;
    }

    if (!formBatch || (!formSupplier && !selectedSupplier) || !formMfgDate || !formExpDate) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    // PDF é obrigatório apenas ao criar novo laudo, não ao editar
    if (!editingLaudoId && !formPdfFile) {
      toast({
        title: 'Erro',
        description: 'É necessário anexar o PDF do laudo.',
        variant: 'destructive',
      });
      return;
    }

    const expiryDate = new Date(formExpDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data
    
    // Verificar se a data de validade não está vencida
    if (expiryDate <= today) {
      toast({
        title: 'Erro',
        description: 'Não é possível cadastrar um laudo com data de validade vencida. A data de validade deve ser futura.',
        variant: 'destructive',
      });
      return;
    }
    
    // Verificar se a data de fabricação não é posterior à data de validade
    const manufacturingDate = new Date(formMfgDate);
    if (manufacturingDate >= expiryDate) {
      toast({
        title: 'Erro',
        description: 'A data de fabricação não pode ser posterior ou igual à data de validade.',
        variant: 'destructive',
      });
      return;
    }

    // Função auxiliar para processar PDF
    const processPdfFile = async (file: File | null, existingPdfUrl?: string): Promise<string | undefined> => {
      if (file) {
        try {
          const base64 = await fileToBase64(file);
          return base64;
        } catch (error) {
          console.error('Erro ao converter PDF para base64:', error);
          toast({
            title: 'Erro',
            description: 'Não foi possível processar o arquivo PDF.',
            variant: 'destructive',
          });
          return undefined;
        }
      }
      return existingPdfUrl; // Manter PDF existente se não houver novo
    };

    let pdfUrl: string | undefined;
    let pdfFileName: string | undefined;

    if (editingLaudoId) {
      const existingLaudo = userLaudos.find(l => l.id === editingLaudoId);
      if (!existingLaudo) {
        toast({ title: 'Erro', description: 'Laudo não encontrado.', variant: 'destructive' });
        return;
      }
      pdfUrl = await processPdfFile(formPdfFile, existingLaudo.pdfUrl);
      pdfFileName = formPdfFile ? formPdfFile.name : existingLaudo.pdfFileName;
    } else {
      pdfUrl = await processPdfFile(formPdfFile);
      pdfFileName = formPdfFile?.name;
    }

    if (!pdfUrl && !editingLaudoId) return; // Erro já tratado no processPdfFile

    const laudoToSave: RawMaterial = {
      id: editingLaudoId || Date.now().toString(),
      substanceId: selectedSubstance.id,
      substanceName: selectedSubstance.name,
      batch: formBatch,
      supplier: selectedSupplier?.name || formSupplier || '',
      manufacturer: formManufacturer || undefined,
      manufacturingDate: manufacturingDate,
      expiryDate: expiryDate,
      pdfUrl: pdfUrl,
      pdfFileName: pdfFileName,
      createdBy: user?.id || '',
      createdAt: editingLaudoId ? (userLaudos.find(l => l.id === editingLaudoId)?.createdAt || new Date()) : new Date(),
      isExpired: checkExpiry(expiryDate),
      purchaseDate: formPurchaseDate ? new Date(formPurchaseDate) : undefined,
      purchaseQuantity: formPurchaseQuantity ? parseFloat(formPurchaseQuantity) : undefined,
      purchaseUnit: formPurchaseQuantity ? formPurchaseUnit : undefined,
      purchasePrice: formPurchasePrice ? parseFloat(formPurchasePrice) : undefined,
      excessQuantity: formExcessQuantity ? parseFloat(formExcessQuantity) : undefined,
      excessUnit: formExcessQuantity ? formExcessUnit : undefined,
      isMarketplaceOfferActive: isMarketplaceOfferActive,
      isManualOfferPrice: isManualOfferPrice,
      manualPricePerUnit: formManualPrice ? parseFloat(formManualPrice) : undefined,
      allowLiquidation: allowLiquidation,
    };

    const supplierName = laudoToSave.supplier.trim();
    const supplierApproved = isSupplierApprovedByName(supplierName);
    let supplierRequestStatus: 'created' | 'already' | 'failed' | null = null;

    if (!supplierApproved && supplierName) {
      supplierRequestStatus = await ensureSupplierRequestForName(supplierName);
    }

    // Verificar conflito no marketplace
    if (isMarketplaceOfferActive && formExcessQuantity && parseFloat(formExcessQuantity) > 0) {
      const existingOffer = getExistingOfferForSubstance(selectedSubstance.id, editingLaudoId || undefined);
      if (existingOffer) {
        setPendingLaudoData({ 
          laudo: laudoToSave, 
          existingOffer: existingOffer,
          supplierApproved,
          supplierRequestStatus
        });
        setIsOfferConflictDialogOpen(true);
        return;
      }
    }

    // Se não houver conflito, salvar normalmente
    await performSaveLaudo(laudoToSave, undefined, false, supplierApproved, supplierRequestStatus);
  };

  const handleSuggestSubstance = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!suggestionName.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o nome da matéria-prima.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se já existe
    const exists = availableSubstances.some(
      (s) => normalizeText(s.name) === normalizeText(suggestionName)
    );
    
    if (exists) {
      toast({
        title: 'Já existe',
        description: 'Esta matéria-prima já está cadastrada no sistema.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se já foi sugerida recentemente
    const recentSuggestion = suggestions.find(
      (s) =>
        normalizeText(s.name) === normalizeText(suggestionName) &&
        s.status === 'pending' &&
        new Date(s.expiresAt) > new Date()
    );

    if (recentSuggestion) {
      toast({
        title: 'Já sugerida',
        description: 'Esta matéria-prima já foi sugerida e está aguardando aprovação.',
        variant: 'destructive',
      });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const newSuggestion: SubstanceSuggestion = {
      id: Date.now().toString(),
      name: suggestionName.trim(),
      userId: user?.id || '',
      userName: user?.name || '',
      status: 'pending',
      createdAt: new Date(),
      expiresAt,
    };

    addSuggestion(newSuggestion);
    
    // Criar notificação para todos os masters
    // Buscar todos os usuários master do localStorage
    try {
      const usersStored = localStorage.getItem('magistral_users');
      const allUsers = usersStored ? JSON.parse(usersStored) : [];
      const masterUsers = allUsers.filter((u: any) => u.role === 'master');
      
      // Se não houver masters no localStorage, usar ID padrão '1' (admin)
      const masterIds = masterUsers.length > 0 
        ? masterUsers.map((u: any) => u.id)
        : ['1'];
      
      masterIds.forEach((masterId: string) => {
        addNotification({
          userId: masterId,
          type: 'substance_suggestion',
          title: 'Nova Sugestão de Matéria-Prima',
          message: `${user?.name || 'Um usuário'} sugeriu a matéria-prima "${suggestionName.trim()}"`,
          link: '/solicitacoes',
          relatedId: newSuggestion.id,
        });
      });
    } catch (error) {
      console.error('Erro ao notificar masters:', error);
      // Fallback: notificar admin padrão
      addNotification({
        userId: '1',
        type: 'substance_suggestion',
        title: 'Nova Sugestão de Matéria-Prima',
        message: `${user?.name || 'Um usuário'} sugeriu a matéria-prima "${suggestionName.trim()}"`,
        link: '/solicitacoes',
        relatedId: newSuggestion.id,
      });
    }
    
    toast({
      title: 'Sugestão enviada',
      description: 'Sua sugestão foi enviada para aprovação do administrador.',
    });

    setSuggestionName('');
    setIsSuggestionDialogOpen(false);
  };



  if (!hasRole(['master', 'cooperado'])) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="card-pharmaceutical">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Acesso Restrito</h3>
            <p className="mt-1 text-center text-muted-foreground">
              Apenas cooperados podem acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Arquivo Digital de Laudos</h1>
          <p className="text-muted-foreground">
            {userLaudos.length === 0 
              ? 'Nenhum laudo cadastrado' 
              : userLaudos.length === 1 
                ? '1 laudo cadastrado' 
                : `${userLaudos.length} laudos cadastrados`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Dados sumiram?{' '}
            <button type="button" onClick={handleRestoreLaudosBackup} className="text-primary underline hover:no-underline">
              Restaurar último backup de laudos
            </button>
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            // Limpar editingLaudoId quando fechar o dialog
            setEditingLaudoId(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Novo Laudo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[95vh] flex flex-col">
            <DialogHeader className="flex-shrink-0 pb-3">
              <DialogTitle className="text-lg">{editingLaudoId ? 'Editar Laudo' : 'Cadastrar Novo Laudo'}</DialogTitle>
              <DialogDescription className="text-sm">
                Cadastre um laudo PDF para adicionar ao seu inventário virtual
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLaudo} className="space-y-3 py-2 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-2">
                <Label htmlFor="substance">Matéria-Prima *</Label>
                <div className="space-y-2">
                  {selectedSubstance ? (
                    // Quando uma matéria-prima está selecionada
                    <div className="relative">
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 pr-10">
                        <p className="font-medium text-sm">{selectedSubstance.name}</p>
                        {selectedSubstance.synonyms && selectedSubstance.synonyms.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Sinônimos: {selectedSubstance.synonyms.join(', ')}
                          </p>
                        )}
                        {canSell(selectedSubstance.id) && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Você já tem laudo válido desta matéria-prima
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => {
                          setSelectedSubstance(null);
                          setSubstanceSearch('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    // Quando nenhuma matéria-prima está selecionada - campo de busca
                    <>
                      <Input
                        id="substance"
                        placeholder="Buscar matéria-prima..."
                        value={substanceSearch}
                        onChange={(e) => setSubstanceSearch(e.target.value)}
                        onFocus={() => {
                          if (!substanceSearch) {
                            // Não limpar se já houver texto
                          }
                        }}
                      />
                      {substanceSearch && filteredSubstances.length > 0 && (
                        <div className="max-h-48 overflow-y-auto rounded-lg border bg-background">
                          {filteredSubstances.slice(0, 10).map((substance) => (
                            <button
                              key={substance.id}
                              type="button"
                              onClick={() => {
                                setSelectedSubstance(substance);
                                setSubstanceSearch('');
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
                      {substanceSearch && filteredSubstances.length === 0 && (
                        <div className="rounded-lg border border-dashed p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            Matéria-prima não encontrada
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSuggestionName(substanceSearch);
                              setIsDialogOpen(false);
                              setIsSuggestionDialogOpen(true);
                            }}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Sugerir Cadastro
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="supplier" className="text-sm">Fornecedor *</Label>
                <div className="space-y-2">
                  {selectedSupplier ? (
                    // Quando um fornecedor está selecionado
                    <div className="relative">
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 pr-10">
                        <p className="font-medium text-sm">{selectedSupplier.name}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => {
                          setSelectedSupplier(null);
                          setFormSupplierSearch('');
                          setFormSupplier('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    // Quando nenhum fornecedor está selecionado - campo de busca
                    <>
                      <Input
                        id="supplier"
                        placeholder="Buscar fornecedor..."
                        value={formSupplierSearch}
                        onChange={(e) => {
                          setFormSupplierSearch(e.target.value);
                          setFormSupplier(e.target.value);
                        }}
                        onFocus={() => {
                          if (!formSupplierSearch) {
                            // Não limpar se já houver texto
                          }
                        }}
                        className="h-9"
                        required
                      />
                      {formSupplierSearch && filteredSuppliers.length > 0 && (
                        <div className="max-h-48 overflow-y-auto rounded-lg border bg-background">
                          {filteredSuppliers.map((supplier) => (
                            <button
                              key={supplier.id}
                              type="button"
                              onClick={() => {
                                setSelectedSupplier({ id: supplier.id, name: supplier.name });
                                setFormSupplier(supplier.name);
                                setFormSupplierSearch('');
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors"
                            >
                              <p className="font-medium">{supplier.name}</p>
                              {supplier.contact && (
                                <p className="text-xs text-muted-foreground">
                                  {supplier.contact}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {formSupplierSearch && filteredSuppliers.length === 0 && (
                        <div className="rounded-lg border border-dashed p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            Fornecedor não encontrado
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!user || !formSupplierSearch.trim()) return;
                              
                              try {
                                const newRequest = await supplierService.createRequest(formSupplierSearch.trim());
                                
                                toast({
                                  title: 'Solicitação enviada',
                                  description:
                                    'Sua solicitação de cadastro de fornecedor foi enviada para o administrador. Você pode continuar cadastrando o laudo — a negociação ficará bloqueada até aprovação.',
                                });
                              } catch (error: any) {
                                console.error('❌ [Laudos] Erro ao criar solicitação de fornecedor:', error);
                                toast({
                                  title: 'Erro',
                                  description: error?.message || 'Não foi possível enviar a solicitação. Tente novamente.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Solicitar Cadastro
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="batch" className="text-sm">Lote (Interno) *</Label>
                  <Input
                    id="batch"
                    value={formBatch}
                    onChange={(e) => setFormBatch(e.target.value)}
                    placeholder="Ex: 2024-VC-001"
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manufacturer" className="text-sm">Fabricante</Label>
                  <Input
                    id="manufacturer"
                    value={formManufacturer}
                    onChange={(e) => setFormManufacturer(e.target.value)}
                    placeholder="Ex: DSM (opcional)"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mfgDate" className="text-sm">Data de Fabricação *</Label>
                  <Input
                    id="mfgDate"
                    type="date"
                    value={formMfgDate}
                    onChange={(e) => setFormMfgDate(e.target.value)}
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expDate" className="text-sm">Data de Validade *</Label>
                  <Input
                    id="expDate"
                    type="date"
                    value={formExpDate}
                    onChange={(e) => setFormExpDate(e.target.value)}
                    className="h-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Laudo (PDF) *</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formPdfFile ? formPdfFile.name : 'Arraste o arquivo ou clique para selecionar'}
                      </p>
                      <p className="text-xs text-muted-foreground">PDF até 10MB</p>
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="mt-2 hidden"
                        id="pdf-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => document.getElementById('pdf-upload')?.click()}
                      >
                        Selecionar PDF
                      </Button>
                    </div>
                  </div>
                  {formPdfFile && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm">{formPdfFile.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormPdfFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Campos opcionais de compra */}
              <div className="rounded-lg border border-dashed p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs font-medium">Informações de Compra (Opcional)</Label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Data da Compra</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={formPurchaseDate}
                      onChange={(e) => setFormPurchaseDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchasePrice">Valor Pago (R$)</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={formPurchasePrice}
                      onChange={(e) => setFormPurchasePrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="purchaseQuantity">Quantidade Comprada</Label>
                    <Input
                      id="purchaseQuantity"
                      type="number"
                      step="0.01"
                      value={formPurchaseQuantity}
                      onChange={(e) => {
                        setFormPurchaseQuantity(e.target.value);
                        if (!formExcessQuantity) {
                          setFormExcessQuantity(e.target.value);
                        }
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchaseUnit">Unidade</Label>
                    <Select 
                      id="purchaseUnit"
                      value={formPurchaseUnit} 
                      onValueChange={(value: 'g' | 'mL' | 'kg' | 'L' | 'un') => {
                        setFormPurchaseUnit(value);
                        setFormExcessUnit(value);
                      }}
                    >
                      <SelectTrigger id="purchaseUnit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g (gramas)</SelectItem>
                        <SelectItem value="kg">kg (quilogramas)</SelectItem>
                        <SelectItem value="mL">mL (mililitros)</SelectItem>
                        <SelectItem value="L">L (litros)</SelectItem>
                        <SelectItem value="un">un (unidade)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seção de Excesso e Marketplace */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold text-primary">Excesso e Marketplace</Label>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="excessQuantity" className="text-xs">Quantidade em Excesso</Label>
                      <Input
                        id="excessQuantity"
                        type="number"
                        step="0.01"
                        value={formExcessQuantity}
                        onChange={(e) => setFormExcessQuantity(e.target.value)}
                        placeholder="Ex: 500"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="excessUnit" className="text-xs">Unidade</Label>
                      <Select id="excessUnit" value={formExcessUnit} onValueChange={(value: any) => setFormExcessUnit(value)}>
                        <SelectTrigger id="excessUnit" className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="mL">mL</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="un">un</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-primary/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Disponibilizar no Marketplace</Label>
                        <p className="text-xs text-muted-foreground">
                          Habilita a oferta de venda e liquidação imediata
                        </p>
                      </div>
                      <Switch
                        checked={isMarketplaceOfferActive}
                        onCheckedChange={setIsMarketplaceOfferActive}
                      />
                    </div>
                  </div>

                  {isMarketplaceOfferActive && (
                    <div className="space-y-3 pt-2 animate-fade-in">
                      <div className="flex items-center justify-between rounded-md bg-green-50 dark:bg-green-950/20 p-2 border border-green-200 dark:border-green-900/30">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-1.5">
                            <TrendingDown className="h-3.5 w-3.5" />
                            Habilitar Liquidação Imediata (10% OFF)
                          </Label>
                          <p className="text-[10px] text-green-700/70 dark:text-green-400/70">
                            Venda automática para a cooperativa com 10% de desconto sobre o custo quando houver necessidade de estoque.
                          </p>
                        </div>
                        <Switch
                          checked={allowLiquidation}
                          onCheckedChange={setAllowLiquidation}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-md bg-background p-2 border border-primary/10">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-medium">Preço de Oferta Manual (por GRAMA, ML ou UNIDADE)</Label>
                          <p className="text-[10px] text-muted-foreground">
                            {isManualOfferPrice 
                              ? "Defina o valor por unidade" 
                              : "Usando preço de custo por padrão"}
                          </p>
                        </div>
                        <Switch
                          checked={isManualOfferPrice}
                          onCheckedChange={(checked) => {
                            setIsManualOfferPrice(checked);
                            if (checked && !formManualPrice) {
                              setFormManualPrice(calculatedCostPrice);
                            }
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="manualPrice" className="text-xs">Valor por {formExcessUnit === 'kg' || formExcessUnit === 'g' ? 'grama' : (formExcessUnit === 'un' ? 'unidade' : 'mL')} (R$)</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              id="manualPrice"
                              type="number"
                              step="0.0001"
                              disabled={!isManualOfferPrice}
                              value={isManualOfferPrice ? formManualPrice : calculatedCostPrice}
                              onChange={(e) => setFormManualPrice(e.target.value)}
                              placeholder="0.0000"
                              className="pl-7 h-8 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Total da Oferta (R$)</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              disabled
                              value={(() => {
                                const price = isManualOfferPrice ? parseFloat(formManualPrice || '0') : parseFloat(calculatedCostPrice);
                                const quantity = parseFloat(formExcessQuantity) || 0;
                                let multiplier = 1;
                                if (formExcessUnit === 'kg' || formExcessUnit === 'L') multiplier = 1000;
                                const total = (price || 0) * (quantity * multiplier);
                                return isNaN(total) ? '0.00' : total.toFixed(2);
                              })()}
                              className="pl-7 h-8 text-sm bg-muted/50"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Taxa Comercial ({marketplaceFee}%)</Label>
                          <div className="relative">
                            <Input
                              disabled
                              value={marketplaceFee.toFixed(1) + '%'}
                              className="h-8 text-sm bg-muted/50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedSubstance(null);
                    setSubstanceSearch('');
                    setFormBatch('');
                    setFormSupplier('');
                    setFormSupplierSearch('');
                    setSelectedSupplier(null);
                    setFormManufacturer('');
                    setFormMfgDate('');
                    setFormExpDate('');
                    setFormPdfFile(null);
                    setFormPurchaseDate('');
                    setFormPurchaseQuantity('');
                    setFormPurchaseUnit('g');
                    setFormPurchasePrice('');
                    setFormExcessQuantity('');
                    setFormExcessUnit('g');
                    setIsMarketplaceOfferActive(false);
                    setIsManualOfferPrice(false);
                    setFormManualPrice('');
                    setEditingLaudoId(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="gradient-primary text-primary-foreground">
                  Salvar Laudo
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="laudos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="laudos" className="gap-2">
            <FileText className="h-4 w-4" />
            Meus Laudos
          </TabsTrigger>
          <TabsTrigger value="substances" className="gap-2">
            <Package className="h-4 w-4" />
            Matérias-Primas
          </TabsTrigger>
        </TabsList>

        {/* Tab: Meus Laudos */}
        <TabsContent value="laudos" className="space-y-4">
          {/* Search and Filters */}
          <Card className="card-pharmaceutical">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, lote, fornecedor ou fabricante..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="valid">Válidos</SelectItem>
                    <SelectItem value="expiring">Vencendo</SelectItem>
                    <SelectItem value="expired">Vencidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Cards de Laudos */}
          {filteredLaudos.length === 0 ? (
            <Card className="card-pharmaceutical">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum laudo encontrado</h3>
                <p className="mt-1 text-center text-muted-foreground">
                  Não há laudos que correspondam aos filtros selecionados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredLaudos.map((laudo) => {
                const status = getLaudoStatus(laudo);
                const daysUntilExpiry = Math.floor(
                  (laudo.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                const supplierApproved = isSupplierApprovedByName(laudo.supplier);
                
                return (
                  <Card key={laudo.id} className="card-pharmaceutical flex flex-col overflow-hidden h-full">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFollowSubstance(laudo.substanceName)}
                              className={`h-5 w-5 p-0 shrink-0 mt-0.5 ${isFollowingSubstance(laudo.substanceName) ? 'text-warning' : ''}`}
                              title={isFollowingSubstance(laudo.substanceName) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                            >
                              <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(laudo.substanceName) ? 'fill-warning' : ''}`} />
                            </Button>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base leading-tight">{laudo.substanceName}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                Lote: {laudo.batch}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {getStatusBadge(status)}
                          {hasExcessOffer(laudo.id) && (
                            <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-600 bg-orange-50">
                              <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                              Excesso
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm flex-1 flex flex-col min-h-0 pb-0">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>Fornecedor: {laudo.supplier || '-'}</span>
                          {laudo.supplier && !supplierApproved && (
                            <Badge variant="outline" className="ml-2 text-xs border-amber-300 text-amber-800">
                              Pendente de aprovação
                            </Badge>
                          )}
                        </div>
                        {laudo.manufacturer && (
                          <div className="text-muted-foreground">
                            <span className="font-medium">Fabricante:</span> {laudo.manufacturer}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Fabricação: {formatDate(laudo.manufacturingDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className={status === 'expired' ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                            Validade: {formatDate(laudo.expiryDate)}
                          </span>
                          {daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {daysUntilExpiry} dias
                            </Badge>
                          )}
                        </div>
                        {(laudo.purchaseDate || laudo.purchasePrice) && (
                          <div className="space-y-1 text-xs pt-1 border-t">
                            {laudo.purchaseDate && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>Compra: {formatDate(laudo.purchaseDate)}</span>
                              </div>
                            )}
                            {laudo.purchaseQuantity && laudo.purchaseUnit && (
                              <div className="text-muted-foreground">
                                Quantidade: {laudo.purchaseQuantity} {laudo.purchaseUnit}
                              </div>
                            )}
                            {laudo.purchasePrice && (
                              <div className="font-medium text-green-600">
                                Valor de Aquisição: {formatCurrency(laudo.purchasePrice)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 pt-4 border-t bg-primary/5 -mx-6 px-6 pb-4 mt-auto flex-shrink-0">
                        {laudo.pdfUrl && !laudo.pdfUrl.startsWith('blob:') ? (
                          <>
                            <div className="flex gap-2 items-center">
                              {/* Botão dividido em 3 partes: olho (1.5/6), texto (3/6), download (1.5/6) */}
                              <div className="flex-1 flex items-stretch border border-input bg-background rounded-md overflow-hidden h-8">
                                {/* Parte 1: Ícone de visualizar (1.5/6 = 3/12) */}
                                <button
                                  className="w-3/12 flex items-center justify-center border-r border-input hover:bg-accent transition-colors shrink-0"
                                  onClick={() => {
                                    try {
                                      // Se for base64, converter para blob URL
                                      if (laudo.pdfUrl?.startsWith('data:application/pdf')) {
                                        const blobUrl = base64ToBlobUrl(laudo.pdfUrl);
                                        if (blobUrl) {
                                          window.open(blobUrl, '_blank');
                                          // Limpar o blob URL após um tempo
                                          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                                        } else {
                                          toast({
                                            title: 'Erro',
                                            description: 'Não foi possível abrir o PDF.',
                                            variant: 'destructive',
                                          });
                                        }
                                      } else if (laudo.pdfUrl && laudo.pdfUrl.startsWith('http')) {
                                        window.open(laudo.pdfUrl, '_blank');
                                      } else {
                                        toast({
                                          title: 'Erro',
                                          description: 'PDF não encontrado. Por favor, reenvie o arquivo PDF.',
                                          variant: 'destructive',
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Erro ao abrir PDF:', error);
                                      toast({
                                        title: 'Erro',
                                        description: 'Não foi possível abrir o PDF.',
                                        variant: 'destructive',
                                      });
                                    }
                                  }}
                                  title="Visualizar Laudo"
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                
                                {/* Parte 2: Texto "Laudo" (3/6 = 6/12) - sem hover */}
                                <div className="w-6/12 flex items-center justify-center px-2 text-xs sm:text-sm font-medium text-foreground">
                                  Laudo
                                </div>
                                
                                {/* Parte 3: Ícone de download (1.5/6 = 3/12) */}
                                <button
                                  className="w-3/12 flex items-center justify-center border-l border-input hover:bg-accent transition-colors shrink-0"
                                  onClick={() => handleDownloadPDF(laudo)}
                                  title="Baixar Laudo"
                                >
                                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </div>
                              
                              {laudo.createdBy === user?.id && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                        onClick={() => {
                                          setViewingLaudo(laudo);
                                          setIsViewDialogOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Ver/Editar Informações</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm"
                              onClick={() => {
                                // Navegar para marketplace e abrir dialog de venda
                                // Passar também o laudoId para preencher os dados automaticamente
                                const substance = availableSubstances.find(s => s.id === laudo.substanceId);
                                if (substance) {
                                  window.location.href = `/marketplace?action=sell&substanceId=${substance.id}&laudoId=${laudo.id}`;
                                }
                              }}
                            >
                              <TrendingUp className="mr-1 sm:mr-2 h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Vender</span>
                            </Button>
                          </>
                        ) : laudo.pdfUrl && laudo.pdfUrl.startsWith('blob:') ? (
                          <div className="space-y-2">
                            <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                              <AlertCircle className="h-3 w-3 inline mr-1" />
                              PDF não disponível. Por favor, edite o laudo e reenvie o arquivo PDF.
                            </div>
                            {laudo.createdBy === user?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs sm:text-sm"
                                onClick={() => {
                                  const substanceObj = availableSubstances.find(s => s.id === laudo.substanceId);
                                  if (substanceObj) {
                                    setSelectedSubstance(substanceObj);
                                    setEditingLaudoId(laudo.id);
                                    setSubstanceSearch(laudo.substanceName);
                                    setFormBatch(laudo.batch);
                                    setFormSupplier(laudo.supplier || '');
                                    setFormSupplierSearch(laudo.supplier || '');
                                    if (laudo.supplier) {
                                      const supplierObj = availableSuppliers.find(s => s.name === laudo.supplier);
                                      if (supplierObj) {
                                        setSelectedSupplier({ id: supplierObj.id, name: supplierObj.name });
                                      }
                                    }
                                    setFormManufacturer(laudo.manufacturer || '');
                                    setFormMfgDate(laudo.manufacturingDate ? laudo.manufacturingDate.toISOString().split('T')[0] : '');
                                    setFormExpDate(laudo.expiryDate ? laudo.expiryDate.toISOString().split('T')[0] : '');
                                    setIsDialogOpen(true);
                                  }
                                }}
                              >
                                <Upload className="mr-1 sm:mr-2 h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">Reenviar PDF</span>
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs sm:text-sm"
                            onClick={() => {
                              // Abrir dialog de edição para anexar PDF
                              const substanceObj = availableSubstances.find(s => s.id === laudo.substanceId);
                              if (substanceObj) {
                                setSelectedSubstance(substanceObj);
                                setEditingLaudoId(laudo.id);
                                setSubstanceSearch(laudo.substanceName);
                                setFormBatch(laudo.batch);
                                setFormSupplier(laudo.supplier || '');
                                setFormSupplierSearch(laudo.supplier || '');
                                if (laudo.supplier) {
                                  const supplierObj = availableSuppliers.find(s => s.name === laudo.supplier);
                                  if (supplierObj) {
                                    setSelectedSupplier({ id: supplierObj.id, name: supplierObj.name });
                                  }
                                }
                                setFormManufacturer(laudo.manufacturer || '');
                                setFormMfgDate(laudo.manufacturingDate ? laudo.manufacturingDate.toISOString().split('T')[0] : '');
                                setFormExpDate(laudo.expiryDate ? laudo.expiryDate.toISOString().split('T')[0] : '');
                                // Preencher campos de compra se existirem
                                if (laudo.purchaseDate) {
                                  setFormPurchaseDate(laudo.purchaseDate.toISOString().split('T')[0]);
                                }
                                if (laudo.purchaseQuantity) {
                                  setFormPurchaseQuantity(laudo.purchaseQuantity.toString());
                                }
                                if (laudo.purchaseUnit) {
                                  setFormPurchaseUnit(laudo.purchaseUnit);
                                }
                                if (laudo.purchasePrice) {
                                  setFormPurchasePrice(laudo.purchasePrice.toString());
                                }
                                setIsDialogOpen(true);
                              } else {
                                toast({
                                  title: 'Erro',
                                  description: 'Substância não encontrada.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            <Upload className="mr-1 sm:mr-2 h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Anexar Laudo</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Matérias-Primas */}
        <TabsContent value="substances" className="space-y-4">
          {/* Cards de Matérias-Primas em Rascunho */}
          {drafts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <h3 className="text-lg font-semibold">Rascunhos ({drafts.length})</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {drafts.map(({ substance, laudo }) => (
                  <Card key={substance.id} className="card-pharmaceutical border-yellow-500/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFollowSubstance(substance.name)}
                              className={`h-5 w-5 p-0 shrink-0 mt-0.5 ${isFollowingSubstance(substance.name) ? 'text-warning' : ''}`}
                              title={isFollowingSubstance(substance.name) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                            >
                              <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(substance.name) ? 'fill-warning' : ''}`} />
                            </Button>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base leading-tight">{substance.name}</CardTitle>
                              {laudo && (
                                <CardDescription className="text-xs mt-1">
                                  {laudo.supplier || 'Fornecedor não informado'}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 shrink-0">
                          Rascunho
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {hasRole(['master']) && (
                        <div className="space-y-2 pb-2 border-b">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Controlada (AE)</span>
                            <Switch
                              checked={Boolean(substance.requiresAe)}
                              onCheckedChange={(checked) =>
                                updateSubstanceRegulation(substance.id, { requiresAe: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Controlada PF (PF)</span>
                            <Switch
                              checked={Boolean(substance.requiresPf)}
                              onCheckedChange={(checked) =>
                                updateSubstanceRegulation(substance.id, { requiresPf: checked })
                              }
                            />
                          </div>
                        </div>
                      )}
                      {laudo && (
                        <>
                          {!laudo.manufacturingDate && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                              <span>Falta: Data de fabricação</span>
                            </div>
                          )}
                          {!laudo.expiryDate && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                              <span>Falta: Data de validade</span>
                            </div>
                          )}
                          {!laudo.supplier && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                              <span>Falta: Fornecedor</span>
                            </div>
                          )}
                          {!laudo.pdfUrl && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                              <span>Falta: Laudo PDF</span>
                            </div>
                          )}
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          // Abrir dialog de edição com a matéria-prima pré-selecionada
                          const substanceObj = availableSubstances.find(s => s.id === substance.id);
                          if (substanceObj) {
                            setSelectedSubstance(substanceObj);
                            if (laudo) {
                              // Preencher formulário com dados do rascunho
                              setSubstanceSearch(laudo.substanceName);
                              setFormBatch(laudo.batch);
                              setFormSupplier(laudo.supplier || '');
                              setFormSupplierSearch(laudo.supplier || '');
                              if (laudo.supplier) {
                                const supplierObj = availableSuppliers.find(s => s.name === laudo.supplier);
                                if (supplierObj) {
                                  setSelectedSupplier({ id: supplierObj.id, name: supplierObj.name });
                                }
                              }
                              setFormManufacturer(laudo.manufacturer || '');
                              setFormMfgDate(laudo.manufacturingDate ? laudo.manufacturingDate.toISOString().split('T')[0] : '');
                              setFormExpDate(laudo.expiryDate ? laudo.expiryDate.toISOString().split('T')[0] : '');
                            }
                            setIsDialogOpen(true);
                          }
                        }}
                      >
                        <Edit2 className="mr-2 h-3.5 w-3.5" />
                        Completar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Cards de Matérias-Primas Não Cadastradas */}
          {notRegistered.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Não Cadastradas ({notRegistered.length})</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {notRegistered.map((substance) => (
                  <Card key={substance.id} className="card-pharmaceutical border-dashed flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFollowSubstance(substance.name)}
                              className={`h-5 w-5 p-0 shrink-0 mt-0.5 ${isFollowingSubstance(substance.name) ? 'text-warning' : ''}`}
                              title={isFollowingSubstance(substance.name) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                            >
                              <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(substance.name) ? 'fill-warning' : ''}`} />
                            </Button>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base leading-tight line-clamp-3">{substance.name}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                Ainda não cadastrada no inventário
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-muted-foreground shrink-0">
                          Nova
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-end mt-auto">
                      {hasRole(['master']) && (
                        <div className="space-y-2 pb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Controlada (AE)</span>
                            <Switch
                              checked={Boolean(substance.requiresAe)}
                              onCheckedChange={(checked) =>
                                updateSubstanceRegulation(substance.id, { requiresAe: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Controlada PF (PF)</span>
                            <Switch
                              checked={Boolean(substance.requiresPf)}
                              onCheckedChange={(checked) =>
                                updateSubstanceRegulation(substance.id, { requiresPf: checked })
                              }
                            />
                          </div>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const substanceObj = availableSubstances.find(s => s.id === substance.id);
                          if (substanceObj) {
                            setSelectedSubstance(substanceObj);
                            setSubstanceSearch(substance.name);
                            setIsDialogOpen(true);
                          }
                        }}
                      >
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        Cadastrar Laudo
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {drafts.length === 0 && notRegistered.length === 0 && (
            <Card className="card-pharmaceutical">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma matéria-prima encontrada</h3>
                <p className="mt-1 text-center text-muted-foreground">
                  As matérias-primas dos fornecedores aparecerão aqui
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Sugestão de Matéria-Prima */}
      <Dialog open={isSuggestionDialogOpen} onOpenChange={setIsSuggestionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Sugerir Nova Matéria-Prima</DialogTitle>
            <DialogDescription>
              A matéria-prima será enviada para aprovação do administrador
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSuggestSubstance} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suggestionName">Nome da Matéria-Prima *</Label>
              <Input
                id="suggestionName"
                value={suggestionName}
                onChange={(e) => setSuggestionName(e.target.value)}
                placeholder="Ex: Ácido Lático"
                required
              />
              <p className="text-xs text-muted-foreground">
                Digite o nome completo da matéria-prima que deseja cadastrar
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsSuggestionDialogOpen(false);
                  setSuggestionName('');
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">
                <Send className="mr-2 h-4 w-4" />
                Enviar Sugestão
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmar remoção de laudo */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Laudo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este laudo? Esta ação não pode ser desfeita.
              {laudoToDelete && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <p><strong>Matéria-prima:</strong> {laudoToDelete.substanceName}</p>
                  <p><strong>Lote:</strong> {laudoToDelete.batch}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setLaudoToDelete(null);
              setIsDeleteDialogOpen(false);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLaudo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Conflito de Oferta de Excesso no Marketplace */}
      <AlertDialog open={isOfferConflictDialogOpen} onOpenChange={setIsOfferConflictDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Oferta de excesso já existente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você já possui uma <strong>oferta de excesso</strong> ativa para <strong>{pendingLaudoData?.laudo.substanceName}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                Apenas uma oferta de excesso pode existir por matéria-prima por cooperado.
              </p>
              <div className="bg-muted/50 p-3 rounded-md space-y-1 text-xs">
                <p><strong>Oferta atual:</strong></p>
                <p>• Quantidade: {pendingLaudoData?.existingOffer?.quantity} {pendingLaudoData?.existingOffer?.unit}</p>
                <p>• Preço: R$ {pendingLaudoData?.existingOffer?.pricePerUnit?.toFixed(4)}/unidade</p>
              </div>
              <p className="font-medium">
                Qual oferta você deseja manter como oferta de excesso?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => {
              setIsOfferConflictDialogOpen(false);
              setPendingLaudoData(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <Button 
              variant="outline" 
              className="sm:flex-1"
              onClick={async () => {
                if (pendingLaudoData) {
                  // Manter a oferta atual: salvar laudo SEM criar/alterar oferta de excesso
                  // O laudo é salvo sem flag de marketplace ativo
                  const laudoSemExcesso = {
                    ...pendingLaudoData.laudo,
                    isMarketplaceOfferActive: false,
                    excessQuantity: undefined,
                    excessUnit: undefined,
                  };
                  await performSaveLaudo(
                    laudoSemExcesso, 
                    undefined, 
                    true, // skipMarketplace
                    pendingLaudoData.supplierApproved, 
                    pendingLaudoData.supplierRequestStatus
                  );
                  setIsOfferConflictDialogOpen(false);
                }
              }}
            >
              Manter oferta atual
            </Button>
            <AlertDialogAction
              className="sm:flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={async () => {
                if (pendingLaudoData) {
                  // Substituir: deletar oferta antiga e criar nova
                  try {
                    await deleteMarketplaceOffer(pendingLaudoData.existingOffer.id);
                    window.dispatchEvent(new CustomEvent('magistral-offers-updated'));
                  } catch (err) {
                    console.error('Erro ao deletar oferta antiga:', err);
                  }
                  await performSaveLaudo(
                    pendingLaudoData.laudo, 
                    undefined, 
                    false, // não skipMarketplace - criar nova oferta
                    pendingLaudoData.supplierApproved, 
                    pendingLaudoData.supplierRequestStatus
                  );
                  setIsOfferConflictDialogOpen(false);
                }
              }}
            >
              Usar nova oferta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Visualização/Edição de Laudo */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Informações do Laudo</DialogTitle>
            <DialogDescription>
              Visualize e edite as informações do laudo cadastrado
            </DialogDescription>
          </DialogHeader>
          {viewingLaudo && (
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label>Matéria-Prima</Label>
                  <div className="mt-1 text-sm font-medium">{viewingLaudo.substanceName}</div>
                </div>
                
                <div>
                  <Label>Lote</Label>
                  <div className="mt-1 text-sm">{viewingLaudo.batch}</div>
                </div>
                
                <div>
                  <Label>Fornecedor</Label>
                  <div className="mt-1 text-sm">{viewingLaudo.supplier || '-'}</div>
                </div>
                
                {viewingLaudo.manufacturer && (
                  <div>
                    <Label>Fabricante</Label>
                    <div className="mt-1 text-sm">{viewingLaudo.manufacturer}</div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Fabricação</Label>
                    <div className="mt-1 text-sm">{formatDate(viewingLaudo.manufacturingDate)}</div>
                  </div>
                  <div>
                    <Label>Data de Validade</Label>
                    <div className="mt-1 text-sm">{formatDate(viewingLaudo.expiryDate)}</div>
                  </div>
                </div>
                
                <div className="pt-4 border-t space-y-3">
                  <h4 className="font-medium text-sm">Informações de Compra</h4>
                  
                  <div>
                    <Label className="text-xs">Data de Compra</Label>
                    {viewingLaudo.purchaseDate ? (
                      <div className="mt-1 text-sm">{formatDate(viewingLaudo.purchaseDate)}</div>
                    ) : (
                      <div className="mt-1 text-sm text-muted-foreground italic">Não informada</div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-xs">Quantidade</Label>
                    {viewingLaudo.purchaseQuantity && viewingLaudo.purchaseUnit ? (
                      <div className="mt-1 text-sm">{viewingLaudo.purchaseQuantity} {viewingLaudo.purchaseUnit}</div>
                    ) : (
                      <div className="mt-1 text-sm text-muted-foreground italic">Não informada</div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-xs">Preço</Label>
                    {viewingLaudo.purchasePrice ? (
                      <div className="mt-1 space-y-2">
                        {viewingLaudo.purchaseQuantity && viewingLaudo.purchaseUnit && viewingLaudo.purchasePrice > 0 ? (
                          <>
                            <div className="text-sm font-medium text-green-600">
                              {formatCurrency(viewingLaudo.purchasePrice)} por {viewingLaudo.purchaseQuantity} {viewingLaudo.purchaseUnit}
                            </div>
                            <div className="text-sm font-medium text-blue-600">
                              {(() => {
                                // Converter para grama ou mL baseado na unidade
                                let quantityInBaseUnit = viewingLaudo.purchaseQuantity;
                                let baseUnit = viewingLaudo.purchaseUnit;
                                
                                if (viewingLaudo.purchaseUnit === 'kg') {
                                  quantityInBaseUnit = viewingLaudo.purchaseQuantity * 1000; // kg para g
                                  baseUnit = 'g';
                                } else if (viewingLaudo.purchaseUnit === 'L') {
                                  quantityInBaseUnit = viewingLaudo.purchaseQuantity * 1000; // L para mL
                                  baseUnit = 'mL';
                                } else if (viewingLaudo.purchaseUnit === 'un') {
                                  baseUnit = 'un';
                                }
                                
                                const pricePerUnit = viewingLaudo.purchasePrice / quantityInBaseUnit;
                                return `${formatCurrency(pricePerUnit)}/${baseUnit}`;
                              })()}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm font-medium text-green-600">
                            {formatCurrency(viewingLaudo.purchasePrice)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-muted-foreground italic">Não informado</div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-primary flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Excesso e Marketplace
                    </h4>
                    {viewingLaudo.isMarketplaceOfferActive && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">Ativo no Mercado</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Quantidade em Excesso</Label>
                      <div className="mt-1 text-sm font-semibold">
                        {viewingLaudo.excessQuantity ? `${viewingLaudo.excessQuantity} ${viewingLaudo.excessUnit || 'g'}` : '-'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Preço de Venda</Label>
                      <div className="mt-1 text-sm font-semibold text-blue-600">
                        {viewingLaudo.isManualOfferPrice && viewingLaudo.manualPricePerUnit 
                          ? `${formatCurrency(viewingLaudo.manualPricePerUnit)}/${viewingLaudo.excessUnit === 'kg' || viewingLaudo.excessUnit === 'g' ? 'g' : (viewingLaudo.excessUnit === 'un' ? 'un' : 'mL')} (Manual)`
                          : viewingLaudo.purchasePrice && viewingLaudo.purchaseQuantity
                            ? `${(() => {
                                let q = viewingLaudo.purchaseQuantity;
                                if (viewingLaudo.purchaseUnit === 'kg' || viewingLaudo.purchaseUnit === 'L') q *= 1000;
                                return formatCurrency(viewingLaudo.purchasePrice / q);
                              })()}/${viewingLaudo.excessUnit === 'kg' || viewingLaudo.excessUnit === 'g' ? 'g' : (viewingLaudo.excessUnit === 'un' ? 'un' : 'mL')} (Custo)`
                            : 'Não definido'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Data de Cadastro</Label>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {formatDate(viewingLaudo.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (viewingLaudo) {
                  // Preencher formulário com dados do laudo para edição
                  const substanceObj = availableSubstances.find(s => s.id === viewingLaudo.substanceId);
                  if (substanceObj) {
                    setSelectedSubstance(substanceObj);
                    setEditingLaudoId(viewingLaudo.id);
                    setSubstanceSearch(viewingLaudo.substanceName);
                    setFormBatch(viewingLaudo.batch);
                    setFormSupplier(viewingLaudo.supplier || '');
                    setFormSupplierSearch(viewingLaudo.supplier || '');
                    if (viewingLaudo.supplier) {
                      const supplierObj = availableSuppliers.find(s => s.name === viewingLaudo.supplier);
                      if (supplierObj) {
                        setSelectedSupplier({ id: supplierObj.id, name: supplierObj.name });
                      }
                    }
                    setFormManufacturer(viewingLaudo.manufacturer || '');
                    setFormMfgDate(viewingLaudo.manufacturingDate ? viewingLaudo.manufacturingDate.toISOString().split('T')[0] : '');
                    setFormExpDate(viewingLaudo.expiryDate ? viewingLaudo.expiryDate.toISOString().split('T')[0] : '');
                    setFormPurchaseDate(viewingLaudo.purchaseDate ? viewingLaudo.purchaseDate.toISOString().split('T')[0] : '');
                    setFormPurchaseQuantity(viewingLaudo.purchaseQuantity?.toString() || '');
                    setFormPurchaseUnit(viewingLaudo.purchaseUnit || 'g');
                    setFormPurchasePrice(viewingLaudo.purchasePrice?.toString() || '');
                    setIsViewDialogOpen(false);
                    setIsDialogOpen(true);
                  }
                }
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
