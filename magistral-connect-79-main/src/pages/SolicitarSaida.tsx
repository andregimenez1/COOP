import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  LogOut,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  Copy,
  QrCode,
} from 'lucide-react';
import { ExitRequest, User } from '@/types';
import { useToast } from '@/hooks/use-toast';

const EXIT_REQUESTS_STORAGE_KEY = 'magistral_exit_requests';
const USERS_STORAGE_KEY = 'magistral_users';

export default function SolicitarSaida() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [exitRequest, setExitRequest] = useState<ExitRequest | null>(null);
  const [reason, setReason] = useState('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);

  // Carregar dados do usuário e solicitação existente
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;

    try {
      // Carregar dados do usuário atualizados do localStorage
      const usersStored = localStorage.getItem(USERS_STORAGE_KEY);
      let loadedUserData: User | null = null;
      
      if (usersStored) {
        const parsed = JSON.parse(usersStored);
        const currentUser = parsed.find((u: any) => u.id === user.id);
        if (currentUser) {
          loadedUserData = {
            ...currentUser,
            createdAt: new Date(currentUser.createdAt),
            bannedAt: currentUser.bannedAt ? new Date(currentUser.bannedAt) : undefined,
          };
        }
      }
      
      // Se não encontrou no localStorage, usar dados do contexto de autenticação como fallback
      if (!loadedUserData && user) {
        loadedUserData = {
          ...user,
          createdAt: user.createdAt || new Date(),
        };
      }
      
      if (loadedUserData) {
        setUserData(loadedUserData);
      }

      // Carregar solicitação existente
      const requestsStored = localStorage.getItem(EXIT_REQUESTS_STORAGE_KEY);
      if (requestsStored) {
        const parsed = JSON.parse(requestsStored);
        const existingRequest = parsed.find((r: any) => r.userId === user.id && r.status === 'pending');
        if (existingRequest) {
          setExitRequest({
            ...existingRequest,
            createdAt: new Date(existingRequest.createdAt),
            reviewedAt: existingRequest.reviewedAt ? new Date(existingRequest.reviewedAt) : undefined,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Em caso de erro, usar dados do contexto de autenticação como fallback
      if (user) {
        setUserData({
          ...user,
          createdAt: user.createdAt || new Date(),
        });
      }
    }
  }, [user]);

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

  const handleSubmitRequest = () => {
    if (!user || !userData) return;

    const newRequest: ExitRequest = {
      id: `exit-request-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      company: user.company,
      cnpj: user.cnpj,
      currentValue: userData.currentValue || userData.contribution || 0,
      reason: reason.trim() || undefined,
      status: 'pending',
      createdAt: new Date(),
    };

    // Salvar solicitação
    try {
      const requestsStored = localStorage.getItem(EXIT_REQUESTS_STORAGE_KEY);
      const requests = requestsStored ? JSON.parse(requestsStored) : [];
      requests.push(newRequest);
      localStorage.setItem(EXIT_REQUESTS_STORAGE_KEY, JSON.stringify(requests));

      setExitRequest(newRequest);
      setReason('');
      setIsConfirmDialogOpen(false);

      toast({
        title: 'Solicitação enviada',
        description: 'Sua solicitação de saída foi enviada e será analisada pelo administrador.',
      });
    } catch (error) {
      console.error('Erro ao salvar solicitação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a solicitação. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelRequest = () => {
    if (!exitRequest) return;

    try {
      const requestsStored = localStorage.getItem(EXIT_REQUESTS_STORAGE_KEY);
      if (requestsStored) {
        const requests = JSON.parse(requestsStored);
        const updated = requests.map((r: any) =>
          r.id === exitRequest.id ? { ...r, status: 'cancelled' as const } : r
        );
        localStorage.setItem(EXIT_REQUESTS_STORAGE_KEY, JSON.stringify(updated));
        setExitRequest(null);
        toast({
          title: 'Solicitação cancelada',
          description: 'Sua solicitação de saída foi cancelada.',
        });
      }
    } catch (error) {
      console.error('Erro ao cancelar solicitação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar a solicitação. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      approved: { label: 'Aprovada', variant: 'default' },
      rejected: { label: 'Rejeitada', variant: 'destructive' },
      cancelled: { label: 'Cancelada', variant: 'secondary' },
    };
    return badges[status] || { label: status, variant: 'outline' };
  };

  if (!hasRole(['cooperado'])) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Acesso restrito a cooperados.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contribution = userData?.contribution || 0;
  const currentValue = userData?.currentValue || contribution;
  const statusBadge = exitRequest ? getStatusBadge(exitRequest.status) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Solicitar Saída da Cooperativa</h1>
        <p className="text-muted-foreground">
          Solicite sua saída da cooperativa. Sua solicitação será analisada pelo administrador.
        </p>
      </div>

      {/* Informações Financeiras */}
      <Card className="card-pharmaceutical border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Sua Participação Atual
          </CardTitle>
          <CardDescription>Valor que será devolvido em caso de aprovação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Aporte Inicial</p>
              <p className="text-2xl font-bold">{formatCurrency(contribution)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Valor Atual</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(currentValue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saldo a Receber e Chave PIX */}
      {(userData?.balanceToReceive || userData?.pixKey) && (
        <Card className="card-pharmaceutical border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-green-700" />
              Informações de Recebimento
            </CardTitle>
            <CardDescription>Dados para receber o valor da sua participação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userData.balanceToReceive !== undefined && userData.balanceToReceive > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Saldo a Receber</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(userData.balanceToReceive)}</p>
              </div>
            )}
            {userData.pixKey && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Chave PIX</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(userData.pixKey || '');
                      toast({
                        title: 'Chave PIX copiada',
                        description: 'A chave PIX foi copiada para a área de transferência.',
                      });
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                <div className="rounded-lg bg-white p-3 border border-green-200">
                  <p className="text-sm font-mono break-all">{userData.pixKey}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status da Solicitação */}
      {exitRequest && (
        <Card className="card-pharmaceutical">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Status da Solicitação
              </CardTitle>
              <Badge variant={statusBadge?.variant}>{statusBadge?.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Solicitado em:</p>
              <p className="font-medium">{formatDate(exitRequest.createdAt)}</p>
            </div>
            {exitRequest.reason && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Motivo informado:</p>
                <p className="text-sm">{exitRequest.reason}</p>
              </div>
            )}
            {exitRequest.status === 'approved' && (
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <p className="font-medium">Solicitação Aprovada</p>
                </div>
                <p className="text-sm text-green-600">
                  Sua solicitação foi aprovada. O valor de {formatCurrency(exitRequest.currentValue)} será
                  processado para devolução.
                </p>
                {exitRequest.reviewedAt && (
                  <p className="text-xs text-green-600 mt-2">
                    Aprovado em: {formatDate(exitRequest.reviewedAt)}
                  </p>
                )}
              </div>
            )}
            {exitRequest.status === 'rejected' && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <XCircle className="h-5 w-5" />
                  <p className="font-medium">Solicitação Rejeitada</p>
                </div>
                {exitRequest.rejectionReason && (
                  <p className="text-sm text-red-600 mb-2">{exitRequest.rejectionReason}</p>
                )}
                {exitRequest.reviewedAt && (
                  <p className="text-xs text-red-600">
                    Rejeitado em: {formatDate(exitRequest.reviewedAt)}
                  </p>
                )}
              </div>
            )}
            {exitRequest.status === 'pending' && (
              <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-700 mb-2">
                  <Clock className="h-5 w-5" />
                  <p className="font-medium">Aguardando Análise</p>
                </div>
                <p className="text-sm text-yellow-600">
                  Sua solicitação está aguardando análise pelo administrador.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelRequest}
                  className="mt-3"
                >
                  Cancelar Solicitação
                </Button>
              </div>
            )}
            {exitRequest.status === 'cancelled' && (
              <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <XCircle className="h-5 w-5" />
                  <p className="font-medium">Solicitação Cancelada</p>
                </div>
                <p className="text-sm text-gray-600">
                  Esta solicitação foi cancelada. Você pode criar uma nova solicitação se desejar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulário de Solicitação */}
      {!exitRequest || exitRequest.status === 'cancelled' || exitRequest.status === 'rejected' ? (
        <Card className="card-pharmaceutical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Nova Solicitação de Desligamento
            </CardTitle>
            <CardDescription>
              Preencha o formulário abaixo para solicitar seu desligamento da cooperativa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
              <div className="flex items-start gap-2 text-yellow-700">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">Atenção</p>
                  <p className="text-sm text-yellow-600">
                    Ao solicitar sua saída, você receberá o valor atual de sua participação (
                    {formatCurrency(currentValue)}). Esta ação requer aprovação do administrador.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da Saída (Opcional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Informe o motivo da sua saída, se desejar..."
                rows={4}
              />
            </div>

            <Button
              onClick={() => setIsConfirmDialogOpen(true)}
              className="w-full"
              variant="destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Solicitar Desligamento
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Dialog de Confirmação */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Confirmar Solicitação de Desligamento
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a solicitar seu desligamento da cooperativa. Esta ação requer aprovação do
                administrador.
              </p>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium mb-2">Valor a ser devolvido:</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(currentValue)}</p>
              </div>
              <p className="text-sm">
                Após a aprovação, este valor será adicionado à lista de pagamentos pendentes para
                processamento.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitRequest} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Solicitação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
