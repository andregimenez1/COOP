import { useState, useEffect } from 'react';
import {
  Package,
  TrendingDown,
  Target,
  BarChart3,
  Plus,
  Edit,
  RefreshCw,
  Box,
  Shield,
  Truck,
  Building2,
  MapPin,
  Maximize2,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { ShelfSpaceOffering } from '@/types';

const SHELF_OFFERINGS_KEY = 'magistral_shelf_offerings';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('pt-BR');

interface Product {
  id: string;
  substanceId: string;
  targetStock: number;
  currentStock: number;
  unit: string;
  substance: { id: string; name: string };
}

interface Gap {
  productId: string;
  substanceId: string;
  substanceName: string;
  targetStock: number;
  currentStock: number;
  gap: number;
  unit: string;
}

interface InventoryItem {
  id: string;
  substanceId: string;
  quantity: number;
  unit: string;
  expirationDate: string;
  isExcess: boolean;
  canLiquidate?: boolean;
  gap?: number;
  substance: { id: string; name: string };
  holder?: { id: string; name: string; company?: string };
  rawMaterial?: { batch?: string };
}

interface StrategicQuotaRow {
  id: string;
  productId: string;
  totalReserved: number;
  resetDate: string;
  periodDays: number;
  unit: string;
  quotaPerMember: number;
  consumedByMe?: number;
  remainingForMe: number;
  remainingInPeriod?: number;
  isInPeriod?: boolean;
  periodEnd?: string;
  product?: { substance?: { name: string }; unit?: string };
}

interface StockDashboard {
  role: 'admin' | 'cooperado';
  products?: Product[];
  gaps?: Gap[];
  liquidationSavings?: { total: number; transactions: { totalPrice: number; completedAt: string; substanceName: string; quantity: number; unit: string }[] };
  inventoryItems?: InventoryItem[];
  productGaps?: Gap[];
  strategicQuotas?: StrategicQuotaRow[];
}

export default function EstoqueInteligente() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<StockDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [targetStockInput, setTargetStockInput] = useState('');
  const [createProductSubstanceId, setCreateProductSubstanceId] = useState('');
  const [createTarget, setCreateTarget] = useState('');
  const [substances, setSubstances] = useState<{ id: string; name: string }[]>([]);
  const [createLotOpen, setCreateLotOpen] = useState(false);
  const [lotSubstanceId, setLotSubstanceId] = useState('');
  const [lotQuantity, setLotQuantity] = useState('');
  const [lotUnit, setLotUnit] = useState<'g' | 'kg' | 'mL' | 'L'>('g');
  const [lotExpiry, setLotExpiry] = useState('');
  const [lotIsExcess, setLotIsExcess] = useState(false);
  const [liquidating, setLiquidating] = useState<string | null>(null);
  const [claimQuotaOpen, setClaimQuotaOpen] = useState(false);
  const [claimQuota, setClaimQuota] = useState<StrategicQuotaRow | null>(null);
  const [claimQuotaQty, setClaimQuotaQty] = useState('');
  const [claimQuotaDelivery, setClaimQuotaDelivery] = useState<'HUB' | 'COOPERATIVA'>('HUB');
  const [claimingQuota, setClaimingQuota] = useState(false);
  const [createQuotaOpen, setCreateQuotaOpen] = useState(false);
  const [createQuotaProductId, setCreateQuotaProductId] = useState('');
  const [createQuotaTotal, setCreateQuotaTotal] = useState('');
  const [createQuotaReset, setCreateQuotaReset] = useState('');
  const [createQuotaDays, setCreateQuotaDays] = useState('30');
  const [creatingQuota, setCreatingQuota] = useState(false);

  // Estados para Oferta de Prateleira
  const [shelfOfferings, setShelfOfferings] = useState<ShelfSpaceOffering[]>([]);
  const [isShelfOfferDialogOpen, setIsShelfOfferDialogOpen] = useState(false);
  const [shelfForm, setShelfForm] = useState({
    region: '',
    capacity: '',
    notes: '',
  });

  // Carregar ofertas de prateleira
  useEffect(() => {
    const stored = localStorage.getItem(SHELF_OFFERINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setShelfOfferings(parsed.map((o: any) => ({
          ...o,
          createdAt: new Date(o.createdAt),
          reviewedAt: o.reviewedAt ? new Date(o.reviewedAt) : undefined,
        })));
      } catch (e) {
        console.error('Erro ao carregar ofertas de prateleira:', e);
      }
    }
  }, []);

  const saveShelfOfferings = (newOfferings: ShelfSpaceOffering[]) => {
    setShelfOfferings(newOfferings);
    localStorage.setItem(SHELF_OFFERINGS_KEY, JSON.stringify(newOfferings));
  };

  const handleSaveShelfOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !shelfForm.region) return;

    const newOffer: ShelfSpaceOffering = {
      id: `shelf-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      companyName: user.company,
      region: shelfForm.region,
      capacity: shelfForm.capacity,
      notes: shelfForm.notes,
      status: 'pending',
      createdAt: new Date(),
    };

    saveShelfOfferings([...shelfOfferings, newOffer]);
    setIsShelfOfferDialogOpen(false);
    setShelfForm({ region: '', capacity: '', notes: '' });
    toast({
      title: 'Oferta enviada',
      description: 'Sua oferta de espaço de prateleira foi enviada para análise da cooperativa.',
    });
  };

  const handleApproveShelfOffer = (id: string) => {
    const updated = shelfOfferings.map((o) =>
      o.id === id ? { ...o, status: 'approved' as const, reviewedAt: new Date(), reviewedBy: user?.id } : o
    );
    saveShelfOfferings(updated);
    toast({ title: 'Oferta aprovada', description: 'O cooperado agora é um ponto de estoque estratégico.' });
  };

  const handleRejectShelfOffer = (id: string) => {
    const updated = shelfOfferings.map((o) =>
      o.id === id ? { ...o, status: 'rejected' as const, reviewedAt: new Date(), reviewedBy: user?.id } : o
    );
    saveShelfOfferings(updated);
    toast({ title: 'Oferta recusada', description: 'A oferta de espaço foi recusada.' });
  };

  const handleActivateShelfOffer = (id: string) => {
    const updated = shelfOfferings.map((o) =>
      o.id === id ? { ...o, status: 'active' as const } : o
    );
    saveShelfOfferings(updated);
    toast({ title: 'Ponto Ativado', description: 'O estoque regional está ativo e pronto para receber insumos.' });
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const stock = await api.get<StockDashboard>('/marketplace/stock');
      setData(stock);
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message || 'Falha ao carregar estoque.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ substances: { id: string; name: string }[] }>('/substances');
        setSubstances(res.substances || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleUpdateTarget = async () => {
    if (!editProduct || targetStockInput === '') return;
    const v = parseFloat(targetStockInput);
    if (isNaN(v) || v < 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    try {
      await api.patch(`/marketplace/products/${editProduct.id}`, { targetStock: v });
      toast({ title: 'Estoque-alvo atualizado' });
      setEditProduct(null);
      setTargetStockInput('');
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao atualizar.', variant: 'destructive' });
    }
  };

  const handleCreateProduct = async () => {
    if (!createProductSubstanceId || !createTarget.trim()) {
      toast({ title: 'Preencha substância e estoque-alvo', variant: 'destructive' });
      return;
    }
    const v = parseFloat(createTarget);
    if (isNaN(v) || v < 0) {
      toast({ title: 'Estoque-alvo inválido', variant: 'destructive' });
      return;
    }
    try {
      await api.post('/marketplace/products', {
        substanceId: createProductSubstanceId,
        targetStock: v,
      });
      toast({ title: 'Produto criado' });
      setCreateProductSubstanceId('');
      setCreateTarget('');
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao criar.', variant: 'destructive' });
    }
  };

  const handleCreateLot = async () => {
    if (!lotSubstanceId || !lotQuantity.trim() || !lotExpiry) {
      toast({ title: 'Preencha substância, quantidade e validade', variant: 'destructive' });
      return;
    }
    const q = parseFloat(lotQuantity);
    if (isNaN(q) || q <= 0) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' });
      return;
    }
    try {
      await api.post('/marketplace/inventory', {
        substanceId: lotSubstanceId,
        quantity: q,
        unit: lotUnit,
        expirationDate: lotExpiry,
        isExcess: lotIsExcess,
      });
      toast({ title: 'Lote cadastrado' });
      setCreateLotOpen(false);
      setLotSubstanceId('');
      setLotQuantity('');
      setLotExpiry('');
      setLotIsExcess(false);
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao cadastrar.', variant: 'destructive' });
    }
  };

  const handleToggleExcess = async (item: InventoryItem) => {
    try {
      await api.patch(`/marketplace/inventory/${item.id}`, { isExcess: !item.isExcess });
      toast({ title: item.isExcess ? 'Excesso desmarcado' : 'Marcado como excesso' });
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message, variant: 'destructive' });
    }
  };

  const handleLiquidation = async (item: InventoryItem) => {
    if (!item.canLiquidate || liquidating) return;
    setLiquidating(item.id);
    try {
      await api.post('/marketplace/liquidation', {
        inventoryItemId: item.id,
        quantity: item.quantity,
      });
      toast({ title: 'Liquidação realizada', description: 'Excesso vendido à Cooperativa.' });
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha na liquidação.', variant: 'destructive' });
    } finally {
      setLiquidating(null);
    }
  };

  const handleClaimQuota = async () => {
    if (!claimQuota || !claimQuotaQty.trim()) return;
    const q = parseFloat(claimQuotaQty);
    if (isNaN(q) || q <= 0) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' });
      return;
    }
    setClaimingQuota(true);
    try {
      await api.post(`/marketplace/strategic-quotas/${claimQuota.id}/claim`, {
        quantity: q,
        deliveryType: claimQuotaDelivery,
      });
      toast({ title: 'Cota resgatada', description: 'Retirar no Hub ou receber via Cooperativa conforme escolhido.' });
      setClaimQuotaOpen(false);
      setClaimQuota(null);
      setClaimQuotaQty('');
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao resgatar.', variant: 'destructive' });
    } finally {
      setClaimingQuota(false);
    }
  };

  const handleCreateQuota = async () => {
    if (!createQuotaProductId || !createQuotaTotal || !createQuotaReset) {
      toast({ title: 'Preencha produto, total reservado e data de início', variant: 'destructive' });
      return;
    }
    const total = parseFloat(createQuotaTotal);
    const days = parseInt(createQuotaDays, 10) || 30;
    if (isNaN(total) || total <= 0) {
      toast({ title: 'Total reservado deve ser positivo', variant: 'destructive' });
      return;
    }
    setCreatingQuota(true);
    try {
      await api.post('/marketplace/strategic-quotas', {
        productId: createQuotaProductId,
        totalReserved: total,
        resetDate: createQuotaReset,
        periodDays: days,
      });
      toast({ title: 'Reserva Estratégica criada' });
      setCreateQuotaOpen(false);
      setCreateQuotaProductId('');
      setCreateQuotaTotal('');
      setCreateQuotaReset('');
      setCreateQuotaDays('30');
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao criar.', variant: 'destructive' });
    } finally {
      setCreatingQuota(false);
    }
  };

  if (!hasRole(['master', 'cooperado'])) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Acesso restrito a cooperados e administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAdmin = data.role === 'admin';
  const products = (data as any).products || [];
  const gaps = (data as any).gaps || (data as any).productGaps || [];
  const savings = (data as any).liquidationSavings;
  const items = (data as any).inventoryItems || [];
  const strategicQuotas = (data as any).strategicQuotas || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estoque Inteligente</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Controle de estoque-alvo e relatório de economia das liquidações'
              : 'Seus lotes, excessos e liquidação imediata quando a Cooperativa precisar'}
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {isAdmin && (
        <>
          {savings && (
            <Card className="card-pharmaceutical">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Economia gerada pelas liquidações
                </CardTitle>
                <CardDescription>
                  Total economizado com compras de excesso dos cooperados (preço líquido = média das últimas 3 vendas − 15%)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{formatCurrency(savings.total)}</p>
                {savings.transactions?.length > 0 && (
                  <div className="mt-4 rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm font-medium mb-2">Últimas liquidações</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {savings.transactions.slice(0, 10).map((t: any, i: number) => (
                        <li key={i}>
                          {formatDate(t.completedAt)} – {t.substanceName}: {t.quantity} {t.unit} → {formatCurrency(t.totalPrice ?? 0)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="card-pharmaceutical">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Insumos da rede – estoque-alvo
                </CardTitle>
                <CardDescription>
                  Defina o estoque-alvo por produto. Quando o estoque atual estiver abaixo, os cooperados verão "Liquidação Imediata" para o excesso.
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                  <Select value={createProductSubstanceId} onValueChange={setCreateProductSubstanceId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Substância" />
                    </SelectTrigger>
                    <SelectContent>
                      {substances
                        .filter((s) => !products.some((p: Product) => p.substanceId === s.id))
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Estoque-alvo"
                    className="w-32"
                    value={createTarget}
                    onChange={(e) => setCreateTarget(e.target.value)}
                  />
                  <Button onClick={handleCreateProduct} disabled={!createProductSubstanceId || !createTarget}>
                    <Plus className="h-4 w-4 mr-1" />
                    Criar
                  </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar estoque-alvo</DialogTitle>
                    <DialogDescription>
                      {editProduct?.substance?.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label>Estoque-alvo</Label>
                    <Input
                      type="number"
                      min={0}
                      value={targetStockInput}
                      onChange={(e) => setTargetStockInput(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditProduct(null)}>Cancelar</Button>
                    <Button onClick={handleUpdateTarget}>Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Insumo</TableHead>
                    <TableHead>Estoque atual</TableHead>
                    <TableHead>Estoque-alvo</TableHead>
                    <TableHead>Gap</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum produto. Crie um para uma substância acima.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((p: Product) => {
                      const g = gaps.find((x: Gap) => x.productId === p.id) || {
                        gap: Math.max(0, p.targetStock - p.currentStock),
                      };
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.substance?.name}</TableCell>
                          <TableCell>{p.currentStock} {p.unit}</TableCell>
                          <TableCell>{p.targetStock} {p.unit}</TableCell>
                          <TableCell>
                            <Badge variant={g.gap > 0 ? 'secondary' : 'outline'}>
                              {g.gap} {p.unit}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditProduct(p);
                                setTargetStockInput(String(p.targetStock));
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="card-pharmaceutical">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  Ofertas de Espaço de Prateleira (Hubs Regionais)
                </CardTitle>
                <CardDescription>
                  Solicitações de cooperados querendo disponibilizar espaço físico para estoque estratégico regional.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {shelfOfferings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma oferta de espaço recebida.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Cooperado</TableHead>
                      <TableHead>Região</TableHead>
                      <TableHead>Capacidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shelfOfferings.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>
                          <div className="font-medium">{offer.userName}</div>
                          <div className="text-xs text-muted-foreground">{offer.companyName}</div>
                        </TableCell>
                        <TableCell>{offer.region}</TableCell>
                        <TableCell>{offer.capacity || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            offer.status === 'pending' ? 'outline' : 
                            offer.status === 'approved' ? 'secondary' : 
                            offer.status === 'active' ? 'default' : 'destructive'
                          }>
                            {offer.status === 'pending' ? 'Pendente' : 
                             offer.status === 'approved' ? 'Aprovado' : 
                             offer.status === 'active' ? 'Ativo' : 'Recusado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {offer.status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleApproveShelfOffer(offer.id)}>Aprovar</Button>
                                <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRejectShelfOffer(offer.id)}>Recusar</Button>
                              </>
                            )}
                            {offer.status === 'approved' && (
                              <Button size="sm" onClick={() => handleActivateShelfOffer(offer.id)}>Ativar Ponto</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="card-pharmaceutical">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Reservas Estratégicas
                </CardTitle>
                <CardDescription>
                  Cota igual por CNPJ para insumos raros. Período de carência (ex.: 30 dias); depois, sobras em compra livre.
                </CardDescription>
              </div>
              <Button onClick={() => setCreateQuotaOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Reserva
              </Button>
            </CardHeader>
            <CardContent>
              {strategicQuotas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhuma reserva estratégica cadastrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Produto</TableHead>
                      <TableHead>Total reservado</TableHead>
                      <TableHead>Cota/membro</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Restante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strategicQuotas.map((sq: StrategicQuotaRow) => (
                      <TableRow key={sq.id}>
                        <TableCell className="font-medium">{sq.product?.substance?.name}</TableCell>
                        <TableCell>{sq.totalReserved} {sq.unit}</TableCell>
                        <TableCell>{sq.quotaPerMember?.toFixed(2)} {sq.unit}</TableCell>
                        <TableCell>{formatDate(sq.resetDate)} (+{sq.periodDays}d)</TableCell>
                        <TableCell>{sq.remainingInPeriod ?? '-'} {sq.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!isAdmin && (
        <>
          <Card className="card-pharmaceutical">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  Meus lotes
                </CardTitle>
                <CardDescription>
                  Gerencie seus lotes físicos e marque excesso. O botão "Liquidação Imediata" aparece quando a Cooperativa precisa do insumo.
                </CardDescription>
              </div>
              <Button onClick={() => setCreateLotOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar lote
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Insumo</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Excesso</TableHead>
                    <TableHead>Liquidação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum lote. Cadastre um acima.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it: InventoryItem) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.substance?.name}</TableCell>
                        <TableCell>{it.quantity} {it.unit}</TableCell>
                        <TableCell>{formatDate(it.expirationDate)}</TableCell>
                        <TableCell>
                          <Badge variant={it.isExcess ? 'default' : 'outline'}>
                            {it.isExcess ? 'Excesso' : 'Não'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {it.canLiquidate ? (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={!!liquidating}
                              onClick={() => handleLiquidation(it)}
                            >
                              {liquidating === it.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <TrendingDown className="h-4 w-4 mr-1" />
                              )}
                              Liquidação imediata
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {!it.isExcess
                                ? 'Marque como excesso'
                                : (it.gap ?? 0) <= 0
                                ? 'Cooperativa não precisa'
                                : 'Indisponível'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleExcess(it)}
                          >
                            {it.isExcess ? 'Desmarcar excesso' : 'Marcar excesso'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="card-pharmaceutical bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  Oferecer Espaço de Prateleira (Estoque Estratégico Regional)
                </CardTitle>
                <CardDescription>
                  Torne sua farmácia um "Estoque Estratégico" para sua região e receba créditos e benefícios por isso.
                </CardDescription>
              </div>
              <Button onClick={() => setIsShelfOfferDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Oferecer Espaço
              </Button>
            </CardHeader>
            <CardContent>
              {shelfOfferings.filter(o => o.userId === user?.id).length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                  <MapPin className="mx-auto h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">Você ainda não ofereceu espaço para estoque regional.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shelfOfferings.filter(o => o.userId === user?.id).map(offer => (
                    <div key={offer.id} className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{offer.region}</span>
                          <Badge variant={
                            offer.status === 'pending' ? 'outline' : 
                            offer.status === 'approved' ? 'secondary' : 
                            offer.status === 'active' ? 'default' : 'destructive'
                          }>
                            {offer.status === 'pending' ? 'Em análise' : 
                             offer.status === 'approved' ? 'Aprovado' : 
                             offer.status === 'active' ? 'Ativo' : 'Recusado'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Capacidade: {offer.capacity || 'Não informada'}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        Solicitado em {formatDate(offer.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card id="reservas" className="card-pharmaceutical scroll-mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Minha cota de reserva estratégica
              </CardTitle>
              <CardDescription>
                Direito de compra equitativo para insumos raros. Cota por período; após o prazo, sobras ficam em compra livre.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {strategicQuotas.filter((q: StrategicQuotaRow) => q.isInPeriod && (q.remainingForMe ?? 0) > 0).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhuma cota disponível no período atual.</p>
              ) : (
                <div className="space-y-3">
                  {strategicQuotas
                    .filter((q: StrategicQuotaRow) => q.isInPeriod && (q.remainingForMe ?? 0) > 0)
                    .map((sq: StrategicQuotaRow) => (
                      <div
                        key={sq.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-medium">{sq.product?.substance?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Sua cota restante: <strong>{sq.remainingForMe} {sq.unit}</strong> • Período até {sq.periodEnd ? formatDate(sq.periodEnd) : '-'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setClaimQuota(sq);
                            setClaimQuotaQty(String(sq.remainingForMe));
                            setClaimQuotaOpen(true);
                          }}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Resgatar cota
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={isShelfOfferDialogOpen} onOpenChange={setIsShelfOfferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Oferecer Espaço de Prateleira</DialogTitle>
            <DialogDescription>
              Disponibilize espaço físico em sua farmácia para atuar como um Hub Regional da Cooperativa.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveShelfOffer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="region">Cidade / Região de Atendimento *</Label>
              <Input 
                id="region" 
                value={shelfForm.region} 
                onChange={(e) => setShelfForm({...shelfForm, region: e.target.value})} 
                placeholder="Ex: Ribeirão Preto e região" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidade Disponível</Label>
              <Input 
                id="capacity" 
                value={shelfForm.capacity} 
                onChange={(e) => setShelfForm({...shelfForm, capacity: e.target.value})} 
                placeholder="Ex: 2 freezers -20°C, 5 prateleiras secas" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações Adicionais</Label>
              <Textarea 
                id="notes" 
                value={shelfForm.notes} 
                onChange={(e) => setShelfForm({...shelfForm, notes: e.target.value})} 
                placeholder="Detalhes sobre segurança, horários de recebimento, etc." 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsShelfOfferDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Enviar Oferta</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={claimQuotaOpen} onOpenChange={setClaimQuotaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resgatar cota de reserva</DialogTitle>
            <DialogDescription>
              {claimQuota?.product?.substance?.name} • Disponível: {claimQuota?.remainingForMe} {claimQuota?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={claimQuotaQty}
                onChange={(e) => setClaimQuotaQty(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Entrega</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={claimQuotaDelivery === 'HUB' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setClaimQuotaDelivery('HUB')}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Retirar no Hub Regional
                </Button>
                <Button
                  type="button"
                  variant={claimQuotaDelivery === 'COOPERATIVA' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setClaimQuotaDelivery('COOPERATIVA')}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Receber via Cooperativa
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimQuotaOpen(false)}>Cancelar</Button>
            <Button onClick={handleClaimQuota} disabled={!!claimingQuota}>
              {claimingQuota ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Resgatar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createQuotaOpen} onOpenChange={setCreateQuotaOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Criar Reserva Estratégica</DialogTitle>
            <DialogDescription>
              Cota igual por CNPJ. Período de carência (ex.: 30 dias); após isso, sobras em compra livre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={createQuotaProductId} onValueChange={setCreateQuotaProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: Product) => (
                    <SelectItem key={p.id} value={p.id}>{p.substance?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Total reservado</Label>
              <Input type="number" step="any" min={0} value={createQuotaTotal} onChange={(e) => setCreateQuotaTotal(e.target.value)} placeholder="0" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início do período</Label>
                <Input type="date" value={createQuotaReset} onChange={(e) => setCreateQuotaReset(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Dias do período</Label>
                <Input type="number" min={1} value={createQuotaDays} onChange={(e) => setCreateQuotaDays(e.target.value)} placeholder="30" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateQuotaOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateQuota} disabled={!!creatingQuota}>
              {creatingQuota ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createLotOpen} onOpenChange={setCreateLotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar lote</DialogTitle>
            <DialogDescription>
              Registre um lote físico. Marque como excesso para gerar oferta e permitir liquidação quando a Cooperativa precisar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Substância</Label>
              <Select value={lotSubstanceId} onValueChange={setLotSubstanceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {substances.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={lotQuantity}
                  onChange={(e) => setLotQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={lotUnit} onValueChange={(v: any) => setLotUnit(v)}>
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
            </div>
            <div className="space-y-2">
              <Label>Validade</Label>
              <Input
                type="date"
                value={lotExpiry}
                onChange={(e) => setLotExpiry(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lotExcess"
                checked={lotIsExcess}
                onChange={(e) => setLotIsExcess(e.target.checked)}
              />
              <Label htmlFor="lotExcess">Marcar como excesso (gera oferta automática)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateLotOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateLot}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
