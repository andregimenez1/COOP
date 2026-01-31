import { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Calendar,
  Package,
  Users,
  CheckCircle2,
  Clock,
  X,
  Edit,
  Trash2,
  AlertCircle,
  Star,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useSubstances } from '@/contexts/SubstanceContext';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/use-auto-save';
import { PurchaseItem, CollectivePurchase, Supplier, Quotation, QuotationVariation } from '@/types';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

const SUPPLIERS_STORAGE_KEY = 'magistral_suppliers';
const QUOTATIONS_STORAGE_KEY = 'magistral_quotations';

// Demo data
const initialCollectivePurchases: CollectivePurchase[] = [
  {
    id: '1',
    name: 'Compra Coletiva - Janeiro 2024',
    deadline: new Date('2024-02-15'),
    status: 'quotation',
    createdBy: '1',
    createdAt: new Date('2024-01-20'),
    items: [],
    totalQuantity: 0,
  },
];

// Função para normalizar texto
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export default function ListaCompras() {
  const { user, hasRole } = useAuth();
  const { substances: availableSubstances } = useSubstances();
  const { toast } = useToast();
  
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
      try {
        localStorage.setItem('magistral_followed_items', JSON.stringify(followedItems));
      } catch (error) {
        console.error('Erro ao salvar itens seguidos:', error);
      }
    }
  }, [followedItems]);
  
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
  
  // Carregar itens de compra do localStorage com proteção
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const loaded = safeGetItem<PurchaseItem[]>('magistral_purchase_items', []);
    return loaded.map((item: any) => ({
      ...item,
      deadline: item.deadline ? (item.deadline instanceof Date ? item.deadline : new Date(item.deadline)) : new Date(),
      createdAt: item.createdAt ? (item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt)) : new Date(),
    }));
  });

  // Carregar compras coletivas do localStorage com proteção
  const [collectivePurchases, setCollectivePurchases] = useState<CollectivePurchase[]>(() => {
    if (typeof window === 'undefined') return initialCollectivePurchases;
    const loaded = safeGetItem<CollectivePurchase[]>('magistral_collective_purchases', initialCollectivePurchases);
    return loaded.map((cp: any) => ({
      ...cp,
      deadline: cp.deadline ? (cp.deadline instanceof Date ? cp.deadline : new Date(cp.deadline)) : new Date(),
      createdAt: cp.createdAt ? (cp.createdAt instanceof Date ? cp.createdAt : new Date(cp.createdAt)) : new Date(),
      items: (cp.items || []).map((item: any) => ({
        ...item,
        deadline: item.deadline ? (item.deadline instanceof Date ? item.deadline : new Date(item.deadline)) : new Date(),
        createdAt: item.createdAt ? (item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt)) : new Date(),
      })),
    }));
  });

  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'my-list' | 'collective' | 'quotations'>('my-list');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      safeSetItem('magistral_purchase_items', purchaseItems);
    }
  }, [purchaseItems]);

  // Salvar compras coletivas no localStorage com proteção
  useEffect(() => {
    if (typeof window !== 'undefined') {
      safeSetItem('magistral_collective_purchases', collectivePurchases);
    }
  }, [collectivePurchases]);
  
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isPurchaseDeleteDialogOpen, setIsPurchaseDeleteDialogOpen] = useState(false);
  const [purchaseItemToDelete, setPurchaseItemToDelete] = useState<PurchaseItem | null>(null);
  const [purchaseItemToEdit, setPurchaseItemToEdit] = useState<PurchaseItem | null>(null);
  
  // Form states - Compra
  const [purchaseSubstanceSearch, setPurchaseSubstanceSearch] = useState('');
  const [selectedPurchaseSubstance, setSelectedPurchaseSubstance] = useState<{ id: string; name: string } | null>(null);
  const [purchaseFormQuantity, setPurchaseFormQuantity] = useState('');
  const [purchaseFormUnit, setPurchaseFormUnit] = useState<'g' | 'mL' | 'kg' | 'L'>('g');
  const [purchaseFormDeadline, setPurchaseFormDeadline] = useState('');
  const [includeInCollectivePurchase, setIncludeInCollectivePurchase] = useState(false);
  
  // Dados do formulário para salvamento automático
  const purchaseFormData = {
    purchaseSubstanceSearch,
    selectedSubstanceId: selectedPurchaseSubstance?.id,
    selectedSubstanceName: selectedPurchaseSubstance?.name,
    formQuantity: purchaseFormQuantity,
    formUnit: purchaseFormUnit,
    formDeadline: purchaseFormDeadline,
  };
  
  // Salvamento automático do formulário
  const { loadSavedData: loadPurchaseDraft, clearSavedData: clearPurchaseDraft } = useAutoSave({
    data: purchaseFormData,
    storageKey: `purchase_form_draft_${user?.id || 'anonymous'}`,
    debounceMs: 1500,
    enabled: isPurchaseDialogOpen,
  });
  
  // Carregar rascunho ao abrir o dialog
  useEffect(() => {
    if (isPurchaseDialogOpen && !purchaseItemToEdit) {
      const saved = loadPurchaseDraft();
      if (saved) {
        setPurchaseSubstanceSearch(saved.purchaseSubstanceSearch || '');
        if (saved.selectedSubstanceId && saved.selectedSubstanceName) {
          setSelectedPurchaseSubstance({ id: saved.selectedSubstanceId, name: saved.selectedSubstanceName });
        }
        setPurchaseFormQuantity(saved.formQuantity || '');
        setPurchaseFormUnit(saved.formUnit || 'g');
        setPurchaseFormDeadline(saved.formDeadline || '');
      }
    }
  }, [isPurchaseDialogOpen, purchaseItemToEdit]);

  // Estados para Cotações e Fornecedores
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(SUPPLIERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
    return [];
  });

  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(QUOTATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((q: any) => ({
          ...q,
          validity: new Date(q.validity),
          quotationDate: new Date(q.quotationDate),
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar cotações:', error);
    }
    return [];
  });

  const [quotationSearchQuery, setQuotationSearchQuery] = useState('');
  const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isDeleteSupplierDialogOpen, setIsDeleteSupplierDialogOpen] = useState(false);
  const [selectedQuotationSupplier, setSelectedQuotationSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  
  // Form states - Cotação
  const [quotationSubstanceSearch, setQuotationSubstanceSearch] = useState('');
  const [selectedQuotationSubstance, setSelectedQuotationSubstance] = useState<{ id: string; name: string } | null>(null);
  const [formQuotationSupplierId, setFormQuotationSupplierId] = useState('');
  const [formQuotationValidity, setFormQuotationValidity] = useState('');
  const [formQuotationVariations, setFormQuotationVariations] = useState<QuotationVariation[]>([
    { quantity: 0, unit: 'g', price: 0 },
  ]);
  const [formQuotationNotes, setFormQuotationNotes] = useState('');
  
  // Form states - Fornecedor
  const [formSupplierName, setFormSupplierName] = useState('');
  const [formSupplierContact, setFormSupplierContact] = useState('');
  const [formSupplierNotes, setFormSupplierNotes] = useState('');
  
  // Dados do formulário de cotação para salvamento automático
  const quotationFormData = {
    quotationSubstanceSearch,
    selectedSubstanceId: selectedQuotationSubstance?.id,
    selectedSubstanceName: selectedQuotationSubstance?.name,
    formSupplierId: formQuotationSupplierId,
    formValidity: formQuotationValidity,
    formVariations: formQuotationVariations,
    formNotes: formQuotationNotes,
  };
  
  // Salvamento automático do formulário de cotação
  const { loadSavedData: loadQuotationDraft, clearSavedData: clearQuotationDraft } = useAutoSave({
    data: quotationFormData,
    storageKey: `quotation_form_draft_${user?.id || 'anonymous'}`,
    debounceMs: 1500,
    enabled: isQuotationDialogOpen,
  });

  // Verificar se deve abrir o diálogo de compra ao carregar (via query param)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setIsPurchaseDialogOpen(true);
      // Limpar parâmetro da URL sem recarregar a página
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  
  // Carregar rascunho ao abrir o dialog de cotação
  useEffect(() => {
    if (isQuotationDialogOpen) {
      const saved = loadQuotationDraft();
      if (saved) {
        setQuotationSubstanceSearch(saved.quotationSubstanceSearch || '');
        if (saved.selectedSubstanceId && saved.selectedSubstanceName) {
          setSelectedQuotationSubstance({ id: saved.selectedSubstanceId, name: saved.selectedSubstanceName });
        }
        setFormQuotationSupplierId(saved.formSupplierId || '');
        setFormQuotationValidity(saved.formValidity || '');
        if (saved.formVariations && saved.formVariations.length > 0) {
          setFormQuotationVariations(saved.formVariations);
        }
        setFormQuotationNotes(saved.formNotes || '');
      }
    }
  }, [isQuotationDialogOpen]);

  // Salvar fornecedores
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
    }
  }, [suppliers]);

  // Salvar cotações
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(quotations));
    }
  }, [quotations]);

  // Filtrar fornecedores do usuário
  const userSuppliers = suppliers.filter((s) => s.userId === user?.id);

  // Filtrar cotações
  const userQuotations = quotations.filter((q) => q.userId === user?.id);
  const allQuotations = hasRole(['master']) ? quotations : userQuotations;

  const filteredQuotations = allQuotations.filter((q) =>
    q.substanceName.toLowerCase().includes(quotationSearchQuery.toLowerCase()) ||
    q.supplierName.toLowerCase().includes(quotationSearchQuery.toLowerCase())
  );

  // Buscar substâncias para compra
  const searchPurchaseSubstances = (query: string) => {
    if (!query.trim()) return availableSubstances.slice(0, 10);
    const normalizedQuery = normalizeText(query);
    return availableSubstances.filter((substance) => {
      const normalizedName = normalizeText(substance.name);
      if (normalizedName.includes(normalizedQuery)) return true;
      if (substance.synonyms) {
        return substance.synonyms.some((synonym) =>
          normalizeText(synonym).includes(normalizedQuery)
        );
      }
      return false;
    }).slice(0, 10);
  };

  const filteredPurchaseSubstances = searchPurchaseSubstances(purchaseSubstanceSearch);

  // Buscar substâncias para cotação
  const searchQuotationSubstances = (query: string) => {
    if (!query.trim()) return availableSubstances.slice(0, 10);
    const normalizedQuery = normalizeText(query);
    return availableSubstances.filter((substance) => {
      const normalizedName = normalizeText(substance.name);
      if (normalizedName.includes(normalizedQuery)) return true;
      if (substance.synonyms) {
        return substance.synonyms.some((synonym) =>
          normalizeText(synonym).includes(normalizedQuery)
        );
      }
      return false;
    }).slice(0, 10);
  };

  const filteredQuotationSubstances = searchQuotationSubstances(quotationSubstanceSearch);

  // Filtrar itens do usuário atual
  const userItems = purchaseItems.filter((item) => item.userId === user?.id);

  // Filtrar itens
  const filteredPurchaseItems = userItems.filter((item) =>
    item.substanceName.toLowerCase().includes(purchaseSearchQuery.toLowerCase())
  );

  // Obter próxima compra coletiva
  const nextCollectivePurchase = collectivePurchases
    .filter((cp) => cp.status !== 'completed' && cp.status !== 'cancelled')
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())[0];

  // Itens incluídos na próxima compra coletiva
  const itemsInCollective = nextCollectivePurchase
    ? purchaseItems.filter((item) => item.collectivePurchaseId === nextCollectivePurchase.id)
    : [];

  // Validar prazo mínimo (10 dias)
  const validateDeadline = (deadline: Date): { valid: boolean; message?: string } => {
    const now = new Date();
    const daysDiff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 10) {
      return {
        valid: false,
        message: `O prazo mínimo é de 10 dias corridos. Data mínima: ${formatDate(addDays(now, 10))}`,
      };
    }
    
    return { valid: true };
  };

  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const formatDate = (date: Date | string): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getDaysUntilDeadline = (deadline: Date): number => {
    const now = new Date();
    return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-warning text-warning">Pendente</Badge>;
      case 'in_collective':
        return <Badge className="status-badge status-active">Na Compra Coletiva</Badge>;
      case 'completed':
        return <Badge className="status-badge status-active">Concluído</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return null;
    }
  };

  const getCollectiveStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return <Badge variant="outline">Planejamento</Badge>;
      case 'quotation':
        return <Badge className="status-badge status-pending">Em Cotação</Badge>;
      case 'ordered':
        return <Badge className="status-badge status-active">Pedido Realizado</Badge>;
      case 'received':
        return <Badge className="status-badge status-active">Recebido</Badge>;
      case 'completed':
        return <Badge className="status-badge status-active">Concluído</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return null;
    }
  };

  const handleOpenPurchaseDialog = (item?: PurchaseItem) => {
    if (item) {
      setPurchaseItemToEdit(item);
      const substance = availableSubstances.find((s) => s.id === item.substanceId);
      if (substance) {
        setSelectedPurchaseSubstance({ id: substance.id, name: substance.name });
        setPurchaseSubstanceSearch(substance.name);
      }
      setPurchaseFormQuantity(item.quantity.toString());
      setPurchaseFormUnit(item.unit);
      setPurchaseFormDeadline(item.deadline.toISOString().split('T')[0]);
      setIncludeInCollectivePurchase(!!item.collectivePurchaseId);
    } else {
      setPurchaseItemToEdit(null);
      setSelectedPurchaseSubstance(null);
      setPurchaseSubstanceSearch('');
      setPurchaseFormQuantity('');
      setPurchaseFormUnit('g');
      const minDate = addDays(new Date(), 10);
      setPurchaseFormDeadline(minDate.toISOString().split('T')[0]);
      setIncludeInCollectivePurchase(false);
    }
    setIsPurchaseDialogOpen(true);
  };

  const handleSavePurchaseItem = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPurchaseSubstance) {
      toast({
        title: 'Erro',
        description: 'Selecione uma matéria-prima.',
        variant: 'destructive',
      });
      return;
    }

    if (!purchaseFormQuantity || !purchaseFormDeadline) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const deadline = new Date(purchaseFormDeadline);
    const validation = validateDeadline(deadline);

    if (!validation.valid) {
      toast({
        title: 'Prazo inválido',
        description: validation.message,
        variant: 'destructive',
      });
      return;
    }

    // Encontrar ou criar próxima compra coletiva se necessário
    const currentNextCollectivePurchase = collectivePurchases
      .filter((cp) => cp.status !== 'completed' && cp.status !== 'cancelled')
      .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())[0];
    
    let targetCollectivePurchase = currentNextCollectivePurchase;
    
    if (includeInCollectivePurchase && !targetCollectivePurchase) {
      // Criar nova compra coletiva se não existir
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      targetCollectivePurchase = {
        id: `collective-${Date.now()}`,
        name: `Compra Coletiva - ${nextMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        deadline: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15),
        status: 'planning' as const,
        createdBy: user?.id || '',
        createdAt: new Date(),
        items: [],
        totalQuantity: 0,
      };
      setCollectivePurchases((prev) => [...prev, targetCollectivePurchase!]);
    }

    if (purchaseItemToEdit) {
      // Editar item
      const updatedItem: PurchaseItem = {
        ...purchaseItemToEdit,
        substanceId: selectedPurchaseSubstance.id,
        substanceName: selectedPurchaseSubstance.name,
        quantity: parseInt(purchaseFormQuantity),
        unit: purchaseFormUnit,
        deadline: deadline,
        status: includeInCollectivePurchase && targetCollectivePurchase ? 'in_collective' : 'pending',
        collectivePurchaseId: includeInCollectivePurchase && targetCollectivePurchase ? targetCollectivePurchase.id : undefined,
      };

      setPurchaseItems((prev) =>
        prev.map((item) => (item.id === purchaseItemToEdit.id ? updatedItem : item))
      );

      // Atualizar compra coletiva se necessário
      if (includeInCollectivePurchase && targetCollectivePurchase) {
        setCollectivePurchases((prev) =>
          prev.map((cp) => {
            if (cp.id === targetCollectivePurchase!.id) {
              // Remover item antigo se estava em outra compra coletiva
              const itemsWithoutOld = cp.items.filter((i) => i.id !== updatedItem.id);
              // Adicionar item atualizado
              return {
                ...cp,
                items: [...itemsWithoutOld, updatedItem],
              };
            }
            // Remover de outras compras coletivas se estava em outra
            if (purchaseItemToEdit.collectivePurchaseId && cp.id === purchaseItemToEdit.collectivePurchaseId && cp.id !== targetCollectivePurchase!.id) {
              return {
                ...cp,
                items: cp.items.filter((i) => i.id !== purchaseItemToEdit.id),
              };
            }
            return cp;
          })
        );
      } else if (purchaseItemToEdit.collectivePurchaseId) {
        // Remover da compra coletiva se desmarcado
        setCollectivePurchases((prev) =>
          prev.map((cp) =>
            cp.id === purchaseItemToEdit.collectivePurchaseId
              ? {
                  ...cp,
                  items: cp.items.filter((i) => i.id !== purchaseItemToEdit.id),
                }
              : cp
          )
        );
      }

      toast({
        title: 'Item atualizado',
        description: includeInCollectivePurchase && targetCollectivePurchase
          ? 'O item foi atualizado e incluído na próxima compra coletiva.'
          : 'O item da lista de compras foi atualizado com sucesso.',
      });
    } else {
      // Criar novo item
      const newItem: PurchaseItem = {
        id: Date.now().toString(),
        userId: user?.id || '',
        userName: user?.name || '',
        substanceId: selectedPurchaseSubstance.id,
        substanceName: selectedPurchaseSubstance.name,
        quantity: parseInt(purchaseFormQuantity),
        unit: purchaseFormUnit,
        deadline: deadline,
        status: includeInCollectivePurchase && targetCollectivePurchase ? 'in_collective' : 'pending',
        createdAt: new Date(),
        collectivePurchaseId: includeInCollectivePurchase && targetCollectivePurchase ? targetCollectivePurchase.id : undefined,
      };

      setPurchaseItems((prev) => [...prev, newItem]);

      // Adicionar à compra coletiva se marcado
      if (includeInCollectivePurchase && targetCollectivePurchase) {
        setCollectivePurchases((prev) =>
          prev.map((cp) =>
            cp.id === targetCollectivePurchase!.id
              ? {
                  ...cp,
                  items: [...cp.items, newItem],
                }
              : cp
          )
        );
      }

      toast({
        title: 'Item adicionado',
        description: includeInCollectivePurchase && targetCollectivePurchase
          ? 'O item foi adicionado à sua lista de compras e incluído na próxima compra coletiva.'
          : 'O item foi adicionado à sua lista de compras.',
      });
      
      // Limpar rascunho após salvar
      clearPurchaseDraft();
    }

    setIsPurchaseDialogOpen(false);
    setPurchaseItemToEdit(null);
    setSelectedPurchaseSubstance(null);
    setPurchaseSubstanceSearch('');
    setPurchaseFormQuantity('');
    setPurchaseFormUnit('g');
    setIncludeInCollectivePurchase(false);
    setPurchaseFormDeadline('');
  };

  const handleDeletePurchaseItem = () => {
    if (!purchaseItemToDelete) return;

    setPurchaseItems((prev) => prev.filter((item) => item.id !== purchaseItemToDelete.id));
    
    toast({
      title: 'Item removido',
      description: 'O item foi removido da sua lista de compras.',
    });

    setIsPurchaseDeleteDialogOpen(false);
    setPurchaseItemToDelete(null);
  };

  // Handlers para Cotações e Fornecedores
  const addQuotationVariation = () => {
    setFormQuotationVariations([...formQuotationVariations, { quantity: 0, unit: 'g', price: 0 }]);
  };

  const removeQuotationVariation = (index: number) => {
    setFormQuotationVariations(formQuotationVariations.filter((_, i) => i !== index));
  };

  const updateQuotationVariation = (index: number, field: keyof QuotationVariation, value: any) => {
    const updated = [...formQuotationVariations];
    updated[index] = { ...updated[index], [field]: value };
    setFormQuotationVariations(updated);
  };

  const handleSaveQuotation = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedQuotationSubstance) {
      toast({
        title: 'Erro',
        description: 'Selecione uma matéria-prima.',
        variant: 'destructive',
      });
      return;
    }

    if (!formQuotationSupplierId) {
      toast({
        title: 'Erro',
        description: 'Selecione um fornecedor.',
        variant: 'destructive',
      });
      return;
    }

    if (!formQuotationValidity) {
      toast({
        title: 'Erro',
        description: 'Informe a validade da cotação.',
        variant: 'destructive',
      });
      return;
    }

    if (formQuotationVariations.length === 0 || formQuotationVariations.some((v) => v.quantity === 0 || v.price === 0)) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos uma variação com quantidade e preço válidos.',
        variant: 'destructive',
      });
      return;
    }

    const supplier = userSuppliers.find((s) => s.id === formQuotationSupplierId);
    if (!supplier) {
      toast({
        title: 'Erro',
        description: 'Fornecedor não encontrado.',
        variant: 'destructive',
      });
      return;
    }

    const newQuotation: Quotation = {
      id: Date.now().toString(),
      userId: user?.id || '',
      userName: user?.name || '',
      substanceId: selectedQuotationSubstance.id,
      substanceName: selectedQuotationSubstance.name,
      supplierId: formQuotationSupplierId,
      supplierName: supplier.name,
      validity: new Date(formQuotationValidity),
      variations: formQuotationVariations.filter((v) => v.quantity > 0 && v.price > 0),
      quotationDate: new Date(),
      notes: formQuotationNotes || undefined,
    };

    setQuotations((prev) => [...prev, newQuotation]);
    
    toast({
      title: 'Cotação cadastrada',
      description: 'A cotação foi cadastrada com sucesso.',
    });

    // Limpar formulário e rascunho
    clearQuotationDraft();
    setSelectedQuotationSubstance(null);
    setQuotationSubstanceSearch('');
    setFormQuotationSupplierId('');
    setFormQuotationValidity('');
    setFormQuotationVariations([{ quantity: 0, unit: 'g', price: 0 }]);
    setFormQuotationNotes('');
    setIsQuotationDialogOpen(false);
  };

  const handleOpenSupplierDialog = (supplier?: Supplier) => {
    if (supplier) {
      setSelectedQuotationSupplier(supplier);
      setFormSupplierName(supplier.name);
      setFormSupplierContact(supplier.contact || '');
      setFormSupplierNotes(supplier.notes || '');
    } else {
      setSelectedQuotationSupplier(null);
      setFormSupplierName('');
      setFormSupplierContact('');
      setFormSupplierNotes('');
    }
    setIsSupplierDialogOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formSupplierName.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o nome do fornecedor.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedQuotationSupplier) {
      // Editar
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === selectedQuotationSupplier.id
            ? {
                ...s,
                name: formSupplierName.trim(),
                contact: formSupplierContact.trim() || undefined,
                notes: formSupplierNotes.trim() || undefined,
              }
            : s
        )
      );
      toast({
        title: 'Fornecedor atualizado',
        description: 'O fornecedor foi atualizado com sucesso.',
      });
    } else {
      // Criar
      const newSupplier: Supplier = {
        id: Date.now().toString(),
        userId: user?.id || '',
        name: formSupplierName.trim(),
        contact: formSupplierContact.trim() || undefined,
        notes: formSupplierNotes.trim() || undefined,
        createdAt: new Date(),
      };
      setSuppliers((prev) => [...prev, newSupplier]);
      toast({
        title: 'Fornecedor cadastrado',
        description: 'O fornecedor foi cadastrado com sucesso.',
      });
    }

    setIsSupplierDialogOpen(false);
    setSelectedQuotationSupplier(null);
    setFormSupplierName('');
    setFormSupplierContact('');
    setFormSupplierNotes('');
  };

  const handleDeleteSupplier = () => {
    if (!supplierToDelete) return;

    const hasQuotations = quotations.some((q) => q.supplierId === supplierToDelete.id);
    
    if (hasQuotations) {
      toast({
        title: 'Não é possível excluir',
        description: 'Este fornecedor possui cotações cadastradas. Remova as cotações primeiro.',
        variant: 'destructive',
      });
      setIsDeleteSupplierDialogOpen(false);
      setSupplierToDelete(null);
      return;
    }

    setSuppliers((prev) => prev.filter((s) => s.id !== supplierToDelete.id));
    toast({
      title: 'Fornecedor removido',
      description: 'O fornecedor foi removido com sucesso.',
    });

    setIsDeleteSupplierDialogOpen(false);
    setSupplierToDelete(null);
  };

  if (!hasRole(['master', 'cooperado'])) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="card-pharmaceutical">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
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
          <h1 className="text-2xl font-bold text-foreground">Compras</h1>
          <p className="text-muted-foreground">
            Gerencie suas necessidades de compra, acompanhe compras coletivas e gerencie cotações
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'my-list' && (
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={() => handleOpenPurchaseDialog()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Item
            </Button>
          )}
          {activeTab === 'quotations' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenSupplierDialog()}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Gerenciar Fornecedores
              </Button>
              <Button
                className="gradient-primary text-primary-foreground"
                onClick={() => {
                  setSelectedQuotationSubstance(null);
                  setQuotationSubstanceSearch('');
                  setFormQuotationSupplierId('');
                  setFormQuotationValidity('');
                  setFormQuotationVariations([{ quantity: 0, unit: 'g', price: 0 }]);
                  setFormQuotationNotes('');
                  setIsQuotationDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Cotação
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-list">
            Minha Lista ({filteredPurchaseItems.length})
          </TabsTrigger>
          <TabsTrigger value="collective">
            Próxima Compra Coletiva ({itemsInCollective.length})
          </TabsTrigger>
          <TabsTrigger value="quotations">
            Cotações ({filteredQuotations.length})
          </TabsTrigger>
        </TabsList>

        {/* Minha Lista Tab */}
        <TabsContent value="my-list" className="space-y-4">
          {/* Search */}
          <Card className="card-pharmaceutical">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por matéria-prima..."
                  value={purchaseSearchQuery}
                  onChange={(e) => setPurchaseSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="card-pharmaceutical overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header hover:bg-muted/50">
                  <TableHead>Matéria-Prima</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchaseItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum item na sua lista de compras
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPurchaseItems.map((item) => {
                    const daysUntil = getDaysUntilDeadline(item.deadline);
                    return (
                      <TableRow key={item.id} className="animate-fade-in">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{item.substanceName}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFollowSubstance(item.substanceName)}
                              className={`h-6 w-6 p-0 ${isFollowingSubstance(item.substanceName) ? 'text-warning' : ''}`}
                              title={isFollowingSubstance(item.substanceName) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                            >
                              <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(item.substanceName) ? 'fill-warning' : ''}`} />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {item.quantity} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{formatDate(item.deadline)}</span>
                            {daysUntil > 0 && daysUntil <= 10 && (
                              <Badge variant="outline" className="ml-2 text-xs text-warning">
                                {daysUntil} dias
                              </Badge>
                            )}
                            {daysUntil <= 0 && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Vencido
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenPurchaseDialog(item)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPurchaseItemToDelete(item);
                                setIsPurchaseDeleteDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Próxima Compra Coletiva Tab */}
        <TabsContent value="collective" className="space-y-4">
          {nextCollectivePurchase ? (
            <>
              <Card className="card-pharmaceutical">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{nextCollectivePurchase.name}</CardTitle>
                      <CardDescription>
                        Prazo: {formatDate(nextCollectivePurchase.deadline)} •{' '}
                        {getDaysUntilDeadline(nextCollectivePurchase.deadline)} dias restantes
                      </CardDescription>
                    </div>
                    {getCollectiveStatusBadge(nextCollectivePurchase.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-sm text-muted-foreground">Itens Incluídos</p>
                      <p className="text-2xl font-bold">{itemsInCollective.length}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-sm text-muted-foreground">Cooperados</p>
                      <p className="text-2xl font-bold">
                        {new Set(itemsInCollective.map((i) => i.userId)).size}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="text-lg font-semibold">
                        {nextCollectivePurchase.status === 'quotation' && 'Em Cotação'}
                        {nextCollectivePurchase.status === 'ordered' && 'Pedido Realizado'}
                        {nextCollectivePurchase.status === 'received' && 'Recebido'}
                        {nextCollectivePurchase.status === 'planning' && 'Planejamento'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-pharmaceutical overflow-hidden">
                <CardHeader>
                  <CardTitle>Itens Incluídos</CardTitle>
                  <CardDescription>
                    Itens que já foram incluídos nesta compra coletiva
                  </CardDescription>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow className="table-header hover:bg-muted/50">
                      <TableHead>Cooperado</TableHead>
                      <TableHead>Matéria-Prima</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Prazo Solicitado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsInCollective.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nenhum item incluído ainda
                        </TableCell>
                      </TableRow>
                    ) : (
                      itemsInCollective.map((item) => (
                        <TableRow key={item.id} className="animate-fade-in">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{item.userName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span>{item.substanceName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {item.quantity} {item.unit}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{formatDate(item.deadline)}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </>
          ) : (
            <Card className="card-pharmaceutical">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma compra coletiva</h3>
                <p className="mt-1 text-center text-muted-foreground">
                  Não há compras coletivas planejadas no momento.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cotações Tab */}
        <TabsContent value="quotations" className="space-y-4">
          {/* Search */}
          <Card className="card-pharmaceutical">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por matéria-prima ou fornecedor..."
                  value={quotationSearchQuery}
                  onChange={(e) => setQuotationSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="card-pharmaceutical overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header hover:bg-muted/50">
                  <TableHead>Matéria-Prima</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  {hasRole(['master']) && <TableHead>Cooperado</TableHead>}
                  <TableHead>Variações</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={hasRole(['master']) ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      Nenhuma cotação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotations.map((quotation) => (
                    <TableRow key={quotation.id} className="animate-fade-in">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{quotation.substanceName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFollowSubstance(quotation.substanceName)}
                            className={`h-6 w-6 p-0 ${isFollowingSubstance(quotation.substanceName) ? 'text-warning' : ''}`}
                            title={isFollowingSubstance(quotation.substanceName) ? 'Deixar de seguir' : 'Seguir matéria-prima'}
                          >
                            <Star className={`h-3.5 w-3.5 ${isFollowingSubstance(quotation.substanceName) ? 'fill-warning' : ''}`} />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          {quotation.supplierName}
                        </div>
                      </TableCell>
                      {hasRole(['master']) && (
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{quotation.userName}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="space-y-1">
                          {quotation.variations.map((variation, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-medium">
                                {variation.quantity} {variation.unit}
                              </span>
                              {' - '}
                              <span className="text-green-600 font-semibold">
                                {formatCurrency(variation.price)}
                              </span>
                              {variation.packageType && (
                                <span className="text-muted-foreground ml-1">
                                  ({variation.packageType})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(quotation.validity)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(quotation.quotationDate)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Criar/Editar Item de Compra */}
      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{purchaseItemToEdit ? 'Editar Item' : 'Adicionar Item à Lista'}</DialogTitle>
            <DialogDescription>
              {purchaseItemToEdit
                ? 'Edite os dados do item da sua lista de compras'
                : 'Adicione um item à sua lista de compras com prazo mínimo de 10 dias'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePurchaseItem} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="substance">Matéria-Prima *</Label>
              <div className="space-y-2">
                <Input
                  id="substance"
                  value={purchaseSubstanceSearch}
                  onChange={(e) => {
                    setPurchaseSubstanceSearch(e.target.value);
                    if (!e.target.value) {
                      setSelectedPurchaseSubstance(null);
                    }
                  }}
                  placeholder="Buscar matéria-prima..."
                  required
                />
                {purchaseSubstanceSearch && filteredPurchaseSubstances.length > 0 && !selectedPurchaseSubstance && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border bg-background">
                    {filteredPurchaseSubstances.map((substance) => (
                      <button
                        key={substance.id}
                        type="button"
                        onClick={() => {
                          setSelectedPurchaseSubstance({ id: substance.id, name: substance.name });
                          setPurchaseSubstanceSearch(substance.name);
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
                {selectedPurchaseSubstance && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{selectedPurchaseSubstance.name}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPurchaseSubstance(null);
                          setPurchaseSubstanceSearch('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={purchaseFormQuantity}
                  onChange={(e) => setPurchaseFormQuantity(e.target.value)}
                  placeholder="Ex: 1000"
                  required
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade *</Label>
                <Select value={purchaseFormUnit} onValueChange={(value: 'g' | 'mL' | 'kg' | 'L') => setPurchaseFormUnit(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">g (gramas)</SelectItem>
                    <SelectItem value="kg">kg (quilogramas)</SelectItem>
                    <SelectItem value="mL">mL (mililitros)</SelectItem>
                    <SelectItem value="L">L (litros)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Prazo Necessário *</Label>
              <Input
                id="deadline"
                type="date"
                value={purchaseFormDeadline}
                onChange={(e) => setPurchaseFormDeadline(e.target.value)}
                required
                min={addDays(new Date(), 10).toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                Prazo mínimo: 10 dias corridos a partir de hoje ({formatDate(addDays(new Date(), 10))})
              </p>
            </div>

            <div className="flex items-center space-x-2 rounded-lg border p-3 bg-muted/50">
              <Checkbox
                id="include-collective"
                checked={includeInCollectivePurchase}
                onCheckedChange={(checked) => setIncludeInCollectivePurchase(checked === true)}
              />
              <Label
                htmlFor="include-collective"
                className="text-sm font-normal cursor-pointer flex-1"
              >
                Incluir este item na próxima compra coletiva
                {nextCollectivePurchase && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    {nextCollectivePurchase.name} (Prazo: {formatDate(nextCollectivePurchase.deadline)})
                  </span>
                )}
              </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPurchaseDialogOpen(false);
                  setPurchaseItemToEdit(null);
                  setSelectedPurchaseSubstance(null);
                  setPurchaseSubstanceSearch('');
                  setPurchaseFormQuantity('');
                  setPurchaseFormUnit('g');
                  setPurchaseFormDeadline('');
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">
                {purchaseItemToEdit ? 'Salvar Alterações' : 'Adicionar Item'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Cotação */}
      <Dialog open={isQuotationDialogOpen} onOpenChange={setIsQuotationDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Cotação</DialogTitle>
            <DialogDescription>
              Cadastre uma nova cotação com variações de quantidade e preço
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveQuotation} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="substance-quotation">Matéria-Prima *</Label>
              <div className="space-y-2">
                <Input
                  id="substance-quotation"
                  value={quotationSubstanceSearch}
                  onChange={(e) => {
                    setQuotationSubstanceSearch(e.target.value);
                    if (!e.target.value) {
                      setSelectedQuotationSubstance(null);
                    }
                  }}
                  placeholder="Buscar matéria-prima..."
                  required
                />
                {quotationSubstanceSearch && filteredQuotationSubstances.length > 0 && !selectedQuotationSubstance && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border bg-background">
                    {filteredQuotationSubstances.map((substance) => (
                      <button
                        key={substance.id}
                        type="button"
                        onClick={() => {
                          setSelectedQuotationSubstance({ id: substance.id, name: substance.name });
                          setQuotationSubstanceSearch(substance.name);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors"
                      >
                        <p className="font-medium">{substance.name}</p>
                      </button>
                    ))}
                  </div>
                )}
                {selectedQuotationSubstance && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{selectedQuotationSubstance.name}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedQuotationSubstance(null);
                          setQuotationSubstanceSearch('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier">Fornecedor *</Label>
                <Select value={formQuotationSupplierId} onValueChange={setFormQuotationSupplierId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {userSuppliers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum fornecedor cadastrado
                      </div>
                    ) : (
                      userSuppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {userSuppliers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Cadastre fornecedores usando o botão "Gerenciar Fornecedores"
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="validity">Validade da Cotação *</Label>
                <Input
                  id="validity"
                  type="date"
                  value={formQuotationValidity}
                  onChange={(e) => setFormQuotationValidity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Variações de Quantidade/Preço *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuotationVariation}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Adicionar Variação
                </Button>
              </div>
              <div className="space-y-3 rounded-lg border p-4">
                {formQuotationVariations.map((variation, index) => (
                  <div key={index} className="grid gap-3 sm:grid-cols-5 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variation.quantity || ''}
                        onChange={(e) => updateQuotationVariation(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unidade</Label>
                      <Select
                        value={variation.unit}
                        onValueChange={(value: 'g' | 'mL' | 'kg' | 'L') => updateQuotationVariation(index, 'unit', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="mL">mL</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Preço (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variation.price || ''}
                        onChange={(e) => updateQuotationVariation(index, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo Embalagem</Label>
                      <Input
                        type="text"
                        value={variation.packageType || ''}
                        onChange={(e) => updateQuotationVariation(index, 'packageType', e.target.value)}
                        placeholder="Ex: Embalagem 5g"
                      />
                    </div>
                    {formQuotationVariations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuotationVariation(index)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                value={formQuotationNotes}
                onChange={(e) => setFormQuotationNotes(e.target.value)}
                placeholder="Observações adicionais (opcional)"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuotationDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">
                Salvar Cotação
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Fornecedor */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedQuotationSupplier ? 'Editar Fornecedor' : 'Gerenciar Fornecedores'}</DialogTitle>
            <DialogDescription>
              {selectedQuotationSupplier
                ? 'Edite os dados do fornecedor'
                : 'Cadastre e gerencie fornecedores para suas cotações'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <form onSubmit={handleSaveSupplier} className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div className="text-sm font-medium">{selectedQuotationSupplier ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="supplierName">Nome do Fornecedor *</Label>
                  <Input
                    id="supplierName"
                    value={formSupplierName}
                    onChange={(e) => setFormSupplierName(e.target.value)}
                    placeholder="Ex: Galena, Fagron"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierContact">Contato</Label>
                  <Input
                    id="supplierContact"
                    value={formSupplierContact}
                    onChange={(e) => setFormSupplierContact(e.target.value)}
                    placeholder="Telefone, email, etc. (opcional)"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierNotes">Observações</Label>
                <Input
                  id="supplierNotes"
                  value={formSupplierNotes}
                  onChange={(e) => setFormSupplierNotes(e.target.value)}
                  placeholder="Observações adicionais (opcional)"
                />
              </div>
              <div className="flex justify-end gap-2">
                {selectedQuotationSupplier && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedQuotationSupplier(null);
                      setFormSupplierName('');
                      setFormSupplierContact('');
                      setFormSupplierNotes('');
                    }}
                  >
                    Cancelar Edição
                  </Button>
                )}
                <Button type="submit" className="gradient-primary text-primary-foreground">
                  {selectedQuotationSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                </Button>
              </div>
            </form>

            <div className="space-y-3">
              <div className="text-sm font-medium">Seus Fornecedores ({userSuppliers.length})</div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSuppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                          Nenhum fornecedor cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      userSuppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell className="text-sm">{supplier.contact || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenSupplierDialog(supplier)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSupplierToDelete(supplier);
                                  setIsDeleteSupplierDialogOpen(true);
                                }}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de Fornecedor */}
      <AlertDialog open={isDeleteSupplierDialogOpen} onOpenChange={setIsDeleteSupplierDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o fornecedor "{supplierToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSupplier}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Exclusão de Item de Compra */}
      <AlertDialog open={isPurchaseDeleteDialogOpen} onOpenChange={setIsPurchaseDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este item da sua lista de compras? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurchaseItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePurchaseItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
