import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubstances } from '@/contexts/SubstanceContext';
import { useLaudos } from '@/contexts/LaudoContext';
import { useUserNotifications } from '@/contexts/NotificationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  FileText,
  ShoppingCart,
  ShoppingBag,
  TrendingUp,
  Bell,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  DollarSign,
  Zap,
  ChevronRight,
  Plus,
  Check,
  CheckCheck,
  Star,
  X,
  Building2,
  CreditCard,
  UserPlus,
  LogOut,
  FileSearch,
  CheckCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  User, 
  RawMaterial,
  SubstanceSuggestion,
  SupplierRequest,
  BankDataChangeRequest,
  ExtraUserRequest,
  ExitRequest,
} from '@/types';

const FOLLOWED_ITEMS_STORAGE_KEY = 'magistral_followed_items';

// Função para calcular tempo relativo
const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
  if (diffDays < 7) return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
  return date.toLocaleDateString('pt-BR');
};

interface FlashDealRow {
  id: string;
  productId: string;
  startTime: string;
  endTime: string;
  specialPrice: number;
  stockLimit: number;
  limitPerUser?: number;
  unit: string;
  remainingStock: number;
  isActive: boolean;
  product?: { substance?: { name: string }; unit?: string };
}

interface FollowedItem {
  id: string;
  name: string;
  alerts: number;
}

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const { laudos } = useLaudos();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useUserNotifications(user?.id || null);
  const { substances: availableSubstances } = useSubstances();
  const [showNotifications, setShowNotifications] = useState(false);
  const [followedItems, setFollowedItems] = useState<FollowedItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(FOLLOWED_ITEMS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (error) {
      // Falha silenciosa no carregamento inicial
    }
    return [];
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [showCompletedRequests, setShowCompletedRequests] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allQuotations, setAllQuotations] = useState<any[]>([]);
  const [flashDeals, setFlashDeals] = useState<FlashDealRow[]>([]);
  const [loadingFlash, setLoadingFlash] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Sincronizar showNotifications com a query string
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setShowNotifications(params.get('view') === 'notifications');
  }, [location.search]);

  // Salvar itens seguidos no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FOLLOWED_ITEMS_STORAGE_KEY, JSON.stringify(followedItems));
      } catch (error) {
        // Falha silenciosa na persistência
      }
    }
  }, [followedItems]);

  // Carregar dados reais (Logica original do Dashboard)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Carregar usuários
    try {
      const usersStored = localStorage.getItem('magistral_users');
      if (usersStored) {
        const parsed = JSON.parse(usersStored);
        setAllUsers(parsed.map((u: any) => ({
          ...u,
          createdAt: new Date(u.createdAt),
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
    
    // Carregar cotações
    try {
      const quotationsStored = localStorage.getItem('magistral_quotations');
      if (quotationsStored) {
        const parsed = JSON.parse(quotationsStored);
        setAllQuotations(parsed.map((q: any) => ({
          ...q,
          quotationDate: new Date(q.quotationDate),
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar cotações:', error);
    }

    // Carregar Flash Deals
    const loadFlashDeals = async () => {
      if (!user) return;
      setLoadingFlash(true);
      try {
        const res = await api.get<{ flashDeals?: FlashDealRow[] }>('/marketplace/stock');
        if (res.flashDeals) {
          setFlashDeals(res.flashDeals.filter(fd => fd.isActive).slice(0, 3));
        }
      } catch (error) {
        console.error('Erro ao carregar Flash Deals:', error);
      } finally {
        setLoadingFlash(false);
      }
    };

    loadFlashDeals();
  }, [user?.id]);

  // Carregar todas as solicitações do usuário (Logica de Notificacoes.tsx)
  useEffect(() => {
    if (!user) return;

    const loadMyRequests = () => {
      try {
        const allReqs: any[] = [];

        // Carregar sugestões de substâncias
        const substanceSuggestionsStored = localStorage.getItem('magistral_substance_suggestions');
        if (substanceSuggestionsStored) {
          const suggestions: SubstanceSuggestion[] = JSON.parse(substanceSuggestionsStored);
          suggestions
            .filter((s) => s.userId === user.id)
            .forEach((s) => {
              allReqs.push({
                id: s.id,
                type: 'substance',
                typeLabel: 'Matéria-Prima',
                title: `Sugestão: ${s.name}`,
                description: s.suggestedName
                  ? `Nome ajustado sugerido: ${s.suggestedName}`
                  : 'Aguardando análise do administrador',
                status: s.status,
                createdAt: s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt),
                reviewedAt: s.rejectedAt 
                  ? (s.rejectedAt instanceof Date ? s.rejectedAt : new Date(s.rejectedAt))
                  : s.approvedAt 
                    ? (s.approvedAt instanceof Date ? s.approvedAt : new Date(s.approvedAt))
                    : undefined,
                rejectionReason: s.rejectionReason,
                data: s,
              });
            });
        }

        // Carregar solicitações de fornecedor
        const supplierRequestsStored = localStorage.getItem('magistral_supplier_requests');
        if (supplierRequestsStored) {
          const requests: SupplierRequest[] = JSON.parse(supplierRequestsStored);
          requests
            .filter((r) => r.userId === user.id)
            .forEach((r) => {
              allReqs.push({
                id: r.id,
                type: 'supplier',
                typeLabel: 'Fornecedor',
                title: `Cadastro de Fornecedor: ${r.name}`,
                description: 'Solicitação de cadastro de novo fornecedor',
                status: r.status,
                createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
                reviewedAt: r.reviewedAt 
                  ? (r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt))
                  : undefined,
                rejectionReason: r.rejectionReason,
                data: r,
              });
            });
        }

        // Carregar solicitações de dados bancários
        const bankDataRequestsStored = localStorage.getItem('magistral_bank_data_requests');
        if (bankDataRequestsStored) {
          const requests: BankDataChangeRequest[] = JSON.parse(bankDataRequestsStored);
          requests
            .filter((r) => r.userId === user.id)
            .forEach((r) => {
              const types: string[] = [];
              if (r.newPixKey) types.push('PIX');
              if (r.newCnpj) types.push('CNPJ');
              if (r.newRazaoSocial) types.push('Razão Social');
              if (r.bankName || r.agency || r.account) types.push('Dados Bancários');

              allReqs.push({
                id: r.id,
                type: 'bank_data',
                typeLabel: 'Dados Cadastrais',
                title: `Alteração de ${types.join(', ')}`,
                description: types.length > 0
                  ? `Solicitação de alteração: ${types.join(', ')}`
                  : 'Solicitação de alteração de dados',
                status: r.status || 'pending',
                createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
                reviewedAt: r.reviewedAt 
                  ? (r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt))
                  : undefined,
                rejectionReason: r.rejectionReason,
                data: r,
              });
            });
        }

        // Carregar solicitações de usuários extras
        const extraUsersRequestsStored = localStorage.getItem('magistral_extra_users_requests');
        if (extraUsersRequestsStored) {
          const requests: ExtraUserRequest[] = JSON.parse(extraUsersRequestsStored);
          requests
            .filter((r) => r.userId === user.id)
            .forEach((r) => {
              allReqs.push({
                id: r.id,
                type: 'extra_users',
                typeLabel: 'Usuários Extras',
                title: `Solicitação de ${r.requestedUsers.length} usuário(s) extra(s)`,
                description: r.requestedUsers
                  .map((u) => `${u.name} (${u.role === 'socio' ? 'Sócio' : 'Funcionário'})`)
                  .join(', '),
                status: r.status,
                createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
                reviewedAt: r.reviewedAt 
                  ? (r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt))
                  : undefined,
                rejectionReason: r.rejectionReason,
                data: r,
              });
            });
        }

        // Carregar solicitações de saída
        const exitRequestsStored = localStorage.getItem('magistral_exit_requests');
        if (exitRequestsStored) {
          const requests: ExitRequest[] = JSON.parse(exitRequestsStored);
          requests
            .filter((r) => r.userId === user.id)
            .forEach((r) => {
              allReqs.push({
                id: r.id,
                type: 'exit',
                typeLabel: 'Solicitação de Saída',
                title: 'Solicitação de Saída da Cooperativa',
                description: r.reason || 'Solicitação de saída e retirada de valores',
                status: r.status,
                createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
                reviewedAt: r.reviewedAt 
                  ? (r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt))
                  : undefined,
                rejectionReason: r.rejectionReason,
                data: r,
              });
            });
        }

        // Ordenar por data (mais recentes primeiro)
        allReqs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setMyRequests(allReqs);
      } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
      }
    };

    loadMyRequests();
    const interval = setInterval(loadMyRequests, 2000);
    const handleStorageChange = () => loadMyRequests();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('supplier-request-created', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('supplier-request-created', handleStorageChange);
    };
  }, [user?.id]);
  
  // Carregar dados reais
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Carregar usuários
    try {
      const usersStored = localStorage.getItem('magistral_users');
      if (usersStored) {
        const parsed = JSON.parse(usersStored);
        setAllUsers(parsed.map((u: any) => ({
          ...u,
          createdAt: new Date(u.createdAt),
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
    
    // Carregar cotações
    try {
      const quotationsStored = localStorage.getItem('magistral_quotations');
      if (quotationsStored) {
        const parsed = JSON.parse(quotationsStored);
        setAllQuotations(parsed.map((q: any) => ({
          ...q,
          quotationDate: new Date(q.quotationDate),
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar cotações:', error);
    }

    // Carregar Flash Deals
    const loadFlashDeals = async () => {
      if (!user) return;
      setLoadingFlash(true);
      try {
        const res = await api.get<{ flashDeals?: FlashDealRow[] }>('/marketplace/stock');
        if (res.flashDeals) {
          setFlashDeals(res.flashDeals.filter(fd => fd.isActive).slice(0, 3));
        }
      } catch (error) {
        console.error('Erro ao carregar Flash Deals:', error);
      } finally {
        setLoadingFlash(false);
      }
    };

    loadFlashDeals();
  }, [user?.id]);

  const removeFollowedItem = (id: string) => {
    setFollowedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Filtrar substâncias baseado no que o usuário digita
  const filteredSubstances = newItem.trim()
    ? availableSubstances.filter((substance) =>
        substance.name.toLowerCase().includes(newItem.toLowerCase()) ||
        (substance.synonyms && substance.synonyms.some((syn) =>
          syn.toLowerCase().includes(newItem.toLowerCase())
        ))
      )
    : [];

  const addFollowedItem = (substanceName?: string) => {
    const itemName = substanceName || newItem.trim();
    if (itemName) {
      // Verificar se já não está seguindo
      if (followedItems.some((item) => item.name.toLowerCase() === itemName.toLowerCase())) {
        return;
      }
      setFollowedItems((prev) => [
        ...prev,
        { id: Date.now().toString(), name: itemName, alerts: 0 },
      ]);
      setNewItem('');
      setIsDialogOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'substance_suggestion':
        return <Package className="h-4 w-4 text-primary" />;
      case 'supplier_request':
        return <Building2 className="h-4 w-4 text-primary" />;
      case 'followed_item_new_offer':
        return <Package className="h-4 w-4 text-accent" />;
      case 'followed_item_expiring':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'followed_user_new_offer':
        return <Users className="h-4 w-4 text-accent" />;
      case 'proposal_received':
        return <ShoppingCart className="h-4 w-4 text-primary" />;
      case 'voting_opened':
        return <Vote className="h-4 w-4 text-primary" />;
      case 'voting_closed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'other':
        return <Bell className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  // Filtrar notificações por role
  const filteredNotifications = notifications.filter((notification) => {
    if (hasRole(['master'])) {
      // Master vê apenas notificações administrativas
      return ['substance_suggestion', 'supplier_request'].includes(notification.type);
    } else if (hasRole(['cooperado'])) {
      // Cooperados veem notificações sobre itens seguidos, usuários seguidos, propostas e votações
      return [
        'followed_item_new_offer',
        'followed_item_expiring',
        'followed_user_new_offer',
        'proposal_received',
        'voting_opened',
        'voting_closed',
      ].includes(notification.type);
    }
    return false;
  });

  const filteredUnreadCount = filteredNotifications.filter((n) => !n.read).length;

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
    if (diffDays < 7) return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
    return dateObj.toLocaleDateString('pt-BR');
  };
  
  // Calcular estatísticas reais
  const getStats = () => {
    if (!user) return [];
    
    if (hasRole(['master'])) {
      const activeUsers = allUsers.filter((u) => u.status === 'active');
      const allLaudos = laudos.length;
      const thisMonthQuotations = allQuotations.filter((q) => {
        const qDate = q.quotationDate instanceof Date ? q.quotationDate : new Date(q.quotationDate);
        const now = new Date();
        return qDate.getMonth() === now.getMonth() && qDate.getFullYear() === now.getFullYear();
      }).length;
      
      return [
        { title: 'Usuários Ativos', value: activeUsers.length.toString(), change: '', trend: 'neutral' as const, icon: Users, link: '/usuarios' },
        { title: 'Laudos Cadastrados', value: allLaudos.toString(), change: '', trend: 'neutral' as const, icon: FileText, link: '/laudos' },
        { title: 'Cotações do Mês', value: thisMonthQuotations.toString(), change: '', trend: 'neutral' as const, icon: TrendingUp, link: '/cotacoes' },
        { title: 'Notificações', value: unreadCount.toString(), change: unreadCount > 0 ? `${unreadCount} novas` : '', trend: 'neutral' as const, icon: Bell, link: '/dashboard?view=notifications' },
      ];
    }
    
    if (hasRole(['cooperado'])) {
      const userLaudos = laudos.filter((l) => l.createdBy === user.id);
      const userQuotations = allQuotations.filter((q) => q.userId === user.id);
      
      return [
        { title: 'Meus Laudos', value: userLaudos.length.toString(), change: '', trend: 'neutral' as const, icon: FileText, link: '/laudos' },
        { title: 'Cotações Salvas', value: userQuotations.length.toString(), change: '', trend: 'neutral' as const, icon: TrendingUp, link: '/cotacoes' },
        { title: 'Notificações', value: unreadCount.toString(), change: unreadCount > 0 ? `${unreadCount} novas` : '', trend: 'neutral' as const, icon: Bell, link: '/dashboard?view=notifications' },
      ];
    }
    
    return [
      { title: 'Notificações', value: unreadCount.toString(), change: unreadCount > 0 ? `${unreadCount} novas` : '', trend: 'neutral' as const, icon: Bell, link: '/dashboard?view=notifications' },
      { title: 'Itens Seguidos', value: '0', change: '', trend: 'neutral' as const, icon: Package, link: '/substancias' },
    ];
  };
  
  const stats = getStats();
  
  // Minhas atividades recentes reais
  const getRecentActivities = () => {
    const activities: any[] = [];
    
    // Meus laudos recentes
    const recentLaudos = laudos
      .filter((l) => l.createdBy === user?.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 2);
    
    recentLaudos.forEach((laudo) => {
      activities.push({
        id: `laudo-${laudo.id}`,
        type: 'laudo',
        title: 'Novo laudo cadastrado',
        description: `${laudo.substanceName} - Lote ${laudo.batch}`,
        time: getRelativeTime(laudo.createdAt),
        date: laudo.createdAt,
      });
    });
    
    // Minhas cotações recentes
    const recentQuotations = allQuotations
      .filter((q) => q.userId === user?.id)
      .sort((a, b) => {
        const aDate = a.quotationDate instanceof Date ? a.quotationDate : new Date(a.quotationDate);
        const bDate = b.quotationDate instanceof Date ? b.quotationDate : new Date(b.quotationDate);
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, 2);
    
    recentQuotations.forEach((quotation) => {
      const qDate = quotation.quotationDate instanceof Date ? quotation.quotationDate : new Date(quotation.quotationDate);
      activities.push({
        id: `quotation-${quotation.id}`,
        type: 'cotacao',
        title: 'Cotação registrada',
        description: `${quotation.substanceName} - ${quotation.supplierName}`,
        time: getRelativeTime(qDate),
        date: qDate,
      });
    });
    
    // Ordenar por data e pegar os 4 mais recentes
    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 4);
  };
  
  const recentActivities = getRecentActivities();
  
  // Cadastros pendentes reais
  const getPendingApprovals = () => {
    if (!hasRole(['master'])) return [];
    
    return allUsers
      .filter((u) => !u.approved && u.status === 'active')
      .map((u) => ({
        id: u.id,
        name: u.name,
        company: u.company || '',
        date: u.createdAt.toLocaleDateString('pt-BR'),
      }));
  };
  
  const pendingApprovals = getPendingApprovals();

  const getRoleName = () => {
    switch (user?.role) {
      case 'master':
        return 'Administrador';
      case 'cooperado':
        return 'Cooperado';
      default:
        return 'Usuário';
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Calcular rendimento do cooperado (apenas proventos, sem CDI)
  // O CDI (100%) é conservação do capital, não rendimento
  // Rendimento = apenas proventos proporcionais do excedente
  const getCooperadoValue = () => {
    if (!user || user.role !== 'cooperado') return null;
    const contribution = (user as any).contribution || 0;
    const currentValue = (user as any).currentValue || contribution;
    
    // Se o campo 'proceeds' já estiver calculado (apenas proventos), usar ele
    // Caso contrário, calcular usando estimativa
    let proceeds = (user as any).proceeds;
    
    if (proceeds === undefined || proceeds === null) {
      // Fallback: calcular usando estimativa de CDI (12% ao ano)
      const estimatedCdiRate = 0.12;
      const cdiOnContribution = contribution * estimatedCdiRate;
      const totalReturns = currentValue - contribution;
      proceeds = Math.max(0, totalReturns - cdiOnContribution);
    }
    
    const proceedsPercent = contribution > 0 ? (proceeds / contribution) * 100 : 0;
    
    return { 
      contribution, 
      currentValue, 
      proceeds, // Apenas proventos (sem CDI)
      proceedsPercent 
    };
  };

  const cooperadoValue = getCooperadoValue();

  const quickActions = [
    {
      title: 'Novo Laudo',
      description: 'Cadastrar matéria-prima no sistema',
      icon: Plus,
      color: 'bg-primary',
      textColor: 'text-primary-foreground',
      bgColor: 'bg-primary/5',
      borderColor: 'border-primary/30',
      hoverColor: 'hover:bg-primary/10',
      path: '/laudos?action=new',
    },
    {
      title: 'Nova Oferta',
      description: 'Comprar ou vender no marketplace',
      icon: ShoppingCart,
      color: 'bg-accent',
      textColor: 'text-accent-foreground',
      bgColor: 'bg-accent/5',
      borderColor: 'border-accent/30',
      hoverColor: 'hover:bg-accent/10',
      path: '/marketplace?action=sell',
    },
    {
      title: 'Solicitar Compra',
      description: 'Sugerir matéria-prima para a cooperativa',
      icon: ShoppingBag,
      color: 'bg-green-600',
      textColor: 'text-white',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:bg-green-100',
      path: '/lista-compras?action=new',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Header com Sininho de Notificações */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">
            {showNotifications ? 'Notificações' : `Olá, ${user?.name.split(' ')[0]}! 👋`}
          </h1>
          <div className="text-muted-foreground flex items-center gap-2">
            {showNotifications ? (
              <span>
                {filteredUnreadCount > 0
                  ? `Você tem ${filteredUnreadCount} notificação${filteredUnreadCount > 1 ? 'ões' : ''} não lida${filteredUnreadCount > 1 ? 's' : ''}`
                  : 'Todas as notificações foram lidas'}
              </span>
            ) : (
              <>
                <span>Bem-vindo ao sistema da Cooperativa Magistral •</span>
                <Badge variant="secondary" className="font-normal">
                  {getRoleName()}
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showNotifications && filteredUnreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => { console.log('[Dashboard] Botão "Marcar todas como lidas" clicado'); markAllAsRead(); }}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Lidas
            </Button>
          )}
          <div 
            className={`relative cursor-pointer hover:opacity-80 transition-opacity p-2 rounded-full ${showNotifications ? 'bg-primary/10 text-primary' : 'text-foreground'}`} 
            onClick={() => navigate(showNotifications ? '/dashboard' : '/dashboard?view=notifications')}
          >
            {showNotifications ? <X className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
            {!showNotifications && unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {showNotifications ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Tabs - Logica de Notificacoes.tsx */}
          <Tabs defaultValue="notifications" className="space-y-4">
            <TabsList className={`grid w-full ${hasRole(['cooperado']) ? 'max-w-3xl grid-cols-3' : 'max-w-md grid-cols-2'}`}>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Notificações
                {filteredUnreadCount > 0 && (
                  <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                    {filteredUnreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              {hasRole(['cooperado']) && (
                <TabsTrigger value="my-requests" className="gap-2">
                  <FileSearch className="h-4 w-4" />
                  Minhas Solicitações
                  {myRequests.filter((r) => r.status === 'pending' || !r.status).length > 0 && (
                    <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-yellow-500">
                      {myRequests.filter((r) => r.status === 'pending' || !r.status).length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="following" className="gap-2">
                <Star className="h-4 w-4" />
                Itens Seguidos ({followedItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notifications" className="space-y-4">
              <Card className="card-pharmaceutical">
                <CardContent className="divide-y p-0">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Nenhuma notificação</p>
                    </div>
                  ) : (
                    filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-4 p-4 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-primary/5' : ''
                        } hover:bg-muted/50`}
                        onClick={() => {
                          if (!notification.read) markAsRead(notification.id);
                          if (notification.link) navigate(notification.link);
                        }}
                      >
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background border">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{notification.title}</p>
                            {!notification.read && <span className="h-2 w-2 rounded-full bg-primary"></span>}
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(notification.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {hasRole(['cooperado']) && (
              <TabsContent value="my-requests" className="space-y-4">
                <Card className="card-pharmaceutical">
                  <CardContent className="divide-y p-0">
                    {myRequests.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <FileSearch className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>Nenhuma solicitação</p>
                      </div>
                    ) : (
                      myRequests.map((request) => (
                        <div key={request.id} className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border">
                            {request.type === 'substance' && <Package className="h-5 w-5 text-blue-500" />}
                            {request.type === 'supplier' && <Building2 className="h-5 w-5 text-green-500" />}
                            {request.type === 'bank_data' && <CreditCard className="h-5 w-5 text-purple-500" />}
                            {request.type === 'extra_users' && <UserPlus className="h-5 w-5 text-orange-500" />}
                            {request.type === 'exit' && <LogOut className="h-5 w-5 text-red-500" />}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{request.title}</p>
                              <Badge variant="outline" className={request.status === 'approved' ? 'border-green-500 text-green-600' : 'border-yellow-500 text-yellow-600'}>
                                {request.status === 'approved' ? 'Aprovada' : 'Pendente'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{request.description}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="following" className="space-y-4">
              <Card className="card-pharmaceutical">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Itens Seguidos</CardTitle>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gradient-primary">
                        <Plus className="mr-2 h-4 w-4" /> Seguir Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Seguir Matéria-Prima</DialogTitle>
                        <DialogDescription>Receba alertas sobre novas cotações</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Input 
                          placeholder="Ex: Vitamina D3" 
                          value={newItem} 
                          onChange={(e) => setNewItem(e.target.value)} 
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                          <Button onClick={() => addFollowedItem()} className="gradient-primary">Adicionar</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-2">
                  {followedItems.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">Nenhum item seguido</p>
                  ) : (
                    followedItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Star className="h-4 w-4 text-warning fill-warning" />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeFollowedItem(item.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <>
          {/* Cooperado Value Card */}
          {cooperadoValue && (
            <Card className="card-pharmaceutical border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Minha Participação na Cooperativa
                </CardTitle>
                <CardDescription>Valor atualizado da sua fatia na cooperativa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Aporte Inicial</p>
                    <p className="text-2xl font-bold">{formatCurrency(cooperadoValue.contribution)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Valor Atual</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(cooperadoValue.currentValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Rendimento</p>
                    <div className="flex items-baseline gap-2">
                      <p className={`text-2xl font-bold ${cooperadoValue.proceeds >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {cooperadoValue.proceeds >= 0 ? '+' : ''}{formatCurrency(cooperadoValue.proceeds)}
                      </p>
                      <span className={`text-sm ${cooperadoValue.proceedsPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({cooperadoValue.proceedsPercent >= 0 ? '+' : ''}{cooperadoValue.proceedsPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="mr-1 inline-block h-3 w-3" />
                    O rendimento mostrado refere-se apenas aos proventos proporcionais. O CDI (100%) é conservação do capital e não é considerado rendimento.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações Rápidas em destaque */}
          {hasRole(['cooperado']) && (
            <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(quickActions.length, 5)}`}>
              {quickActions.map((action, index) => (
                <Card 
                  key={index}
                  className={`card-pharmaceutical border-2 ${action.borderColor} ${action.bgColor} ${action.hoverColor} transition-all cursor-pointer group hover:shadow-md`}
                  onClick={() => navigate(action.path)}
                >
                  <CardContent className="flex items-center gap-4 py-6">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.color} ${action.textColor} group-hover:scale-110 transition-transform shadow-sm`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Stats Cards */}
          {stats.length > 0 && (
            <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(stats.length, 5)}`}>
              {stats.map((stat, index) => (
                <Card 
                  key={index} 
                  className="card-pharmaceutical animate-fade-in hover:border-primary/50 transition-colors cursor-pointer" 
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(stat.link)}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    {stat.change && (
                      <p className="mt-1 flex items-center text-xs text-muted-foreground">
                        {stat.trend === 'up' && (
                          <ArrowUpRight className="mr-1 h-3 w-3 text-success" />
                        )}
                        {stat.trend === 'down' && (
                          <ArrowDownRight className="mr-1 h-3 w-3 text-destructive" />
                        )}
                        <span className={stat.trend === 'up' ? 'text-success' : ''}>
                          {stat.change}
                        </span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Flash Deals Widget */}
            <Card className="card-pharmaceutical flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                    Flash Deals
                  </CardTitle>
                  <CardDescription>Ofertas exclusivas por tempo limitado</CardDescription>
                </div>
                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                  Ativos agora
                </Badge>
              </CardHeader>
              <CardContent className="flex-1">
                {loadingFlash ? (
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                ) : flashDeals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                    <Zap className="mx-auto h-12 w-12 mb-4 opacity-20" />
                    <p>Nenhum flash deal ativo no momento</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {flashDeals.map((fd) => (
                      <div
                        key={fd.id}
                        className="flex items-center gap-4 rounded-xl border bg-card p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => navigate('/marketplace/flash-deals')}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50 group-hover:bg-amber-100 transition-colors">
                          <Package className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm truncate">{fd.product?.substance?.name}</p>
                            <p className="text-sm font-bold text-amber-600">{formatCurrency(fd.specialPrice)}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <p className="text-xs text-muted-foreground truncate">
                              Estoque: {fd.remainingStock} {fd.unit}
                            </p>
                            <p className="text-[10px] font-medium text-amber-600/70 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expira em breve
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  variant="default" 
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                  onClick={() => navigate('/marketplace/flash-deals')}
                >
                  Ver Mais
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            {/* Recent Activity */}
            <Card className="card-pharmaceutical">
              <CardHeader>
                <CardTitle className="text-lg">Minhas Atividades Recentes</CardTitle>
                <CardDescription>Suas últimas atualizações no sistema</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhuma atividade recente</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          {activity.type === 'laudo' && <FileText className="h-4 w-4 text-primary" />}
                          {activity.type === 'oferta' && <ShoppingCart className="h-4 w-4 text-primary" />}
                          {activity.type === 'cotacao' && <TrendingUp className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{activity.description}</p>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {activity.time}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin-only: Pending Approvals */}
            {hasRole(['master']) && (
              <Card className="card-pharmaceutical">
                <CardHeader>
                  <CardTitle className="text-lg">Cadastros Pendentes</CardTitle>
                  <CardDescription>Usuários aguardando aprovação</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingApprovals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Nenhum cadastro pendente</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingApprovals.map((approval) => (
                        <div
                          key={approval.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="font-medium">{approval.name}</p>
                            <p className="text-sm text-muted-foreground">{approval.company}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="status-pending">
                              Pendente
                            </Badge>
                            <p className="mt-1 text-xs text-muted-foreground">{approval.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </>
      )}
    </div>
  );
}
