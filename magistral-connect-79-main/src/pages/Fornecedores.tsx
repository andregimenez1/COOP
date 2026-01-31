import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  FileText,
  Upload,
  CheckCircle2,
  Check,
  X,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { supplierService } from '@/services/supplier.service';
import { supplierQualificationService } from '@/services/supplierQualification.service';
import { settingsService, type SupplierDocValidityPolicy } from '@/services/settings.service';
import {
  Supplier,
  SupplierQualificationRequest,
  SupplierQualification,
  SupplierDocument,
  SupplierDocumentType,
  SupplierRequest,
} from '@/types';

const SUPPLIERS_STORAGE_KEY = 'magistral_suppliers';
// OBS: qualification requests/qualifications agora vêm da API (MySQL) — compartilhado entre cooperados

const REQUIRED_DOCUMENT_TYPES: { type: SupplierDocumentType; label: string; description: string }[] = [
  {
    type: 'afe',
    label: 'AFE',
    description: 'Emitida pela ANVISA',
  },
  {
    type: 'ae',
    label: 'AE',
    description: 'Obrigatória para substâncias controladas (Portaria 344/98)',
  },
  {
    type: 'licenca_sanitaria',
    label: 'Licença Sanitária Local',
    description: 'Alvará da vigilância sanitária estadual ou municipal',
  },
  {
    type: 'crt',
    label: 'CRF/CRQ',
    description: 'Certificado/regularidade do conselho profissional (CRF/CRQ)',
  },
];

const OPTIONAL_DOCUMENT_TYPES: { type: SupplierDocumentType; label: string; description: string }[] = [
  {
    type: 'questionario',
    label: 'Questionário',
    description: 'Documento opcional (formulário de avaliação)',
  },
  {
    type: 'policia_federal',
    label: 'PF',
    description: 'Documento opcional relacionado à Polícia Federal',
  },
];

const ALL_DOCUMENT_TYPES = [...REQUIRED_DOCUMENT_TYPES, ...OPTIONAL_DOCUMENT_TYPES];

