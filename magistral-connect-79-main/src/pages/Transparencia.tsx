import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Clock,
  Search,
  Info,
  CheckCircle,
  Edit,
  Plus,
  Vote,
  XCircle,
  Minus,
  Users,
} from 'lucide-react';
import { FinancialMovement, TransparencyNews, Voting, Vote as VoteType, User as UserType } from '@/types';
import { api } from '@/lib/api';
import { getReadNewsIds, markNewsAsRead } from '@/lib/transparencyNewsRead';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const MOVEMENTS_STORAGE_KEY = 'magistral_financial_movements';
const VOTINGS_STORAGE_KEY = 'magistral_votings';
const VOTES_STORAGE_KEY = 'magistral_votes';
const USERS_STORAGE_KEY = 'magistral_users';

export default function Transparencia() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [movements, setMovements] = useState<FinancialMovement[]>([]);
  const [news, setNews] = useState<TransparencyNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const tabParam = searchParams.get('tab');
  const pageParam = searchParams.get('page');
  const [activeTab, setActiveTab] = useState<'movements' | 'news' | 'votings'>(
    tabParam === 'news' ? 'news' : tabParam === 'votings' ? 'votings' : 'movements'
  );
  const [editNews, setEditNews] = useState<TransparencyNews | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPage, setEditPage] = useState<string>('dashboard');
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createPage, setCreatePage] = useState<string>('dashboard');
  const [creating, setCreating] = useState(false);
  const [readNewsIds, setReadNewsIds] = useState<Set<string>>(() => getReadNewsIds(user?.id));
  const [newsDetailsOpen, setNewsDetailsOpen] = useState(false);
  const [newsDetailsItem, setNewsDetailsItem] = useState<TransparencyNews | null>(null);

  // Estados para Votações
  const [votings, setVotings] = useState<Voting[]>([]);
  const [votes, setVotes] = useState<VoteType[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [selectedVoting, setSelectedVoting] = useState<Voting | null>(null);
  const [voteChoice, setVoteChoice] = useState<'yes' | 'no' | 'abstain' | null>(null);
  const [isVoteDialogOpen, setIsVoteDialogOpen] = useState(false);

  const PAGE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'laudos', label: 'Laudos RDC' },
    { value: 'estoque-inteligente', label: 'Estoque Inteligente' },
    { value: 'lista-compras', label: 'Lista de Compras' },
    { value: 'cotacoes', label: 'Cotações' },
    { value: 'fornecedores', label: 'Fornecedores' },
    { value: 'perfil', label: 'Meu Perfil' },
    { value: 'notificacoes', label: 'Notificações' },
    { value: 'transparencia', label: 'Transparência' },
    { value: 'votacoes', label: 'Votações' },
    { value: 'solicitacoes', label: 'Solicitações (Admin)' },
    { value: 'usuarios', label: 'Usuários (Admin)' },
    { value: 'gestao', label: 'Gestão (Admin)' },
    { value: 'configuracoes', label: 'Configurações (Admin)' },
  ];

  const getPageLabel = (page?: string) => PAGE_OPTIONS.find((p) => p.value === page)?.label ?? 'Outros';

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'news' || t === 'movements' || t === 'votings') setActiveTab(t as any);
  }, [searchParams]);

  const setTab = (v: 'movements' | 'news' | 'votings') => {
    setActiveTab(v);
    setSearchParams(v === 'movements' ? {} : { tab: v });
  };

  const loadMovements = () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMovements(parsed.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt) })));
      }
    } catch (e) {
      console.error('Erro ao carregar movimentações:', e);
    }
  };

  const loadNews = async () => {
    setNewsLoading(true);
    try {
      const res = await api.get<{ news: TransparencyNews[] }>('/transparency/news');
      const list = (res.news || []).map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        approvedAt: n.approvedAt ? new Date(n.approvedAt) : undefined,
      }));
      setNews(list);
      setReadNewsIds(getReadNewsIds(user?.id));
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falha ao carregar novidades.', variant: 'destructive' });
    } finally {
      setNewsLoading(false);
    }
  };

  const loadVotings = () => {
    if (typeof window === 'undefined') return;

    try {
      const votingsStored = localStorage.getItem(VOTINGS_STORAGE_KEY);
      if (votingsStored) {
        const parsed = JSON.parse(votingsStored);
        setVotings(
          parsed.map((v: any) => ({
            ...v,
            createdAt: new Date(v.createdAt),
            openedAt: v.openedAt ? new Date(v.openedAt) : undefined,
            closedAt: v.closedAt ? new Date(v.closedAt) : undefined,
            deadline: v.deadline ? new Date(v.deadline) : undefined,
          }))
        );
      }
    } catch (error) {
      console.error('Erro ao carregar votações:', error);
    }

    try {
      const votesStored = localStorage.getItem(VOTES_STORAGE_KEY);
      if (votesStored) {
        const parsed = JSON.parse(votesStored);
        setVotes(
          parsed.map((v: any) => ({
            ...v,
            createdAt: new Date(v.createdAt),
            updatedAt: v.updatedAt ? new Date(v.updatedAt) : undefined,
          }))
        );
      }
    } catch (error) {
      console.error('Erro ao carregar votos:', error);
    }

    try {
      const usersStored = localStorage.getItem(USERS_STORAGE_KEY);
      if (usersStored) {
        const parsed = JSON.parse(usersStored);
        setAllUsers(parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  useEffect(() => {
    loadMovements();
    loadNews();
    loadVotings();
  }, []);

  useEffect(() => {
    setReadNewsIds(getReadNewsIds(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === MOVEMENTS_STORAGE_KEY) loadMovements();
      if (e.key === VOTINGS_STORAGE_KEY || e.key === VOTES_STORAGE_KEY) loadVotings();
    };
    window.addEventListener('storage', handleStorage);
    const iv = setInterval(() => {
      loadMovements();
      loadVotings();
    }, 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(iv);
    };
  }, []);

  // Handlers para Votações
  const getUserVote = (votingId: string): VoteType | null => {
    if (!user) return null;
    return votes.find((v) => v.votingId === votingId && v.userId === user.id) || null;
  };

  const canVote = (voting: Voting): boolean => {
    if (!user || !hasRole(['cooperado'])) return false;
    if (voting.status !== 'open') return false;
    if (voting.deadline && new Date() > voting.deadline) return false;
    return !getUserVote(voting.id);
  };

  const handleOpenVoteDialog = (voting: Voting) => {
    if (!canVote(voting)) {
      toast({
        title: 'Não é possível votar',
        description: 'Esta votação não está aberta ou você já votou.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedVoting(voting);
    setVoteChoice(null);
    setIsVoteDialogOpen(true);
  };

  const handleSubmitVote = () => {
    if (!user || !selectedVoting || !voteChoice) return;

    const newVote: VoteType = {
      id: `vote-${Date.now()}`,
      votingId: selectedVoting.id,
      userId: user.id,
      userName: user.name,
      choice: voteChoice,
      createdAt: new Date(),
    };

    const updatedVotes = [...votes, newVote];
    setVotes(updatedVotes);
    localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(updatedVotes));

    const updatedVotings = votings.map((v) => {
      if (v.id === selectedVoting.id) {
        const newYes = voteChoice === 'yes' ? v.yesVotes + 1 : v.yesVotes;
        const newNo = voteChoice === 'no' ? v.noVotes + 1 : v.noVotes;
        const newAbstain = voteChoice === 'abstain' ? v.abstentions + 1 : v.abstentions;
        return {
          ...v,
          yesVotes: newYes,
          noVotes: newNo,
          abstentions: newAbstain,
        };
      }
      return v;
    });
    setVotings(updatedVotings);
    localStorage.setItem(VOTINGS_STORAGE_KEY, JSON.stringify(updatedVotings));

    toast({ title: 'Voto registrado', description: 'Seu voto foi registrado com sucesso.' });
    setIsVoteDialogOpen(false);
    setSelectedVoting(null);
    setVoteChoice(null);
    window.dispatchEvent(new Event('magistral-votings-updated'));
  };

  const getVotingResult = (voting: Voting) => {
    const totalVotes = voting.yesVotes + voting.noVotes + voting.abstentions;
    const participationRate = voting.totalEligibleVoters > 0 
      ? (totalVotes / voting.totalEligibleVoters) * 100 
      : 0;
    
    if (voting.status === 'open') return { status: 'open', participationRate, totalVotes };
    if (voting.yesVotes > voting.noVotes) return { status: 'approved', participationRate, totalVotes };
    if (voting.noVotes > voting.yesVotes) return { status: 'rejected', participationRate, totalVotes };
    return { status: 'tied', participationRate, totalVotes };
  };

  const filteredVotings = votings
    .filter((v) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return v.title.toLowerCase().includes(term) || v.description.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (a.status !== 'open' && b.status === 'open') return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const pendingVotingsCount = votings.filter(v => canVote(v)).length;

  // Filtrar movimentações
  const filteredMovements = movements
    .filter((m) => {
      if (!user) return false;
      if (hasRole(['cooperado']) && m.userId !== user.id) return false;
      if (hasRole(['master'])) return true;
      return false;
    })
    .filter((m) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        m.description.toLowerCase().includes(term) ||
        m.type.toLowerCase().includes(term) ||
        m.userName?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Filtrar novidades
  const filteredNews = news
    .filter((n) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const pendingNews = filteredNews.filter((n) => n.status === 'pending');
  const approvedNews = filteredNews.filter((n) => n.status === 'approved' || !n.status);
  const pendingNewsAll = news.filter((n) => n.status === 'pending');
  const approvedNewsAll = news.filter((n) => n.status === 'approved' || !n.status);

  const approvedByPage = approvedNews.reduce<Record<string, TransparencyNews[]>>((acc, n) => {
    const page = n.page || 'dashboard';
    acc[page] = acc[page] || [];
    acc[page].push(n);
    return acc;
  }, {});

  const unreadCountByPage = Object.fromEntries(
    Object.entries(approvedByPage).map(([page, items]) => [
      page,
      items.filter((n) => !readNewsIds.has(n.id)).length,
    ])
  );
  const unreadTotal = approvedNews.filter((n) => !readNewsIds.has(n.id)).length;
  const unreadTotalAll = approvedNewsAll.filter((n) => !readNewsIds.has(n.id)).length;

  const openNewsDetails = (item: TransparencyNews) => {
    setNewsDetailsItem(item);
    setNewsDetailsOpen(true);
    if (user?.id && item.status === 'approved') {
      markNewsAsRead(user.id, item.id);
      setReadNewsIds(getReadNewsIds(user.id));
      window.dispatchEvent(new Event('magistral-news-read-updated'));
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      contribution: 'Aporte',
      cdi_yield: 'Rendimento CDI',
      proceeds: 'Proventos',
      withdrawal: 'Retirada',
      adjustment: 'Ajuste',
      refund: 'Reembolso',
    };
    return labels[type] || type;
  };

  const getMovementTypeIcon = (type: string) => {
    if (['contribution', 'cdi_yield', 'proceeds', 'refund'].includes(type)) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      financial: 'bg-blue-100 text-blue-800',
      decision: 'bg-purple-100 text-purple-800',
      general: 'bg-gray-100 text-gray-800',
      voting: 'bg-orange-100 text-orange-800',
      update: 'bg-green-100 text-green-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const handleApprove = async (item: TransparencyNews) => {
    setApproving(item.id);
    try {
      await api.post(`/transparency/news/${item.id}/approve`);
      toast({ title: 'Novidade aprovada', description: 'Cooperados receberão notificação.' });
      loadNews();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falha ao aprovar.', variant: 'destructive' });
    } finally {
      setApproving(null);
    }
  };

  const openEdit = (item: TransparencyNews) => {
    setEditNews(item);
    setEditTitle(item.title);
    setEditContent(item.content);
    setEditPage(item.page || 'dashboard');
  };

  const handleSaveEdit = async () => {
    if (!editNews) return;
    setSaving(true);
    try {
      await api.patch(`/transparency/news/${editNews.id}`, { title: editTitle, content: editContent, page: editPage });
      toast({ title: 'Novidade atualizada' });
      setEditNews(null);
      loadNews();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falha ao salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleMoveNewsPage = async (item: TransparencyNews, page: string) => {
    if (!hasRole(['master'])) return;
    try {
      await api.patch(`/transparency/news/${item.id}`, { page });
      toast({ title: 'Novidade movida', description: `Agora em: ${getPageLabel(page)}` });
      loadNews();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('magistral-news-updated'));
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falha ao mover novidade.', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    if (!createTitle.trim() || !createContent.trim()) {
      toast({ title: 'Preencha título e conteúdo', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await api.post('/transparency/news', {
        title: createTitle.trim(),
        content: createContent.trim(),
        category: 'update',
        page: createPage,
      });
      toast({ title: 'Novidade criada', description: 'Pendente de aprovação. Aprove para liberar aos cooperados.' });
      setCreateOpen(false);
      setCreateTitle('');
      setCreateContent('');
      setCreatePage('dashboard');
      loadNews();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falha ao criar.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Rascunho', variant: 'outline' },
      open: { label: 'Aberta', variant: 'default' },
      closed: { label: 'Encerrada', variant: 'secondary' },
      approved: { label: 'Aprovada', variant: 'default' },
      rejected: { label: 'Rejeitada', variant: 'destructive' },
    };
    return badges[status] || { label: status, variant: 'outline' };
  };

  if (!hasRole(['cooperado', 'master'])) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Acesso restrito a cooperados e administradores.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Governança</h1>
        <p className="text-muted-foreground">
          Transparência financeira, novidades e participação democrática da cooperativa
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar movimentações, novidades ou votações..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setTab(v as 'movements' | 'news' | 'votings')}>
        <TabsList>
          <TabsTrigger value="movements">
            <DollarSign className="mr-2 h-4 w-4" />
            Movimentações Financeiras
            {filteredMovements.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {filteredMovements.length > 99 ? '99+' : filteredMovements.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="news">
            <FileText className="mr-2 h-4 w-4" />
            Novidades
            {(() => {
              const count = hasRole(['master']) ? (pendingNewsAll.length + unreadTotalAll) : unreadTotalAll;
              if (count <= 0) return null;
              return (
                <Badge className="ml-2 bg-red-500 text-white">
                  {count > 99 ? '99+' : count}
                </Badge>
              );
            })()}
          </TabsTrigger>
          <TabsTrigger value="votings">
            <Vote className="mr-2 h-4 w-4" />
            Votações
            {pendingVotingsCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {pendingVotingsCount > 99 ? '99+' : pendingVotingsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Movimentações */}
        <TabsContent value="movements" className="space-y-4">
          {filteredMovements.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhuma movimentação encontrada</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredMovements.map((movement) => (
                <Card key={movement.id} className="card-pharmaceutical">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5">{getMovementTypeIcon(movement.type)}</div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{getMovementTypeLabel(movement.type)}</p>
                            {movement.userName && hasRole(['master']) && (
                              <Badge variant="outline" className="text-xs">
                                {movement.userName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{movement.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getRelativeTime(movement.createdAt)}
                            </div>
                            <span>{formatDate(movement.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${
                            movement.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {movement.amount >= 0 ? '+' : ''}
                          {formatCurrency(movement.amount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Novidades */}
        <TabsContent value="news" id="novidades" className="space-y-4 scroll-mt-6">
          {hasRole(['master']) && (
            <div className="flex justify-end">
              <Button onClick={() => { setCreateOpen(true); setCreateTitle(''); setCreateContent(''); setCreatePage('dashboard'); }}>
                <Plus className="h-4 w-4 mr-2" />
                Criar novidade
              </Button>
            </div>
          )}
          {newsLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">Carregando novidades...</div>
              </CardContent>
            </Card>
          ) : filteredNews.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhuma novidade encontrada</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {hasRole(['master']) && pendingNews.length > 0 && (
                <Card className="card-pharmaceutical">
                  <CardHeader>
                    <CardTitle className="text-base">Pendente de aprovação ({pendingNews.length})</CardTitle>
                    <CardDescription>Estas novidades ainda não foram liberadas para os cooperados.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pendingNews.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{item.title}</p>
                            <Badge variant="secondary" className="text-xs">Pendente</Badge>
                            <Badge variant="outline" className="text-xs">{getPageLabel(item.page)}</Badge>
                            <Badge className={`text-xs ${getCategoryBadge(item.category)}`}>
                              {item.category === 'financial' && 'Financeiro'}
                              {item.category === 'decision' && 'Decisão'}
                              {item.category === 'general' && 'Geral'}
                              {item.category === 'voting' && 'Votação'}
                              {item.category === 'update' && 'Update do Sistema'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(item.createdAt)}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Select
                            value={item.page || 'dashboard'}
                            onValueChange={(v) => handleMoveNewsPage(item, v)}
                          >
                            <SelectTrigger className="h-9 w-[190px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAGE_OPTIONS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  Mover para: {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(item)}
                            disabled={!!approving}
                          >
                            {approving === item.id ? (
                              <Clock className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Aprovar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openNewsDetails(item)}>
                            Ver
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className="card-pharmaceutical">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">Novidades por página</CardTitle>
                      <CardDescription>
                        {unreadTotal > 0 ? `${unreadTotal} novidade(s) não lida(s).` : 'Tudo lido.'}
                      </CardDescription>
                    </div>
                    {unreadTotal > 0 && (
                      <Badge variant="outline" className="text-xs border-red-300 text-red-700">
                        {unreadTotal} não lidas
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion
                    type="multiple"
                    defaultValue={pageParam ? [pageParam] : undefined}
                    className="w-full"
                  >
                    {Object.entries(approvedByPage)
                      .sort((a, b) => getPageLabel(a[0]).localeCompare(getPageLabel(b[0])))
                      .map(([page, items]) => {
                        const unread = unreadCountByPage[page] ?? 0;
                        return (
                          <AccordionItem key={page} value={page} className="border-b-0">
                            <AccordionTrigger className="px-2 py-3 hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-medium truncate">{getPageLabel(page)}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {items.length}
                                  </Badge>
                                  {unread > 0 && (
                                    <Badge variant="outline" className="text-xs border-red-300 text-red-700">
                                      {unread} não lidas
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-2">
                              <div className="space-y-2">
                                {items
                                  .sort((a, b) => {
                                    if (a.isPinned && !b.isPinned) return -1;
                                    if (!a.isPinned && b.isPinned) return 1;
                                    return b.createdAt.getTime() - a.createdAt.getTime();
                                  })
                                  .map((item) => {
                                    const isUnread = item.status === 'approved' && !readNewsIds.has(item.id);
                                    return (
                                      <div
                                        key={item.id}
                                        className={`flex items-start justify-between gap-3 rounded-md border p-3 ${
                                          isUnread ? 'border-red-200 bg-red-50/40' : ''
                                        }`}
                                      >
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium truncate">{item.title}</p>
                                            {item.isPinned && <Badge variant="default" className="text-xs">Fixado</Badge>}
                                            {isUnread && <Badge variant="outline" className="text-xs border-red-300 text-red-700">Não lida</Badge>}
                                            <Badge className={`text-xs ${getCategoryBadge(item.category)}`}>
                                              {item.category === 'financial' && 'Financeiro'}
                                              {item.category === 'decision' && 'Decisão'}
                                              {item.category === 'general' && 'Geral'}
                                              {item.category === 'voting' && 'Votação'}
                                              {item.category === 'update' && 'Update do Sistema'}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-1">{formatDate(item.createdAt)}</p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                          {hasRole(['master']) && (
                                            <>
                                              <Select
                                                value={item.page || 'dashboard'}
                                                onValueChange={(v) => handleMoveNewsPage(item, v)}
                                              >
                                                <SelectTrigger className="h-9 w-[190px]">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {PAGE_OPTIONS.map((p) => (
                                                    <SelectItem key={p.value} value={p.value}>
                                                      Mover para: {p.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                                                <Edit className="h-4 w-4 mr-1" />
                                                Editar
                                              </Button>
                                            </>
                                          )}
                                          <Button variant="outline" size="sm" onClick={() => openNewsDetails(item)}>
                                            Ver
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Votações */}
        <TabsContent value="votings" className="space-y-4">
          {filteredVotings.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Vote className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhuma votação encontrada</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredVotings.map((voting) => {
                const userVote = getUserVote(voting.id);
                const result = getVotingResult(voting);
                const statusBadge = getStatusBadge(voting.status);

                return (
                  <Card key={voting.id} className="card-pharmaceutical">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <CardTitle className="text-lg">{voting.title}</CardTitle>
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`text-xs ${getCategoryBadge(voting.category)}`}>
                          {voting.category === 'financial' && 'Financeiro'}
                          {voting.category === 'operational' && 'Operacional'}
                          {voting.category === 'strategic' && 'Estratégico'}
                          {voting.category === 'regulatory' && 'Regulatório'}
                        </Badge>
                      </div>
                      <CardDescription className="whitespace-pre-wrap">{voting.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Estatísticas */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-green-50 p-2">
                          <div className="flex items-center justify-center gap-1 text-green-700 mb-1">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-bold">{voting.yesVotes}</span>
                          </div>
                          <p className="text-xs text-green-600">Sim</p>
                        </div>
                        <div className="rounded-lg bg-red-50 p-2">
                          <div className="flex items-center justify-center gap-1 text-red-700 mb-1">
                            <XCircle className="h-4 w-4" />
                            <span className="font-bold">{voting.noVotes}</span>
                          </div>
                          <p className="text-xs text-red-600">Não</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-2">
                          <div className="flex items-center justify-center gap-1 text-gray-700 mb-1">
                            <Minus className="h-4 w-4" />
                            <span className="font-bold">{voting.abstentions}</span>
                          </div>
                          <p className="text-xs text-gray-600">Abstenção</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Participação</span>
                          <span className="font-medium">{result.participationRate.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${result.participationRate}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {result.totalVotes} de {voting.totalEligibleVoters} cooperados
                        </p>
                      </div>

                      {voting.deadline && voting.status === 'open' && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Prazo: {formatDate(voting.deadline)}</span>
                        </div>
                      )}

                      {voting.status !== 'open' && (
                        <div className="rounded-lg bg-muted p-3">
                          <div className="flex items-center gap-2">
                            {result.status === 'approved' && (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="font-medium text-green-600">Aprovada</span>
                              </>
                            )}
                            {result.status === 'rejected' && (
                              <>
                                <XCircle className="h-5 w-5 text-red-600" />
                                <span className="font-medium text-red-600">Rejeitada</span>
                              </>
                            )}
                            {result.status === 'tied' && (
                              <>
                                <Minus className="h-5 w-5 text-gray-600" />
                                <span className="font-medium text-gray-600">Empate</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {userVote && (
                        <div className="rounded-lg border p-3">
                          <p className="text-sm font-medium mb-1">Seu voto:</p>
                          <div className="flex items-center gap-2">
                            {userVote.choice === 'yes' && (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-600">Sim</span>
                              </>
                            )}
                            {userVote.choice === 'no' && (
                              <>
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm text-red-600">Não</span>
                              </>
                            )}
                            {userVote.choice === 'abstain' && (
                              <>
                                <Minus className="h-4 w-4 text-gray-600" />
                                <span className="text-sm text-gray-600">Abstenção</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {canVote(voting) && (
                        <Button onClick={() => handleOpenVoteDialog(voting)} className="w-full">
                          <Vote className="mr-2 h-4 w-4" />
                          Votar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editNews} onOpenChange={(o) => !o && setEditNews(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar novidade</DialogTitle>
            <DialogDescription>Altere título e conteúdo. Salvar não aprova; use Aprovar na lista.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Página</Label>
              <Select value={editPage} onValueChange={setEditPage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a página" />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título" />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="Conteúdo" rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNews(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar novidade</DialogTitle>
            <DialogDescription>Criada como pendente. Aprove na lista para liberar aos cooperados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Página</Label>
              <Select value={createPage} onValueChange={setCreatePage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a página" />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Título" />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea value={createContent} onChange={(e) => setCreateContent(e.target.value)} placeholder="Conteúdo" rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newsDetailsOpen} onOpenChange={setNewsDetailsOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{newsDetailsItem?.title || 'Detalhes'}</DialogTitle>
            <DialogDescription>
              {newsDetailsItem?.page ? getPageLabel(newsDetailsItem.page) : 'Novidade'} •{' '}
              {newsDetailsItem?.createdAt ? formatDate(newsDetailsItem.createdAt) : ''}
            </DialogDescription>
          </DialogHeader>
          {newsDetailsItem && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {newsDetailsItem.status === 'pending' && hasRole(['master']) && (
                  <Badge variant="secondary" className="text-xs">Pendente</Badge>
                )}
                <Badge className={`text-xs ${getCategoryBadge(newsDetailsItem.category)}`}>
                  {newsDetailsItem.category === 'financial' && 'Financeiro'}
                  {newsDetailsItem.category === 'decision' && 'Decisão'}
                  {newsDetailsItem.category === 'general' && 'Geral'}
                  {newsDetailsItem.category === 'voting' && 'Votação'}
                  {newsDetailsItem.category === 'update' && 'Update do Sistema'}
                </Badge>
                {newsDetailsItem.isPinned && <Badge variant="default" className="text-xs">Fixado</Badge>}
              </div>
              <div className="whitespace-pre-wrap text-sm">{newsDetailsItem.content}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewsDetailsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Voto */}
      <Dialog open={isVoteDialogOpen} onOpenChange={setIsVoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedVoting?.title}</DialogTitle>
            <DialogDescription>{selectedVoting?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={voteChoice || ''} onValueChange={(v) => setVoteChoice(v as 'yes' | 'no' | 'abstain')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes" className="flex items-center gap-2 cursor-pointer text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Sim</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no" className="flex items-center gap-2 cursor-pointer text-sm">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>Não</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="abstain" id="abstain" />
                <Label htmlFor="abstain" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Minus className="h-4 w-4 text-gray-600" />
                  <span>Abstenção</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVoteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitVote} disabled={!voteChoice}>
              Confirmar Voto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
