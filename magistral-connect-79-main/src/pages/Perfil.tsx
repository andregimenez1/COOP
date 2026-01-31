import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  User,
  Camera,
  Lock,
  Users,
  CreditCard,
  Plus,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  Edit,
  Copy,
  FileSearch,
  Bell,
} from 'lucide-react';
import type {
  ExtraUserRequest,
  BankDataChangeRequest,
  UserProfileDocument,
  UserProfileDocumentType,
  UserProfileDocumentRequest,
} from '@/types';
import { requestService } from '@/services/request.service';
import { userProfileDocumentsService } from '@/services/userProfileDocuments.service';
import { api } from '@/lib/api';
import { formatCnpj } from '@/lib/cnpj';
import { Checkbox } from '@/components/ui/checkbox';

const USERS_STORAGE_KEY = 'magistral_users';
const EXTRA_USERS_REQUESTS_KEY = 'magistral_extra_users_requests';

export default function Perfil() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs para rastrear se estamos inicializando (para evitar sobrescrever durante digitação)
  const isInitializingRef = useRef(true);
  
  // Refs para estados de edição (para evitar re-renders em useEffects)
  const editingStatesRef = useRef({
    isEditingProfile: false,
  });
  
  // Estados para edição de perfil
  const [editName, setEditName] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editRazaoSocial, setEditRazaoSocial] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [justification, setJustification] = useState('');
  
  // Atualizar refs quando estados mudarem
  useEffect(() => {
    editingStatesRef.current = {
      isEditingProfile,
    };
  }, [isEditingProfile]);
  
  // Estados para solicitação de usuários extras
  const [isExtraUsersDialogOpen, setIsExtraUsersDialogOpen] = useState(false);
  const [extraUsers, setExtraUsers] = useState<Array<{ name: string; email: string; role: 'socio' | 'funcionario'; position?: string }>>([]);
  const [extraUsersReason, setExtraUsersReason] = useState('');
  
  // Estados para solicitação de alteração bancária
  const [isBankDataDialogOpen, setIsBankDataDialogOpen] = useState(false);
  const [newPixKey, setNewPixKey] = useState('');
  const [pixBank, setPixBank] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState<'corrente' | 'poupanca'>('corrente');
  const [agency, setAgency] = useState('');
  const [account, setAccount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankDataReason, setBankDataReason] = useState('');
  
  // Estados para histórico de solicitações
  const [extraUsersRequests, setExtraUsersRequests] = useState<ExtraUserRequest[]>([]);
  const [bankDataRequests, setBankDataRequests] = useState<BankDataChangeRequest[]>([]);
  const [showCompletedRequests, setShowCompletedRequests] = useState(false);

  // Preferências de notificação por e-mail
  const [notifyEmailFlashDeals, setNotifyEmailFlashDeals] = useState(false);
  const [notifyEmailReservas, setNotifyEmailReservas] = useState(false);
  const [notifyEmailHubCredit, setNotifyEmailHubCredit] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Documentos obrigatórios do cooperado (perfil)
  const [profileDocuments, setProfileDocuments] = useState<UserProfileDocument[]>([]);
  const [profileDocsLoading, setProfileDocsLoading] = useState(false);
  const [profileDocRequests, setProfileDocRequests] = useState<UserProfileDocumentRequest[]>([]);
  const [isProfileDocDialogOpen, setIsProfileDocDialogOpen] = useState(false);
  const [selectedProfileDocType, setSelectedProfileDocType] = useState<UserProfileDocumentType | null>(null);
  const [selectedProfileDocFile, setSelectedProfileDocFile] = useState<File | null>(null);
  const [profileDocValidUntil, setProfileDocValidUntil] = useState('');
  const [profileDocValidIndefinitely, setProfileDocValidIndefinitely] = useState(false);

  // Carregar dados do usuário e solicitações (apenas na inicialização)
  useEffect(() => {
    if (!user) return;
    
    // Só atualizar campos na inicialização ou se não estiver editando
    const shouldUpdateFields = isInitializingRef.current || !isEditingProfile;
    
    // Recarregar dados do usuário do localStorage magistral_users se existir
    // Isso garante que dados aprovados pelo admin sejam exibidos
    const loadUserData = () => {
      try {
        const usersStored = localStorage.getItem('magistral_users');
        if (usersStored) {
          const users = JSON.parse(usersStored);
          const updatedUser = users.find((u: any) => u.id === user.id);
          if (updatedUser && updateUser) {
            // Converter datas de string para Date se necessário
            const processedUser = {
              ...updatedUser,
              createdAt: updatedUser.createdAt instanceof Date 
                ? updatedUser.createdAt 
                : updatedUser.createdAt 
                  ? new Date(updatedUser.createdAt) 
                  : user.createdAt,
            };
            
            // Atualizar o usuário no contexto com os dados mais recentes
            // Priorizar valores do localStorage (aprovados pelo admin) sobre valores fictícios do contexto
            const mergedUser = {
              ...user, // Base: valores do contexto
              ...processedUser, // Sobrescrever com valores do localStorage (mais atualizados)
              // Para campos específicos, priorizar localStorage se existir (valores aprovados)
              razaoSocial: processedUser.razaoSocial || user.razaoSocial,
              cnpj: processedUser.cnpj || user.cnpj,
              pixKey: processedUser.pixKey || user.pixKey,
              pixBank: processedUser.pixBank || user.pixBank,
              bankName: processedUser.bankName || user.bankName,
              agency: processedUser.agency || user.agency,
              account: processedUser.account || user.account,
              accountHolder: processedUser.accountHolder || user.accountHolder,
              accountType: processedUser.accountType || user.accountType,
              createdAt: user.createdAt, // Manter a data original do contexto
            };
            
            // Só atualizar se realmente houver mudanças para evitar loops
            const hasRealChanges = 
              mergedUser.razaoSocial !== user.razaoSocial ||
              mergedUser.cnpj !== user.cnpj ||
              mergedUser.name !== user.name ||
              mergedUser.pixKey !== user.pixKey ||
              mergedUser.pixBank !== user.pixBank;
            
            if (hasRealChanges) {
              updateUser(mergedUser);
            }
            
            // Atualizar os campos locais apenas se permitido
            if (shouldUpdateFields) {
              if (!isEditingProfile) {
                setEditName(mergedUser.name);
                setEditCnpj(formatCnpj(mergedUser.cnpj || ''));
                setEditRazaoSocial(mergedUser.razaoSocial || '');
              }
            }
            setProfilePicture(mergedUser.profilePicture || null);
            console.log('✅ [Perfil] Dados do usuário carregados de magistral_users:', {
              razaoSocial: mergedUser.razaoSocial,
              cnpj: mergedUser.cnpj,
              pixKey: mergedUser.pixKey,
              hasRealChanges,
              userRazaoSocial: user.razaoSocial,
              processedRazaoSocial: processedUser.razaoSocial,
            });
            return true;
          }
        }
      } catch (error) {
        console.error('❌ [Perfil] Erro ao carregar dados atualizados do usuário:', error);
      }
      return false;
    };
    
    // Tentar carregar de magistral_users primeiro
    if (!loadUserData()) {
      // Fallback: usar dados do contexto, mas apenas se permitido
      if (shouldUpdateFields && !isEditingProfile) {
        setEditName(user.name);
        setEditCnpj(formatCnpj(user.cnpj || ''));
        setEditRazaoSocial(user.razaoSocial || '');
      }
      setProfilePicture(user.profilePicture || null);
      console.log('ℹ️ [Perfil] Usando dados do contexto (magistral_users não encontrado)');
    }
    
    // Marcar que a inicialização foi concluída
    if (isInitializingRef.current) {
      isInitializingRef.current = false;
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Usar apenas user?.id para evitar re-renders quando user muda mas não o ID
  
  // Carregar solicitações (separado para evitar conflitos com edição)
  useEffect(() => {
    if (!user) return;
    
    const loadRequests = async () => {
      try {
        // Carregar solicitações de usuários extras do localStorage (ainda não migrado)
        const extraRequestsStored = localStorage.getItem(EXTRA_USERS_REQUESTS_KEY);
        if (extraRequestsStored) {
          const parsed = JSON.parse(extraRequestsStored);
          setExtraUsersRequests(
            parsed
              .filter((r: any) => r.userId === user.id)
              .map((r: any) => {
                try {
                  return {
                    ...r,
                    createdAt: r.createdAt ? (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)) : new Date(),
                    reviewedAt: r.reviewedAt ? (r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt)) : undefined,
                  };
                } catch (dateError) {
                  console.error('Erro ao converter data da solicitação de usuário extra:', r.id, dateError);
                  return {
                    ...r,
                    createdAt: new Date(),
                    reviewedAt: undefined,
                  };
                }
              })
          );
        }
        
        // Carregar solicitações de dados bancários da API
        const allRequests = await requestService.getBankDataRequests();
        const userRequests = allRequests.filter(r => r.userId === user.id);
        console.log('👤 [Perfil] Solicitações do usuário carregadas da API:', userRequests);
        setBankDataRequests(userRequests);
      } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
        setBankDataRequests([]);
      }
    };
    
    loadRequests();
  }, [user?.id]); // Usar apenas user?.id para evitar re-renders desnecessários

  useEffect(() => {
    if (!user) return;
    setPrefsLoading(true);
    api
      .get<{ notifyEmailFlashDeals: boolean; notifyEmailReservas: boolean; notifyEmailHubCredit: boolean }>(
        '/notifications/preferences'
      )
      .then((p) => {
        setNotifyEmailFlashDeals(!!p.notifyEmailFlashDeals);
        setNotifyEmailReservas(!!p.notifyEmailReservas);
        setNotifyEmailHubCredit(!!p.notifyEmailHubCredit);
      })
      .catch(() => {})
      .finally(() => setPrefsLoading(false));
  }, [user?.id]);

  // Carregar documentos do perfil (somente cooperado)
  useEffect(() => {
    if (!user || user.role !== 'cooperado') return;
    setProfileDocsLoading(true);
    Promise.all([userProfileDocumentsService.getMyDocuments(), requestService.getProfileDocumentRequests()])
      .then(([docs, reqs]) => {
        setProfileDocuments(docs);
        setProfileDocRequests(reqs);
      })
      .catch(() => {
        setProfileDocuments([]);
        setProfileDocRequests([]);
      })
      .finally(() => setProfileDocsLoading(false));
  }, [user?.id, user?.role]);

  const handleSaveNotificationPrefs = async () => {
    setPrefsSaving(true);
    try {
      await api.patch('/notifications/preferences', {
        notifyEmailFlashDeals,
        notifyEmailReservas,
        notifyEmailHubCredit,
      });
      toast({ title: 'Preferências salvas', description: 'Suas preferências de notificação foram atualizadas.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falha ao salvar preferências.', variant: 'destructive' });
    } finally {
      setPrefsSaving(false);
    }
  };

  // Listener para detectar mudanças no localStorage e atualizar o usuário
  useEffect(() => {
    if (!user || !updateUser) return;
    
    const handleStorageChange = (e: StorageEvent) => {
      // Se magistral_users foi atualizado, recarregar dados do usuário
      // Mas não atualizar campos de edição se o usuário estiver editando
      if (e.key === 'magistral_users' && e.newValue) {
        try {
          const users = JSON.parse(e.newValue);
          const updatedUser = users.find((u: any) => u.id === user.id);
          if (updatedUser) {
            const mergedUser = {
              ...user,
              ...updatedUser,
              createdAt: user.createdAt,
            };
                   updateUser(mergedUser);
                   // Só atualizar campos de edição se não estiver em modo de edição
                   if (!editingStatesRef.current.isEditingProfile) {
                     setEditName(mergedUser.name);
                     setEditCnpj(formatCnpj(mergedUser.cnpj || ''));
                     setEditRazaoSocial(mergedUser.razaoSocial || '');
                   }
          }
        } catch (error) {
          console.error('Erro ao processar mudança no localStorage:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
           // Também verificar periodicamente (para mudanças na mesma aba)
           // Mas apenas se não estiver em modo de edição
           const interval = setInterval(() => {
             // Não verificar se estiver editando (usar refs para evitar re-renders)
             if (editingStatesRef.current.isEditingProfile) {
               return;
             }
      
      try {
        const usersStored = localStorage.getItem('magistral_users');
        if (usersStored) {
          const users = JSON.parse(usersStored);
          const updatedUser = users.find((u: any) => u.id === user.id);
          if (updatedUser && updateUser) {
            // Verificar se há mudanças
            const hasChanges = 
              updatedUser.pixKey !== user.pixKey ||
              updatedUser.pixBank !== user.pixBank ||
              updatedUser.cnpj !== user.cnpj ||
              updatedUser.razaoSocial !== user.razaoSocial ||
              updatedUser.bankName !== user.bankName;
            
            if (hasChanges) {
              const mergedUser = {
                ...user,
                ...updatedUser,
                createdAt: user.createdAt,
              };
                     updateUser(mergedUser);
                     // Atualizar campos de edição (já verificamos que não está editando)
                     if (!editingStatesRef.current.isEditingProfile) {
                       setEditName(mergedUser.name);
                       setEditCnpj(formatCnpj(mergedUser.cnpj || ''));
                       setEditRazaoSocial(mergedUser.razaoSocial || '');
                     }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar atualizações do usuário:', error);
      }
    }, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Usar apenas user?.id para evitar re-renders quando estados de edição mudam

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem.',
        variant: 'destructive',
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive',
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      setProfilePicture(imageUrl);
      
      // Atualizar no contexto de autenticação
      if (user && updateUser) {
        updateUser({ ...user, profilePicture: imageUrl });
      }
      
      toast({
        title: 'Foto atualizada',
        description: 'Sua foto de perfil foi atualizada com sucesso.',
      });
    };
    reader.readAsDataURL(file);
  };

  // Verificar se há alterações nos campos
  const hasChanges = () => {
    if (!user) return false;
    return (
      editName.trim() !== user.name ||
      editCnpj.replace(/\D/g, '') !== (user.cnpj || '').replace(/\D/g, '') ||
      editRazaoSocial.trim() !== (user.razaoSocial || '')
    );
  };

  // Função única para salvar todas as alterações
  const handleSaveProfileChanges = async () => {
    if (!user) return;

    // Validar nome
    if (!editName.trim()) {
      toast({
        title: 'Nome inválido',
        description: 'O nome não pode estar vazio.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se há alterações
    if (!hasChanges()) {
      toast({
        title: 'Nenhuma alteração',
        description: 'Não há alterações para salvar.',
      });
      setIsEditingProfile(false);
      return;
    }

    // Validar justificativa se houver alterações
    if (!justification.trim()) {
      toast({
        title: 'Justificativa obrigatória',
        description: 'Por favor, informe uma justificativa para as alterações.',
        variant: 'destructive',
      });
      return;
    }

    // Validar CNPJ se foi alterado
    const cnpjClean = editCnpj.replace(/\D/g, '');
    if (cnpjClean && cnpjClean.length !== 14) {
      toast({
        title: 'CNPJ inválido',
        description: 'O CNPJ deve conter 14 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    const formattedCnpj = cnpjClean ? 
      cnpjClean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : 
      undefined;

    const newRazaoSocial = editRazaoSocial.trim() || undefined;

    // Verificar quais campos foram alterados e criar solicitações
    let hasNameChange = false;
    let requestsCreated = 0;

    // Alteração de nome
    if (editName.trim() !== user.name) {
      hasNameChange = true;
      // Nome pode ser atualizado diretamente (não precisa de aprovação)
      if (updateUser) {
        try {
          await updateUser({ ...user, name: editName.trim() });
          console.log('✅ [Perfil] Nome atualizado com sucesso');
        } catch (error: any) {
          console.error('❌ [Perfil] Erro ao atualizar nome:', error);
          toast({
            title: 'Erro',
            description: error?.message || 'Não foi possível atualizar o nome.',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    // Alteração de CNPJ
    if (user.cnpj && formattedCnpj && formattedCnpj !== user.cnpj) {
      try {
        await requestService.createBankDataRequest({
          currentCnpj: user.cnpj,
          newCnpj: formattedCnpj,
          reason: justification.trim(),
        });
        requestsCreated++;
        console.log('✅ [Perfil] Solicitação de CNPJ criada');
      } catch (error: any) {
        console.error('❌ [Perfil] Erro ao criar solicitação de CNPJ:', error);
        toast({
          title: 'Erro',
          description: error?.message || 'Não foi possível criar a solicitação de alteração de CNPJ.',
          variant: 'destructive',
        });
        return;
      }
    } else if (!user.cnpj && formattedCnpj) {
      // Cadastro inicial de CNPJ - atualizar diretamente
      if (updateUser) {
        try {
          await updateUser({ ...user, cnpj: formattedCnpj });
          console.log('✅ [Perfil] CNPJ atualizado com sucesso');
        } catch (error: any) {
          console.error('❌ [Perfil] Erro ao atualizar CNPJ:', error);
          toast({
            title: 'Erro',
            description: error?.message || 'Não foi possível atualizar o CNPJ.',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    // Alteração de Razão Social
    if (user.razaoSocial && newRazaoSocial && newRazaoSocial !== user.razaoSocial) {
      try {
        await requestService.createBankDataRequest({
          currentRazaoSocial: user.razaoSocial,
          newRazaoSocial: newRazaoSocial,
          reason: justification.trim(),
        });
        requestsCreated++;
        console.log('✅ [Perfil] Solicitação de Razão Social criada');
      } catch (error: any) {
        console.error('❌ [Perfil] Erro ao criar solicitação de Razão Social:', error);
        toast({
          title: 'Erro',
          description: error?.message || 'Não foi possível criar a solicitação de alteração de Razão Social.',
          variant: 'destructive',
        });
        return;
      }
    } else if (!user.razaoSocial && newRazaoSocial) {
      // Cadastro inicial de Razão Social - atualizar diretamente
      if (updateUser) {
        try {
          await updateUser({ ...user, razaoSocial: newRazaoSocial });
          console.log('✅ [Perfil] Razão Social atualizada com sucesso');
        } catch (error: any) {
          console.error('❌ [Perfil] Erro ao atualizar Razão Social:', error);
          toast({
            title: 'Erro',
            description: error?.message || 'Não foi possível atualizar a Razão Social.',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    // Mensagem de sucesso
    if (hasNameChange && requestsCreated === 0) {
      toast({
        title: 'Perfil atualizado',
        description: 'Seu perfil foi atualizado com sucesso.',
      });
    } else if (requestsCreated > 0) {
      toast({
        title: 'Solicitações enviadas',
        description: `${requestsCreated} solicitação(ões) de alteração foram enviadas e serão analisadas pelo administrador.`,
      });
    }

    // Limpar e sair do modo de edição
    setJustification('');
    setIsEditingProfile(false);
  };

  // Função para cancelar edição
  const handleCancelEdit = () => {
    if (!user) return;
    setEditName(user.name);
    setEditCnpj(formatCnpj(user.cnpj || ''));
    setEditRazaoSocial(user.razaoSocial || '');
    setJustification('');
    setIsEditingProfile(false);
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'As senhas não são iguais.',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    
    // Em produção, aqui faria a validação da senha atual e atualização
    toast({
      title: 'Senha alterada',
      description: 'Sua senha foi alterada com sucesso.',
    });
    
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsChangingPassword(false);
  };

  const handleAddExtraUser = () => {
    setExtraUsers([...extraUsers, { name: '', email: '', role: 'funcionario' }]);
  };

  const handleRemoveExtraUser = (index: number) => {
    setExtraUsers(extraUsers.filter((_, i) => i !== index));
  };

  const handleUpdateExtraUser = (index: number, field: string, value: string) => {
    const updated = [...extraUsers];
    updated[index] = { ...updated[index], [field]: value };
    setExtraUsers(updated);
  };

  const handleSubmitExtraUsersRequest = () => {
    if (extraUsers.length === 0) {
      toast({
        title: 'Nenhum usuário',
        description: 'Adicione pelo menos um usuário.',
        variant: 'destructive',
      });
      return;
    }
    
    const invalidUsers = extraUsers.filter(u => !u.name.trim() || !u.email.trim());
    if (invalidUsers.length > 0) {
      toast({
        title: 'Dados incompletos',
        description: 'Preencha nome e email de todos os usuários.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!user) return;
    
    const newRequest: ExtraUserRequest = {
      id: `extra-users-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      requestedUsers: extraUsers,
      reason: extraUsersReason.trim() || undefined,
      status: 'pending',
      createdAt: new Date(),
    };
    
    try {
      const requestsStored = localStorage.getItem(EXTRA_USERS_REQUESTS_KEY);
      const requests = requestsStored ? JSON.parse(requestsStored) : [];
      requests.push(newRequest);
      localStorage.setItem(EXTRA_USERS_REQUESTS_KEY, JSON.stringify(requests));
      
      setExtraUsersRequests([...extraUsersRequests, newRequest]);
      setExtraUsers([]);
      setExtraUsersReason('');
      setIsExtraUsersDialogOpen(false);
      
      toast({
        title: 'Solicitação enviada',
        description: 'Sua solicitação de usuários extras foi enviada e será analisada pelo administrador.',
      });
    } catch (error) {
      console.error('Erro ao salvar solicitação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a solicitação.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitBankDataRequest = async () => {
    if (!newPixKey.trim() && !bankName.trim()) {
      toast({
        title: 'Dados incompletos',
        description: 'Informe pelo menos a chave PIX ou os dados bancários.',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPixKey.trim() && !/^[a-zA-Z0-9@.\-+]+$/.test(newPixKey.trim())) {
      toast({
        title: 'Chave PIX inválida',
        description: 'A chave PIX deve conter apenas letras, números e caracteres especiais permitidos.',
        variant: 'destructive',
      });
      return;
    }
    
    if (bankName.trim() && (!agency.trim() || !account.trim() || !accountHolder.trim())) {
      toast({
        title: 'Dados bancários incompletos',
        description: 'Preencha todos os dados bancários (banco, agência, conta e titular).',
        variant: 'destructive',
      });
      return;
    }
    
    if (!user) return;
    
    const newPixKeyTrimmed = newPixKey.trim() || undefined;
    const pixBankTrimmed = pixBank.trim() || undefined;
    const bankNameTrimmed = bankName.trim() || undefined;
    
    // Verificar se é alteração (já existe) ou cadastro inicial (não existe)
    const isPixChange = user.pixKey && newPixKeyTrimmed && newPixKeyTrimmed !== user.pixKey;
    const isPixBankChange = user.pixBank && pixBankTrimmed && pixBankTrimmed !== user.pixBank;
    const isBankDataChange = user.bankName && bankNameTrimmed && bankNameTrimmed !== user.bankName;
    
    // Verificar se há algum campo sendo alterado (não apenas adicionado)
    const hasAnyChange = isPixChange || isPixBankChange || isBankDataChange;
    
    // Se é alteração de campo existente, criar solicitação
    // IMPORTANTE: Só criar solicitação se realmente houver alteração de um campo que já existe
    // Se o campo está vazio, é cadastro inicial e não precisa de solicitação
    if (hasAnyChange) {
      try {
        console.log('📤 [Perfil] Criando solicitação de dados bancários...', {
          currentPixKey: user.pixKey,
          newPixKey: newPixKeyTrimmed,
          pixBank: pixBankTrimmed,
          bankName: bankNameTrimmed,
          reason: bankDataReason.trim() || undefined,
        });
        
        const newRequest = await requestService.createBankDataRequest({
          currentPixKey: user.pixKey,
          newPixKey: newPixKeyTrimmed,
          pixBank: pixBankTrimmed,
          bankName: bankNameTrimmed,
          accountType: bankNameTrimmed ? accountType : undefined,
          agency: agency.trim() || undefined,
          account: account.trim() || undefined,
          accountHolder: accountHolder.trim() || undefined,
          reason: bankDataReason.trim() || undefined,
        });
        
        console.log('✅ [Perfil] Solicitação criada com sucesso:', newRequest);
        console.log('📋 [Perfil] ID da solicitação:', newRequest.id);
        console.log('📋 [Perfil] Status:', newRequest.status);
        
        // Recarregar solicitações da API
        const allRequests = await requestService.getBankDataRequests();
        console.log('📊 [Perfil] Total de solicitações carregadas:', allRequests.length);
        const userRequests = allRequests.filter(r => r.userId === user.id);
        console.log('👤 [Perfil] Solicitações do usuário:', userRequests.length);
        setBankDataRequests(userRequests);
        
        setNewPixKey('');
        setPixBank('');
        setBankName('');
        setAgency('');
        setAccount('');
        setAccountHolder('');
        setBankDataReason('');
        setIsBankDataDialogOpen(false);
        
        toast({
          title: 'Solicitação enviada',
          description: 'Sua solicitação de alteração de dados bancários foi enviada e será analisada pelo administrador.',
        });
      } catch (error: any) {
        console.error('Erro ao criar solicitação:', error);
        toast({
          title: 'Erro',
          description: error?.message || 'Não foi possível enviar a solicitação.',
          variant: 'destructive',
        });
      }
    } else {
      // Se é cadastro inicial (não existe), atualizar diretamente
      if (updateUser) {
        try {
          const updatedUser: User = {
            ...user,
          };
          
          // Atualizar apenas os campos que existem no modelo User
          // NOTA: bankName, accountType, agency, account, accountHolder não existem no User
          // Esses campos só podem ser atualizados via solicitação
          if (newPixKeyTrimmed) {
            updatedUser.pixKey = newPixKeyTrimmed;
          }
          if (pixBankTrimmed) {
            updatedUser.pixBank = pixBankTrimmed;
          }
          
          // Se há dados bancários completos, criar solicitação mesmo sendo cadastro inicial
          // porque esses campos não existem no User
          if (bankNameTrimmed && agency.trim() && account.trim() && accountHolder.trim()) {
            try {
              await requestService.createBankDataRequest({
                newPixKey: newPixKeyTrimmed,
                pixBank: pixBankTrimmed,
                bankName: bankNameTrimmed,
                accountType: accountType,
                agency: agency.trim(),
                account: account.trim(),
                accountHolder: accountHolder.trim(),
                reason: bankDataReason.trim() || undefined,
              });
              
              // Atualizar apenas PIX se foi preenchido
              if (newPixKeyTrimmed || pixBankTrimmed) {
                await updateUser(updatedUser);
              }
              
              console.log('✅ [Perfil] Solicitação de dados bancários criada (cadastro inicial)');
              
              setNewPixKey('');
              setPixBank('');
              setBankName('');
              setAgency('');
              setAccount('');
              setAccountHolder('');
              setBankDataReason('');
              setIsBankDataDialogOpen(false);
              
              toast({
                title: 'Solicitação enviada',
                description: 'Sua solicitação de dados bancários foi enviada e será analisada pelo administrador.',
              });
              return;
            } catch (error: any) {
              console.error('❌ [Perfil] Erro ao criar solicitação de dados bancários:', error);
              toast({
                title: 'Erro',
                description: error?.message || 'Não foi possível enviar a solicitação de dados bancários.',
                variant: 'destructive',
              });
              return;
            }
          }
          
          // Se só tem PIX (sem dados bancários completos), atualizar diretamente
          if (newPixKeyTrimmed || pixBankTrimmed) {
            await updateUser(updatedUser);
            console.log('✅ [Perfil] PIX atualizado com sucesso');
          }
          
          setNewPixKey('');
          setPixBank('');
          setBankName('');
          setAgency('');
          setAccount('');
          setAccountHolder('');
          setBankDataReason('');
          setIsBankDataDialogOpen(false);
          
          toast({
            title: 'Dados atualizados',
            description: 'Seus dados foram atualizados com sucesso.',
          });
        } catch (error: any) {
          console.error('❌ [Perfil] Erro ao atualizar dados:', error);
          toast({
            title: 'Erro',
            description: error?.message || 'Não foi possível atualizar os dados.',
            variant: 'destructive',
          });
        }
      }
    }
  };

  const getStatusBadge = (status: string | undefined | null) => {
    // Tratar status undefined/null/vazio como pendente
    if (!status || status === '') {
      return { label: 'Pendente', variant: 'outline' as const };
    }
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      approved: { label: 'Aprovada', variant: 'default' },
      rejected: { label: 'Rejeitada', variant: 'destructive' },
    };
    return badges[status] || { label: status, variant: 'outline' };
  };

  // Função para identificar o tipo de solicitação
  const getRequestType = (request: BankDataChangeRequest): string[] => {
    const types: string[] = [];
    
    if (request.newPixKey || request.currentPixKey) {
      types.push('PIX');
    }
    if (request.newCnpj || request.currentCnpj) {
      types.push('CNPJ');
    }
    if (request.newRazaoSocial || request.currentRazaoSocial) {
      types.push('Razão Social');
    }
    if (request.bankName || request.agency || request.account) {
      types.push('Dados Bancários');
    }
    
    return types.length > 0 ? types : ['Dados Bancários'];
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Data não disponível';
    
    // Converter string para Date se necessário
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyPixKey = () => {
    if (user?.pixKey) {
      navigator.clipboard.writeText(user.pixKey);
      toast({
        title: 'Chave PIX copiada',
        description: 'A chave PIX foi copiada para a área de transferência.',
      });
    }
  };

  const PROFILE_DOCUMENT_TYPES: Array<{ type: UserProfileDocumentType; label: string; hint?: string }> = [
    { type: 'afe', label: 'AFE', hint: 'Autorização de Funcionamento de Empresa' },
    { type: 'ae', label: 'AE', hint: 'Autorização Especial' },
    { type: 'licenca_sanitaria', label: 'Licença Sanitária' },
    { type: 'corpo_bombeiros', label: 'Corpo de Bombeiros' },
    { type: 'policia_federal', label: 'PF', hint: 'Polícia Federal (quando aplicável)' },
  ];

  const getLatestProfileDoc = (type: UserProfileDocumentType) => {
    // API já vem em ordem desc por uploadedAt
    return profileDocuments.find((d) => d.type === type);
  };

  const getLatestPendingProfileDocRequest = (type: UserProfileDocumentType) => {
    return profileDocRequests.find((r) => r.type === type && (r.status === 'pending' || !r.status));
  };

  const getProfileDocStatus = (doc?: UserProfileDocument) => {
    if (!doc) return { label: 'Ausente', variant: 'destructive' as const, color: 'text-destructive' };
    if (doc.validIndefinitely) return { label: 'Indeterminada', variant: 'outline' as const, color: 'text-emerald-700' };
    if (!doc.validUntil) return { label: 'Sem validade', variant: 'outline' as const, color: 'text-muted-foreground' };
    const isExpired = new Date(doc.validUntil).getTime() < new Date().getTime();
    return isExpired
      ? { label: 'Vencido', variant: 'destructive' as const, color: 'text-destructive' }
      : { label: 'Válido', variant: 'outline' as const, color: 'text-emerald-700' };
  };

  const openProfileDocDialog = (type: UserProfileDocumentType) => {
    const existing = getLatestProfileDoc(type);
    setSelectedProfileDocType(type);
    setSelectedProfileDocFile(null);

    // Defaults: AE/AFE costumam ser indeterminadas
    const defaultIndefinite = type === 'ae' || type === 'afe';
    setProfileDocValidIndefinitely(existing?.validIndefinitely ?? defaultIndefinite);

    if (existing?.validUntil) {
      const d = new Date(existing.validUntil);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setProfileDocValidUntil(`${yyyy}-${mm}-${dd}`);
    } else {
      setProfileDocValidUntil('');
    }

    setIsProfileDocDialogOpen(true);
  };

  const handleConfirmProfileDocUpload = async () => {
    if (!user || user.role !== 'cooperado' || !selectedProfileDocType) return;
    const file = selectedProfileDocFile;

    if (!file) {
      toast({
        title: 'Selecione o PDF',
        description: 'Escolha o arquivo PDF do documento antes de confirmar.',
        variant: 'destructive',
      });
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Arquivo inválido',
        description: 'Envie um PDF.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 10MB.',
        variant: 'destructive',
      });
      return;
    }

    if (!profileDocValidUntil && !profileDocValidIndefinitely) {
      toast({
        title: 'Informe a validade',
        description: 'Defina a validade do documento (data/mês/ano) ou marque como indeterminada.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const fileUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Agora é SOLICITAÇÃO ao admin (não salva direto no perfil)
      await requestService.createProfileDocumentRequest({
        type: selectedProfileDocType,
        fileName: file.name,
        fileUrl,
        validUntil: profileDocValidIndefinitely ? undefined : profileDocValidUntil,
        validIndefinitely: profileDocValidIndefinitely,
      });

      const [docs, reqs] = await Promise.all([
        userProfileDocumentsService.getMyDocuments(),
        requestService.getProfileDocumentRequests(),
      ]);
      setProfileDocuments(docs);
      setProfileDocRequests(reqs);

      toast({
        title: 'Solicitação enviada',
        description: 'Documento enviado para avaliação do administrador.',
      });

      setIsProfileDocDialogOpen(false);
      setSelectedProfileDocType(null);
      setSelectedProfileDocFile(null);
      setProfileDocValidUntil('');
      setProfileDocValidIndefinitely(false);
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message ?? 'Falha ao enviar solicitação.',
        variant: 'destructive',
      });
    }
  };


  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="card-pharmaceutical">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Acesso Restrito</h3>
            <p className="mt-1 text-center text-muted-foreground">
              Faça login para acessar seu perfil.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais, senha e solicitações
        </p>
      </div>

      {/* Informações do Perfil */}
      <Card className="card-pharmaceutical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Foto de Perfil */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profilePicture || undefined} alt={user.name} />
              <AvatarFallback className="text-lg">
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Label className="text-sm font-medium">Foto de Perfil</Label>
              <p className="text-xs text-muted-foreground mb-2">
                JPG, PNG ou GIF. Máximo 5MB.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Alterar Foto
                </Button>
                {profilePicture && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProfilePicture(null);
                      if (user && updateUser) {
                        updateUser({ ...user, profilePicture: undefined });
                      }
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remover
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePictureChange}
              />
            </div>
          </div>

          <Separator />

          {/* Botão de Editar/Salvar */}
          <div className="flex justify-end mb-4">
            {!isEditingProfile ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditName(user.name);
                  setEditCnpj(formatCnpj(user.cnpj || ''));
                  setEditRazaoSocial(user.razaoSocial || '');
                  setJustification('');
                  setIsEditingProfile(true);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar Perfil
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSaveProfileChanges}>
                  Salvar Alterações
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label>Nome</Label>
            {isEditingProfile ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1"
              />
            ) : (
              <p className="text-sm">{user.name}</p>
            )}
          </div>

          {/* Email (somente leitura) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado. Entre em contato com o administrador se necessário.
            </p>
          </div>

          {/* Empresa */}
          {user.company && (
            <div className="space-y-2">
              <Label>Empresa</Label>
              <p className="text-sm">{user.company}</p>
            </div>
          )}

          {/* CNPJ */}
          <div className="space-y-2">
            <Label>CNPJ</Label>
            {isEditingProfile ? (
              <Input
                value={editCnpj}
                onChange={(e) => setEditCnpj(formatCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                className="flex-1"
              />
            ) : (
              <p className="text-sm">{user.cnpj || 'Não informado'}</p>
            )}
          </div>

          {/* Razão Social */}
          <div className="space-y-2">
            <Label>Razão Social</Label>
            {isEditingProfile ? (
              <Input
                value={editRazaoSocial}
                onChange={(e) => setEditRazaoSocial(e.target.value)}
                placeholder="Razão social da empresa"
                className="flex-1"
              />
            ) : (
              <p className="text-sm">{user.razaoSocial || 'Não informado'}</p>
            )}
          </div>

          {/* Campo de Justificativa - aparece apenas quando há alterações */}
          {isEditingProfile && hasChanges() && (
            <div className="space-y-2">
              <Label htmlFor="justification">
                Justificativa para as alterações <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Descreva o motivo das alterações cadastrais..."
                className="min-h-[100px]"
                required
              />
              <p className="text-xs text-muted-foreground">
                É obrigatório informar uma justificativa para alterações cadastrais.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentos do cooperado (perfil) */}
      {user.role === 'cooperado' && (
        <Card className="card-pharmaceutical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Documentos do cooperado
            </CardTitle>
            <CardDescription>AE, AFE, Licença Sanitária e Corpo de Bombeiros cadastrados no seu perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profileDocsLoading ? (
              <p className="text-sm text-muted-foreground">Carregando documentos...</p>
            ) : (
              <div className="rounded-lg border divide-y">
                {PROFILE_DOCUMENT_TYPES.map((meta) => {
                  const doc = getLatestProfileDoc(meta.type);
                  const pendingReq = getLatestPendingProfileDocRequest(meta.type);
                  const status = pendingReq
                    ? { label: 'Pendente', variant: 'outline' as const, color: 'text-yellow-700' }
                    : getProfileDocStatus(doc);
                  const validityText = doc?.validIndefinitely
                    ? 'Indeterminada'
                    : doc?.validUntil
                      ? new Date(doc.validUntil).toLocaleDateString('pt-BR')
                      : '—';

                  return (
                    <button
                      key={meta.type}
                      type="button"
                      className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
                      onClick={() => openProfileDocDialog(meta.type)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{meta.label}</p>
                            <Badge
                              variant={status.variant}
                              className={pendingReq ? 'border-yellow-500 text-yellow-700' : undefined}
                            >
                              {status.label}
                            </Badge>
                          </div>
                          {meta.hint && <p className="text-xs text-muted-foreground">{meta.hint}</p>}
                          {pendingReq && (
                            <p className="text-xs text-muted-foreground">
                              Enviado em {new Date(pendingReq.createdAt).toLocaleDateString('pt-BR')} (aguardando aprovação)
                            </p>
                          )}
                          {pendingReq && meta.type === 'ae' && (
                            <p className="text-xs text-muted-foreground">
                              Enquanto a <span className="font-medium">AE</span> estiver em aprovação, você não pode negociar ativos controlados pela ANVISA (AE).
                            </p>
                          )}
                          {pendingReq && meta.type === 'policia_federal' && (
                            <p className="text-xs text-muted-foreground">
                              Enquanto a licença <span className="font-medium">PF</span> estiver em aprovação, você não pode negociar ativos controlados pela PF.
                            </p>
                          )}
                          {doc?.fileName ? (
                            <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Nenhum PDF anexado</p>
                              {meta.type === 'ae' && (
                                <p className="text-xs text-muted-foreground">
                                  Sem <span className="font-medium">AE</span> carregada e aprovada, você não pode negociar ativos controlados pela ANVISA (AE).
                                </p>
                              )}
                              {meta.type === 'policia_federal' && (
                                <p className="text-xs text-muted-foreground">
                                  Sem licença <span className="font-medium">PF</span> carregada e aprovada, você não pode negociar ativos controlados pela PF.
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={doc && status.label !== 'Vencido' ? 'border-emerald-300 text-emerald-700' : ''}
                          >
                            {validityText}
                          </Badge>
                          {doc?.fileUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
                              }}
                            >
                              Ver PDF
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openProfileDocDialog(meta.type); }}>
                            <Upload className="mr-2 h-4 w-4" />
                            {doc ? 'Substituir' : 'Anexar'}
                          </Button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Orientação de validade: se constar apenas mês/ano, use dia 01 (ex.: 01/06/2026). Se constar apenas o ano,
              use 01/01 (ex.: 01/01/2026). Se o documento tiver validade indeterminada, marque a opção “Validade
              indeterminada”.
            </p>

            <Dialog open={isProfileDocDialogOpen} onOpenChange={setIsProfileDocDialogOpen}>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>Anexar documento</DialogTitle>
                  <DialogDescription>
                    {selectedProfileDocType
                      ? PROFILE_DOCUMENT_TYPES.find((d) => d.type === selectedProfileDocType)?.label
                      : 'Selecione um tipo'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>PDF do documento</Label>
                    <Input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setSelectedProfileDocFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">Apenas PDF. Máximo 10MB.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Validade</Label>
                    <Input
                      type="date"
                      value={profileDocValidUntil}
                      onChange={(e) => setProfileDocValidUntil(e.target.value)}
                      disabled={profileDocValidIndefinitely}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="profile-doc-indef"
                      checked={profileDocValidIndefinitely}
                      onCheckedChange={(c) => setProfileDocValidIndefinitely(!!c)}
                    />
                    <Label htmlFor="profile-doc-indef" className="text-sm font-normal cursor-pointer">
                      Validade indeterminada
                    </Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsProfileDocDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleConfirmProfileDocUpload}>Confirmar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Alterar Senha */}
      <Card className="card-pharmaceutical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isChangingPassword ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Senha Atual</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleChangePassword}>Salvar</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setIsChangingPassword(false);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Senha</p>
                <p className="text-xs text-muted-foreground">
                  Altere sua senha para manter sua conta segura
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsChangingPassword(true)}
              >
                Alterar Senha
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferências de notificação por e-mail */}
      <Card className="card-pharmaceutical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações por e-mail
          </CardTitle>
          <CardDescription>
            Escolha quais alertas deseja receber por e-mail
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {prefsLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pref-flash"
                  checked={notifyEmailFlashDeals}
                  onCheckedChange={(c) => setNotifyEmailFlashDeals(!!c)}
                />
                <Label htmlFor="pref-flash" className="text-sm font-normal cursor-pointer">
                  Avisar novos Flash Deals
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pref-reservas"
                  checked={notifyEmailReservas}
                  onCheckedChange={(c) => setNotifyEmailReservas(!!c)}
                />
                <Label htmlFor="pref-reservas" className="text-sm font-normal cursor-pointer">
                  Avisar sobre Reservas Estratégicas (quando estiverem acabando)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pref-hub"
                  checked={notifyEmailHubCredit}
                  onCheckedChange={(c) => setNotifyEmailHubCredit(!!c)}
                />
                <Label htmlFor="pref-hub" className="text-sm font-normal cursor-pointer">
                  Avisar quando crédito de Hub Logístico for depositado
                </Label>
              </div>
              <Button onClick={handleSaveNotificationPrefs} disabled={prefsSaving}>
                {prefsSaving ? 'Salvando...' : 'Salvar preferências'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Solicitar Usuários Extras */}
      <Card className="card-pharmaceutical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários Extras
          </CardTitle>
          <CardDescription>
            Solicite usuários adicionais para seus sócios e funcionários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dialog open={isExtraUsersDialogOpen} onOpenChange={setIsExtraUsersDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Solicitar Usuários Extras
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Solicitar Usuários Extras</DialogTitle>
                <DialogDescription>
                  Adicione os dados dos sócios e funcionários que precisam de acesso ao sistema
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {extraUsers.map((extraUser, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-medium">Usuário {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExtraUser(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={extraUser.role}
                          onChange={(e) =>
                            handleUpdateExtraUser(
                              index,
                              'role',
                              e.target.value as 'socio' | 'funcionario'
                            )
                          }
                        >
                          <option value="socio">Sócio</option>
                          <option value="funcionario">Funcionário</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nome *</Label>
                        <Input
                          value={extraUser.name}
                          onChange={(e) =>
                            handleUpdateExtraUser(index, 'name', e.target.value)
                          }
                          placeholder="Nome completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={extraUser.email}
                          onChange={(e) =>
                            handleUpdateExtraUser(index, 'email', e.target.value)
                          }
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      {extraUser.role === 'funcionario' && (
                        <div className="space-y-2">
                          <Label>Cargo/Função</Label>
                          <Input
                            value={extraUser.position || ''}
                            onChange={(e) =>
                              handleUpdateExtraUser(index, 'position', e.target.value)
                            }
                            placeholder="Ex: Farmacêutico, Gerente, etc."
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                <Button
                  variant="outline"
                  onClick={handleAddExtraUser}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Usuário
                </Button>
                <div className="space-y-2">
                  <Label>Justificativa (Opcional)</Label>
                  <Textarea
                    value={extraUsersReason}
                    onChange={(e) => setExtraUsersReason(e.target.value)}
                    placeholder="Explique a necessidade dos usuários extras..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsExtraUsersDialogOpen(false);
                    setExtraUsers([]);
                    setExtraUsersReason('');
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSubmitExtraUsersRequest}>
                  Enviar Solicitação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </CardContent>
      </Card>

      {/* Solicitar Alteração de Dados Bancários/PIX */}
      <Card className="card-pharmaceutical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Dados para Recebimento
          </CardTitle>
          <CardDescription>
            Solicite alteração da chave PIX ou dados bancários para receber proventos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.pixKey && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Chave PIX</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-mono flex-1 break-all">{user.pixKey}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPixKey}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {user.pixBank && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Banco</Label>
                    <p className="text-sm">{user.pixBank}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <Dialog open={isBankDataDialogOpen} onOpenChange={setIsBankDataDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CreditCard className="mr-2 h-4 w-4" />
                Solicitar Alteração
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Alterar Dados para Recebimento</DialogTitle>
                <DialogDescription>
                  Informe a nova chave PIX ou os dados bancários
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nova Chave PIX</Label>
                  <Input
                    value={newPixKey}
                    onChange={(e) => setNewPixKey(e.target.value)}
                    placeholder="CPF, email, telefone ou chave aleatória"
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco se preferir usar conta bancária
                  </p>
                </div>
                {newPixKey.trim() && (
                  <div className="space-y-2">
                    <Label>Banco da Chave PIX</Label>
                    <Input
                      value={pixBank}
                      onChange={(e) => setPixBank(e.target.value)}
                      placeholder="Ex: Banco do Brasil, Itaú, Nubank, etc."
                    />
                    <p className="text-xs text-muted-foreground">
                      Informe o banco para que o pagador se sinta seguro
                    </p>
                  </div>
                )}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">OU</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome do Banco</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ex: Banco do Brasil, Itaú, etc."
                  />
                </div>
                {bankName && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de Conta</Label>
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={accountType}
                          onChange={(e) =>
                            setAccountType(e.target.value as 'corrente' | 'poupanca')
                          }
                        >
                          <option value="corrente">Conta Corrente</option>
                          <option value="poupanca">Conta Poupança</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Agência</Label>
                        <Input
                          value={agency}
                          onChange={(e) => setAgency(e.target.value)}
                          placeholder="0000"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Número da Conta</Label>
                      <Input
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        placeholder="00000-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Titular da Conta</Label>
                      <Input
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        placeholder="Nome completo do titular"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Motivo da Alteração (Opcional)</Label>
                  <Textarea
                    value={bankDataReason}
                    onChange={(e) => setBankDataReason(e.target.value)}
                    placeholder="Explique o motivo da alteração..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBankDataDialogOpen(false);
                    setNewPixKey('');
                    setPixBank('');
                    setBankName('');
                    setAgency('');
                    setAccount('');
                    setAccountHolder('');
                    setBankDataReason('');
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSubmitBankDataRequest}>
                  Enviar Solicitação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </CardContent>
      </Card>

      {/* Histórico de Solicitações - Card Separado */}
      {(extraUsersRequests.length > 0 || bankDataRequests.length > 0) && (
        <Card className="card-pharmaceutical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Histórico de Solicitações
            </CardTitle>
            <CardDescription>
              Acompanhe o status de todas as suas solicitações enviadas ao administrador
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {(() => {
              // Combinar todas as solicitações
              const allRequests = [
                ...extraUsersRequests.map((r) => ({
                  id: r.id,
                  type: 'extra_users' as const,
                  typeLabel: 'Usuários Extras',
                  title: `${r.requestedUsers.length} usuário(s) solicitado(s)`,
                  status: r.status || 'pending',
                  createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
                  reviewedAt: r.reviewedAt 
                    ? (r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt))
                    : undefined,
                  rejectionReason: r.rejectionReason,
                  data: r,
                })),
                ...bankDataRequests.map((r) => ({
                  id: r.id,
                  type: 'bank_data' as const,
                  typeLabel: getRequestType(r).join(', '),
                  title: `Alteração de ${getRequestType(r).join(', ')}`,
                  status: r.status || 'pending',
                  createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
                  reviewedAt: r.reviewedAt 
                    ? (r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt))
                    : undefined,
                  rejectionReason: r.rejectionReason,
                  data: r,
                })),
              ];

              // Separar em pendentes e finalizadas
              const pendingRequests = allRequests
                .filter(
                  (r) => r.status === 'pending' || r.status === undefined || r.status === null || r.status === ''
                )
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Mais recentes primeiro
              const completedRequests = allRequests
                .filter(
                  (r) => r.status === 'approved' || r.status === 'rejected' || r.status === 'cancelled'
                )
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Mais recentes primeiro
              const requestsToShow = showCompletedRequests
                ? [...pendingRequests, ...completedRequests]
                : pendingRequests;

              if (requestsToShow.length === 0 && !showCompletedRequests) {
                return (
                  <div className="p-8 text-center text-muted-foreground">
                    <FileSearch className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhuma solicitação pendente</p>
                  </div>
                );
              }

              return (
                <>
                  {requestsToShow.map((request) => {
                    const statusBadge = getStatusBadge(request.status);
                    
                    return (
                      <div
                        key={request.id}
                        className="flex items-start gap-4 p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border">
                          {request.type === 'extra_users' ? (
                            <Users className="h-5 w-5 text-orange-500" />
                          ) : (
                            <CreditCard className="h-5 w-5 text-purple-500" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{request.title}</p>
                                <Badge variant={statusBadge.variant}>
                                  {statusBadge.label}
                                </Badge>
                              </div>
                              <Badge variant="secondary" className="text-xs mb-2">
                                {request.typeLabel}
                              </Badge>
                              
                              {request.type === 'bank_data' && (
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  {request.data.newPixKey && (
                                    <p>
                                      <span className="text-muted-foreground">PIX: </span>
                                      <span className="font-mono">{request.data.newPixKey}</span>
                                      {request.data.pixBank && (
                                        <span className="text-muted-foreground"> ({request.data.pixBank})</span>
                                      )}
                                    </p>
                                  )}
                                  {request.data.newCnpj && (
                                    <p>
                                      <span className="text-muted-foreground">CNPJ: </span>
                                      <span>{request.data.newCnpj}</span>
                                    </p>
                                  )}
                                  {request.data.newRazaoSocial && (
                                    <p>
                                      <span className="text-muted-foreground">Razão Social: </span>
                                      <span>{request.data.newRazaoSocial}</span>
                                    </p>
                                  )}
                                  {request.data.bankName && (
                                    <p>
                                      <span className="text-muted-foreground">Banco: </span>
                                      <span>{request.data.bankName}</span>
                                      {request.data.accountType && (
                                        <span className="text-muted-foreground">
                                          {' '}- {request.data.accountType === 'corrente' ? 'Conta Corrente' : 'Conta Poupança'}
                                        </span>
                                      )}
                                      {request.data.agency && request.data.account && (
                                        <span className="text-muted-foreground">
                                          {' '}(Ag: {request.data.agency} / Conta: {request.data.account})
                                        </span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              )}
                              
                              {request.rejectionReason && (
                                <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2">
                                  <p className="text-xs font-medium text-red-700 mb-1">Motivo da Rejeição:</p>
                                  <p className="text-xs text-red-600">{request.rejectionReason}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>
                                  <Clock className="inline h-3 w-3 mr-1" />
                                  Criada: {formatDate(request.createdAt)}
                                </span>
                                {request.reviewedAt && (
                                  <span>
                                    <CheckCircle className="inline h-3 w-3 mr-1" />
                                    Analisada: {formatDate(request.reviewedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {completedRequests.length > 0 && !showCompletedRequests && (
                    <div className="p-4 border-t">
                      <Button
                        variant="ghost"
                        className="w-full justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCompletedRequests(true)}
                      >
                        <FileSearch className="mr-2 h-4 w-4" />
                        Ver solicitações aprovadas ou reprovadas ({completedRequests.length})
                      </Button>
                    </div>
                  )}
                  {showCompletedRequests && completedRequests.length > 0 && (
                    <div className="p-4 border-t">
                      <Button
                        variant="ghost"
                        className="w-full justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCompletedRequests(false)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Ocultar solicitações aprovadas ou reprovadas
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
