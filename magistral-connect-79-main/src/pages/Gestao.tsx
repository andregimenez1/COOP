import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Gavel,
  Vote,
  Plus,
  Edit,
  Trash2,
  Clock,
  Users,
  AlertCircle,
  FileText,
  DollarSign,
  Settings,
  Target,
  Scale,
} from 'lucide-react';
import { Decision, Voting, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';

const DECISIONS_STORAGE_KEY = 'magistral_decisions';
const VOTINGS_STORAGE_KEY = 'magistral_votings';
const USERS_STORAGE_KEY = 'magistral_users';
const NEWS_STORAGE_KEY = 'magistral_transparency_news';
const MOVEMENTS_STORAGE_KEY = 'magistral_financial_movements';

export default function Gestao() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [votings, setVotings] = useState<Voting[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // Estados para decisões
  const [isDecisionDialogOpen, setIsDecisionDialogOpen] = useState(false);
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null);
  const [decisionForm, setDecisionForm] = useState({
    title: '',
    description: '',
    category: 'financial' as 'financial' | 'operational' | 'strategic' | 'regulatory',
  });

  // Estados para votações
  const [isVotingDialogOpen, setIsVotingDialogOpen] = useState(false);
  const [editingVoting, setEditingVoting] = useState<Voting | null>(null);
  const [votingForm, setVotingForm] = useState({
    title: '',
    description: '',
    category: 'financial' as 'financial' | 'operational' | 'strategic' | 'regulatory',
    deadline: '',
    requiresQuorum: false,
    quorumPercentage: 50,
  });

  // Carregar dados
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const decisionsStored = localStorage.getItem(DECISIONS_STORAGE_KEY);
      if (decisionsStored) {
        const parsed = JSON.parse(decisionsStored);
        setDecisions(
          parsed.map((d: any) => ({
            ...d,
            createdAt: new Date(d.createdAt),
            publishedAt: d.publishedAt ? new Date(d.publishedAt) : undefined,
            approvedAt: d.approvedAt ? new Date(d.approvedAt) : undefined,
            implementedAt: d.implementedAt ? new Date(d.implementedAt) : undefined,
          }))
        );
      }
    } catch (error) {
      console.error('Erro ao carregar decisões:', error);
    }

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
      const usersStored = localStorage.getItem(USERS_STORAGE_KEY);
      if (usersStored) {
        const parsed = JSON.parse(usersStored);
        setAllUsers(parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  }, []);

  // Contar cooperados elegíveis
  const eligibleVoters = allUsers.filter((u) => u.role === 'cooperado' && u.status === 'active').length;

  // Handlers para Decisões
  const handleOpenDecisionDialog = (decision?: Decision) => {
    if (decision) {
      setEditingDecision(decision);
      setDecisionForm({
        title: decision.title,
        description: decision.description,
        category: decision.category,
      });
    } else {
      setEditingDecision(null);
      setDecisionForm({
        title: '',
        description: '',
        category: 'financial',
      });
    }
    setIsDecisionDialogOpen(true);
  };

  const handleSaveDecision = () => {
    if (!user || !decisionForm.title || !decisionForm.description) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (editingDecision) {
      // Atualizar decisão existente
      const updated = decisions.map((d) =>
        d.id === editingDecision.id
          ? { ...d, ...decisionForm }
          : d
      );
      setDecisions(updated);
      localStorage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify(updated));
      toast({
        title: 'Decisão atualizada',
        description: 'A decisão foi atualizada com sucesso.',
      });
    } else {
      // Criar nova decisão
      const newDecision: Decision = {
        id: `decision-${Date.now()}`,
        ...decisionForm,
        status: 'draft',
        createdAt: new Date(),
        createdBy: user.id,
      };
      const updated = [...decisions, newDecision];
      setDecisions(updated);
      localStorage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify(updated));
      toast({
        title: 'Decisão criada',
        description: 'A decisão foi criada com sucesso.',
      });
    }

    setIsDecisionDialogOpen(false);
    setEditingDecision(null);
    setDecisionForm({
      title: '',
      description: '',
      category: 'financial',
    });
  };

  const handlePublishDecision = (decision: Decision) => {
    const updated = decisions.map((d) =>
      d.id === decision.id
        ? { ...d, status: 'published', publishedAt: new Date() }
        : d
    );
    setDecisions(updated);
    localStorage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify(updated));

    // Criar novidade de transparência
    const newsStored = localStorage.getItem(NEWS_STORAGE_KEY);
    const news = newsStored ? JSON.parse(newsStored) : [];
    const newNews = {
      id: `news-${Date.now()}`,
      title: `Nova Decisão: ${decision.title}`,
      content: decision.description,
      category: 'decision',
      relatedItemId: decision.id,
      createdAt: new Date(),
      createdBy: user?.id || '',
      isPinned: false,
    };
    news.push(newNews);
    localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(news));

    toast({
      title: 'Decisão publicada',
      description: 'A decisão foi publicada e aparecerá nas novidades.',
    });
  };

  const handleDeleteDecision = (decision: Decision) => {
    if (!confirm('Tem certeza que deseja excluir esta decisão?')) return;
    const updated = decisions.filter((d) => d.id !== decision.id);
    setDecisions(updated);
    localStorage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify(updated));
    toast({
      title: 'Decisão excluída',
      description: 'A decisão foi excluída com sucesso.',
    });
  };

  // Handlers para Votações
  const handleOpenVotingDialog = (voting?: Voting) => {
    if (voting) {
      setEditingVoting(voting);
      setVotingForm({
        title: voting.title,
        description: voting.description,
        category: voting.category,
        deadline: voting.deadline ? voting.deadline.toISOString().split('T')[0] : '',
        requiresQuorum: voting.requiresQuorum || false,
        quorumPercentage: voting.quorumPercentage || 50,
      });
    } else {
      setEditingVoting(null);
      setVotingForm({
        title: '',
        description: '',
        category: 'financial',
        deadline: '',
        requiresQuorum: false,
        quorumPercentage: 50,
      });
    }
    setIsVotingDialogOpen(true);
  };

  const handleSaveVoting = () => {
    if (!user || !votingForm.title || !votingForm.description) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (editingVoting) {
      // Atualizar votação existente
      const updated = votings.map((v) =>
        v.id === editingVoting.id
          ? {
              ...v,
              ...votingForm,
              deadline: votingForm.deadline ? new Date(votingForm.deadline) : undefined,
            }
          : v
      );
      setVotings(updated);
      localStorage.setItem(VOTINGS_STORAGE_KEY, JSON.stringify(updated));
      toast({
        title: 'Votação atualizada',
        description: 'A votação foi atualizada com sucesso.',
      });
    } else {
      // Criar nova votação
      const newVoting: Voting = {
        id: `voting-${Date.now()}`,
        ...votingForm,
        deadline: votingForm.deadline ? new Date(votingForm.deadline) : undefined,
        status: 'draft',
        createdAt: new Date(),
        createdBy: user.id,
        totalEligibleVoters: eligibleVoters,
        yesVotes: 0,
        noVotes: 0,
        abstentions: 0,
      };
      const updated = [...votings, newVoting];
      setVotings(updated);
      localStorage.setItem(VOTINGS_STORAGE_KEY, JSON.stringify(updated));
      toast({
        title: 'Votação criada',
        description: 'A votação foi criada com sucesso.',
      });
    }

    setIsVotingDialogOpen(false);
    setEditingVoting(null);
    setVotingForm({
      title: '',
      description: '',
      category: 'financial',
      deadline: '',
      requiresQuorum: false,
      quorumPercentage: 50,
    });
  };

  const handleOpenVoting = (voting: Voting) => {
    const updated = votings.map((v) =>
      v.id === voting.id
        ? { ...v, status: 'open', openedAt: new Date() }
        : v
    );
    setVotings(updated);
    localStorage.setItem(VOTINGS_STORAGE_KEY, JSON.stringify(updated));

    // Criar novidade de transparência
    const newsStored = localStorage.getItem(NEWS_STORAGE_KEY);
    const news = newsStored ? JSON.parse(newsStored) : [];
    const newNews = {
      id: `news-${Date.now()}`,
      title: `Nova Votação: ${voting.title}`,
      content: voting.description,
      category: 'voting',
      relatedItemId: voting.id,
      createdAt: new Date(),
      createdBy: user?.id || '',
      isPinned: true,
    };
    news.push(newNews);
    localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(news));

    // Notificar cooperados
    allUsers
      .filter(u => u.role === 'cooperado' && u.status === 'active')
      .forEach(u => {
        addNotification({
          userId: u.id,
          type: 'voting_opened',
          title: 'Nova Votação Aberta',
          message: `A votação "${voting.title}" foi aberta. Sua participação é importante!`,
          link: '/transparencia?tab=votings',
          relatedId: voting.id,
        });
      });

    toast({
      title: 'Votação aberta',
      description: 'A votação foi aberta e os cooperados foram notificados.',
    });
  };

  const handleCloseVoting = (voting: Voting) => {
    if (!confirm('Tem certeza que deseja encerrar esta votação?')) return;
    
    const yesVotes = voting.yesVotes;
    const noVotes = voting.noVotes;
    const result = yesVotes > noVotes ? 'approved' : noVotes > yesVotes ? 'rejected' : 'tied';
    
    const updated = votings.map((v) =>
      v.id === voting.id
        ? { ...v, status: 'closed', closedAt: new Date(), result }
        : v
    );
    setVotings(updated);
    localStorage.setItem(VOTINGS_STORAGE_KEY, JSON.stringify(updated));

    // Notificar cooperados sobre o resultado
    const resultLabel = result === 'approved' ? 'Aprovada' : result === 'rejected' ? 'Rejeitada' : 'Empatada';
    allUsers
      .filter(u => u.role === 'cooperado' && u.status === 'active')
      .forEach(u => {
        addNotification({
          userId: u.id,
          type: 'voting_closed',
          title: 'Votação Encerrada',
          message: `A votação "${voting.title}" foi encerrada. Resultado: ${resultLabel}.`,
          link: '/transparencia?tab=votings',
          relatedId: voting.id,
        });
      });

    toast({
      title: 'Votação encerrada',
      description: `Resultado: ${resultLabel}. Cooperados notificados.`,
    });
  };

  const handleDeleteVoting = (voting: Voting) => {
    if (!confirm('Tem certeza que deseja excluir esta votação?')) return;
    const updated = votings.filter((v) => v.id !== voting.id);
    setVotings(updated);
    localStorage.setItem(VOTINGS_STORAGE_KEY, JSON.stringify(updated));
    toast({
      title: 'Votação excluída',
      description: 'A votação foi excluída com sucesso.',
    });
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Rascunho', variant: 'outline' },
      published: { label: 'Publicada', variant: 'default' },
      approved: { label: 'Aprovada', variant: 'default' },
      rejected: { label: 'Rejeitada', variant: 'destructive' },
      implemented: { label: 'Implementada', variant: 'secondary' },
      open: { label: 'Aberta', variant: 'default' },
      closed: { label: 'Encerrada', variant: 'secondary' },
    };
    return badges[status] || { label: status, variant: 'outline' };
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      financial: 'bg-blue-100 text-blue-800',
      operational: 'bg-green-100 text-green-800',
      strategic: 'bg-purple-100 text-purple-800',
      regulatory: 'bg-orange-100 text-orange-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (!hasRole(['master'])) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Acesso restrito a administradores.</p>
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
        <h1 className="text-2xl font-bold text-foreground">Gestão</h1>
        <p className="text-muted-foreground">
          Gerencie decisões do conselho e crie votações para os cooperados
        </p>
      </div>

      <Tabs defaultValue="decisions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="decisions">
            <Gavel className="mr-2 h-4 w-4" />
            Decisões
          </TabsTrigger>
          <TabsTrigger value="votings">
            <Vote className="mr-2 h-4 w-4" />
            Votações
          </TabsTrigger>
        </TabsList>

        {/* Decisões */}
        <TabsContent value="decisions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenDecisionDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Decisão
            </Button>
          </div>

          {decisions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Gavel className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhuma decisão cadastrada</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {decisions.map((decision) => {
                const statusBadge = getStatusBadge(decision.status);
                return (
                  <Card key={decision.id} className="card-pharmaceutical">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <CardTitle className="text-lg">{decision.title}</CardTitle>
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`text-xs ${getCategoryBadge(decision.category)}`}>
                          {decision.category === 'financial' && 'Financeiro'}
                          {decision.category === 'operational' && 'Operacional'}
                          {decision.category === 'strategic' && 'Estratégico'}
                          {decision.category === 'regulatory' && 'Regulatório'}
                        </Badge>
                      </div>
                      <CardDescription className="whitespace-pre-wrap line-clamp-3">
                        {decision.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        <p>Criada em: {formatDate(decision.createdAt)}</p>
                        {decision.publishedAt && (
                          <p>Publicada em: {formatDate(decision.publishedAt)}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDecisionDialog(decision)}
                        >
                          <Edit className="mr-2 h-3 w-3" />
                          Editar
                        </Button>
                        {decision.status === 'draft' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePublishDecision(decision)}
                          >
                            Publicar
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteDecision(decision)}
                        >
                          <Trash2 className="mr-2 h-3 w-3" />
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Votações */}
        <TabsContent value="votings" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenVotingDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Votação
            </Button>
          </div>

          {votings.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Vote className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhuma votação cadastrada</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {votings.map((voting) => {
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
                      <CardDescription className="whitespace-pre-wrap line-clamp-3">
                        {voting.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <p className="font-bold text-green-600">{voting.yesVotes}</p>
                          <p className="text-xs text-muted-foreground">Sim</p>
                        </div>
                        <div>
                          <p className="font-bold text-red-600">{voting.noVotes}</p>
                          <p className="text-xs text-muted-foreground">Não</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-600">{voting.abstentions}</p>
                          <p className="text-xs text-muted-foreground">Abstenção</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>Cooperados elegíveis: {voting.totalEligibleVoters}</p>
                        {voting.deadline && (
                          <p>Prazo: {formatDate(voting.deadline)}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenVotingDialog(voting)}
                        >
                          <Edit className="mr-2 h-3 w-3" />
                          Editar
                        </Button>
                        {voting.status === 'draft' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenVoting(voting)}
                          >
                            Abrir Votação
                          </Button>
                        )}
                        {voting.status === 'open' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCloseVoting(voting)}
                          >
                            Encerrar
                          </Button>
                        )}
                        {voting.status === 'draft' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteVoting(voting)}
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Excluir
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
      </Tabs>

      {/* Dialog de Decisão */}
      <Dialog open={isDecisionDialogOpen} onOpenChange={setIsDecisionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDecision ? 'Editar Decisão' : 'Nova Decisão'}</DialogTitle>
            <DialogDescription>
              Crie uma decisão do conselho/diretoria que será publicada nas novidades
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="decision-title">Título *</Label>
              <Input
                id="decision-title"
                value={decisionForm.title}
                onChange={(e) => setDecisionForm({ ...decisionForm, title: e.target.value })}
                placeholder="Ex: Aprovação de novo investimento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decision-category">Categoria *</Label>
              <Select
                value={decisionForm.category}
                onValueChange={(v) => setDecisionForm({ ...decisionForm, category: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Financeiro
                    </div>
                  </SelectItem>
                  <SelectItem value="operational">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Operacional
                    </div>
                  </SelectItem>
                  <SelectItem value="strategic">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Estratégico
                    </div>
                  </SelectItem>
                  <SelectItem value="regulatory">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Regulatório
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="decision-description">Descrição *</Label>
              <Textarea
                id="decision-description"
                value={decisionForm.description}
                onChange={(e) => setDecisionForm({ ...decisionForm, description: e.target.value })}
                placeholder="Descreva a decisão tomada..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDecisionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDecision}>
              {editingDecision ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Votação */}
      <Dialog open={isVotingDialogOpen} onOpenChange={setIsVotingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVoting ? 'Editar Votação' : 'Nova Votação'}</DialogTitle>
            <DialogDescription>
              Crie uma votação que será aberta para todos os cooperados
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="voting-title">Título *</Label>
              <Input
                id="voting-title"
                value={votingForm.title}
                onChange={(e) => setVotingForm({ ...votingForm, title: e.target.value })}
                placeholder="Ex: Aprovação de mudança na política de investimentos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voting-category">Categoria *</Label>
              <Select
                value={votingForm.category}
                onValueChange={(v) => setVotingForm({ ...votingForm, category: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">Financeiro</SelectItem>
                  <SelectItem value="operational">Operacional</SelectItem>
                  <SelectItem value="strategic">Estratégico</SelectItem>
                  <SelectItem value="regulatory">Regulatório</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="voting-description">Descrição *</Label>
              <Textarea
                id="voting-description"
                value={votingForm.description}
                onChange={(e) => setVotingForm({ ...votingForm, description: e.target.value })}
                placeholder="Descreva o que está sendo votado..."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voting-deadline">Prazo (opcional)</Label>
              <Input
                id="voting-deadline"
                type="datetime-local"
                value={votingForm.deadline}
                onChange={(e) => setVotingForm({ ...votingForm, deadline: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires-quorum"
                checked={votingForm.requiresQuorum}
                onCheckedChange={(checked) =>
                  setVotingForm({ ...votingForm, requiresQuorum: checked as boolean })
                }
              />
              <Label htmlFor="requires-quorum" className="cursor-pointer">
                Requer quórum mínimo
              </Label>
            </div>
            {votingForm.requiresQuorum && (
              <div className="space-y-2">
                <Label htmlFor="quorum-percentage">Porcentagem de quórum (%)</Label>
                <Input
                  id="quorum-percentage"
                  type="number"
                  min="1"
                  max="100"
                  value={votingForm.quorumPercentage}
                  onChange={(e) =>
                    setVotingForm({ ...votingForm, quorumPercentage: parseInt(e.target.value) || 50 })
                  }
                />
              </div>
            )}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                Cooperados elegíveis: <span className="font-medium">{eligibleVoters}</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVotingDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveVoting}>
              {editingVoting ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
