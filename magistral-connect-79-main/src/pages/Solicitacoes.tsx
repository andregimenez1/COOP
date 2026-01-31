import { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Package,
  CheckCircle2,
  XCircle,
  Edit2,
  Clock,
  User,
  Calendar,
  Search,
  Filter,
  Building2,
  Plus,
  CreditCard,
  Users,
  FileSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth } from '@/contexts/AuthContext';
import { useSubstances } from '@/contexts/SubstanceContext';
import { useUserNotifications } from '@/contexts/NotificationContext';
import { useToast } from '@/hooks/use-toast';
import { useRequestsDataContext } from '@/contexts/RequestsDataContext';
import { SubstanceSuggestion, Supplier, BankDataChangeRequest, ExtraUserRequest, SupplierRequest, UserProfileDocumentRequest } from '@/types';
import { requestService } from '@/services/request.service';
import { supplierService } from '@/services/supplier.service';
import { userService } from '@/services/user.service';

export default function Solicitacoes() {
  const { user, hasRole, updateUser } = useAuth();
  const { suggestions, updateSuggestion } = useSubstances();
  const { notifications, markAsRead, getNotificationsByType } = useUserNotifications(user?.id || null);
  const { toast } = useToast();
  const {
    bankDataRequests,
    setBankDataRequests,
    profileDocumentRequests,
    setProfileDocumentRequests,
    extraUsersRequests,
    setExtraUsersRequests,
    supplierRequests,
    setSupplierRequests,
    suppliers,
    setSuppliers,
    isLoading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useRequestsDataContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showHistory, setShowHistory] = useState({
    bankData: false,
    profileDocs: false,
    extraUsers: false,
    suppliers: false,
    exit: false,
  });
  
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SubstanceSuggestion | null>(null);
  const [adjustedName, setAdjustedName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [isSupplierRequestAdjustDialogOpen, setIsSupplierRequestAdjustDialogOpen] = useState(false);
  const [adjustedSupplierName, setAdjustedSupplierName] = useState('');
  
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isDeleteSupplierDialogOpen, setIsDeleteSupplierDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [formSupplierName, setFormSupplierName] = useState('');
  const [formSupplierContact, setFormSupplierContact] = useState('');
  const [formSupplierNotes, setFormSupplierNotes] = useState('');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  
  const [selectedSupplierRequest, setSelectedSupplierRequest] = useState<SupplierRequest | null>(null);
  const [isSupplierRequestRejectDialogOpen, setIsSupplierRequestRejectDialogOpen] = useState(false);
  const [supplierRequestRejectionReason, setSupplierRequestRejectionReason] = useState('');
  
  const [selectedBankDataRequest, setSelectedBankDataRequest] = useState<BankDataChangeRequest | null>(null);
  const [isBankDataRequestRejectDialogOpen, setIsBankDataRequestRejectDialogOpen] = useState(false);
  const [bankDataRequestRejectionReason, setBankDataRequestRejectionReason] = useState('');
  
  const [selectedExtraUserRequest, setSelectedExtraUserRequest] = useState<ExtraUserRequest | null>(null);
  const [isExtraUserRequestRejectDialogOpen, setIsExtraUserRequestRejectDialogOpen] = useState(false);
  const [extraUserRequestRejectionReason, setExtraUserRequestRejectionReason] = useState('');

  const [selectedProfileDocRequest, setSelectedProfileDocRequest] = useState<UserProfileDocumentRequest | null>(null);
  const [isProfileDocRequestRejectDialogOpen, setIsProfileDocRequestRejectDialogOpen] = useState(false);
  const [profileDocRequestRejectionReason, setProfileDocRequestRejectionReason] = useState('');

  // Verificar se o usuário tem permissão
  if (!user || !hasRole(['master'])) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="card-pharmaceutical">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Acesso Restrito</h3>
            <p className="mt-1 text-center text-muted-foreground">
              Apenas o administrador pode acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filtrar sugestões
  const filteredSuggestions = suggestions.filter((suggestion) => {
    const matchesSearch =
      suggestion.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      suggestion.userName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && suggestion.status === filterStatus;
  });

  const pendingSuggestions = useMemo(() => 
    suggestions.filter((s) => s.status === 'pending'),
    [suggestions]
  );

  const pendingProfileDocRequests = useMemo(
    () =>
      profileDocumentRequests.filter(
        (r) => r.status === 'pending' || r.status === undefined || r.status === null || r.status === ''
      ),
    [profileDocumentRequests]
  );

  const completedProfileDocRequests = useMemo(
    () => profileDocumentRequests.filter((r) => r.status === 'approved' || r.status === 'rejected'),
    [profileDocumentRequests]
  );
  
  // Filtrar solicitações pendentes
  // IMPORTANTE: Incluir solicitações sem status definido (criadas antes do ajuste)
  const pendingBankDataRequests = useMemo(() => 
    bankDataRequests.filter((r) => 
      r.status === 'pending' || r.status === undefined || r.status === null || r.status === ''
    ),
    [bankDataRequests]
  );
  const completedBankDataRequests = useMemo(() => 
    bankDataRequests.filter((r) => 
      r.status === 'approved' || r.status === 'rejected'
    ),
    [bankDataRequests]
  );
  
  // IMPORTANTE: Incluir solicitações sem status definido (criadas antes do ajuste)
  const pendingExtraUsersRequests = useMemo(() => 
    extraUsersRequests.filter((r) => 
      r.status === 'pending' || r.status === undefined || r.status === null || r.status === ''
    ),
    [extraUsersRequests]
  );
  const completedExtraUsersRequests = useMemo(() => 
    extraUsersRequests.filter((r) => 
      r.status === 'approved' || r.status === 'rejected'
    ),
    [extraUsersRequests]
  );
  
  // Obter solicitações de fornecedor pendentes
  // IMPORTANTE: Incluir solicitações sem status definido (criadas antes do ajuste)
  const pendingSupplierRequests = useMemo(() => 
    supplierRequests.filter((r) => 
      r.status === 'pending' || r.status === undefined || r.status === null || r.status === ''
    ),
    [supplierRequests]
  );
  const completedSupplierRequests = useMemo(() => 
    supplierRequests.filter((r) => 
      r.status === 'approved' || r.status === 'rejected'
    ),
    [supplierRequests]
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Função para verificar e marcar todas as notificações de solicitações respondidas como lidas
  const checkAndMarkAllNotificationsAsRead = () => {
    // Verificar sugestões de substâncias
    const allSubstanceSuggestions = suggestions;
    
    // Verificar solicitações de fornecedor
    const allSupplierRequests = supplierRequests;
    
    // Marcar todas as notificações de solicitações já respondidas como lidas
    notifications.forEach((notification) => {
      if (
        (notification.type === 'substance_suggestion' || notification.type === 'other') &&
        !notification.read
      ) {
        // Verificar se a solicitação relacionada já foi respondida
        if (notification.type === 'substance_suggestion') {
          const suggestion = allSubstanceSuggestions.find((s) => s.id === notification.relatedId);
          if (suggestion && suggestion.status !== 'pending') {
            markAsRead(notification.id);
          }
        } else if (notification.type === 'other') {
          // Verificar se é notificação de fornecedor
          const request = allSupplierRequests.find((r) => r.id === notification.relatedId);
          if (request && request.status !== 'pending') {
            markAsRead(notification.id);
          }
        }
      }
    });
  };

  const handleApproveSuggestion = async (suggestion: SubstanceSuggestion) => {
    try {
      await updateSuggestion(suggestion.id, {
        status: 'approved',
        suggestedName: suggestion.suggestedName || suggestion.name,
        approvedAt: new Date(),
      });
      const related = notifications.find((n) => n.type === 'substance_suggestion' && n.relatedId === suggestion.id);
      if (related) markAsRead(related.id);
      toast({ title: 'Sugestão aprovada', description: `A matéria-prima "${suggestion.suggestedName || suggestion.name}" foi adicionada à lista.` });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao aprovar.', variant: 'destructive' });
    }
  };

  const handleRejectSuggestion = async (suggestion: SubstanceSuggestion, reason: string) => {
    try {
      await updateSuggestion(suggestion.id, { status: 'rejected', rejectionReason: reason, rejectedAt: new Date() });
      const related = notifications.find((n) => n.type === 'substance_suggestion' && n.relatedId === suggestion.id);
      if (related) markAsRead(related.id);
      checkAndMarkAllNotificationsAsRead();
      toast({ title: 'Sugestão recusada', description: 'A sugestão foi recusada e o usuário será notificado.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao recusar.', variant: 'destructive' });
    }
  };

  const handleRequestAdjustment = (suggestion: SubstanceSuggestion, adjustedName: string) => {
    updateSuggestion(suggestion.id, {
      status: 'adjustment_requested',
      suggestedName: adjustedName,
    });

    // Marcar notificação como lida
    const relatedNotification = notifications.find(
      (n) => n.type === 'substance_suggestion' && n.relatedId === suggestion.id
    );
    if (relatedNotification) {
      markAsRead(relatedNotification.id);
    }

    toast({
      title: 'Ajuste solicitado',
      description: 'O usuário será notificado sobre o ajuste sugerido.',
    });
  };

  // Gerenciar fornecedores
  const handleOpenSupplierDialog = (supplier?: Supplier) => {
    if (supplier) {
      setSelectedSupplier(supplier);
      setFormSupplierName(supplier.name);
      setFormSupplierContact(supplier.contact || '');
      setFormSupplierNotes(supplier.notes || '');
    } else {
      setSelectedSupplier(null);
      setFormSupplierName('');
      setFormSupplierContact('');
      setFormSupplierNotes('');
    }
    setIsSupplierDialogOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplierName.trim()) {
      toast({ title: 'Erro', description: 'Digite o nome do fornecedor.', variant: 'destructive' });
      return;
    }
    try {
      if (selectedSupplier) {
        await supplierService.update(selectedSupplier.id, {
          name: formSupplierName.trim(),
          contact: formSupplierContact.trim() || undefined,
          notes: formSupplierNotes.trim() || undefined,
        });
        await refetchRequests();
        toast({ title: 'Fornecedor atualizado', description: 'O fornecedor foi atualizado com sucesso.' });
      } else {
        await supplierService.create({
          name: formSupplierName.trim(),
          contact: formSupplierContact.trim() || undefined,
          notes: formSupplierNotes.trim() || undefined,
        });
        await refetchRequests();
        toast({ title: 'Fornecedor cadastrado', description: 'O fornecedor foi cadastrado com sucesso.' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao salvar.', variant: 'destructive' });
      return;
    }
    setIsSupplierDialogOpen(false);
    setSelectedSupplier(null);
    setFormSupplierName('');
    setFormSupplierContact('');
    setFormSupplierNotes('');
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    try {
      await supplierService.delete(supplierToDelete.id);
      await refetchRequests();
      toast({ title: 'Fornecedor removido', description: 'O fornecedor foi removido com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao remover.', variant: 'destructive' });
    }
    setIsDeleteSupplierDialogOpen(false);
    setSupplierToDelete(null);
  };

  // Verificar periodicamente se todas as solicitações foram respondidas e marcar notificações
  useEffect(() => {
    checkAndMarkAllNotificationsAsRead();
    
    // Verificar a cada 2 segundos
    const interval = setInterval(checkAndMarkAllNotificationsAsRead, 2000);
    return () => clearInterval(interval);
  }, [suggestions, supplierRequests, notifications]);

  const handleApproveSupplierRequest = async (request: SupplierRequest, _adjustedName?: string) => {
    if (!user) return;
    try {
      await supplierService.approveRequest(request.id);
      await refetchRequests();
      const related = notifications.find((n) => n.type === 'other' && n.relatedId === request.id);
      if (related) markAsRead(related.id);
      toast({ title: 'Solicitação aprovada', description: `O fornecedor "${request.name}" foi cadastrado com sucesso.` });
      checkAndMarkAllNotificationsAsRead();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao aprovar.', variant: 'destructive' });
    }
  };

  const handleRejectSupplierRequest = async () => {
    if (!selectedSupplierRequest || !user || !supplierRequestRejectionReason.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o motivo da rejeição.', variant: 'destructive' });
      return;
    }
    try {
      await supplierService.rejectRequest(selectedSupplierRequest.id, supplierRequestRejectionReason.trim());
      await refetchRequests();
      const related = notifications.find((n) => n.type === 'other' && n.relatedId === selectedSupplierRequest.id);
      if (related) markAsRead(related.id);
      toast({ title: 'Solicitação rejeitada', description: 'A solicitação foi rejeitada e o usuário será notificado.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao rejeitar.', variant: 'destructive' });
    }
    setIsSupplierRequestRejectDialogOpen(false);
    setSelectedSupplierRequest(null);
    setSupplierRequestRejectionReason('');
  };

  const handleRejectBankDataRequest = async () => {
    if (!selectedBankDataRequest || !bankDataRequestRejectionReason.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o motivo da rejeição.', variant: 'destructive' });
      return;
    }
    try {
      await requestService.rejectBankDataRequest(selectedBankDataRequest.id, bankDataRequestRejectionReason.trim());
      await refetchRequests();
      toast({ title: 'Solicitação rejeitada', description: 'A solicitação foi rejeitada e o usuário será notificado.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao rejeitar.', variant: 'destructive' });
    }
    setIsBankDataRequestRejectDialogOpen(false);
    setSelectedBankDataRequest(null);
    setBankDataRequestRejectionReason('');
  };

  const handleRejectExtraUserRequest = async () => {
    if (!selectedExtraUserRequest || !extraUserRequestRejectionReason.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o motivo da rejeição.', variant: 'destructive' });
      return;
    }
    try {
      await requestService.rejectExtraUserRequest(selectedExtraUserRequest.id, extraUserRequestRejectionReason.trim());
      await refetchRequests();
      toast({ title: 'Solicitação rejeitada', description: 'A solicitação foi rejeitada e o usuário será notificado.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao rejeitar.', variant: 'destructive' });
    }
    setIsExtraUserRequestRejectDialogOpen(false);
    setSelectedExtraUserRequest(null);
    setExtraUserRequestRejectionReason('');
  };

  const handleApproveProfileDocRequest = async (request: UserProfileDocumentRequest) => {
    try {
      await requestService.approveProfileDocumentRequest(request.id);
      await refetchRequests();
      toast({ title: 'Documento aprovado', description: 'O documento foi aprovado e aplicado ao perfil do cooperado.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao aprovar.', variant: 'destructive' });
    }
  };

  const handleRejectProfileDocRequest = async () => {
    if (!selectedProfileDocRequest || !profileDocRequestRejectionReason.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o motivo da rejeição.', variant: 'destructive' });
      return;
    }
    try {
      await requestService.rejectProfileDocumentRequest(selectedProfileDocRequest.id, profileDocRequestRejectionReason.trim());
      await refetchRequests();
      toast({ title: 'Documento rejeitado', description: 'A solicitação foi rejeitada e o usuário será notificado.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao rejeitar.', variant: 'destructive' });
    }
    setIsProfileDocRequestRejectDialogOpen(false);
    setSelectedProfileDocRequest(null);
    setProfileDocRequestRejectionReason('');
  };

  const handleApproveBankDataRequest = async (request: BankDataChangeRequest) => {
    try {
      await requestService.approveBankDataRequest(request.id);
      await refetchRequests();
      if (user && request.userId === user.id && updateUser) {
        try {
          const u = await userService.getById(user.id);
          await updateUser(u);
        } catch {
          /* refresh user on next load */
        }
      }
      toast({ title: 'Solicitação aprovada', description: 'Os dados foram atualizados com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao aprovar.', variant: 'destructive' });
    }
  };

  const handleApproveExtraUserRequest = async (request: ExtraUserRequest) => {
    try {
      await requestService.approveExtraUserRequest(request.id);
      await refetchRequests();
      toast({ title: 'Solicitação aprovada', description: 'Os usuários extras foram aprovados.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao aprovar.', variant: 'destructive' });
    }
  };

  // Debug: Log das solicitações carregadas
  useEffect(() => {
    console.log('📋 [Solicitações] Carregando solicitações...');
    console.log('📊 [Solicitações] Total de Bank Data Requests:', bankDataRequests.length);
    console.log('📊 [Solicitações] Total de Supplier Requests:', supplierRequests.length);
    console.log('⏳ [Solicitações] Bank Data Pendentes:', pendingBankDataRequests.length);
    console.log('⏳ [Solicitações] Supplier Pendentes:', pendingSupplierRequests.length);
    console.log('✅ [Solicitações] Bank Data Finalizadas:', completedBankDataRequests.length);
    console.log('✅ [Solicitações] Supplier Finalizadas:', completedSupplierRequests.length);
    console.log('👤 [Solicitações] Usuário atual:', user?.email, 'Role:', user?.role);
    
    if (bankDataRequests.length > 0) {
      console.log('📋 [Solicitações] Detalhes Bank Data:', bankDataRequests.map(r => ({
        id: r.id,
        userName: r.userName,
        status: r.status,
        newPixKey: r.newPixKey,
        newCnpj: r.newCnpj,
        newRazaoSocial: r.newRazaoSocial,
        createdAt: r.createdAt,
      })));
    }
    
    if (supplierRequests.length > 0) {
      supplierRequests.forEach((r, index) => {
        console.log(`📋 [Solicitações] Supplier Request ${index + 1}:`, {
          id: r.id,
          name: r.name,
          userName: r.userName,
          userId: r.userId,
          status: r.status,
          statusType: typeof r.status,
          isPending: r.status === 'pending' || r.status === undefined || r.status === null || r.status === '',
          isCompleted: r.status === 'approved' || r.status === 'rejected',
          createdAt: r.createdAt,
        });
      });
      console.log('🔍 [Solicitações] Resumo:', {
        total: supplierRequests.length,
        pending: pendingSupplierRequests.length,
        completed: completedSupplierRequests.length,
        statuses: supplierRequests.map(r => r.status),
      });
      supplierRequests.forEach((r, index) => {
        console.log(`🔍 [Solicitações] Análise detalhada ${index + 1}:`, {
          id: r.id,
          name: r.name,
          status: r.status,
          statusType: typeof r.status,
          isNull: r.status === null,
          isUndefined: r.status === undefined,
          isEmpty: r.status === '',
          equalsPending: r.status === 'pending',
          equalsApproved: r.status === 'approved',
          equalsRejected: r.status === 'rejected',
        });
      });
    }
    
    if (requestsError) {
      console.error('❌ [Solicitações] Erro ao carregar:', requestsError);
    }
  }, [bankDataRequests, supplierRequests, pendingBankDataRequests, pendingSupplierRequests, completedBankDataRequests, completedSupplierRequests, user, requestsError]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solicitações</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações e aprovações pendentes
          </p>
        </div>
        {pendingSuggestions.length > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {pendingSuggestions.length} pendente{pendingSuggestions.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="card-pharmaceutical">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome da matéria-prima ou usuário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchRequests()}
              disabled={requestsLoading}
              title="Atualizar lista de solicitações"
            >
              {requestsLoading ? 'Carregando...' : 'Atualizar'}
            </Button>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                Todas
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('pending')}
                size="sm"
              >
                Pendentes
              </Button>
              <Button
                variant={filterStatus === 'approved' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('approved')}
                size="sm"
              >
                Aprovadas
              </Button>
              <Button
                variant={filterStatus === 'rejected' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('rejected')}
                size="sm"
              >
                Recusadas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="substances" className="space-y-4">
        <TabsList>
          <TabsTrigger value="substances" className="gap-2">
            <Package className="h-4 w-4" />
            Matérias-Primas ({pendingSuggestions.length})
          </TabsTrigger>
          <TabsTrigger value="profile-documents" className="gap-2">
            <FileSearch className="h-4 w-4" />
            Documentos do cooperado ({pendingProfileDocRequests.length})
          </TabsTrigger>
          <TabsTrigger value="supplier-requests" className="gap-2">
            <Building2 className="h-4 w-4" />
            Fornecedores ({pendingSupplierRequests.length})
          </TabsTrigger>
          <TabsTrigger value="bank-data" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Dados Bancários/PIX ({pendingBankDataRequests.length})
          </TabsTrigger>
          <TabsTrigger value="extra-users" className="gap-2">
            <Users className="h-4 w-4" />
            Usuários Extras ({pendingExtraUsersRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="substances" className="space-y-4">
          <Card className="card-pharmaceutical overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header hover:bg-muted/50">
                  <TableHead>Matéria-Prima</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuggestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma sugestão encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuggestions.map((suggestion) => (
                    <TableRow key={suggestion.id} className="animate-fade-in">
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{suggestion.name}</span>
                          {suggestion.suggestedName && (
                            <span className="text-xs text-muted-foreground">
                              Sugestão: {suggestion.suggestedName}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{suggestion.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(suggestion.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {suggestion.status === 'pending' && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                            <Clock className="mr-1 h-3 w-3" />
                            Pendente
                          </Badge>
                        )}
                        {suggestion.status === 'approved' && (
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Aprovada
                          </Badge>
                        )}
                        {suggestion.status === 'rejected' && (
                          <Badge variant="outline" className="border-red-500 text-red-600">
                            <XCircle className="mr-1 h-3 w-3" />
                            Recusada
                          </Badge>
                        )}
                        {suggestion.status === 'adjustment_requested' && (
                          <Badge variant="outline" className="border-blue-500 text-blue-600">
                            <Edit2 className="mr-1 h-3 w-3" />
                            Ajuste Solicitado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {suggestion.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSuggestion(suggestion);
                                setAdjustedName(suggestion.name);
                                setIsAdjustDialogOpen(true);
                              }}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              Ajustar/Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedSuggestion(suggestion);
                                setRejectionReason('');
                                setIsRejectDialogOpen(true);
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Recusar
                            </Button>
                          </div>
                        )}
                        {suggestion.status === 'adjustment_requested' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveSuggestion(suggestion)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedSuggestion(suggestion);
                                setRejectionReason('');
                                setIsRejectDialogOpen(true);
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Recusar
                            </Button>
                          </div>
                        )}
                        {suggestion.status === 'rejected' && suggestion.rejectionReason && (
                          <p className="text-xs text-muted-foreground text-right">
                            {suggestion.rejectionReason}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab de Documentos do Cooperado */}
        <TabsContent value="profile-documents" className="space-y-4">
          {completedProfileDocRequests.length > 0 && !showHistory.profileDocs && (
            <Card className="card-pharmaceutical">
              <CardContent className="p-4">
                <Button
                  variant="outline"
                  onClick={() => setShowHistory({ ...showHistory, profileDocs: true })}
                  className="w-full"
                >
                  Ver histórico de solicitações ({completedProfileDocRequests.length} solicitações)
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="card-pharmaceutical overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header hover:bg-muted/50">
                  <TableHead>Documento</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingProfileDocRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {completedProfileDocRequests.length > 0
                        ? 'Nenhuma solicitação pendente. Use o botão acima para ver o histórico.'
                        : 'Nenhuma solicitação de documentos encontrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingProfileDocRequests
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .map((request) => {
                      const typeLabel: Record<string, string> = {
                        afe: 'AFE',
                        ae: 'AE',
                        licenca_sanitaria: 'Licença Sanitária',
                        corpo_bombeiros: 'Corpo de Bombeiros',
                        policia_federal: 'PF',
                      };
                      const validityText = request.validIndefinitely
                        ? 'Indeterminada'
                        : request.validUntil
                          ? new Date(request.validUntil).toLocaleDateString('pt-BR')
                          : '—';

                      return (
                        <TableRow key={request.id} className="animate-fade-in">
                          <TableCell className="font-medium">{typeLabel[request.type] || request.type}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{request.userName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={request.validIndefinitely ? 'border-emerald-300 text-emerald-700' : ''}>
                              {validityText}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {formatDate(request.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              <Clock className="mr-1 h-3 w-3" />
                              Pendente
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(request.fileUrl, '_blank', 'noopener,noreferrer')}
                              >
                                Ver PDF
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleApproveProfileDocRequest(request)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setSelectedProfileDocRequest(request);
                                  setProfileDocRequestRejectionReason('');
                                  setIsProfileDocRequestRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Recusar
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

          {showHistory.profileDocs && completedProfileDocRequests.length > 0 && (
            <Card className="card-pharmaceutical overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Histórico de Solicitações Finalizadas</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory({ ...showHistory, profileDocs: false })}>
                    Ocultar
                  </Button>
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="table-header hover:bg-muted/50">
                    <TableHead>Documento</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Data de Resolução</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedProfileDocRequests
                    .sort((a, b) => {
                      const aDate = a.reviewedAt || a.createdAt;
                      const bDate = b.reviewedAt || b.createdAt;
                      return bDate.getTime() - aDate.getTime();
                    })
                    .map((request) => {
                      const typeLabel: Record<string, string> = {
                        afe: 'AFE',
                        ae: 'AE',
                        licenca_sanitaria: 'Licença Sanitária',
                        corpo_bombeiros: 'Corpo de Bombeiros',
                        policia_federal: 'PF',
                      };
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{typeLabel[request.type] || request.type}</TableCell>
                          <TableCell>{request.userName}</TableCell>
                          <TableCell>
                            {request.status === 'approved' ? (
                              <Badge variant="outline" className="border-green-500 text-green-600">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Aprovada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-red-500 text-red-600">
                                <XCircle className="mr-1 h-3 w-3" />
                                Rejeitada
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(request.createdAt)}</TableCell>
                          <TableCell>
                            {request.reviewedAt ? formatDate(request.reviewedAt) : '-'}
                            {request.rejectionReason && (
                              <p className="text-xs text-muted-foreground mt-1">Motivo: {request.rejectionReason}</p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Tab de Solicitações de Fornecedores */}
        <TabsContent value="supplier-requests" className="space-y-4">
          {completedSupplierRequests.length > 0 && !showHistory.suppliers && (
            <Card className="card-pharmaceutical">
              <CardContent className="p-4">
                <Button
                  variant="outline"
                  onClick={() => setShowHistory({ ...showHistory, suppliers: true })}
                  className="w-full"
                >
                  Ver histórico de solicitações ({completedSupplierRequests.length} solicitações)
                </Button>
              </CardContent>
            </Card>
          )}
          <Card className="card-pharmaceutical overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header hover:bg-muted/50">
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingSupplierRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {completedSupplierRequests.length > 0 
                        ? 'Nenhuma solicitação pendente. Use o botão acima para ver o histórico.'
                        : 'Nenhuma solicitação de fornecedor encontrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingSupplierRequests
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .map((request) => (
                      <TableRow key={request.id} className="animate-fade-in">
                        <TableCell className="font-medium">{request.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm">{request.userName}</span>
                              {request.company && (
                                <p className="text-xs text-muted-foreground">{request.company}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(request.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(request.status === 'pending' || !request.status || request.status === '') && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              <Clock className="mr-1 h-3 w-3" />
                              Pendente
                            </Badge>
                          )}
                          {request.status === 'approved' && (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Aprovada
                            </Badge>
                          )}
                          {request.status === 'rejected' && (
                            <Badge variant="outline" className="border-red-500 text-red-600">
                              <XCircle className="mr-1 h-3 w-3" />
                              Rejeitada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {(request.status === 'pending' || !request.status || request.status === '') && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSupplierRequest(request);
                                  setAdjustedSupplierName(request.name);
                                  setIsSupplierRequestAdjustDialogOpen(true);
                                }}
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Ajustar/Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setSelectedSupplierRequest(request);
                                  setSupplierRequestRejectionReason('');
                                  setIsSupplierRequestRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Recusar
                              </Button>
                            </div>
                          )}
                          {request.status === 'rejected' && request.rejectionReason && (
                            <p className="text-xs text-muted-foreground text-right">
                              {request.rejectionReason}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Histórico de Solicitações Finalizadas - Suppliers */}
          {showHistory.suppliers && completedSupplierRequests.length > 0 && (
            <Card className="card-pharmaceutical overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Histórico de Solicitações Finalizadas</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory({ ...showHistory, suppliers: false })}
                  >
                    Ocultar
                  </Button>
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="table-header hover:bg-muted/50">
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Resolução</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedSupplierRequests
                    .sort((a, b) => {
                      const aDate = a.reviewedAt || a.createdAt;
                      const bDate = b.reviewedAt || b.createdAt;
                      return bDate.getTime() - aDate.getTime();
                    })
                    .map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm">{request.userName}</span>
                              {request.company && (
                                <p className="text-xs text-muted-foreground">{request.company}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(request.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.status === 'approved' && (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Aprovada
                            </Badge>
                          )}
                          {request.status === 'rejected' && (
                            <Badge variant="outline" className="border-red-500 text-red-600">
                              <XCircle className="mr-1 h-3 w-3" />
                              Rejeitada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {request.reviewedAt ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {formatDate(request.reviewedAt)}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                          {request.rejectionReason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Motivo: {request.rejectionReason}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Tab de Solicitações de Dados Bancários/PIX */}
        <TabsContent value="bank-data" className="space-y-4">
          {completedBankDataRequests.length > 0 && !showHistory.bankData && (
            <Card className="card-pharmaceutical">
              <CardContent className="p-4">
                <Button
                  variant="outline"
                  onClick={() => setShowHistory({ ...showHistory, bankData: true })}
                  className="w-full"
                >
                  Ver histórico de solicitações ({completedBankDataRequests.length} solicitações)
                </Button>
              </CardContent>
            </Card>
          )}
          {showHistory.bankData && (
            <Card className="card-pharmaceutical">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Histórico de Solicitações</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistory({ ...showHistory, bankData: false })}
                  >
                    Ocultar histórico
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="card-pharmaceutical overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header hover:bg-muted/50">
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo de Alteração</TableHead>
                  <TableHead>Dados</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando solicitações...
                    </TableCell>
                  </TableRow>
                ) : pendingBankDataRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {completedBankDataRequests.length > 0 
                        ? 'Nenhuma solicitação pendente. Use o botão acima para ver o histórico.'
                        : 'Nenhuma solicitação de alteração de dados bancários/PIX encontrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingBankDataRequests
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .map((request) => (
                      <TableRow key={request.id} className="animate-fade-in">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm font-medium">{request.userName}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {request.newPixKey && (
                              <Badge variant="outline" className="text-xs">Chave PIX</Badge>
                            )}
                            {request.bankName && (
                              <Badge variant="outline" className="text-xs">Conta Bancária</Badge>
                            )}
                            {request.newCnpj && (
                              <Badge variant="outline" className="text-xs">CNPJ</Badge>
                            )}
                            {request.newRazaoSocial && (
                              <Badge variant="outline" className="text-xs">Razão Social</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            {request.newPixKey && (
                              <div>
                                <span className="text-muted-foreground">PIX: </span>
                                <span className="font-mono">{request.newPixKey}</span>
                                {request.pixBank && (
                                  <span className="text-muted-foreground"> ({request.pixBank})</span>
                                )}
                              </div>
                            )}
                            {request.bankName && (
                              <div>
                                <span className="text-muted-foreground">Banco: </span>
                                <span>{request.bankName}</span>
                              </div>
                            )}
                            {request.newCnpj && (
                              <div>
                                <span className="text-muted-foreground">CNPJ: </span>
                                <span>{request.newCnpj}</span>
                              </div>
                            )}
                            {request.newRazaoSocial && (
                              <div>
                                <span className="text-muted-foreground">Razão Social: </span>
                                <span>{request.newRazaoSocial}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(request.createdAt                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(request.status === 'pending' || request.status === undefined || request.status === null || request.status === '') && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              <Clock className="mr-1 h-3 w-3" />
                              Pendente
                            </Badge>
                          )}
                          {request.status === 'approved' && (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Aprovada
                            </Badge>
                          )}
                          {request.status === 'rejected' && (
                            <Badge variant="outline" className="border-red-500 text-red-600">
                              <XCircle className="mr-1 h-3 w-3" />
                              Rejeitada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {(request.status === 'pending' || request.status === undefined || request.status === null || request.status === '') && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveBankDataRequest(request)}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setSelectedBankDataRequest(request);
                                  setBankDataRequestRejectionReason('');
                                  setIsBankDataRequestRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Recusar
                              </Button>
                            </div>
                          )}
                          {request.status === 'rejected' && request.rejectionReason && (
                            <p className="text-xs text-muted-foreground text-right">
                              {request.rejectionReason}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Histórico de Solicitações Finalizadas */}
          {showHistory.bankData && completedBankDataRequests.length > 0 && (
            <Card className="card-pharmaceutical overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Histórico de Solicitações Finalizadas</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory({ ...showHistory, bankData: false })}
                  >
                    Ocultar
                  </Button>
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="table-header hover:bg-muted/50">
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tipo de Alteração</TableHead>
                    <TableHead>Dados</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Resolução</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedBankDataRequests
                    .sort((a, b) => {
                      const aDate = a.reviewedAt || a.createdAt;
                      const bDate = b.reviewedAt || b.createdAt;
                      return bDate.getTime() - aDate.getTime();
                    })
                    .map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{request.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {request.newPixKey && <Badge variant="outline" className="text-xs">Chave PIX</Badge>}
                            {request.bankName && <Badge variant="outline" className="text-xs">Conta Bancária</Badge>}
                            {request.newCnpj && <Badge variant="outline" className="text-xs">CNPJ</Badge>}
                            {request.newRazaoSocial && <Badge variant="outline" className="text-xs">Razão Social</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            {request.newPixKey && (
                              <div>
                                <span className="text-muted-foreground">PIX: </span>
                                <span className="font-mono">{request.newPixKey}</span>
                              </div>
                            )}
                            {request.newCnpj && (
                              <div>
                                <span className="text-muted-foreground">CNPJ: </span>
                                <span>{request.newCnpj}</span>
                              </div>
                            )}
                            {request.newRazaoSocial && (
                              <div>
                                <span className="text-muted-foreground">Razão Social: </span>
                                <span>{request.newRazaoSocial}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(request.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.status === 'approved' && (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Aprovada
                            </Badge>
                          )}
                          {request.status === 'rejected' && (
                            <Badge variant="outline" className="border-red-500 text-red-600">
                              <XCircle className="mr-1 h-3 w-3" />
                              Rejeitada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {request.reviewedAt ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {formatDate(request.reviewedAt)}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                          {request.rejectionReason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Motivo: {request.rejectionReason}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Tab de Solicitações de Usuários Extras */}
        <TabsContent value="extra-users" className="space-y-4">
          {completedExtraUsersRequests.length > 0 && !showHistory.extraUsers && (
            <Card className="card-pharmaceutical">
              <CardContent className="p-4">
                <Button
                  variant="outline"
                  onClick={() => setShowHistory({ ...showHistory, extraUsers: true })}
                  className="w-full"
                >
                  Ver histórico de solicitações ({completedExtraUsersRequests.length} solicitações)
                </Button>
              </CardContent>
            </Card>
          )}
          <Card className="card-pharmaceutical overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header hover:bg-muted/50">
                  <TableHead>Usuário</TableHead>
                  <TableHead>Usuários Solicitados</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingExtraUsersRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {completedExtraUsersRequests.length > 0 
                        ? 'Nenhuma solicitação pendente. Use o botão acima para ver o histórico.'
                        : 'Nenhuma solicitação de usuários extras encontrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingExtraUsersRequests
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .map((request) => (
                      <TableRow key={request.id} className="animate-fade-in">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm font-medium">{request.userName}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {request.requestedUsers.map((reqUser, idx) => (
                              <div key={idx} className="text-xs">
                                <Badge variant="outline" className="text-xs mr-1">
                                  {reqUser.role === 'socio' ? 'Sócio' : 'Funcionário'}
                                </Badge>
                                <span>{reqUser.name}</span>
                                {reqUser.email && (
                                  <span className="text-muted-foreground"> ({reqUser.email})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(request.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              <Clock className="mr-1 h-3 w-3" />
                              Pendente
                            </Badge>
                          )}
                          {request.status === 'approved' && (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Aprovada
                            </Badge>
                          )}
                          {request.status === 'rejected' && (
                            <Badge variant="outline" className="border-red-500 text-red-600">
                              <XCircle className="mr-1 h-3 w-3" />
                              Rejeitada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveExtraUserRequest(request)}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setSelectedExtraUserRequest(request);
                                  setExtraUserRequestRejectionReason('');
                                  setIsExtraUserRequestRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Recusar
                              </Button>
                            </div>
                          )}
                          {request.status === 'rejected' && request.rejectionReason && (
                            <p className="text-xs text-muted-foreground text-right">
                              {request.rejectionReason}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Histórico de Solicitações Finalizadas - Extra Users */}
          {showHistory.extraUsers && completedExtraUsersRequests.length > 0 && (
            <Card className="card-pharmaceutical overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Histórico de Solicitações Finalizadas</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory({ ...showHistory, extraUsers: false })}
                  >
                    Ocultar
                  </Button>
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="table-header hover:bg-muted/50">
                    <TableHead>Usuário</TableHead>
                    <TableHead>Usuários Solicitados</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Resolução</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedExtraUsersRequests
                    .sort((a, b) => {
                      const aDate = a.reviewedAt || a.createdAt;
                      const bDate = b.reviewedAt || b.createdAt;
                      return bDate.getTime() - aDate.getTime();
                    })
                    .map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{request.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {request.requestedUsers.map((reqUser, idx) => (
                              <div key={idx} className="text-xs">
                                <Badge variant="outline" className="text-xs mr-1">
                                  {reqUser.role === 'socio' ? 'Sócio' : 'Funcionário'}
                                </Badge>
                                <span>{reqUser.name}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(request.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.status === 'approved' && (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Aprovada
                            </Badge>
                          )}
                          {request.status === 'rejected' && (
                            <Badge variant="outline" className="border-red-500 text-red-600">
                              <XCircle className="mr-1 h-3 w-3" />
                              Rejeitada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {request.reviewedAt ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {formatDate(request.reviewedAt)}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                          {request.rejectionReason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Motivo: {request.rejectionReason}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

      </Tabs>

      {/* Dialog de Ajuste/Aprovação */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ajustar Nome da Matéria-Prima</DialogTitle>
            <DialogDescription>
              Sugira um nome ajustado ou deixe em branco para usar o nome original
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Original</Label>
              <Input
                value={selectedSuggestion?.name || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Ajustado (opcional)</Label>
              <Input
                value={adjustedName}
                onChange={(e) => setAdjustedName(e.target.value)}
                placeholder="Deixe em branco para usar o nome original"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAdjustDialogOpen(false);
                setSelectedSuggestion(null);
                setAdjustedName('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!selectedSuggestion) return;
                
                if (adjustedName.trim() && adjustedName.trim() !== selectedSuggestion.name) {
                  handleRequestAdjustment(selectedSuggestion, adjustedName.trim());
                } else {
                  handleApproveSuggestion(selectedSuggestion);
                }
                
                setIsAdjustDialogOpen(false);
                setSelectedSuggestion(null);
                setAdjustedName('');
              }}
              className="gradient-primary text-primary-foreground"
            >
              {adjustedName.trim() && adjustedName.trim() !== selectedSuggestion?.name
                ? 'Solicitar Ajuste'
                : 'Aprovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Recusa */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Recusar Sugestão</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. O usuário será notificado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Matéria-Prima Sugerida</Label>
              <Input
                value={selectedSuggestion?.name || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Motivo da Recusa *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Matéria-prima já cadastrada, nome incorreto, etc."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setSelectedSuggestion(null);
                setRejectionReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!selectedSuggestion || !rejectionReason.trim()) {
                  toast({
                    title: 'Erro',
                    description: 'Informe o motivo da recusa.',
                    variant: 'destructive',
                  });
                  return;
                }
                
                handleRejectSuggestion(selectedSuggestion, rejectionReason.trim());
                setIsRejectDialogOpen(false);
                setSelectedSuggestion(null);
                setRejectionReason('');
              }}
              variant="destructive"
            >
              Recusar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Ajuste/Aprovação de Solicitação de Fornecedor */}
      <Dialog open={isSupplierRequestAdjustDialogOpen} onOpenChange={setIsSupplierRequestAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ajustar Nome do Fornecedor</DialogTitle>
            <DialogDescription>
              Sugira um nome ajustado ou deixe em branco para usar o nome original
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Original</Label>
              <Input
                value={selectedSupplierRequest?.name || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Ajustado (opcional)</Label>
              <Input
                value={adjustedSupplierName}
                onChange={(e) => setAdjustedSupplierName(e.target.value)}
                placeholder="Deixe em branco para usar o nome original"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSupplierRequestAdjustDialogOpen(false);
                setSelectedSupplierRequest(null);
                setAdjustedSupplierName('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!selectedSupplierRequest) return;
                
                if (adjustedSupplierName.trim() && adjustedSupplierName.trim() !== selectedSupplierRequest.name) {
                  handleApproveSupplierRequest(selectedSupplierRequest, adjustedSupplierName.trim());
                } else {
                  handleApproveSupplierRequest(selectedSupplierRequest);
                }
                
                setIsSupplierRequestAdjustDialogOpen(false);
                setSelectedSupplierRequest(null);
                setAdjustedSupplierName('');
              }}
              className="gradient-primary text-primary-foreground"
            >
              {adjustedSupplierName.trim() && adjustedSupplierName.trim() !== selectedSupplierRequest?.name
                ? 'Aprovar com Ajuste'
                : 'Aprovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição de Solicitação de Fornecedor */}
      <Dialog open={isSupplierRequestRejectDialogOpen} onOpenChange={setIsSupplierRequestRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Recusar Solicitação de Fornecedor</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. O usuário será notificado.
            </DialogDescription>
          </DialogHeader>
          {selectedSupplierRequest && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium mb-1">Fornecedor solicitado:</p>
                <p className="text-sm text-muted-foreground">{selectedSupplierRequest.name}</p>
                <p className="text-sm font-medium mb-1 mt-2">Solicitante:</p>
                <p className="text-sm text-muted-foreground">{selectedSupplierRequest.userName}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierRequestRejectionReason">Motivo da Recusa *</Label>
                <Textarea
                  id="supplierRequestRejectionReason"
                  value={supplierRequestRejectionReason}
                  onChange={(e) => setSupplierRequestRejectionReason(e.target.value)}
                  placeholder="Ex: Fornecedor já cadastrado, nome incorreto, etc."
                  required
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsSupplierRequestRejectDialogOpen(false);
                    setSelectedSupplierRequest(null);
                    setSupplierRequestRejectionReason('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRejectSupplierRequest}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Recusar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição de Solicitação de Dados Bancários */}
      <Dialog open={isBankDataRequestRejectDialogOpen} onOpenChange={setIsBankDataRequestRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Recusar Solicitação de Dados Bancários</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. O usuário será notificado.
            </DialogDescription>
          </DialogHeader>
          {selectedBankDataRequest && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium mb-1">Solicitação de:</p>
                <p className="text-sm text-muted-foreground">{selectedBankDataRequest.userName}</p>
                {selectedBankDataRequest.newPixKey && (
                  <p className="text-xs text-muted-foreground mt-1">PIX: {selectedBankDataRequest.newPixKey}</p>
                )}
                {selectedBankDataRequest.newCnpj && (
                  <p className="text-xs text-muted-foreground mt-1">CNPJ: {selectedBankDataRequest.newCnpj}</p>
                )}
                {selectedBankDataRequest.newRazaoSocial && (
                  <p className="text-xs text-muted-foreground mt-1">Razão Social: {selectedBankDataRequest.newRazaoSocial}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankDataRequestRejectionReason">Motivo da Recusa *</Label>
                <Textarea
                  id="bankDataRequestRejectionReason"
                  value={bankDataRequestRejectionReason}
                  onChange={(e) => setBankDataRequestRejectionReason(e.target.value)}
                  placeholder="Ex: Dados inválidos, documentação incompleta, etc."
                  required
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsBankDataRequestRejectDialogOpen(false);
                    setSelectedBankDataRequest(null);
                    setBankDataRequestRejectionReason('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRejectBankDataRequest}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Recusar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição de Solicitação de Usuários Extras */}
      <Dialog open={isExtraUserRequestRejectDialogOpen} onOpenChange={setIsExtraUserRequestRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Recusar Solicitação de Usuários Extras</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. O usuário será notificado.
            </DialogDescription>
          </DialogHeader>
          {selectedExtraUserRequest && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium mb-1">Solicitação de:</p>
                <p className="text-sm text-muted-foreground">{selectedExtraUserRequest.userName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedExtraUserRequest.requestedUsers.length} usuário(s) solicitado(s)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extraUserRequestRejectionReason">Motivo da Recusa *</Label>
                <Textarea
                  id="extraUserRequestRejectionReason"
                  value={extraUserRequestRejectionReason}
                  onChange={(e) => setExtraUserRequestRejectionReason(e.target.value)}
                  placeholder="Ex: Documentação incompleta, limite de usuários atingido, etc."
                  required
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsExtraUserRequestRejectDialogOpen(false);
                    setSelectedExtraUserRequest(null);
                    setExtraUserRequestRejectionReason('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRejectExtraUserRequest}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Recusar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição de Solicitação de Documento do Cooperado */}
      <Dialog open={isProfileDocRequestRejectDialogOpen} onOpenChange={setIsProfileDocRequestRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Recusar Solicitação de Documento</DialogTitle>
            <DialogDescription>Informe o motivo da recusa. O usuário será notificado.</DialogDescription>
          </DialogHeader>
          {selectedProfileDocRequest && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium mb-1">Solicitante:</p>
                <p className="text-sm text-muted-foreground">{selectedProfileDocRequest.userName}</p>
                <p className="text-xs text-muted-foreground mt-1">Arquivo: {selectedProfileDocRequest.fileName}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileDocRequestRejectionReason">Motivo da Recusa *</Label>
                <Textarea
                  id="profileDocRequestRejectionReason"
                  value={profileDocRequestRejectionReason}
                  onChange={(e) => setProfileDocRequestRejectionReason(e.target.value)}
                  placeholder="Ex: PDF ilegível, documento incorreto, validade inválida, etc."
                  required
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsProfileDocRequestRejectDialogOpen(false);
                    setSelectedProfileDocRequest(null);
                    setProfileDocRequestRejectionReason('');
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleRejectProfileDocRequest} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Recusar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
