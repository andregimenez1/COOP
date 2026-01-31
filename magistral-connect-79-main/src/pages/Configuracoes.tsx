import { useEffect, useState } from 'react';
import { Settings, Building2, Shield, Database, Bell, Palette, Plus, X, Sparkles, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatCnpj } from '@/lib/cnpj';
import { TransparencyNews } from '@/types';
import { settingsService, type MarketplaceConfig, type SupplierDocValidityPolicyMode, type SupplierDocValidityPolicyType } from '@/services/settings.service';

const NEWS_STORAGE_KEY = 'magistral_transparency_news';

export default function Configuracoes() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [configCnpj, setConfigCnpj] = useState('00.000.000/0001-00');

  const [validityPolicy, setValidityPolicy] = useState<Record<string, { mode: SupplierDocValidityPolicyMode; months?: number | null }>>({
    afe: { mode: 'indefinite', months: null },
    ae: { mode: 'indefinite', months: null },
    crt: { mode: 'indefinite', months: null },
  });

  const [marketplaceConfig, setMarketplaceConfig] = useState<MarketplaceConfig | null>(null);
  const [minSellValidityDays, setMinSellValidityDays] = useState<string>('30');
  const [marketplaceFee, setMarketplaceFee] = useState<string>('0');
  const [savingMarketplaceConfig, setSavingMarketplaceConfig] = useState(false);

  useEffect(() => {
    if (!hasRole(['master'])) return;
    settingsService
      .getSupplierDocumentValidityPolicies()
      .then((policies) => {
        const next = { ...validityPolicy };
        policies.forEach((p) => {
          next[p.type] = { mode: p.mode, months: p.months ?? null };
        });
        setValidityPolicy(next);
      })
      .catch(() => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as políticas de validade.',
          variant: 'destructive',
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasRole(['master'])) return;
    settingsService
      .getMarketplaceConfig()
      .then((cfg) => {
        setMarketplaceConfig(cfg);
        setMinSellValidityDays(String(cfg.minSellValidityDays ?? 30));
        setMarketplaceFee(String(cfg.marketplaceFee ?? 0));
      })
      .catch(() => {
        // fallback silencioso
        setMarketplaceConfig({ id: 'singleton', minSellValidityDays: 30, marketplaceFee: 0 });
        setMinSellValidityDays('30');
        setMarketplaceFee('0');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveMarketplaceConfig = async () => {
    setSavingMarketplaceConfig(true);
    try {
      const v = Math.trunc(Number(minSellValidityDays));
      const fee = Number(marketplaceFee);
      
      if (!Number.isFinite(v) || v < 0) {
        toast({ title: 'Valor inválido', description: 'Informe um número de dias válido (0 ou maior).', variant: 'destructive' });
        return;
      }
      
      if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
        toast({ title: 'Taxa inválida', description: 'Informe uma taxa entre 0 e 100%.', variant: 'destructive' });
        return;
      }

      const updated = await settingsService.updateMarketplaceConfig({ 
        minSellValidityDays: v,
        marketplaceFee: fee
      });
      
      setMarketplaceConfig(updated);
      setMinSellValidityDays(String(updated.minSellValidityDays));
      setMarketplaceFee(String(updated.marketplaceFee));
      toast({ title: 'Configuração salva', description: 'Regras do marketplace atualizadas com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar configuração do marketplace.', variant: 'destructive' });
    } finally {
      setSavingMarketplaceConfig(false);
    }
  };

  const handleUpdatePolicy = async (type: SupplierDocValidityPolicyType, value: string) => {
    try {
      if (value === 'indefinite') {
        await settingsService.updateSupplierDocumentValidityPolicy({ type, mode: 'indefinite', months: null });
        setValidityPolicy((prev) => ({ ...prev, [type]: { mode: 'indefinite', months: null } }));
      } else {
        const months = Number(value);
        await settingsService.updateSupplierDocumentValidityPolicy({ type, mode: 'months', months });
        setValidityPolicy((prev) => ({ ...prev, [type]: { mode: 'months', months } }));
      }
      toast({ title: 'Configuração salva', description: 'Política de validade atualizada.' });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Falha ao salvar a política de validade.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateUpdate = () => {
    if (!updateTitle.trim() || !updateContent.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o título e a descrição do update.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    try {
      const newsStored = localStorage.getItem(NEWS_STORAGE_KEY);
      const news = newsStored ? JSON.parse(newsStored) : [];
      
      // Formatar data e hora atual
      const now = new Date();
      const formattedDate = now.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const formattedTime = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      
      // Gerar texto resumido e redigido: "[Título] implementado DD/MM/AAAA e HH:MM"
      const summaryText = `${updateTitle.trim()} implementado ${formattedDate} e ${formattedTime}`;
      
      const newUpdate: TransparencyNews = {
        id: `update-${Date.now()}`,
        title: summaryText, // Usar o texto resumido como título
        content: updateContent.trim(), // Manter a descrição detalhada no conteúdo
        category: 'update',
        createdAt: now,
        createdBy: user.id,
        isPinned: isPinned,
      };

      news.push(newUpdate);
      
      // Salvar no localStorage (JSON.stringify converte Date para string automaticamente)
      localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(news));
      
      // Disparar evento customizado para atualizar outras abas
      window.dispatchEvent(new Event('storage'));

      toast({
        title: 'Update publicado',
        description: 'O update foi publicado e aparecerá nas novidades para todos os cooperados e administradores.',
      });

      // Limpar formulário
      setUpdateTitle('');
      setUpdateContent('');
      setIsPinned(false);
      setIsUpdateDialogOpen(false);
    } catch (error) {
      console.error('Erro ao criar update:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível publicar o update. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  if (!hasRole(['master'])) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="card-pharmaceutical">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Acesso Restrito</h3>
            <p className="mt-1 text-center text-muted-foreground">
              Apenas o administrador pode acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      {/* Updates/Novidades */}
      <Card className="card-pharmaceutical">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Updates do Sistema
              </CardTitle>
              <CardDescription>
                Publique novidades sobre correções de bugs, implementações e melhorias
              </CardDescription>
            </div>
            <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Update
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Publicar Update do Sistema</DialogTitle>
                  <DialogDescription>
                    Crie uma novidade sobre correções, implementações ou melhorias que será exibida para todos os cooperados e administradores na seção de Transparência.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="update-title">Título *</Label>
                    <Input
                      id="update-title"
                      placeholder="Ex: Correção de bug na contagem de solicitações"
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="update-content">Descrição *</Label>
                    <Textarea
                      id="update-content"
                      placeholder="Descreva as correções, implementações ou melhorias realizadas..."
                      value={updateContent}
                      onChange={(e) => setUpdateContent(e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Você pode usar múltiplas linhas para organizar melhor a descrição.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="pin-update"
                      checked={isPinned}
                      onCheckedChange={setIsPinned}
                    />
                    <Label htmlFor="pin-update" className="cursor-pointer">
                      Fixar no topo das novidades
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsUpdateDialogOpen(false);
                      setUpdateTitle('');
                      setUpdateContent('');
                      setIsPinned(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateUpdate}
                    className="gradient-primary text-primary-foreground"
                  >
                    Publicar Update
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Os updates publicados aparecerão automaticamente na aba "Novidades" da página de Transparência para todos os cooperados e administradores.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company Info */}
        <Card className="card-pharmaceutical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Informações da Cooperativa
            </CardTitle>
            <CardDescription>Dados básicos da organização</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Cooperativa</Label>
              <Input defaultValue="Cooperativa Magistral" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={configCnpj}
                onChange={(e) => setConfigCnpj(formatCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label>Email de Contato</Label>
              <Input type="email" defaultValue="contato@magistral.com" />
            </div>
            <Button className="gradient-primary text-primary-foreground">
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="card-pharmaceutical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Segurança
            </CardTitle>
            <CardDescription>Configurações de acesso e autenticação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Aprovação manual de cadastros</p>
                <p className="text-sm text-muted-foreground">
                  Novos usuários precisam de aprovação
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Autenticação em dois fatores</p>
                <p className="text-sm text-muted-foreground">
                  Exigir 2FA para administradores
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sessão expirada em</p>
                <p className="text-sm text-muted-foreground">
                  Tempo de inatividade para logout automático
                </p>
              </div>
              <Input className="w-24" defaultValue="30 min" />
            </div>
          </CardContent>
        </Card>

        {/* Validade de Documentos (Qualificação de Fornecedores) */}
        <Card className="card-pharmaceutical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              Validade de Documentos (Fornecedores)
            </CardTitle>
            <CardDescription>
              Define a regra padrão para documentos com validade indeterminada (ex.: AE/AFE). A regra é aplicada automaticamente no envio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>AFE</Label>
              <Select
                value={
                  validityPolicy.afe?.mode === 'months'
                    ? String(validityPolicy.afe.months ?? 12)
                    : 'indefinite'
                }
                onValueChange={(v) => handleUpdatePolicy('afe', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinite">Indeterminada</SelectItem>
                  <SelectItem value="6">Semestral (6 meses)</SelectItem>
                  <SelectItem value="12">Anual (12 meses)</SelectItem>
                  <SelectItem value="24">Bienal (24 meses)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>AE</Label>
              <Select
                value={
                  validityPolicy.ae?.mode === 'months'
                    ? String(validityPolicy.ae.months ?? 12)
                    : 'indefinite'
                }
                onValueChange={(v) => handleUpdatePolicy('ae', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinite">Indeterminada</SelectItem>
                  <SelectItem value="6">Semestral (6 meses)</SelectItem>
                  <SelectItem value="12">Anual (12 meses)</SelectItem>
                  <SelectItem value="24">Bienal (24 meses)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />
            <p className="text-xs text-muted-foreground">
              Observação: CRT/CRF costuma ser indeterminada, porém exige verificação de inscrição regular (regra operacional, não automática aqui).
            </p>
          </CardContent>
        </Card>

        {/* Marketplace */}
        <Card className="card-pharmaceutical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Marketplace
            </CardTitle>
            <CardDescription>
              Regras administrativas do marketplace (aplicadas para todos os cooperados).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Dias mínimos de validade (laudo) para vender</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  className="w-28"
                  value={minSellValidityDays}
                  onChange={(e) => setMinSellValidityDays(e.target.value)}
                />
                <p className="text-xs text-muted-foreground flex-1">
                  Mínimo de dias que um laudo deve ter de validade restante para ser aceito no marketplace.
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Taxa de Comercialização (%)</Label>
              <div className="flex items-center gap-2">
                <div className="relative w-28">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className="pr-7"
                    value={marketplaceFee}
                    onChange={(e) => setMarketplaceFee(e.target.value)}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground flex-1">
                  Taxa aplicada sobre o valor total da venda no momento da conclusão da transação.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                className="w-full sm:w-auto"
                onClick={handleSaveMarketplaceConfig}
                disabled={savingMarketplaceConfig}
              >
                {savingMarketplaceConfig ? 'Salvando...' : 'Salvar Regras do Marketplace'}
              </Button>
            </div>

            {marketplaceConfig && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Configurações Atuais</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Validade mínima:</span>
                  <span className="font-medium">{marketplaceConfig.minSellValidityDays} dias</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxa de mercado:</span>
                  <span className="font-medium">{marketplaceConfig.marketplaceFee}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="card-pharmaceutical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary" />
              Notificações do Sistema
            </CardTitle>
            <CardDescription>Configure alertas e lembretes automáticos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Alerta de validade próxima</p>
                <p className="text-sm text-muted-foreground">
                  Notificar quando laudos estiverem próximos do vencimento
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Resumo diário</p>
                <p className="text-sm text-muted-foreground">
                  Enviar email com resumo de atividades
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Novas ofertas no marketplace</p>
                <p className="text-sm text-muted-foreground">
                  Notificar cooperados sobre novas oportunidades
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card className="card-pharmaceutical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              Dados e Backup
            </CardTitle>
            <CardDescription>Gerenciamento de dados do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Último backup</p>
                  <p className="text-sm text-muted-foreground">22/01/2026 às 03:00</p>
                </div>
                <Button variant="outline">Backup Manual</Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Backup automático</p>
                <p className="text-sm text-muted-foreground">
                  Realizar backup diário às 03:00
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Retenção de dados</p>
                <p className="text-sm text-muted-foreground">
                  Manter histórico de cotações por
                </p>
              </div>
              <Input className="w-24" defaultValue="2 anos" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