export default function Fornecedores() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { addNotification, allNotifications } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  // Filtrar notificações do usuário atual com verificação de segurança
  const notifications = useMemo(() => {
    if (!user?.id || !allNotifications) return [];
    return allNotifications.filter((n) => n && n.userId === user.id);
  }, [user?.id, allNotifications]);

  // Estados
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  // Fornecedores cadastrados na base (API) — compartilhados entre todos os cooperados
  const [baseSuppliers, setBaseSuppliers] = useState<Supplier[]>([]);
  const [baseSuppliersLoading, setBaseSuppliersLoading] = useState(false);
  const [qualificationRequests, setQualificationRequests] = useState<SupplierQualificationRequest[]>([]);
  const [qualifications, setQualifications] = useState<SupplierQualification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'my-suppliers' | 'requests' | 'qualifications'>('my-suppliers');

  // Estados para dialogs
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isQualificationDialogOpen, setIsQualificationDialogOpen] = useState(false);
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SupplierQualificationRequest | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<SupplierDocumentType | null>(null);
  const [requestSupplierName, setRequestSupplierName] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<SupplierDocumentType, File | null>>({
    afe: null,
    ae: null,
    licenca_sanitaria: null,
    crt: null,
    questionario: null,
    policia_federal: null,
  });
  const [uploadedDocumentsValidUntil, setUploadedDocumentsValidUntil] = useState<Record<SupplierDocumentType, string>>({
    afe: '',
    ae: '',
    licenca_sanitaria: '',
    crt: '',
    questionario: '',
    policia_federal: '',
  });
  const [uploadedDocumentsValidIndefinitely, setUploadedDocumentsValidIndefinitely] = useState<Record<SupplierDocumentType, boolean>>({
    afe: false,
    ae: false,
    licenca_sanitaria: false,
    crt: false,
    questionario: false,
    policia_federal: false,
  });

  const [docValidityPolicies, setDocValidityPolicies] = useState<Record<string, SupplierDocValidityPolicy>>({});

  // Estados para adicionar fornecedor
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [selectedExistingSupplier, setSelectedExistingSupplier] = useState<Supplier | null>(null);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierWhatsApp, setNewSupplierWhatsApp] = useState('');

  // Abrir dialog de qualificação
  const handleOpenQualificationDialog = (request: SupplierQualificationRequest) => {
    // Se for uma solicitação virtual (de qualificação incompleta), encontrar a qualificação correspondente
    if (request.id.startsWith('virtual-')) {
      const qualificationId = request.id.replace('virtual-', '');
      const qualification = qualifications.find((q) => q.id === qualificationId);
      if (qualification) {
        // Criar solicitação real se não existir
        const existingRequest = qualificationRequests.find(
          (r) =>
            r.supplierName.toLowerCase() === qualification.supplierName.toLowerCase() &&
            r.year === qualification.year
        );
        if (existingRequest) {
          setSelectedRequest(existingRequest);
        } else {
          // Usar a solicitação virtual
          setSelectedRequest(request);
        }
      } else {
        setSelectedRequest(request);
      }
    } else {
      setSelectedRequest(request);
    }

    setUploadedDocuments({
      afe: null,
      ae: null,
      licenca_sanitaria: null,
      crt: null,
      questionario: null,
    });
    setUploadedDocumentsValidUntil({
      afe: '',
      ae: '',
      licenca_sanitaria: '',
      crt: '',
      questionario: '',
    });
    setIsQualificationDialogOpen(true);
  };

  const openSingleDocumentUpload = (request: SupplierQualificationRequest, docType: SupplierDocumentType) => {
    setSelectedRequest(request);
    setSelectedDocType(docType);

    // resetar seleções locais
    setUploadedDocuments({
      afe: null,
      ae: null,
      licenca_sanitaria: null,
      crt: null,
      questionario: null,
    });
    setUploadedDocumentsValidUntil({
      afe: '',
      ae: '',
      licenca_sanitaria: '',
      crt: '',
      questionario: '',
    });
    setUploadedDocumentsValidIndefinitely({
      afe: false,
      ae: false,
      licenca_sanitaria: false,
      crt: false,
      questionario: false,
      policia_federal: false,
    });

    // pré-preencher validade, se existir
    const existingDoc = request.documents.find((d) => d.type === docType);
    if (existingDoc?.validUntil) {
      const d = new Date(existingDoc.validUntil);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setUploadedDocumentsValidUntil((prev) => ({ ...prev, [docType]: `${yyyy}-${mm}-${dd}` }));
    }
    if (existingDoc?.validIndefinitely) {
      setUploadedDocumentsValidIndefinitely((prev) => ({ ...prev, [docType]: true }));
    }

    // Se não existe documento ainda, aplicar sugestão pela política do admin (AE/AFE/CRT)
    if (!existingDoc) {
      const policy = docValidityPolicies[docType];
      if (policy?.mode === 'indefinite') {
        setUploadedDocumentsValidIndefinitely((prev) => ({ ...prev, [docType]: true }));
      } else if (policy?.mode === 'months') {
        const months = policy.months || 12;
        const d = new Date();
        d.setMonth(d.getMonth() + months);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setUploadedDocumentsValidUntil((prev) => ({ ...prev, [docType]: `${yyyy}-${mm}-${dd}` }));
        setUploadedDocumentsValidIndefinitely((prev) => ({ ...prev, [docType]: false }));
      }
    }

    setIsQualificationDialogOpen(true);
  };

  // Verificar se há notificação para abrir dialog (quando vem de notificação)
  useEffect(() => {
    if (!user || qualificationRequests.length === 0) return;

    // Verificar se há query param ou state indicando qualificação
    const searchParams = new URLSearchParams(location.search);
    const requestId = searchParams.get('requestId') || (location.state as any)?.requestId;

    if (requestId) {
      const request = qualificationRequests.find((r) => r.id === requestId);
      if (request && (request.status === 'pending' || request.status === 'in_progress')) {
        setActiveTab('requests');
        setTimeout(() => {
          handleOpenQualificationDialog(request);
        }, 300);
        // Limpar query param
        navigate(location.pathname, { replace: true });
      }
    } else {
      // Verificar notificações não lidas do usuário atual
      if (user?.id && notifications.length > 0) {
        const unreadNotification = notifications.find(
          (n) =>
            !n.read &&
            n.type === 'supplier_request' &&
            n.relatedId &&
            qualificationRequests.some((r) => r.id === n.relatedId)
        );

        if (unreadNotification && unreadNotification.relatedId) {
          const request = qualificationRequests.find((r) => r.id === unreadNotification.relatedId);
          if (request && (request.status === 'pending' || request.status === 'in_progress')) {
            setActiveTab('requests');
            setTimeout(() => {
              handleOpenQualificationDialog(request);
            }, 300);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, qualificationRequests.length, user?.id, notifications.length]);

  // Carregar dados do localStorage (apenas dados locais legados do usuário)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const suppliersStored = localStorage.getItem(SUPPLIERS_STORAGE_KEY);
      if (suppliersStored) {
        const parsed = JSON.parse(suppliersStored);
        setSuppliers(
          parsed.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }

  }, []);

  // Carregar fornecedores da base (API) — lista global/compartilhada
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    const loadBaseSuppliers = async () => {
      try {
        setBaseSuppliersLoading(true);
        const data = await supplierService.getAll();
        if (!cancelled) setBaseSuppliers(data);
      } catch (error: any) {
        console.error('Erro ao carregar fornecedores da base:', error);
        if (!cancelled) {
          // Não bloquear a página — apenas avisar
          toast({
            title: 'Erro',
            description: error?.message || 'Não foi possível carregar fornecedores cadastrados.',
            variant: 'destructive',
          });
          setBaseSuppliers([]);
        }
      } finally {
        if (!cancelled) setBaseSuppliersLoading(false);
      }
    };

    loadBaseSuppliers();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salvar dados no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
      } catch (error) {
        console.error('Erro ao salvar fornecedores:', error);
      }
    }
  }, [suppliers]);

  // Carregar solicitações/qualificações da API (compartilhado entre cooperados)
  const refetchQualificationData = async () => {
    try {
      const [reqs, quals] = await Promise.all([
        supplierQualificationService.getRequests(currentYear),
        supplierQualificationService.getQualifications(),
      ]);
      setQualificationRequests(reqs);
      setQualifications(quals);
    } catch (error: any) {
      console.error('Erro ao carregar qualificação da API:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Não foi possível carregar solicitações/qualificações.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    refetchQualificationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    settingsService
      .getSupplierDocumentValidityPolicies()
      .then((policies) => {
        const index: Record<string, SupplierDocValidityPolicy> = {};
        policies.forEach((p) => {
          index[p.type] = p;
        });
        setDocValidityPolicies(index);
      })
      .catch(() => {
        // silencioso: se falhar, cai no comportamento manual já existente
      });
  }, []);

  // Fornecedores do usuário (localStorage) — usado para “meus” fluxos internos (ex.: atalhos/qualificação)
  const mySuppliers = user ? suppliers.filter((s) => s.userId === user.id) : [];

  // Fornecedores cadastrados na base (API) — exibidos nesta aba
  const allSuppliers = baseSuppliers;
  const filteredBaseSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allSuppliers;
    return allSuppliers.filter((s) => s.name.toLowerCase().includes(q));
  }, [allSuppliers, searchQuery]);

  // Filtrar qualificações (antes do return para evitar erro de inicialização)
  const allQualifications = qualifications.filter((q) => q.year === currentYear);
  const now = new Date();
  // Qualificações completas ainda válidas (expiração vem do documento que vence primeiro)
  const completeQualifications = qualifications.filter(
    (q) => q.status === 'complete' && new Date(q.expiresAt) >= now
  );

  // Verificar se o usuário tem permissão
  if (!user || (!hasRole(['cooperado']) && !hasRole(['master']))) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="card-pharmaceutical">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Acesso Restrito</h3>
            <p className="mt-1 text-center text-muted-foreground">
              Apenas cooperados e administradores podem acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filtrar solicitações
  const myRequests = qualificationRequests.filter((r) => r.requestedBy === user.id);
  const pendingRequests = qualificationRequests.filter(
    (r) => r.status === 'pending' || r.status === 'in_progress'
  );

  const isValidQualificationDoc = (d: { validIndefinitely?: boolean; validUntil?: Date | string }) => {
    if (d.validIndefinitely) return true;
    if (!d.validUntil) return false;
    const dt = d.validUntil instanceof Date ? d.validUntil : new Date(d.validUntil);
    return !Number.isNaN(dt.getTime()) && dt.getTime() >= now.getTime();
  };

  const shouldAppearInQualificationsTab = (r: SupplierQualificationRequest) => {
    // Regra: só aparece na aba Qualificações quando:
    // - já tem TODOS os documentos essenciais, OU
    // - já foi anexado ao menos 1 documento válido
    const requiredTypes = REQUIRED_DOCUMENT_TYPES.map((t) => t.type);
    const presentTypes = new Set(r.documents.map((d) => d.type));
    const hasAllRequired = requiredTypes.every((t) => presentTypes.has(t));
    const hasAnyValidDoc = r.documents.some((d) => isValidQualificationDoc(d));
    return hasAllRequired || hasAnyValidDoc;
  };

  // “Incompletas” (exibidas na aba Qualificações) = solicitações pendente/em progresso
  // MAS apenas se já houver progresso (docs essenciais completos OU ao menos 1 doc válido).
  const incompleteQualificationRequests = pendingRequests.filter(shouldAppearInQualificationsTab);

  // Admin: fila de avaliação (somente quando todos essenciais foram anexados e aguardando avaliação)
  const adminReviewQueue = hasRole(['master'])
    ? qualificationRequests.filter(
      (r: any) =>
        r.year === currentYear &&
        (r.status === 'pending' || r.status === 'in_progress') &&
        Boolean((r as any).awaitingAdminReview)
    )
    : [];

  // Solicitações que QUALQUER cooperado pode atender (compartilhadas):
  // todas pendentes ou em progresso no ano atual
  const requestsToQualify = pendingRequests;

  // Indexar fornecedores qualificados (ano atual) para pintar cards
  const qualifiedIndex = useMemo(() => {
    const byId = new Set<string>();
    const byName = new Set<string>();
    completeQualifications.forEach((q) => {
      if (q.supplierId) byId.add(q.supplierId);
      if (q.supplierName) byName.add(q.supplierName.toLowerCase());
    });
    return { byId, byName };
  }, [completeQualifications]);

  const lastQualificationYearIndex = useMemo(() => {
    const byId = new Map<string, number>();
    const byName = new Map<string, number>();
    qualifications
      .filter((q) => q.status === 'complete' && Number.isFinite(Number(q.year)))
      .forEach((q) => {
        const y = Number(q.year);
        if (q.supplierId) byId.set(q.supplierId, Math.max(byId.get(q.supplierId) ?? 0, y));
        if (q.supplierName) {
          const key = q.supplierName.toLowerCase();
          byName.set(key, Math.max(byName.get(key) ?? 0, y));
        }
      });
    return { byId, byName };
  }, [qualifications]);

  const getLastQualificationYear = (supplier: Supplier): number | null => {
    if (!supplier) return null;
    if (supplier.id) {
      const y = lastQualificationYearIndex.byId.get(supplier.id);
      if (typeof y === 'number' && y > 0) return y;
    }
    const y2 = lastQualificationYearIndex.byName.get(supplier.name.toLowerCase());
    return typeof y2 === 'number' && y2 > 0 ? y2 : null;
  };

  const isSupplierQualified = (supplier: Supplier): boolean => {
    if (!supplier) return false;
    if (supplier.id && qualifiedIndex.byId.has(supplier.id)) return true;
    return qualifiedIndex.byName.has(supplier.name.toLowerCase());
  };

  const getSupplierRequestStatus = (supplier: Supplier): 'pending' | 'in_progress' | null => {
    const req = qualificationRequests.find(
      (r) =>
        r.year === currentYear &&
        (r.status === 'pending' || r.status === 'in_progress') &&
        (r.supplierId === supplier.id || r.supplierName.toLowerCase() === supplier.name.toLowerCase())
    );
    if (!req) return null;
    return req.status === 'in_progress' ? 'in_progress' : 'pending';
  };

  const handleOpenRequestQualificationForSupplier = (supplierName: string) => {
    setRequestSupplierName(supplierName);
    setIsRequestDialogOpen(true);
  };

  const handleQuickRequestQualificationForSupplier = async (supplier: Supplier) => {
    try {
      await supplierQualificationService.requestQualification({
        supplierId: supplier.id,
        supplierName: supplier.name,
        year: currentYear,
      });
      await refetchQualificationData();

      toast({
        title: 'Solicitação registrada',
        description: `Qualificação solicitada para "${supplier.name}". Prossiga na aba Solicitações para anexar os documentos.`,
      });

      setActiveTab('requests');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Falha ao solicitar qualificação.',
        variant: 'destructive',
      });
    }
  };

  const handleDoQualificationForSupplier = (supplier: Supplier) => {
    if (!user) return;

    // Garantir que exista uma solicitação na base (API) e abrir o fluxo
    supplierQualificationService
      .requestQualification({ supplierId: supplier.id, supplierName: supplier.name, year: currentYear })
      .then(async (request) => {
        await refetchQualificationData();
        setActiveTab('requests');
        setTimeout(() => handleOpenQualificationDialog(request), 200);
      })
      .catch((error: any) => {
        toast({
          title: 'Erro',
          description: error?.message || 'Falha ao iniciar qualificação.',
          variant: 'destructive',
        });
      });
  };

  // Função para verificar se já existe solicitação do mesmo usuário
  const checkExistingRequest = (supplierName: string): boolean => {
    return myRequests.some(
      (r) =>
        r.supplierName.toLowerCase() === supplierName.toLowerCase() &&
        r.year === currentYear &&
        (r.status === 'pending' || r.status === 'in_progress')
    );
  };

  // Função para contar usuários aguardando
  const getPendingUsersCount = (supplierName: string): number => {
    const requests = qualificationRequests.filter(
      (r) =>
        r.supplierName.toLowerCase() === supplierName.toLowerCase() &&
        r.year === currentYear &&
        (r.status === 'pending' || r.status === 'in_progress')
    );
    return requests.length;
  };

  // Solicitar qualificação
  const handleRequestQualification = () => {
    if (!requestSupplierName.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o nome do fornecedor.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se já existe solicitação do mesmo usuário
    if (checkExistingRequest(requestSupplierName.trim())) {
      toast({
        title: 'Solicitação já existe',
        description: 'Você já solicitou a qualificação deste fornecedor para este ano.',
        variant: 'destructive',
      });
      return;
    }

    const supplierName = requestSupplierName.trim();
    const supplier = baseSuppliers.find((s) => s.name.toLowerCase() === supplierName.toLowerCase());
    if (!supplier) {
      toast({
        title: 'Fornecedor não encontrado',
        description: 'Selecione um fornecedor cadastrado na base para solicitar qualificação.',
        variant: 'destructive',
      });
      return;
    }

    supplierQualificationService
      .requestQualification({ supplierId: supplier.id, supplierName: supplier.name, year: currentYear })
      .then(async () => {
        await refetchQualificationData();
        toast({
          title: 'Solicitação criada',
          description: 'A solicitação de qualificação foi registrada e ficará visível para todos os cooperados.',
        });
      })
      .catch((error: any) => {
        toast({
          title: 'Erro',
          description: error?.message || 'Falha ao solicitar qualificação.',
          variant: 'destructive',
        });
      });

    setRequestSupplierName('');
    setIsRequestDialogOpen(false);
  };

  // Upload de documento
  const handleDocumentUpload = (type: SupplierDocumentType, file: File | null) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Formato inválido',
        description: 'Apenas arquivos PDF são aceitos.',
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

    setUploadedDocuments((prev) => ({
      ...prev,
      [type]: file,
    }));

    // Se já houver validade no documento existente, pré-preencher ao substituir
    const existingDoc = selectedRequest?.documents.find((d) => d.type === type);
    if (existingDoc?.validUntil) {
      const yyyy = new Date(existingDoc.validUntil).getFullYear();
      const mm = String(new Date(existingDoc.validUntil).getMonth() + 1).padStart(2, '0');
      const dd = String(new Date(existingDoc.validUntil).getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      setUploadedDocumentsValidUntil((prev) => ({ ...prev, [type]: dateStr }));
    }

    toast({
      title: 'Documento selecionado',
      description: `${file.name} foi selecionado.`,
    });
  };

  // Salvar progresso da qualificação
  const handleSaveQualificationProgress = async () => {
    if (!selectedRequest || !user) return;

    // Converter arquivos para base64 e enviar para API
    const fileEntries = Object.entries(uploadedDocuments).filter(([_, file]) => file !== null);

    if (fileEntries.length === 0) {
      toast({
        title: 'Nenhum documento selecionado',
        description: 'Selecione pelo menos um documento para salvar.',
        variant: 'destructive',
      });
      return;
    }

    // Exigir validade para cada PDF enviado
    for (const [type, file] of fileEntries) {
      if (!file) continue;
      const validUntil = uploadedDocumentsValidUntil[type as SupplierDocumentType];
      if (!validUntil) {
        toast({
          title: 'Informe a validade',
          description: `Defina a validade do documento (${type}) antes de salvar.`,
          variant: 'destructive',
        });
        return;
      }
    }

    const filePromises = fileEntries.map(
      ([type, file]) =>
        new Promise<{ type: SupplierDocumentType; fileName: string; fileUrl: string; validUntil: string }>((resolve) => {
          if (!file) return;
          const validUntil = uploadedDocumentsValidUntil[type as SupplierDocumentType];
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              type: type as SupplierDocumentType,
              fileName: file.name,
              fileUrl: reader.result as string,
              validUntil,
            });
          };
          reader.readAsDataURL(file);
        })
    );

    const docsPayload = await Promise.all(filePromises);

    try {
      await supplierQualificationService.saveProgress({
        requestId: selectedRequest.id,
        documents: docsPayload,
      });
      await refetchQualificationData();

      toast({
        title: 'Progresso salvo',
        description: 'Os documentos foram anexados. Se completar todos, a qualificação será concluída automaticamente.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Falha ao salvar progresso.',
        variant: 'destructive',
      });
      return;
    }

    setIsQualificationDialogOpen(false);
    setSelectedRequest(null);
    setUploadedDocuments({
      afe: null,
      ae: null,
      licenca_sanitaria: null,
      crt: null,
      questionario: null,
    });
    setUploadedDocumentsValidUntil({
      afe: '',
      ae: '',
      licenca_sanitaria: '',
      crt: '',
      questionario: '',
    });
  };

  const handleConfirmSingleDocumentUpload = async () => {
    if (!selectedRequest || !selectedDocType || !user) return;

    const file = uploadedDocuments[selectedDocType];
    const validUntil = uploadedDocumentsValidUntil[selectedDocType];
    const validIndefinitely = uploadedDocumentsValidIndefinitely[selectedDocType];

    if (!file) {
      toast({
        title: 'Selecione o PDF',
        description: 'Escolha o arquivo PDF do documento antes de confirmar.',
        variant: 'destructive',
      });
      return;
    }

    if (!validUntil && !validIndefinitely) {
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

      await supplierQualificationService.saveProgress({
        requestId: selectedRequest.id,
        documents: [
          {
            type: selectedDocType,
            fileName: file.name,
            fileUrl,
            validUntil: validIndefinitely ? undefined : validUntil,
            validIndefinitely,
          },
        ],
      });

      await refetchQualificationData();

      toast({
        title: 'Documento anexado',
        description: 'Documento e validade salvos com sucesso.',
      });

      setIsQualificationDialogOpen(false);
      setSelectedRequest(null);
      setSelectedDocType(null);
      setUploadedDocuments({
        afe: null,
        ae: null,
        licenca_sanitaria: null,
        crt: null,
        questionario: null,
      });
      setUploadedDocumentsValidUntil({
        afe: '',
        ae: '',
        licenca_sanitaria: '',
        crt: '',
        questionario: '',
      });
      setUploadedDocumentsValidIndefinitely({
        afe: false,
        ae: false,
        licenca_sanitaria: false,
        crt: false,
        questionario: false,
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Falha ao anexar documento.',
        variant: 'destructive',
      });
    }
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

  const renderDocsDivider = (label: string) => (
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t-2 border-dashed border-muted-foreground/40" />
      </div>
      <div className="relative flex justify-center text-[10px] uppercase tracking-wide">
        <span className="bg-background px-2 text-muted-foreground">{label}</span>
      </div>
    </div>
  );

  const selectedDocTypeMeta = selectedDocType ? ALL_DOCUMENT_TYPES.find((d) => d.type === selectedDocType) : null;
  const selectedExistingDoc =
    selectedRequest && selectedDocType ? selectedRequest.documents.find((d) => d.type === selectedDocType) : undefined;
  const selectedUploadedFile = selectedDocType ? uploadedDocuments[selectedDocType] : null;
  const selectedValidUntilLocal = selectedDocType ? uploadedDocumentsValidUntil[selectedDocType] : '';
  const selectedValidIndefinitely = selectedDocType ? uploadedDocumentsValidIndefinitely[selectedDocType] : false;
  const selectedPolicy = selectedDocType ? docValidityPolicies[selectedDocType] : undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
          <p className="text-muted-foreground">
            Gerencie fornecedores e solicite qualificações
          </p>
        </div>
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Solicitar Qualificação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Qualificação de Fornecedor</DialogTitle>
              <DialogDescription>
                Solicite a qualificação de um fornecedor. Todos os cooperados serão notificados e poderão anexar os documentos necessários.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-name">Nome do Fornecedor *</Label>
                <Input
                  id="supplier-name"
                  placeholder="Ex: Galena, Fagron, etc."
                  value={requestSupplierName}
                  onChange={(e) => setRequestSupplierName(e.target.value)}
                />
              </div>
              {requestSupplierName.trim() && (
                <div className="rounded-lg bg-muted/50 p-3">
                  {checkExistingRequest(requestSupplierName.trim()) ? (
                    <div className="flex items-start gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <div>
                        <p className="font-medium">Você já solicitou esta qualificação</p>
                        <p className="text-sm">Você já possui uma solicitação pendente para este fornecedor no ano {currentYear}.</p>
                      </div>
                    </div>
                  ) : getPendingUsersCount(requestSupplierName.trim()) > 0 ? (
                    <div className="flex items-start gap-2 text-primary">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <div>
                        <p className="font-medium">
                          {getPendingUsersCount(requestSupplierName.trim())} usuário(s) aguardando
                        </p>
                        <p className="text-sm">
                          Outros cooperados já solicitaram esta qualificação. Você será adicionado à lista de aguardando.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsRequestDialogOpen(false);
                  setRequestSupplierName('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRequestQualification}
                className="gradient-primary text-primary-foreground"
                disabled={checkExistingRequest(requestSupplierName.trim())}
              >
                Solicitar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar fornecedores, solicitações ou qualificações..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="my-suppliers">
            <Building2 className="mr-2 h-4 w-4" />
            Fornecedores cadastrados ({baseSuppliers.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            <Clock className="mr-2 h-4 w-4" />
            Solicitações ({requestsToQualify.length})
          </TabsTrigger>
          <TabsTrigger value="qualifications">
            <FileText className="mr-2 h-4 w-4" />
            Qualificações (
            {completeQualifications.length} completas, {incompleteQualificationRequests.length} incompletas
            {hasRole(['master']) && adminReviewQueue.length > 0 ? `, ${adminReviewQueue.length} aguardando avaliação` : ''}
            )
          </TabsTrigger>
        </TabsList>

        {/* Fornecedores cadastrados */}
        <TabsContent value="my-suppliers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Fornecedores cadastrados</h2>
              <p className="text-sm text-muted-foreground">
                Fornecedores cadastrados na cooperativa. Para aparecer “normal”, o fornecedor precisa estar qualificado no ano {currentYear}.
              </p>
            </div>
            <Dialog open={isAddSupplierDialogOpen} onOpenChange={setIsAddSupplierDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Fornecedor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Fornecedor</DialogTitle>
                  <DialogDescription>
                    Busque um fornecedor existente na base de dados ou cadastre um novo fornecedor
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Buscar Fornecedor Existente</Label>
                    <Input
                      placeholder="Digite o nome do fornecedor..."
                      value={supplierSearchQuery}
                      onChange={(e) => {
                        setSupplierSearchQuery(e.target.value);
                        setSelectedExistingSupplier(null);
                        setNewSupplierName('');
                        setNewSupplierWhatsApp('');
                      }}
                    />
                    {supplierSearchQuery && (
                      <div className="max-h-48 overflow-y-auto rounded-lg border bg-background mt-2">
                        {allSuppliers
                          .filter((s) =>
                            s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase())
                          )
                          .slice(0, 10)
                          .map((supplier) => (
                            <button
                              key={supplier.id}
                              type="button"
                              onClick={() => {
                                setSelectedExistingSupplier(supplier);
                                setSupplierSearchQuery(supplier.name);
                                setNewSupplierName('');
                                setNewSupplierWhatsApp('');
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors"
                            >
                              <p className="font-medium">{supplier.name}</p>
                              {supplier.contact && (
                                <p className="text-xs text-muted-foreground">{supplier.contact}</p>
                              )}
                            </button>
                          ))}
                        {allSuppliers.filter((s) =>
                          s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase())
                        ).length === 0 && (
                            <div className="px-4 py-2 text-sm text-muted-foreground">
                              Nenhum fornecedor encontrado. Preencha os dados abaixo para cadastrar um novo.
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {selectedExistingSupplier ? (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{selectedExistingSupplier.name}</p>
                          {selectedExistingSupplier.contact && (
                            <p className="text-xs text-muted-foreground">
                              Contato: {selectedExistingSupplier.contact}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedExistingSupplier(null);
                            setSupplierSearchQuery('');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="new-supplier-name">Nome do Fornecedor *</Label>
                        <Input
                          id="new-supplier-name"
                          placeholder="Ex: Galena, Fagron, etc."
                          value={newSupplierName}
                          onChange={(e) => setNewSupplierName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-supplier-whatsapp">Contato WhatsApp</Label>
                        <Input
                          id="new-supplier-whatsapp"
                          placeholder="Ex: (11) 99999-9999"
                          value={newSupplierWhatsApp}
                          onChange={(e) => setNewSupplierWhatsApp(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          WhatsApp para solicitar documentos atualizados durante a qualificação
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddSupplierDialogOpen(false);
                      setSupplierSearchQuery('');
                      setSelectedExistingSupplier(null);
                      setNewSupplierName('');
                      setNewSupplierWhatsApp('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      if (selectedExistingSupplier) {
                        // Adicionar fornecedor existente aos meus fornecedores
                        // Verificar se já existe um fornecedor com o mesmo nome para este usuário
                        if (!mySuppliers.some((s) => s.name.toLowerCase() === selectedExistingSupplier.name.toLowerCase())) {
                          const newSupplier: Supplier = {
                            id: `supplier-${Date.now()}`,
                            userId: user.id,
                            name: selectedExistingSupplier.name,
                            contact: selectedExistingSupplier.contact,
                            whatsapp: selectedExistingSupplier.whatsapp,
                            notes: selectedExistingSupplier.notes,
                            createdAt: new Date(),
                          };
                          setSuppliers((prev) => [...prev, newSupplier]);

                          // Criar solicitação de qualificação se não existir
                          const existingRequest = qualificationRequests.find(
                            (r) =>
                              r.supplierName.toLowerCase() === selectedExistingSupplier.name.toLowerCase() &&
                              r.year === currentYear &&
                              (r.status === 'pending' || r.status === 'in_progress')
                          );

                          if (!existingRequest) {
                            const newRequest: SupplierQualificationRequest = {
                              id: `qual-request-${Date.now()}`,
                              supplierId: newSupplier.id,
                              supplierName: newSupplier.name,
                              requestedBy: user.id,
                              requestedByName: user.name,
                              status: 'pending',
                              requestedAt: new Date(),
                              year: currentYear,
                              documents: [],
                              pendingUsers: [user.id],
                            };
                            setQualificationRequests((prev) => [...prev, newRequest]);
                          }

                          toast({
                            title: 'Fornecedor adicionado',
                            description: `${selectedExistingSupplier.name} foi adicionado aos seus fornecedores e uma solicitação de qualificação foi criada.`,
                          });
                        } else {
                          toast({
                            title: 'Fornecedor já existe',
                            description: 'Este fornecedor já está na sua lista.',
                            variant: 'destructive',
                          });
                        }
                      } else if (newSupplierName.trim()) {
                        // Criar novo fornecedor
                        const newSupplier: Supplier = {
                          id: `supplier-${Date.now()}`,
                          userId: user.id,
                          name: newSupplierName.trim(),
                          whatsapp: newSupplierWhatsApp.trim() || undefined,
                          createdAt: new Date(),
                        };
                        setSuppliers((prev) => [...prev, newSupplier]);

                        // Criar solicitação de cadastro de fornecedor para o admin via API
                        try {
                          const newSupplierRequest = await supplierService.createRequest(newSupplierName.trim());

                          toast({
                            title: 'Solicitação enviada',
                            description: 'Sua solicitação de cadastro de fornecedor foi enviada para o administrador.',
                          });
                        } catch (error: any) {
                          console.error('❌ [Fornecedores] Erro ao criar solicitação de fornecedor:', error);
                          toast({
                            title: 'Erro',
                            description: error?.message || 'Não foi possível enviar a solicitação. Tente novamente.',
                            variant: 'destructive',
                          });
                        }

                        // Criar solicitação de qualificação automaticamente
                        const newRequest: SupplierQualificationRequest = {
                          id: `qual-request-${Date.now()}`,
                          supplierId: newSupplier.id,
                          supplierName: newSupplier.name,
                          requestedBy: user.id,
                          requestedByName: user.name,
                          status: 'pending',
                          requestedAt: new Date(),
                          year: currentYear,
                          documents: [],
                          pendingUsers: [user.id],
                        };
                        setQualificationRequests((prev) => [...prev, newRequest]);

                        toast({
                          title: 'Fornecedor cadastrado',
                          description: `${newSupplier.name} foi cadastrado. Uma solicitação de cadastro foi enviada ao administrador e uma solicitação de qualificação foi criada.`,
                        });
                      } else {
                        toast({
                          title: 'Erro',
                          description: 'Selecione um fornecedor existente ou preencha o nome do novo fornecedor.',
                          variant: 'destructive',
                        });
                        return;
                      }

                      setIsAddSupplierDialogOpen(false);
                      setSupplierSearchQuery('');
                      setSelectedExistingSupplier(null);
                      setNewSupplierName('');
                      setNewSupplierWhatsApp('');
                    }}
                    className="gradient-primary text-primary-foreground"
                  >
                    {selectedExistingSupplier ? 'Adicionar' : 'Cadastrar e Solicitar Qualificação'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {baseSuppliersLoading ? (
            <Card className="card-pharmaceutical">
              <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <span className="ml-3">Carregando fornecedores...</span>
              </CardContent>
            </Card>
          ) : baseSuppliers.length === 0 ? (
            <Card className="card-pharmaceutical">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 opacity-50" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">Nenhum fornecedor cadastrado</h3>
                <p className="mt-1 text-center">
                  Cadastre um fornecedor para usar em laudos, cotações e solicitações.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredBaseSuppliers.map((supplier) => {
                const qualified = isSupplierQualified(supplier);
                const reqStatus = getSupplierRequestStatus(supplier);
                const lastYear = getLastQualificationYear(supplier);
                return (
                  <Card key={supplier.id} className="card-pharmaceutical flex flex-col overflow-hidden h-full">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <div
                        className={`flex items-start justify-between gap-2 ${!qualified ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base leading-tight truncate">{supplier.name}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              Cadastrado em {formatDate(supplier.createdAt)}
                            </CardDescription>
                          </div>
                        </div>
                        {qualified ? (
                          <Badge variant="outline" className="text-xs flex-shrink-0 border-green-500 text-green-600">
                            Qualificado
                          </Badge>
                        ) : reqStatus === 'in_progress' ? (
                          <Badge variant="outline" className="text-xs flex-shrink-0 border-blue-500 text-blue-700">
                            Em progresso
                          </Badge>
                        ) : reqStatus === 'pending' ? (
                          <Badge variant="outline" className="text-xs flex-shrink-0 border-yellow-500 text-yellow-700">
                            Pendente
                          </Badge>
                        ) : (
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge variant="outline" className="text-xs">
                              Sem qualificação
                            </Badge>
                            <span className="text-[11px] text-muted-foreground/70 italic">
                              Última qualificação: {lastYear ?? '—'}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="text-sm flex-1 flex flex-col min-h-0 pb-4">
                      {/* Conteúdo “desabilitado” quando não qualificado */}
                      <div className={`flex-1 space-y-2 ${!qualified ? 'opacity-60 pointer-events-none' : ''}`}>
                        {supplier.contact && (
                          <div className="text-muted-foreground">
                            <span className="font-medium">Contato:</span> {supplier.contact}
                          </div>
                        )}
                        {supplier.whatsapp && (
                          <div className="text-muted-foreground">
                            <span className="font-medium">WhatsApp:</span> {supplier.whatsapp}
                          </div>
                        )}
                        {supplier.notes && (
                          <div className="text-muted-foreground">
                            <span className="font-medium">Notas:</span> {supplier.notes}
                          </div>
                        )}
                        {!supplier.contact && !supplier.whatsapp && !supplier.notes && (
                          <div className="text-muted-foreground">
                            Nenhuma informação adicional cadastrada.
                          </div>
                        )}
                      </div>
                      {/* Ações sempre clicáveis, mas “vivas” principalmente quando não qualificado */}
                      {!qualified && (
                        <div className="flex flex-col gap-2 pt-4 border-t bg-primary/5 -mx-6 px-6 pb-4 mt-auto flex-shrink-0 opacity-100 pointer-events-auto">
                          {/*
                           * Se já existe solicitação de qualificação (pendente/em progresso) para este fornecedor/ano,
                           * o botão deve ficar desabilitado e informar "Qualificação em andamento".
                           */}
                          <Button
                            onClick={() => handleQuickRequestQualificationForSupplier(supplier)}
                            className="w-full"
                            variant="default"
                            disabled={reqStatus === 'pending' || reqStatus === 'in_progress'}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            {reqStatus === 'pending' || reqStatus === 'in_progress'
                              ? 'Qualificação em andamento'
                              : 'Solicitar qualificação'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Solicitações para Qualificar */}
        <TabsContent value="requests" className="space-y-4">
          {requestsToQualify.length === 0 ? (
            <Card className="card-pharmaceutical">
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhuma solicitação pendente</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {requestsToQualify
                .filter((r) =>
                  searchQuery
                    ? r.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
                    : true
                )
                .map((request) => {
                  const uploadedDocTypes = request.documents.map((d) => d.type);
                  const uploadedRequiredCount = REQUIRED_DOCUMENT_TYPES.filter((t) =>
                    uploadedDocTypes.includes(t.type)
                  ).length;

                  return (
                    <Card key={request.id} className="card-pharmaceutical flex flex-col overflow-hidden h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">{request.supplierName}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              Solicitado por {request.requestedByName}
                              {request.pendingUsers.length ? ` • ${request.pendingUsers.length} aguardando` : ''}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-xs ${request.status === 'in_progress'
                                  ? 'border-blue-500 text-blue-700'
                                  : request.status === 'pending'
                                    ? 'border-yellow-500 text-yellow-700'
                                    : ''
                                }`}
                            >
                              {request.status === 'completed'
                                ? 'Completa'
                                : request.status === 'in_progress'
                                  ? 'Em progresso'
                                  : 'Pendente'}
                            </Badge>
                            <Badge variant="outline" className="text-[11px] text-muted-foreground/80">
                              {uploadedRequiredCount}/{REQUIRED_DOCUMENT_TYPES.length}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm flex-1 flex flex-col min-h-0 pb-8 pt-0">
                        <div className="flex-1 space-y-1">
                          {/* Essenciais */}
                          {REQUIRED_DOCUMENT_TYPES.map((docType) => {
                            const document = request.documents.find((d) => d.type === docType.type);
                            const isUploaded = Boolean(document);
                            const validUntil = document?.validUntil ? new Date(document.validUntil) : null;

                            return (
                              <button
                                key={docType.type}
                                type="button"
                                onClick={() => openSingleDocumentUpload(request, docType.type)}
                                className={`w-full text-left flex items-center justify-between gap-3 rounded border px-2 py-1.5 transition-colors ${isUploaded
                                    ? 'border-green-700/30 bg-green-50 hover:bg-green-50/70'
                                    : 'bg-muted/20 hover:bg-muted/40'
                                  }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isUploaded ? (
                                    <div className="flex h-4 w-4 items-center justify-center rounded-full border border-green-800 text-green-800">
                                      <Check className="h-2.5 w-2.5" />
                                    </div>
                                  ) : (
                                    <div className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/40 text-muted-foreground/70">
                                      <X className="h-2.5 w-2.5" />
                                    </div>
                                  )}
                                  <p className={`text-xs font-medium truncate ${isUploaded ? 'text-green-900' : ''}`}>
                                    {docType.label}
                                  </p>
                                </div>

                                {validUntil ? (
                                  <Badge variant="outline" className="text-[11px] border-green-800 text-green-800 flex-shrink-0">
                                    {validUntil.toLocaleDateString('pt-BR')}
                                  </Badge>
                                ) : document?.validIndefinitely ? (
                                  <Badge variant="outline" className="text-[11px] border-green-800 text-green-800 flex-shrink-0">
                                    Indeterminada
                                  </Badge>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/60 flex-shrink-0">—</span>
                                )}
                              </button>
                            );
                          })}

                          {/* Separador (opcionais) */}
                          {renderDocsDivider('Documentos opcionais')}

                          {/* Opcionais */}
                          {OPTIONAL_DOCUMENT_TYPES.map((docType) => {
                            const document = request.documents.find((d) => d.type === docType.type);
                            const isUploaded = Boolean(document);
                            const validUntil = document?.validUntil ? new Date(document.validUntil) : null;

                            return (
                              <button
                                key={docType.type}
                                type="button"
                                onClick={() => openSingleDocumentUpload(request, docType.type)}
                                className={`w-full text-left flex items-center justify-between gap-3 rounded border px-2 py-1.5 transition-colors ${isUploaded
                                    ? 'border-green-700/30 bg-green-50 hover:bg-green-50/70'
                                    : 'bg-muted/20 hover:bg-muted/40'
                                  }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isUploaded ? (
                                    <div className="flex h-4 w-4 items-center justify-center rounded-full border border-green-800 text-green-800">
                                      <Check className="h-2.5 w-2.5" />
                                    </div>
                                  ) : (
                                    <div className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/40 text-muted-foreground/70">
                                      <X className="h-2.5 w-2.5" />
                                    </div>
                                  )}
                                  <p className={`text-xs font-medium truncate ${isUploaded ? 'text-green-900' : ''}`}>
                                    {docType.label}
                                  </p>
                                </div>

                                {validUntil ? (
                                  <Badge variant="outline" className="text-[11px] border-green-800 text-green-800 flex-shrink-0">
                                    {validUntil.toLocaleDateString('pt-BR')}
                                  </Badge>
                                ) : document?.validIndefinitely ? (
                                  <Badge variant="outline" className="text-[11px] border-green-800 text-green-800 flex-shrink-0">
                                    Indeterminada
                                  </Badge>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/60 flex-shrink-0">—</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* Qualificações */}
        <TabsContent value="qualifications" className="space-y-4">
          {/* Admin: aguardando avaliação */}
          {hasRole(['master']) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Aguardando avaliação ({adminReviewQueue.length})
              </h3>
              {adminReviewQueue.length === 0 ? (
                <Card className="card-pharmaceutical">
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Nenhum fornecedor aguardando avaliação</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {adminReviewQueue
                    .filter((r) =>
                      searchQuery ? r.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) : true
                    )
                    .map((request) => {
                      const requiredTypes = REQUIRED_DOCUMENT_TYPES.map((t) => t.type);
                      const docsByType = new Map(request.documents.map((d) => [d.type, d]));
                      const allReviewedApproved = requiredTypes.every((t) => {
                        const d = docsByType.get(t);
                        return d && d.reviewStatus === 'approved';
                      });

                      return (
                        <Card key={request.id} className="card-pharmaceutical flex flex-col overflow-hidden h-full">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <CardTitle className="text-base truncate">{request.supplierName}</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  Ano {request.year} • solicitado por {request.requestedByName}
                                </CardDescription>
                              </div>
                              <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 flex-shrink-0">
                                Aguardando avaliação
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="text-sm flex-1 flex flex-col">
                            <div className="space-y-2 flex-1">
                              {REQUIRED_DOCUMENT_TYPES.map((docType) => {
                                const document = request.documents.find((d) => d.type === docType.type);
                                const status = document?.reviewStatus || 'pending';
                                return (
                                  <div
                                    key={docType.type}
                                    className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium">{docType.label}</p>
                                      {document?.fileName && (
                                        <p className="text-xs text-muted-foreground truncate">{document.fileName}</p>
                                      )}
                                      {status === 'rejected' && document?.rejectionReason && (
                                        <p className="text-xs text-destructive mt-1">Motivo: {document.rejectionReason}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {document?.fileUrl && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => window.open(document.fileUrl, '_blank', 'noopener,noreferrer')}
                                        >
                                          Ver PDF
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                          if (!document) return;
                                          try {
                                            await supplierQualificationService.reviewQualificationDocument({
                                              requestId: request.id,
                                              documentId: document.id,
                                              status: 'approved',
                                            });
                                            await refetchQualificationData();
                                            toast({ title: 'Documento aprovado', description: `${docType.label} aprovado.` });
                                          } catch (e: any) {
                                            toast({ title: 'Erro', description: e?.message || 'Falha ao aprovar.', variant: 'destructive' });
                                          }
                                        }}
                                        disabled={!document}
                                      >
                                        Aprovar
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={async () => {
                                          if (!document) return;
                                          const reason = prompt('Motivo da reprovação do documento:') || '';
                                          if (!reason.trim()) return;
                                          try {
                                            await supplierQualificationService.reviewQualificationDocument({
                                              requestId: request.id,
                                              documentId: document.id,
                                              status: 'rejected',
                                              rejectionReason: reason.trim(),
                                            });
                                            await refetchQualificationData();
                                            toast({ title: 'Documento reprovado', description: `${docType.label} reprovado.` });
                                          } catch (e: any) {
                                            toast({ title: 'Erro', description: e?.message || 'Falha ao reprovar.', variant: 'destructive' });
                                          }
                                        }}
                                        disabled={!document}
                                      >
                                        Reprovar
                                      </Button>
                                      <Badge
                                        variant="outline"
                                        className={`text-[11px] ${status === 'approved'
                                            ? 'border-green-700 text-green-700'
                                            : status === 'rejected'
                                              ? 'border-red-600 text-red-600'
                                              : 'border-yellow-600 text-yellow-700'
                                          }`}
                                      >
                                        {status === 'approved' ? 'Aprovado' : status === 'rejected' ? 'Reprovado' : 'Pendente'}
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })}

                              {renderDocsDivider('Documentos opcionais (não bloqueiam)')}

                              {OPTIONAL_DOCUMENT_TYPES.map((docType) => {
                                const document = request.documents.find((d) => d.type === docType.type);
                                const status = document?.reviewStatus || 'pending';
                                return (
                                  <div
                                    key={docType.type}
                                    className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium">{docType.label}</p>
                                      {document?.fileName && (
                                        <p className="text-xs text-muted-foreground truncate">{document.fileName}</p>
                                      )}
                                      {status === 'rejected' && document?.rejectionReason && (
                                        <p className="text-xs text-destructive mt-1">Motivo: {document.rejectionReason}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {document?.fileUrl && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => window.open(document.fileUrl, '_blank', 'noopener,noreferrer')}
                                        >
                                          Ver PDF
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                          if (!document) return;
                                          try {
                                            await supplierQualificationService.reviewQualificationDocument({
                                              requestId: request.id,
                                              documentId: document.id,
                                              status: 'approved',
                                            });
                                            await refetchQualificationData();
                                            toast({ title: 'Documento aprovado', description: `${docType.label} aprovado.` });
                                          } catch (e: any) {
                                            toast({ title: 'Erro', description: e?.message || 'Falha ao aprovar.', variant: 'destructive' });
                                          }
                                        }}
                                        disabled={!document}
                                      >
                                        Aprovar
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={async () => {
                                          if (!document) return;
                                          const reason = prompt('Motivo da reprovação do documento:') || '';
                                          if (!reason.trim()) return;
                                          try {
                                            await supplierQualificationService.reviewQualificationDocument({
                                              requestId: request.id,
                                              documentId: document.id,
                                              status: 'rejected',
                                              rejectionReason: reason.trim(),
                                            });
                                            await refetchQualificationData();
                                            toast({ title: 'Documento reprovado', description: `${docType.label} reprovado.` });
                                          } catch (e: any) {
                                            toast({ title: 'Erro', description: e?.message || 'Falha ao reprovar.', variant: 'destructive' });
                                          }
                                        }}
                                        disabled={!document}
                                      >
                                        Reprovar
                                      </Button>
                                      <Badge
                                        variant="outline"
                                        className={`text-[11px] ${status === 'approved'
                                            ? 'border-green-700 text-green-700'
                                            : status === 'rejected'
                                              ? 'border-red-600 text-red-600'
                                              : 'border-yellow-600 text-yellow-700'
                                          }`}
                                      >
                                        {status === 'approved' ? 'Aprovado' : status === 'rejected' ? 'Reprovado' : 'Pendente'}
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="pt-3">
                              <Button
                                className="w-full"
                                onClick={async () => {
                                  try {
                                    await supplierQualificationService.approveQualificationRequest(request.id);
                                    await refetchQualificationData();
                                    toast({
                                      title: 'Fornecedor qualificado',
                                      description: 'A qualificação foi aprovada e o fornecedor agora aparece como Qualificado.',
                                    });
                                  } catch (e: any) {
                                    toast({ title: 'Erro', description: e?.message || 'Falha ao qualificar.', variant: 'destructive' });
                                  }
                                }}
                                disabled={!allReviewedApproved}
                              >
                                Confirmar qualificação
                              </Button>
                              {!allReviewedApproved && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Para confirmar, aprove todos os documentos essenciais.
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Completos */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Completos ({completeQualifications.length})
            </h3>
            {completeQualifications.length === 0 ? (
              <Card className="card-pharmaceutical">
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhuma qualificação completa</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completeQualifications
                  .filter((q) =>
                    searchQuery ? q.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) : true
                  )
                  .map((qualification) => (
                    <Card key={qualification.id} className="card-pharmaceutical flex flex-col overflow-hidden h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">{qualification.supplierName}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              Qualificado por {qualification.qualifiedByName} em {formatDate(qualification.completedAt)}
                            </CardDescription>
                          </div>
                          <Badge variant="default" className="text-xs flex-shrink-0">
                            Válida até {formatDate(qualification.expiresAt)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm flex-1">
                        <div className="space-y-2">
                          {/* Essenciais */}
                          {REQUIRED_DOCUMENT_TYPES.map((docType) => {
                            const document = qualification.documents?.find((d) => d.type === docType.type);
                            const validUntil = document?.validUntil ? new Date(document.validUntil) : null;
                            return (
                              <div
                                key={docType.type}
                                className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                  <p className="text-sm font-medium">{docType.label}</p>
                                </div>
                                {validUntil ? (
                                  <Badge variant="outline" className="text-[11px] border-green-700 text-green-800 flex-shrink-0">
                                    {validUntil.toLocaleDateString('pt-BR')}
                                  </Badge>
                                ) : document?.validIndefinitely ? (
                                  <Badge variant="outline" className="text-[11px] border-green-700 text-green-800 flex-shrink-0">
                                    Indeterminada
                                  </Badge>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/60 flex-shrink-0">—</span>
                                )}
                              </div>
                            );
                          })}

                          {renderDocsDivider('Documentos opcionais')}

                          {/* Opcionais */}
                          {(() => {
                            const anyOptional = OPTIONAL_DOCUMENT_TYPES.some((t) =>
                              qualification.documents?.some((d) => d.type === t.type)
                            );
                            if (!anyOptional) {
                              return <div className="text-xs text-muted-foreground">Nenhum documento opcional anexado.</div>;
                            }
                            return (
                              <div className="space-y-2">
                                {OPTIONAL_DOCUMENT_TYPES.map((docType) => {
                                  const document = qualification.documents?.find((d) => d.type === docType.type);
                                  if (!document) return null;
                                  const validUntil = document?.validUntil ? new Date(document.validUntil) : null;
                                  return (
                                    <div key={docType.type} className="flex items-center justify-between gap-3 py-1.5">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="flex h-4 w-4 items-center justify-center rounded-full border border-green-800 text-green-800">
                                          <Check className="h-2.5 w-2.5" />
                                        </div>
                                        <p className="text-xs font-medium truncate">{docType.label}</p>
                                      </div>
                                      {validUntil ? (
                                        <Badge variant="outline" className="text-[11px] border-green-800 text-green-800 flex-shrink-0">
                                          {validUntil.toLocaleDateString('pt-BR')}
                                        </Badge>
                                      ) : document?.validIndefinitely ? (
                                        <Badge variant="outline" className="text-[11px] border-green-800 text-green-800 flex-shrink-0">
                                          Indeterminada
                                        </Badge>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground/60 flex-shrink-0">—</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>

          {/* Incompletos */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Incompletos ({incompleteQualificationRequests.length})
            </h3>
            {incompleteQualificationRequests.length === 0 ? (
              <Card className="card-pharmaceutical">
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhuma qualificação incompleta</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {incompleteQualificationRequests
                  .filter((r) =>
                    searchQuery ? r.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) : true
                  )
                  .map((request) => {
                    const uploadedDocTypes = request.documents.map((d) => d.type);
                    const uploadedRequiredCount = REQUIRED_DOCUMENT_TYPES.filter((t) =>
                      uploadedDocTypes.includes(t.type)
                    ).length;
                    const progress = (uploadedRequiredCount / REQUIRED_DOCUMENT_TYPES.length) * 100;
                    return (
                      <Card key={request.id} className="card-pharmaceutical flex flex-col overflow-hidden h-full">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <CardTitle className="text-base truncate">{request.supplierName}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                Solicitado por {request.requestedByName} • Ano {request.year}
                              </CardDescription>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs flex-shrink-0 ${request.status === 'in_progress'
                                  ? 'border-blue-500 text-blue-700'
                                  : 'border-yellow-500 text-yellow-700'
                                }`}
                            >
                              {request.status === 'in_progress' ? 'Em progresso' : 'Pendente'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="text-sm flex-1 flex flex-col">
                          <div className="space-y-4 flex-1">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Progresso</span>
                                <span className="text-sm text-muted-foreground">
                                  {uploadedRequiredCount} de {REQUIRED_DOCUMENT_TYPES.length} documentos
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                              </div>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              {/* Essenciais */}
                              {REQUIRED_DOCUMENT_TYPES.map((docType) => {
                                const document = request.documents.find((d) => d.type === docType.type);
                                const isUploaded = Boolean(document);
                                const validUntil = document?.validUntil ? new Date(document.validUntil) : null;

                                return (
                                  <button
                                    key={docType.type}
                                    type="button"
                                    onClick={() => openSingleDocumentUpload(request, docType.type)}
                                    className={`w-full text-left flex items-center justify-between gap-3 rounded border px-3 py-2 transition-colors ${isUploaded
                                        ? 'border-green-700/30 bg-green-50 hover:bg-green-50/70'
                                        : 'bg-muted/30 hover:bg-muted/50'
                                      }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {isUploaded ? (
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-green-800 text-green-800">
                                          <Check className="h-3 w-3" />
                                        </div>
                                      ) : (
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-muted-foreground/40 text-muted-foreground/70">
                                          <X className="h-3 w-3" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className={`text-sm font-medium truncate ${isUploaded ? 'text-green-900' : ''}`}>
                                          {docType.label}
                                        </p>
                                        {document?.fileName && (
                                          <p className={`text-xs truncate ${isUploaded ? 'text-green-900/70' : 'text-muted-foreground'}`}>
                                            {document.fileName}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {validUntil ? (
                                        <Badge variant="outline" className="text-xs border-green-800 text-green-800">
                                          {validUntil.toLocaleDateString('pt-BR')}
                                        </Badge>
                                      ) : document?.validIndefinitely ? (
                                        <Badge variant="outline" className="text-xs border-green-800 text-green-800">
                                          Indeterminada
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {renderDocsDivider('Documentos opcionais')}

                            <div className="grid gap-2 sm:grid-cols-2">
                              {/* Opcionais */}
                              {OPTIONAL_DOCUMENT_TYPES.map((docType) => {
                                const document = request.documents.find((d) => d.type === docType.type);
                                const isUploaded = Boolean(document);
                                const validUntil = document?.validUntil ? new Date(document.validUntil) : null;

                                return (
                                  <button
                                    key={docType.type}
                                    type="button"
                                    onClick={() => openSingleDocumentUpload(request, docType.type)}
                                    className={`w-full text-left flex items-center justify-between gap-3 rounded border px-3 py-2 transition-colors ${isUploaded
                                        ? 'border-green-700/30 bg-green-50 hover:bg-green-50/70'
                                        : 'bg-muted/30 hover:bg-muted/50'
                                      }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {isUploaded ? (
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-green-800 text-green-800">
                                          <Check className="h-3 w-3" />
                                        </div>
                                      ) : (
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-muted-foreground/40 text-muted-foreground/70">
                                          <X className="h-3 w-3" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className={`text-sm font-medium truncate ${isUploaded ? 'text-green-900' : ''}`}>
                                          {docType.label}
                                        </p>
                                        {document?.fileName && (
                                          <p className={`text-xs truncate ${isUploaded ? 'text-green-900/70' : 'text-muted-foreground'}`}>
                                            {document.fileName}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {validUntil ? (
                                        <Badge variant="outline" className="text-xs border-green-800 text-green-800">
                                          {validUntil.toLocaleDateString('pt-BR')}
                                        </Badge>
                                      ) : document?.validIndefinitely ? (
                                        <Badge variant="outline" className="text-xs border-green-800 text-green-800">
                                          Indeterminada
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-4 border-t">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setActiveTab('requests');
                                setSearchQuery(request.supplierName);
                              }}
                              className="w-full"
                            >
                              Ir para Solicitações
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de Qualificação */}
      <Dialog open={isQualificationDialogOpen} onOpenChange={setIsQualificationDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDocTypeMeta
                ? `Enviar documento: ${selectedDocTypeMeta.label}`
                : `Qualificar Fornecedor: ${selectedRequest?.supplierName ?? ''}`}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.supplierName
                ? `Fornecedor: ${selectedRequest.supplierName}`
                : 'Selecione uma solicitação.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedDocTypeMeta || !selectedDocType ? (
              <div className="text-sm text-muted-foreground">Selecione um documento para enviar.</div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">{selectedDocTypeMeta.label}</div>
                  <div className="text-xs text-muted-foreground">{selectedDocTypeMeta.description}</div>
                </div>

                {selectedExistingDoc && !selectedUploadedFile ? (
                  <div className="flex items-center gap-2 p-2 rounded border bg-green-50 border-green-200">
                    <FileText className="h-4 w-4 text-green-700" />
                    <span className="text-sm flex-1 truncate">{selectedExistingDoc.fileName}</span>
                    {selectedExistingDoc.validUntil && (
                      <Badge variant="outline" className="text-xs border-green-800 text-green-800">
                        {new Date(selectedExistingDoc.validUntil).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id={`doc-${selectedDocType}`}
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleDocumentUpload(selectedDocType, file);
                      }}
                      className="flex-1"
                    />
                    {selectedUploadedFile && (
                      <Badge variant="outline" className="bg-primary/10 text-xs">
                        {selectedUploadedFile.name}
                      </Badge>
                    )}
                  </div>

                  {/* Orientações de validade */}
                  <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground/80">Orientação sobre validade</p>
                    <p>
                      - Se você tiver apenas <span className="font-medium">mês/ano</span>, informe como <span className="font-medium">dia 01</span> daquele mês.
                    </p>
                    <p>
                      - Se você tiver apenas <span className="font-medium">ano</span>, informe como <span className="font-medium">01/01</span> do ano.
                    </p>
                    <p>
                      - Alternativamente, marque <span className="font-medium">“Validade indeterminada”</span>.
                    </p>
                    {(selectedDocType === 'crt' || selectedDocType === 'afe' || selectedDocType === 'ae') && (
                      <p className="pt-1">
                        Dica: {selectedDocType === 'crt'
                          ? 'CRT/CRF costuma ser indeterminada, mas é necessário confirmar se a inscrição está regular.'
                          : 'AE e AFE costumam ter validade indeterminada.'}
                      </p>
                    )}
                    {selectedPolicy && (
                      <p className="pt-1">
                        Regra do administrador para este documento:{' '}
                        <span className="font-medium">
                          {selectedPolicy.mode === 'indefinite'
                            ? 'validade indeterminada'
                            : `validade ${selectedPolicy.months ?? 12} meses a partir do envio`}
                        </span>
                        .
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Validade do documento</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        type="date"
                        value={selectedValidUntilLocal}
                        disabled={selectedValidIndefinitely || Boolean(selectedPolicy)}
                        onChange={(e) => {
                          setUploadedDocumentsValidIndefinitely((prev) => ({ ...prev, [selectedDocType]: false }));
                          setUploadedDocumentsValidUntil((prev) => ({
                            ...prev,
                            [selectedDocType]: e.target.value,
                          }));
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          id={`indef-${selectedDocType}`}
                          type="checkbox"
                          checked={selectedValidIndefinitely}
                          disabled={Boolean(selectedPolicy)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUploadedDocumentsValidIndefinitely((prev) => ({ ...prev, [selectedDocType]: checked }));
                            if (checked) {
                              setUploadedDocumentsValidUntil((prev) => ({ ...prev, [selectedDocType]: '' }));
                            }
                          }}
                        />
                        <Label htmlFor={`indef-${selectedDocType}`} className="text-xs text-muted-foreground">
                          Validade indeterminada
                        </Label>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Se você só tem mês/ano</Label>
                        <Input
                          type="month"
                          disabled={selectedValidIndefinitely || Boolean(selectedPolicy)}
                          onChange={(e) => {
                            const v = e.target.value; // YYYY-MM
                            if (!v) return;
                            setUploadedDocumentsValidIndefinitely((prev) => ({ ...prev, [selectedDocType]: false }));
                            setUploadedDocumentsValidUntil((prev) => ({ ...prev, [selectedDocType]: `${v}-01` }));
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Se você só tem o ano</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="Ex.: 2026"
                          min={2000}
                          max={2100}
                          disabled={selectedValidIndefinitely || Boolean(selectedPolicy)}
                          onChange={(e) => {
                            const y = e.target.value.trim();
                            if (!y) return;
                            setUploadedDocumentsValidIndefinitely((prev) => ({ ...prev, [selectedDocType]: false }));
                            setUploadedDocumentsValidUntil((prev) => ({ ...prev, [selectedDocType]: `${y}-01-01` }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsQualificationDialogOpen(false);
                setSelectedRequest(null);
                setSelectedDocType(null);
                setUploadedDocuments({
                  afe: null,
                  ae: null,
                  licenca_sanitaria: null,
                  crt: null,
                  questionario: null,
                });
                setUploadedDocumentsValidUntil({
                  afe: '',
                  ae: '',
                  licenca_sanitaria: '',
                  crt: '',
                  questionario: '',
                });
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSingleDocumentUpload}
              className="gradient-primary text-primary-foreground"
            >
              Confirmar upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
