import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Check,
  X,
  MoreHorizontal,
  Shield,
  User,
  Building2,
  Mail,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Ban,
  UserCheck,
  DollarSign,
  TrendingUp,
  FileText,
  RotateCcw,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useSubstances } from '@/contexts/SubstanceContext';
import { useToast } from '@/hooks/use-toast';
import { userService } from '@/services/user.service';
import { requestService } from '@/services/request.service';
import { rolesService, type CooperativeRoleDto } from '@/services/roles.service';
import { formatCnpj } from '@/lib/cnpj';
import { User as UserType, PendingPayment, FinancialConfig, SubstanceSuggestion, ExitRequest } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Send, Package, CheckCircle2, XCircle, Edit2, LogOut } from 'lucide-react';

export default function Usuarios() {
  const { user: currentUser, hasRole } = useAuth();
  const { substances: availableSubstances, suggestions: substanceSuggestions, addSubstance, updateSuggestion } = useSubstances();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('cooperados');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [financialConfig, setFinancialConfig] = useState<FinancialConfig>({
    totalApplied: 0,
    cdiRate: 0.12,
    lastUpdate: new Date(),
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [isUnbanDialogOpen, setIsUnbanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SubstanceSuggestion | null>(null);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [adjustmentName, setAdjustmentName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [exitRequests, setExitRequests] = useState<ExitRequest[]>([]);
  const [selectedExitRequest, setSelectedExitRequest] = useState<ExitRequest | null>(null);
  const [isExitRejectDialogOpen, setIsExitRejectDialogOpen] = useState(false);
  const [exitRejectionReason, setExitRejectionReason] = useState('');
  const [isDeleteByEmailDialogOpen, setIsDeleteByEmailDialogOpen] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState('');

  // Privilégios / permissões por usuário
  const [permissionsByUserId, setPermissionsByUserId] = useState<Record<string, Array<'marketplace_moderate_offers'>>>({});
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);

  // Cargos (funções)
  const [roles, setRoles] = useState<CooperativeRoleDto[]>([]);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [assignUserId, setAssignUserId] = useState('');

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [formContribution, setFormContribution] = useState('');
  const [formPassword, setFormPassword] = useState('');

  // Carregar usuários da API
  useEffect(() => {
    const loadUsers = async () => {
      if (!hasRole(['master'])) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const apiUsers = await userService.getAll();
        setUsers(apiUsers);
      } catch (e: any) {
        console.error('Erro ao carregar usuários:', e);
        toast({ title: 'Erro', description: 'Falha ao carregar usuários da API', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, [hasRole]);

  // Carregar permissões quando entrar na aba "Privilégios"
  useEffect(() => {
    if (!hasRole(['master'])) return;
    if (activeTab !== 'privilegios') return;
    setIsPermissionsLoading(true);
    userService
      .getAllPermissions()
      .then((byUserId) => setPermissionsByUserId((byUserId || {}) as any))
      .catch(() => {
        toast({ title: 'Erro', description: 'Não foi possível carregar os privilégios.', variant: 'destructive' });
      })
      .finally(() => setIsPermissionsLoading(false));
  }, [activeTab, hasRole]);

  // Carregar cargos quando entrar na aba "Cargos"
  useEffect(() => {
    if (!hasRole(['master'])) return;
    if (activeTab !== 'cargos') return;
    setIsRolesLoading(true);
    rolesService
      .list()
      .then((r) => {
        setRoles(r);
        if (!selectedRoleId && r.length > 0) setSelectedRoleId(r[0].id);
      })
      .catch(() => {
        toast({ title: 'Erro', description: 'Não foi possível carregar os cargos.', variant: 'destructive' });
      })
      .finally(() => setIsRolesLoading(false));
  }, [activeTab, hasRole]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;

  const openCreateRole = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleDescription('');
    setIsRoleDialogOpen(true);
  };

  const openEditRole = () => {
    if (!selectedRole) return;
    setEditingRoleId(selectedRole.id);
    setRoleName(selectedRole.name);
    setRoleDescription(selectedRole.description || '');
    setIsRoleDialogOpen(true);
  };

  const refreshRoles = async () => {
    const r = await rolesService.list();
    setRoles(r);
    if (selectedRoleId && !r.some((x) => x.id === selectedRoleId)) {
      setSelectedRoleId(r[0]?.id ?? null);
    }
  };

  // Carregar exit requests da API
  useEffect(() => {
    const loadExitRequests = async () => {
      try {
        const requests = await requestService.getExitRequests();
        setExitRequests(requests);
      } catch (e) {
        console.error('Erro ao carregar solicitações de saída:', e);
      }
    };
    if (hasRole(['master'])) {
      loadExitRequests();
    }
  }, [hasRole]);

  // Carregar valores a pagar da API (master only)
  useEffect(() => {
    const loadPendingPayments = async () => {
      try {
        const payments = await userService.getPendingPayments();
        setPendingPayments(payments);
      } catch (e) {
        console.error('Erro ao carregar valores a pagar:', e);
      }
    };
    if (hasRole(['master'])) {
      loadPendingPayments();
    }
  }, [hasRole]);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.cnpj?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reconstruir usuários removidos a partir do snapshot do PendingPayment
  const removedUsers: UserType[] = pendingPayments
    .filter((p) => p.reason === 'removed' && p.status === 'pending' && p.deletedUserSnapshot)
    .map((payment) => {
      const snapshot = payment.deletedUserSnapshot!;
      return {
        id: snapshot.id as string,
        name: snapshot.name as string,
        email: snapshot.email as string,
        role: (snapshot.role as string) || 'cooperado',
        company: (snapshot.company as string) || undefined,
        cnpj: (snapshot.cnpj as string) || undefined,
        razaoSocial: (snapshot.razaoSocial as string) || undefined,
        approved: Boolean(snapshot.approved),
        status: 'inactive' as const, // Status para removidos
        contribution: Number(snapshot.contribution ?? 0),
        currentValue: Number(snapshot.currentValue ?? 0),
        proceeds: snapshot.proceeds != null ? Number(snapshot.proceeds) : undefined,
        balanceToReceive: snapshot.balanceToReceive != null ? Number(snapshot.balanceToReceive) : undefined,
        pixKey: (snapshot.pixKey as string) || undefined,
        pixBank: (snapshot.pixBank as string) || undefined,
        pixQrCode: (snapshot.pixQrCode as string) || undefined,
        profilePicture: (snapshot.profilePicture as string) || undefined,
        createdAt: typeof snapshot.createdAt === 'string' ? new Date(snapshot.createdAt) : new Date(),
        bannedAt: snapshot.bannedAt ? (typeof snapshot.bannedAt === 'string' ? new Date(snapshot.bannedAt) : undefined) : undefined,
      } as UserType;
    });

  // Combinar usuários ativos com usuários removidos
  const allUsers = [...filteredUsers, ...removedUsers];
  const cooperados = allUsers.filter((u) => u.role === 'cooperado');
  const bannedUsers = allUsers.filter((u) => u.status === 'banned');

  // Calcular proventos baseado em CDI e distribuição proporcional
  // Cada cooperado recebe 100% do CDI sobre seu aporte + proventos proporcionais do excedente
  const calculateProceeds = (
    userContribution: number,
    totalContributions: number,
    totalApplied: number,
    cdiRate: number
  ) => {
    if (totalContributions === 0) return 0;

    // 1. Rendimento de 100% do CDI sobre o aporte do cooperado
    const cdiReturnOnContribution = userContribution * cdiRate;

    // 2. Rendimento total da cooperativa (100% CDI sobre valor total aplicado)
    const totalCdiReturn = totalApplied * cdiRate;

    // 3. Rendimento excedente (rendimento acima de 100% CDI dos aportes)
    // Este excedente é distribuído proporcionalmente como proventos
    const totalContributionsReturn = totalContributions * cdiRate;
    const excessReturn = totalCdiReturn - totalContributionsReturn;

    // 4. Participação do usuário na cooperativa (baseada no aporte)
    const participation = userContribution / totalContributions;

    // 5. Proventos proporcionais do excedente
    const proportionalProceeds = excessReturn > 0 ? excessReturn * participation : 0;

    // Valor total de rendimento = rendimento CDI + proventos proporcionais
    return cdiReturnOnContribution + proportionalProceeds;
  };


  // Atualizar valores dos cooperados baseado na configuração financeira
  useEffect(() => {
    const totalContributions = users
      .filter((u) => u.role === 'cooperado' && u.status === 'active')
      .reduce((sum, u) => sum + u.contribution, 0);

    if (totalContributions > 0) {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.role === 'cooperado' && u.status === 'active') {
            const totalProceeds = calculateProceeds(
              u.contribution,
              totalContributions,
              financialConfig.totalApplied,
              financialConfig.cdiRate
            );

            // Calcular apenas proventos (sem CDI)
            // totalProceeds = CDI + proventos proporcionais
            const cdiOnContribution = u.contribution * financialConfig.cdiRate;
            const proportionalProceeds = Math.max(0, totalProceeds - cdiOnContribution);

            const currentValue = u.contribution + totalProceeds;
            return { ...u, currentValue, proceeds: proportionalProceeds };
          }
          return u;
        })
      );
    }
  }, [financialConfig, users.length]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'master':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Shield className="mr-1 h-3 w-3" />
            Admin
          </Badge>
        );
      case 'cooperado':
        return (
          <Badge className="bg-accent/10 text-accent border-accent/20">
            <Users className="mr-1 h-3 w-3" />
            Cooperado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <User className="mr-1 h-3 w-3" />
            Padrão
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string, userId?: string) => {
    // Verificar se é um usuário removido
    const isRemoved = userId && pendingPayments.some(
      (p) => p.userId === userId && p.reason === 'removed' && p.status === 'pending'
    );

    if (isRemoved) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">Removido</Badge>;
    }

    switch (status) {
      case 'banned':
        return <Badge variant="destructive">Banido</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inativo</Badge>;
      default:
        return <Badge className="status-badge status-active">Ativo</Badge>;
    }
  };

  const handleCreateUser = () => {
    setFormName('');
    setFormEmail('');
    setFormCompany('');
    setFormCnpj('');
    setFormContribution('');
    setFormPassword('');
    setSelectedUser(null);
    setIsCreateDialogOpen(true);
  };

  const handleEditUser = (user: UserType) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormCompany(user.company || '');
    setFormCnpj(formatCnpj(user.cnpj || ''));
    setFormContribution(user.contribution.toString());
    setFormPassword('');
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName || !formEmail || !formCompany || !formCnpj || !formContribution) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }

    const contribution = parseFloat(formContribution);
    if (isNaN(contribution) || contribution <= 0) {
      toast({ title: 'Erro', description: 'O valor de aporte deve ser maior que zero.', variant: 'destructive' });
      return;
    }

    try {
      if (selectedUser) {
        await userService.update(selectedUser.id, {
          name: formName,
          email: formEmail,
          company: formCompany,
          cnpj: formCnpj,
          contribution,
        });
        const updated = await userService.getAll();
        setUsers(updated);
        toast({ title: 'Usuário atualizado', description: 'Os dados do cooperado foram atualizados com sucesso.' });
        setIsEditDialogOpen(false);
      } else {
        if (!formPassword) {
          toast({ title: 'Erro', description: 'Senha é obrigatória para criar usuário.', variant: 'destructive' });
          return;
        }
        await userService.create({
          name: formName,
          email: formEmail,
          password: formPassword,
          company: formCompany,
          cnpj: formCnpj,
          contribution,
        });
        const updated = await userService.getAll();
        setUsers(updated);
        toast({ title: 'Cooperado criado', description: 'O novo cooperado foi criado com sucesso.' });
        setIsCreateDialogOpen(false);
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao salvar usuário.', variant: 'destructive' });
      return;
    }

    // Limpar formulário
    setFormName('');
    setFormEmail('');
    setFormCompany('');
    setFormCnpj('');
    setFormContribution('');
    setFormPassword('');
    setSelectedUser(null);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await userService.delete(selectedUser.id);
      const [updated, payments] = await Promise.all([
        userService.getAll(),
        userService.getPendingPayments(),
      ]);
      setUsers(updated);
      setPendingPayments(payments);
      toast({ title: 'Usuário removido', description: 'O usuário foi removido com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao remover usuário.', variant: 'destructive' });
    }
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteUserByEmail = async () => {
    if (!deleteEmailInput.trim()) {
      toast({ title: 'Erro', description: 'Por favor, informe o email do usuário.', variant: 'destructive' });
      return;
    }
    try {
      await userService.deleteByEmail(deleteEmailInput.trim());
      const [updated, payments] = await Promise.all([
        userService.getAll(),
        userService.getPendingPayments(),
      ]);
      setUsers(updated);
      setPendingPayments(payments);
      toast({ title: 'Usuário removido', description: `O usuário com email ${deleteEmailInput.trim()} foi removido com sucesso.` });
      setIsDeleteByEmailDialogOpen(false);
      setDeleteEmailInput('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao remover usuário.', variant: 'destructive' });
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    try {
      await userService.ban(selectedUser.id);
      const updated = await userService.getAll();
      setUsers(updated);
      toast({ title: 'Usuário banido', description: 'O usuário foi banido com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao banir usuário.', variant: 'destructive' });
    }
    setIsBanDialogOpen(false);
    setSelectedUser(null);
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;
    try {
      await userService.unban(selectedUser.id);
      const updated = await userService.getAll();
      setUsers(updated);
      toast({ title: 'Usuário desbanido', description: 'O usuário foi desbanido e pode acessar a plataforma novamente.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao desbanir usuário.', variant: 'destructive' });
    }
    setIsUnbanDialogOpen(false);
    setSelectedUser(null);
  };

  const handleMarkPaymentAsPaid = async (paymentId: string) => {
    try {
      await userService.markPaymentAsPaid(paymentId);
      const payments = await userService.getPendingPayments();
      setPendingPayments(payments);
      toast({
        title: 'Pagamento registrado',
        description: 'O pagamento foi marcado como realizado.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao marcar como pago.',
        variant: 'destructive',
      });
    }
  };

  const handleRevertPaymentAsPaid = async (paymentId: string) => {
    try {
      await userService.revertPaymentAsPaid(paymentId);
      const payments = await userService.getPendingPayments();
      setPendingPayments(payments);
      toast({
        title: 'Marcação revertida',
        description: 'O pagamento voltou a figurar como pendente.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao reverter marcação como pago.',
        variant: 'destructive',
      });
    }
  };

  const handleUndoRemoval = async (paymentId: string) => {
    try {
      await userService.undoRemoval(paymentId);
      const [updatedUsers, payments] = await Promise.all([
        userService.getAll(),
        userService.getPendingPayments(),
      ]);
      setUsers(updatedUsers);
      setPendingPayments(payments);
      toast({
        title: 'Remoção desfeita',
        description: 'O usuário foi restaurado e o valor a pagar removido.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao desfazer remoção.',
        variant: 'destructive',
      });
    }
  };

  // Handlers para solicitações de saída
  const handleApproveExitRequest = async (request: ExitRequest) => {
    try {
      await requestService.approveExitRequest(request.id);
      const [updatedRequests, updatedUsers] = await Promise.all([
        requestService.getExitRequests(),
        userService.getAll(),
      ]);
      setExitRequests(updatedRequests);
      setUsers(updatedUsers);
      toast({ title: 'Solicitação aprovada', description: 'A solicitação foi aprovada com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao aprovar.', variant: 'destructive' });
    }
  };

  const handleRejectExitRequest = async () => {
    if (!selectedExitRequest || !exitRejectionReason.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o motivo da rejeição.', variant: 'destructive' });
      return;
    }
    try {
      await requestService.rejectExitRequest(selectedExitRequest.id, exitRejectionReason.trim());
      const updated = await requestService.getExitRequests();
      setExitRequests(updated);
      toast({ title: 'Solicitação rejeitada', description: 'A solicitação foi rejeitada e o cooperado será notificado.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Falha ao rejeitar.', variant: 'destructive' });
    }
    setIsExitRejectDialogOpen(false);
    setSelectedExitRequest(null);
    setExitRejectionReason('');
  };

  const handleUpdateTotalApplied = (newTotal: number) => {
    setFinancialConfig((prev) => ({
      ...prev,
      totalApplied: newTotal,
      lastUpdate: new Date(),
    }));
    toast({
      title: 'Valor total atualizado',
      description: 'O valor total aplicado foi atualizado. Os valores dos cooperados serão recalculados automaticamente.',
    });
  };

  // Normalizar texto (remover acentos, etc)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Verificar se diferença é apenas pontuação/espaços
  const isOnlyPunctuationDifference = (str1: string, str2: string): boolean => {
    return normalizeText(str1) === normalizeText(str2);
  };

  // Aprovar sugestão de matéria-prima
  const handleApproveSuggestion = (suggestion: SubstanceSuggestion) => {
    const finalName = suggestion.suggestedName || suggestion.name;

    // Adicionar à lista de matérias-primas
    const newSubstance = {
      id: Date.now().toString(),
      name: finalName,
      synonyms: [],
      createdAt: new Date(),
      createdBy: currentUser?.id,
    };

    addSubstance(newSubstance);

    // Atualizar status da sugestão
    updateSuggestion(suggestion.id, {
      status: 'approved',
      approvedAt: new Date(),
    });

    toast({
      title: 'Sugestão aprovada',
      description: `A matéria-prima "${finalName}" foi adicionada à lista.`,
    });
  };

  // Solicitar ajuste de nome
  const handleRequestAdjustment = () => {
    if (!selectedSuggestion || !adjustmentName.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um nome para a sugestão de ajuste.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se é apenas diferença de pontuação
    if (isOnlyPunctuationDifference(selectedSuggestion.name, adjustmentName)) {
      toast({
        title: 'Ajuste desnecessário',
        description: 'A diferença é apenas de pontuação ou espaços. Você pode aprovar diretamente.',
        variant: 'destructive',
      });
      return;
    }

    updateSuggestion(selectedSuggestion.id, {
      suggestedName: adjustmentName.trim(),
      status: 'adjustment_requested',
    });

    toast({
      title: 'Ajuste solicitado',
      description: 'O cooperado será notificado sobre a sugestão de ajuste no nome.',
    });

    setIsAdjustmentDialogOpen(false);
    setSelectedSuggestion(null);
    setAdjustmentName('');
  };

  // Recusar sugestão
  const handleRejectSuggestion = () => {
    if (!selectedSuggestion || !rejectionReason.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe o motivo da recusa.',
        variant: 'destructive',
      });
      return;
    }

    updateSuggestion(selectedSuggestion.id, {
      status: 'rejected',
      rejectionReason: rejectionReason.trim(),
      rejectedAt: new Date(),
    });

    toast({
      title: 'Sugestão recusada',
      description: 'O cooperado será notificado sobre a recusa e o motivo.',
    });

    setIsRejectDialogOpen(false);
    setSelectedSuggestion(null);
    setRejectionReason('');
  };

  if (!hasRole(['master'])) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="card-pharmaceutical">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Acesso Restrito</h3>
            <p className="mt-1 text-center text-muted-foreground">
              Apenas administradores podem acessar esta página.
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
          <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">
            {cooperados.length} cooperado{cooperados.length !== 1 ? 's' : ''} • {bannedUsers.length} banido{bannedUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gradient-primary text-primary-foreground" onClick={handleCreateUser}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cooperado
          </Button>
          <Button
            onClick={() => setIsDeleteByEmailDialogOpen(true)}
            variant="destructive"
            className="gap-2"
            title="Temporário: Deletar usuário por email"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Deletar por Email
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-pharmaceutical">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total Aplicado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(financialConfig.totalApplied)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Atualizado em {formatDate(financialConfig.lastUpdate)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-pharmaceutical">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa CDI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{(financialConfig.cdiRate * 100).toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Ao ano</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-pharmaceutical">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pagamentos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    pendingPayments
                      .filter((p) => p.status === 'pending')
                      .reduce((sum, p) => sum + p.amount, 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingPayments.filter((p) => p.status === 'pending').length} pendente{pendingPayments.filter((p) => p.status === 'pending').length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                <FileText className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="card-pharmaceutical">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, empresa ou CNPJ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="shrink-0">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="cooperados">
            Cooperados ({cooperados.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Valores a Pagar ({pendingPayments.filter((p) => p.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="privilegios">Privilégios</TabsTrigger>
          <TabsTrigger value="cargos">Cargos</TabsTrigger>
          <TabsTrigger value="substances">
            Sugestões de Matérias-Primas ({substanceSuggestions.filter((s) => s.status === 'pending' && new Date(s.expiresAt) > new Date()).length})
          </TabsTrigger>
          <TabsTrigger value="financial">
            Configuração Financeira
          </TabsTrigger>
          <TabsTrigger value="exit-requests">
            Solicitações de Saída ({exitRequests.filter((r) => r.status === 'pending').length})
          </TabsTrigger>
        </TabsList>

        {/* Cooperados Tab */}
        <TabsContent value="cooperados" className="space-y-4">
          <Card className="card-pharmaceutical overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header hover:bg-muted/50">
                  <TableHead className="w-[250px]">Usuário</TableHead>
                  <TableHead>Empresa / CNPJ</TableHead>
                  <TableHead>Aporte</TableHead>
                  <TableHead>Valor Atual</TableHead>
                  <TableHead>Rendimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : cooperados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum cooperado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  cooperados.map((user) => {
                    const proceeds = user.currentValue - user.contribution;
                    const proceedsPercent = user.contribution > 0 ? (proceeds / user.contribution) * 100 : 0;

                    return (
                      <TableRow key={user.id} className="animate-fade-in">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5" />
                              {user.company}
                            </div>
                            {user.cnpj && (
                              <p className="text-xs text-muted-foreground">CNPJ: {user.cnpj}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{formatCurrency(user.contribution)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-primary">{formatCurrency(user.currentValue)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className={`font-semibold ${proceeds >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {proceeds >= 0 ? '+' : ''}{formatCurrency(proceeds)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({proceedsPercent >= 0 ? '+' : ''}{proceedsPercent.toFixed(2)}%)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status, user.id)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(user.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUser(user)}
                              className="h-8 w-8 p-0"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {user.id !== currentUser?.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    title="Mais ações"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {(() => {
                                    // Verificar se o usuário foi removido (está em pendingPayments)
                                    const removedPayment = pendingPayments.find(
                                      (p) => p.userId === user.id && p.reason === 'removed' && p.status === 'pending'
                                    );

                                    if (removedPayment) {
                                      return (
                                        <DropdownMenuItem
                                          onClick={() => handleUndoRemoval(removedPayment.id)}
                                          className="text-primary"
                                        >
                                          <RotateCcw className="mr-2 h-4 w-4" />
                                          Reverter desligamento
                                        </DropdownMenuItem>
                                      );
                                    }

                                    return (
                                      <>
                                        {user.status === 'banned' ? (
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setSelectedUser(user);
                                              setIsUnbanDialogOpen(true);
                                            }}
                                          >
                                            <UserCheck className="mr-2 h-4 w-4" />
                                            Desbanir
                                          </DropdownMenuItem>
                                        ) : (
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setSelectedUser(user);
                                              setIsBanDialogOpen(true);
                                            }}
                                            className="text-destructive"
                                          >
                                            <Ban className="mr-2 h-4 w-4" />
                                            Banir
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedUser(user);
                                            setIsDeleteDialogOpen(true);
                                          }}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Remover
                                        </DropdownMenuItem>
                                      </>
                                    );
                                  })()}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
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

        {/* Valores a Pagar Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card className="card-pharmaceutical overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header hover:bg-muted/50">
                  <TableHead>Cooperado</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum pagamento pendente
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingPayments.map((payment) => (
                    <TableRow key={payment.id} className="animate-fade-in">
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.userName}</p>
                          {payment.company && (
                            <p className="text-sm text-muted-foreground">{payment.company}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{payment.cnpj || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-primary">{formatCurrency(payment.amount)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.reason === 'banned' ? 'destructive' : 'secondary'}>
                          {payment.reason === 'banned'
                            ? 'Banimento'
                            : payment.reason === 'exit_request'
                              ? 'Solicitação de saída'
                              : 'Remoção'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(payment.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.status === 'paid' ? (
                          <Badge className="status-badge status-active">Pago</Badge>
                        ) : (
                          <Badge variant="outline" className="border-warning text-warning">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            {payment.reason === 'removed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUndoRemoval(payment.id)}
                                title="Restaurar usuário e remover este valor a pagar"
                              >
                                Desfazer remoção
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkPaymentAsPaid(payment.id)}
                              className="gradient-primary text-primary-foreground"
                            >
                              Marcar como Pago
                            </Button>
                          </div>
                        )}
                        {payment.status === 'paid' && (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-muted-foreground">
                              {payment.paidAt ? `Pago em ${formatDate(payment.paidAt)}` : 'Pago'}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevertPaymentAsPaid(payment.id)}
                              title="Voltar a pendente"
                            >
                              Desmarcar como pago
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Privilégios Tab */}
        <TabsContent value="privilegios" className="space-y-4">
          <Card className="card-pharmaceutical overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Privilégios por usuário</CardTitle>
              <CardDescription>
                Defina permissões específicas para criar hierarquia dentro da cooperativa.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-3 text-xs text-muted-foreground">
                Permissão disponível: <span className="font-medium">Marketplace — moderar ofertas</span> (editar/remover ofertas de outros cooperados).
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="table-header hover:bg-muted/50">
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Marketplace — moderar ofertas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPermissionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Carregando privilégios...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => {
                      const isMasterUser = u.role === 'master';
                      const hasPerm = (permissionsByUserId[u.id] || []).includes('marketplace_moderate_offers');
                      return (
                        <TableRow key={u.id} className="animate-fade-in">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {getInitials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{u.name}</p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(u.role)}</TableCell>
                          <TableCell className="text-right">
                            {isMasterUser ? (
                              <Badge className="bg-primary/10 text-primary border-primary/20">Sempre (Admin)</Badge>
                            ) : (
                              <Switch
                                checked={hasPerm}
                                onCheckedChange={async (checked) => {
                                  try {
                                    const next = await userService.setPermission(u.id, 'marketplace_moderate_offers', checked);
                                    setPermissionsByUserId((prev) => ({ ...prev, [u.id]: next as any }));
                                    toast({
                                      title: 'Privilégio atualizado',
                                      description: checked
                                        ? `Agora ${u.name} pode moderar ofertas no Marketplace.`
                                        : `Agora ${u.name} não pode mais moderar ofertas no Marketplace.`,
                                    });
                                  } catch (e: any) {
                                    toast({
                                      title: 'Erro',
                                      description: e?.message || 'Falha ao atualizar privilégio.',
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cargos Tab */}
        <TabsContent value="cargos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[320px_1fr]">
            <Card className="card-pharmaceutical">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">Cargos</CardTitle>
                    <CardDescription>Crie/edite/remova cargos e defina permissões.</CardDescription>
                  </div>
                  <Button size="sm" className="gradient-primary text-primary-foreground" onClick={openCreateRole}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {isRolesLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Carregando cargos...</div>
                ) : roles.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Nenhum cargo cadastrado</div>
                ) : (
                  roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRoleId(r.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${selectedRoleId === r.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{r.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {r.userIds?.length || 0} membro{(r.userIds?.length || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {(r.permissionKeys || []).length} perm.
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="card-pharmaceutical">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">Detalhes do cargo</CardTitle>
                    <CardDescription>Defina membros e permissões do cargo selecionado.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={openEditRole} disabled={!selectedRole}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={!selectedRole}
                      onClick={async () => {
                        if (!selectedRole) return;
                        try {
                          await rolesService.remove(selectedRole.id);
                          toast({ title: 'Cargo removido', description: 'O cargo foi removido com sucesso.' });
                          await refreshRoles();
                        } catch (e: any) {
                          toast({ title: 'Erro', description: e?.message || 'Falha ao remover cargo.', variant: 'destructive' });
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!selectedRole ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Selecione um cargo à esquerda.</div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{selectedRole.name}</div>
                      {selectedRole.description ? (
                        <div className="text-sm text-muted-foreground whitespace-pre-line">{selectedRole.description}</div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Sem descrição</div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Permissões do cargo</div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <div className="font-medium text-sm">Marketplace — moderar ofertas</div>
                          <div className="text-xs text-muted-foreground">
                            Permite editar/remover ofertas de outros cooperados.
                          </div>
                        </div>
                        <Switch
                          checked={(selectedRole.permissionKeys || []).includes('marketplace_moderate_offers')}
                          onCheckedChange={async (checked) => {
                            try {
                              const perms = await rolesService.setPermission(
                                selectedRole.id,
                                'marketplace_moderate_offers',
                                checked
                              );
                              setRoles((prev) =>
                                prev.map((r) =>
                                  r.id === selectedRole.id ? { ...r, permissionKeys: perms } : r
                                )
                              );
                              toast({ title: 'Permissão atualizada', description: 'Permissões do cargo atualizadas.' });
                            } catch (e: any) {
                              toast({ title: 'Erro', description: e?.message || 'Falha ao atualizar permissão.', variant: 'destructive' });
                            }
                          }}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-2">
                          <Label>Adicionar cooperado ao cargo</Label>
                          <Input
                            placeholder="Cole o ID do usuário (por enquanto)"
                            value={assignUserId}
                            onChange={(e) => setAssignUserId(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Próximo refinamento: seletor por nome/email. (Já dá para usar com o ID.)
                          </p>
                        </div>
                        <Button
                          className="gradient-primary text-primary-foreground"
                          onClick={async () => {
                            if (!selectedRole) return;
                            const id = assignUserId.trim();
                            if (!id) return;
                            try {
                              await rolesService.addMember(selectedRole.id, id);
                              setAssignUserId('');
                              await refreshRoles();
                              toast({ title: 'Atribuição feita', description: 'O cooperado foi incluído no cargo.' });
                            } catch (e: any) {
                              toast({ title: 'Erro', description: e?.message || 'Falha ao atribuir cargo.', variant: 'destructive' });
                            }
                          }}
                          disabled={!assignUserId.trim()}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Membros</div>
                        {(selectedRole.userIds || []).length === 0 ? (
                          <div className="text-sm text-muted-foreground">Nenhum membro neste cargo.</div>
                        ) : (
                          <div className="space-y-2">
                            {(selectedRole.userIds || []).map((uid) => {
                              const u = users.find((x) => x.id === uid);
                              return (
                                <div key={uid} className="flex items-center justify-between rounded-lg border p-3">
                                  <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">{u?.name || uid}</div>
                                    <div className="text-xs text-muted-foreground truncate">{u?.email || '—'}</div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive hover:text-destructive"
                                    onClick={async () => {
                                      if (!selectedRole) return;
                                      try {
                                        await rolesService.removeMember(selectedRole.id, uid);
                                        await refreshRoles();
                                        toast({ title: 'Removido', description: 'O cooperado foi removido do cargo.' });
                                      } catch (e: any) {
                                        toast({ title: 'Erro', description: e?.message || 'Falha ao remover do cargo.', variant: 'destructive' });
                                      }
                                    }}
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Remover
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dialog criar/editar cargo */}
          <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>{editingRoleId ? 'Editar cargo' : 'Novo cargo'}</DialogTitle>
                <DialogDescription>Defina o nome e a descrição do cargo.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Ex.: Coordenador" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Ex.: Coordena as atividades do setor..."
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="gradient-primary text-primary-foreground"
                    onClick={async () => {
                      const name = roleName.trim();
                      if (!name) {
                        toast({ title: 'Campo obrigatório', description: 'Informe o nome do cargo.', variant: 'destructive' });
                        return;
                      }
                      try {
                        if (editingRoleId) {
                          await rolesService.update(editingRoleId, { name, description: roleDescription.trim() || null });
                          toast({ title: 'Cargo atualizado', description: 'Alterações salvas.' });
                        } else {
                          await rolesService.create({ name, description: roleDescription.trim() || null });
                          toast({ title: 'Cargo criado', description: 'O cargo foi criado com sucesso.' });
                        }
                        setIsRoleDialogOpen(false);
                        await refreshRoles();
                      } catch (e: any) {
                        toast({ title: 'Erro', description: e?.message || 'Falha ao salvar cargo.', variant: 'destructive' });
                      }
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Sugestões de Matérias-Primas Tab */}
        <TabsContent value="substances" className="space-y-4">
          <Card className="card-pharmaceutical overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Sugestões de Matérias-Primas</CardTitle>
              <CardDescription>
                Aprove ou recuse sugestões de novas matérias-primas dos cooperados
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="table-header hover:bg-muted/50">
                  <TableHead>Cooperado</TableHead>
                  <TableHead>Nome Sugerido</TableHead>
                  <TableHead>Nome Ajustado</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {substanceSuggestions.filter((s) => new Date(s.expiresAt) > new Date()).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma sugestão pendente
                    </TableCell>
                  </TableRow>
                ) : (
                  substanceSuggestions
                    .filter((s) => new Date(s.expiresAt) > new Date())
                    .map((suggestion) => (
                      <TableRow key={suggestion.id} className="animate-fade-in">
                        <TableCell>
                          <div>
                            <p className="font-medium">{suggestion.userName}</p>
                            <p className="text-xs text-muted-foreground">{suggestion.userId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{suggestion.name}</span>
                        </TableCell>
                        <TableCell>
                          {suggestion.suggestedName ? (
                            <span className="text-primary font-medium">{suggestion.suggestedName}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(suggestion.createdAt)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Expira em {formatDate(suggestion.expiresAt)}
                          </p>
                        </TableCell>
                        <TableCell>
                          {suggestion.status === 'pending' && (
                            <Badge variant="outline" className="border-warning text-warning">
                              Pendente
                            </Badge>
                          )}
                          {suggestion.status === 'adjustment_requested' && (
                            <Badge variant="outline" className="border-primary text-primary">
                              Ajuste Solicitado
                            </Badge>
                          )}
                          {suggestion.status === 'approved' && (
                            <Badge className="status-badge status-active">Aprovada</Badge>
                          )}
                          {suggestion.status === 'rejected' && (
                            <Badge variant="destructive">Recusada</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {suggestion.status === 'pending' || suggestion.status === 'adjustment_requested' ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Abrir dialog de ajuste de nome
                                  setSelectedSuggestion(suggestion);
                                  setAdjustmentName(suggestion.suggestedName || suggestion.name);
                                  setIsAdjustmentDialogOpen(true);
                                }}
                                className="h-8"
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Ajustar Nome
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSuggestion(suggestion);
                                  setIsRejectDialogOpen(true);
                                }}
                                className="h-8 text-destructive hover:text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Recusar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApproveSuggestion(suggestion)}
                                className="h-8 gradient-primary text-primary-foreground"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Aceitar
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {suggestion.status === 'approved' && suggestion.approvedAt
                                ? `Aprovada em ${formatDate(suggestion.approvedAt)}`
                                : suggestion.status === 'rejected' && suggestion.rejectedAt
                                  ? `Recusada em ${formatDate(suggestion.rejectedAt)}`
                                  : '-'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Configuração Financeira Tab */}
        <TabsContent value="financial" className="space-y-4">
          <Card className="card-pharmaceutical">
            <CardHeader>
              <CardTitle>Configuração Financeira</CardTitle>
              <CardDescription>
                Gerencie o valor total aplicado e a taxa CDI para cálculo de proventos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totalApplied">Valor Total Aplicado (R$)</Label>
                <div className="flex gap-2">
                  <Input
                    id="totalApplied"
                    type="number"
                    value={financialConfig.totalApplied}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setFinancialConfig((prev) => ({ ...prev, totalApplied: value }));
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleUpdateTotalApplied(financialConfig.totalApplied)}
                    className="gradient-primary text-primary-foreground"
                  >
                    Atualizar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ao atualizar, os valores de todos os cooperados serão recalculados automaticamente
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cdiRate">Taxa CDI (% ao ano)</Label>
                <div className="flex gap-2">
                  <Input
                    id="cdiRate"
                    type="number"
                    step="0.01"
                    value={(financialConfig.cdiRate * 100).toFixed(2)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setFinancialConfig((prev) => ({ ...prev, cdiRate: value / 100 }));
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      setFinancialConfig((prev) => ({ ...prev, lastUpdate: new Date() }));
                      toast({
                        title: 'Taxa CDI atualizada',
                        description: 'A taxa CDI foi atualizada. Os valores serão recalculados.',
                      });
                    }}
                    className="gradient-primary text-primary-foreground"
                  >
                    Atualizar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Taxa CDI atual: {(financialConfig.cdiRate * 100).toFixed(2)}% ao ano
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Solicitações de Saída Tab */}
        <TabsContent value="exit-requests" className="space-y-4">
          <Card className="card-pharmaceutical overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header hover:bg-muted/50">
                  <TableHead>Cooperado</TableHead>
                  <TableHead>Empresa / CNPJ</TableHead>
                  <TableHead>Valor a Devolver</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data da Solicitação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exitRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma solicitação de saída encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  exitRequests
                    .sort((a, b) => {
                      // Pendentes primeiro, depois por data
                      if (a.status === 'pending' && b.status !== 'pending') return -1;
                      if (a.status !== 'pending' && b.status === 'pending') return 1;
                      return b.createdAt.getTime() - a.createdAt.getTime();
                    })
                    .map((request) => {
                      const statusBadge = {
                        pending: { label: 'Pendente', variant: 'outline' as const },
                        approved: { label: 'Aprovada', variant: 'default' as const },
                        rejected: { label: 'Rejeitada', variant: 'destructive' as const },
                        cancelled: { label: 'Cancelada', variant: 'secondary' as const },
                      }[request.status];

                      return (
                        <TableRow key={request.id} className="animate-fade-in">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {request.userName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{request.userName}</p>
                                {request.company && (
                                  <p className="text-xs text-muted-foreground">{request.company}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{request.company || '-'}</p>
                              {request.cnpj && (
                                <p className="text-xs text-muted-foreground">{request.cnpj}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-primary">
                              {formatCurrency(request.currentValue)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-muted-foreground max-w-xs truncate">
                              {request.reason || 'Não informado'}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{formatDate(request.createdAt)}</p>
                            {request.reviewedAt && (
                              <p className="text-xs text-muted-foreground">
                                Analisado: {formatDate(request.reviewedAt)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                            {request.rejectionReason && request.status === 'rejected' && (
                              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                                {request.rejectionReason}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {request.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApproveExitRequest(request)}
                                >
                                  <CheckCircle2 className="mr-2 h-3 w-3" />
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedExitRequest(request);
                                    setIsExitRejectDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="mr-2 h-3 w-3" />
                                  Rejeitar
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Criar/Editar Cooperado */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedUser(null);
          setFormName('');
          setFormEmail('');
          setFormCompany('');
          setFormCnpj('');
          setFormContribution('');
          setFormPassword('');
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Editar Cooperado' : 'Criar Novo Cooperado'}</DialogTitle>
            <DialogDescription>
              {selectedUser ? 'Edite os dados do cooperado' : 'Preencha os dados para criar um novo cooperado'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUser} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
                disabled={!!selectedUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa *</Label>
              <Input
                id="company"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                placeholder="Nome da empresa"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                value={formCnpj}
                onChange={(e) => setFormCnpj(formatCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contribution">Valor de Aporte (R$) *</Label>
              <Input
                id="contribution"
                type="number"
                step="0.01"
                value={formContribution}
                onChange={(e) => setFormContribution(e.target.value)}
                placeholder="0,00"
                required
              />
              <p className="text-xs text-muted-foreground">
                Valor inicial que o cooperado aportou na cooperativa
              </p>
            </div>
            {!selectedUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha Temporária *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Senha para primeiro acesso"
                  required
                />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setSelectedUser(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">
                {selectedUser ? 'Salvar Alterações' : 'Criar Cooperado'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Remoção */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este cooperado? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedUser && (
            <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
              <p className="font-medium">{selectedUser.name}</p>
              <p className="text-sm text-muted-foreground">{selectedUser.company}</p>
              {selectedUser.cnpj && (
                <p className="text-sm text-muted-foreground">CNPJ: {selectedUser.cnpj}</p>
              )}
              {selectedUser.currentValue > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-sm font-semibold text-primary">
                    Valor a ser devolvido: {formatCurrency(selectedUser.currentValue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Este valor será adicionado à lista de pagamentos pendentes
                  </p>
                </div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Banimento */}
      <AlertDialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Banimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja banir este cooperado? O usuário e seu CNPJ serão banidos da plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedUser && (
            <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
              <p className="font-medium">{selectedUser.name}</p>
              <p className="text-sm text-muted-foreground">{selectedUser.company}</p>
              {selectedUser.cnpj && (
                <p className="text-sm text-muted-foreground">CNPJ: {selectedUser.cnpj}</p>
              )}
              {selectedUser.currentValue > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-sm font-semibold text-primary">
                    Valor a ser devolvido: {formatCurrency(selectedUser.currentValue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Este valor será adicionado à lista de pagamentos pendentes
                  </p>
                </div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Banir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Desbanimento */}
      <AlertDialog open={isUnbanDialogOpen} onOpenChange={setIsUnbanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Desbanimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desbanir este cooperado? O usuário poderá acessar a plataforma novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedUser && (
            <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
              <p className="font-medium">{selectedUser.name}</p>
              <p className="text-sm text-muted-foreground">{selectedUser.company}</p>
              {selectedUser.cnpj && (
                <p className="text-sm text-muted-foreground">CNPJ: {selectedUser.cnpj}</p>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnbanUser}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Desbanir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Ajuste de Nome */}
      <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Sugerir Ajuste no Nome</DialogTitle>
            <DialogDescription>
              Sugira um ajuste no nome da matéria-prima. O cooperado poderá aceitar ou reenviar.
            </DialogDescription>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium mb-1">Nome original sugerido:</p>
                <p className="text-sm text-muted-foreground">{selectedSuggestion.name}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustmentName">Nome Ajustado *</Label>
                <Input
                  id="adjustmentName"
                  value={adjustmentName}
                  onChange={(e) => setAdjustmentName(e.target.value)}
                  placeholder="Digite o nome ajustado"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  O cooperado receberá uma notificação com esta sugestão de ajuste
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdjustmentDialogOpen(false);
                    setSelectedSuggestion(null);
                    setAdjustmentName('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRequestAdjustment}
                  className="gradient-primary text-primary-foreground"
                >
                  Enviar Ajuste
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Recusa */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Recusar Sugestão</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. O cooperado será notificado.
            </DialogDescription>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium mb-1">Matéria-prima sugerida:</p>
                <p className="text-sm text-muted-foreground">{selectedSuggestion.name}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Motivo da Recusa *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ex: Matéria-prima já cadastrada com outro nome, nome incorreto, etc."
                  required
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
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
                  onClick={handleRejectSuggestion}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Recusar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição de Solicitação de Saída */}
      <Dialog open={isExitRejectDialogOpen} onOpenChange={setIsExitRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação de Saída</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O cooperado será notificado.
            </DialogDescription>
          </DialogHeader>
          {selectedExitRequest && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium mb-1">Cooperado:</p>
                <p className="text-sm text-muted-foreground">{selectedExitRequest.userName}</p>
                <p className="text-sm font-medium mb-1 mt-2">Valor solicitado:</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(selectedExitRequest.currentValue)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitRejectionReason">Motivo da Rejeição *</Label>
                <Textarea
                  id="exitRejectionReason"
                  value={exitRejectionReason}
                  onChange={(e) => setExitRejectionReason(e.target.value)}
                  placeholder="Ex: Período mínimo de permanência não atingido, pendências financeiras, etc."
                  required
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsExitRejectDialogOpen(false);
                    setSelectedExitRequest(null);
                    setExitRejectionReason('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRejectExitRequest}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Rejeitar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog temporário: Deletar por Email */}
      <Dialog open={isDeleteByEmailDialogOpen} onOpenChange={setIsDeleteByEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar Usuário por Email</DialogTitle>
            <DialogDescription>
              Digite o email do usuário que deseja deletar. Esta é uma funcionalidade temporária.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deleteEmail">Email do Usuário</Label>
              <Input
                id="deleteEmail"
                type="email"
                value={deleteEmailInput}
                onChange={(e) => setDeleteEmailInput(e.target.value)}
                placeholder="exemplo@magistral.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDeleteUserByEmail();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteByEmailDialogOpen(false);
                  setDeleteEmailInput('');
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteUserByEmail}
                disabled={!deleteEmailInput.trim()}
              >
                Deletar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
