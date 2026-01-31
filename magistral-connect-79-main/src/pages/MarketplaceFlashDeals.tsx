import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  ArrowLeft,
  Clock,
  Package,
  ShoppingCart,
  ChevronRight,
  Plus,
  History,
  Timer,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

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
  product?: { id: string; substance?: { name: string }; unit?: string };
}

export default function MarketplaceFlashDeals() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeFlashDeals, setActiveFlashDeals] = useState<FlashDealRow[]>([]);
  const [expiredFlashDeals, setExpiredFlashDeals] = useState<FlashDealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  // Create Flash Deal states
  const [createFlashOpen, setCreateFlashOpen] = useState(false);
  const [createFlashProductId, setCreateFlashProductId] = useState('');
  const [createFlashStart, setCreateFlashStart] = useState('');
  const [createFlashEnd, setCreateFlashEnd] = useState('');
  const [createFlashPrice, setCreateFlashPrice] = useState('');
  const [createFlashStock, setCreateFlashStock] = useState('');
  const [createFlashLimit, setCreateFlashLimit] = useState('');
  const [creatingFlash, setCreatingFlash] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);

  const isAdmin = hasRole(['master']);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get<{ flashDeals?: FlashDealRow[]; products?: any[] }>('/marketplace/stock');
      if (res.flashDeals) {
        setActiveFlashDeals(res.flashDeals.filter(fd => fd.isActive));
        setExpiredFlashDeals(res.flashDeals.filter(fd => !fd.isActive));
      }
      if (res.products) {
        setAvailableProducts(res.products);
      }
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message || 'Falha ao carregar Flash Deals.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlash = async () => {
    if (!createFlashProductId || !createFlashStart || !createFlashEnd || !createFlashPrice || !createFlashStock) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    const price = parseFloat(createFlashPrice);
    const stock = parseFloat(createFlashStock);
    const limit = createFlashLimit.trim() ? parseFloat(createFlashLimit) : undefined;
    if (isNaN(price) || price <= 0 || isNaN(stock) || stock <= 0) {
      toast({ title: 'Preço e estoque devem ser positivos', variant: 'destructive' });
      return;
    }
    setCreatingFlash(true);
    try {
      await api.post('/marketplace/flash-deals', {
        productId: createFlashProductId,
        startTime: createFlashStart,
        endTime: createFlashEnd,
        specialPrice: price,
        stockLimit: stock,
        limitPerUser: limit,
      });
      toast({ title: 'Flash Deal criado com sucesso!' });
      setCreateFlashOpen(false);
      // Reset form
      setCreateFlashProductId('');
      setCreateFlashStart('');
      setCreateFlashEnd('');
      setCreateFlashPrice('');
      setCreateFlashStock('');
      setCreateFlashLimit('');
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao criar Flash Deal.', variant: 'destructive' });
    } finally {
      setCreatingFlash(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-500 fill-amber-500" />
              Flash Deals
            </h1>
            <p className="text-muted-foreground">Ofertas imperdíveis com tempo e estoque limitados</p>
          </div>
        </div>
        
        {isAdmin && (
          <Button 
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2"
            onClick={() => setCreateFlashOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nova Oferta Flash
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-amber-50 border-amber-100">
          <TabsTrigger value="active" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white gap-2">
            <Timer className="h-4 w-4" />
            Ofertas Ativas ({activeFlashDeals.length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white gap-2">
            <History className="h-4 w-4" />
            Histórico Expirado ({expiredFlashDeals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 w-full animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : activeFlashDeals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                <p className="text-xl font-medium text-muted-foreground">Nenhum Flash Deal ativo no momento</p>
                <p className="text-sm text-muted-foreground mt-1">Fique atento às notificações para novas ofertas!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeFlashDeals.map((fd) => (
                <Card key={fd.id} className="group overflow-hidden border-amber-100 hover:border-amber-300 transition-all shadow-sm hover:shadow-md">
                  <div className="h-2 bg-amber-500 w-full" />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Clock className="mr-1 h-3 w-3" />
                        Tempo Limitado
                      </Badge>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Preço Especial</span>
                        <span className="text-xl font-bold text-amber-600">{formatCurrency(fd.specialPrice)}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg group-hover:text-amber-700 transition-colors">
                      {fd.product?.substance?.name}
                    </CardTitle>
                    <CardDescription>
                      Unidade: {fd.unit}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Estoque disponível:</span>
                        <span className="font-semibold">{fd.remainingStock} {fd.unit}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full transition-all" 
                          style={{ width: `${Math.min(100, (fd.remainingStock / fd.stockLimit) * 100)}%` }}
                        />
                      </div>
                      {fd.limitPerUser && (
                        <p className="text-xs text-amber-600 font-medium bg-amber-50 p-2 rounded-md">
                          Limite de {fd.limitPerUser} {fd.unit} por cooperado
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/50 border-t p-4">
                    <Button 
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold"
                      onClick={() => {
                        navigate('/estoque-inteligente');
                        toast({
                          title: 'Acesse o Flash Deal',
                          description: 'Localize o item na lista de Flash Deals para realizar sua reserva.',
                        });
                      }}
                    >
                      Aproveitar Oferta
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 w-full animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : expiredFlashDeals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
              <History className="mx-auto h-12 w-12 mb-4 opacity-20" />
              <p>Nenhum histórico de ofertas expiradas</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-70">
              {expiredFlashDeals.map((fd) => (
                <Card key={fd.id} className="grayscale hover:grayscale-0 transition-all border-muted">
                  <div className="h-1 bg-muted-foreground/30 w-full" />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className="bg-muted text-muted-foreground border-muted">
                        Expirada
                      </Badge>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block line-through">Preço Oferta</span>
                        <span className="text-lg font-bold text-muted-foreground">{formatCurrency(fd.specialPrice)}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg text-muted-foreground">
                      {fd.product?.substance?.name}
                    </CardTitle>
                    <CardDescription>
                      Encerrada em: {new Date(fd.endTime).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-sm text-muted-foreground italic">
                      Esta oferta não está mais disponível.
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Admin-only: Create Flash Deal Dialog */}
      <Dialog open={createFlashOpen} onOpenChange={setCreateFlashOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
              Criar Nova Oferta Flash
            </DialogTitle>
            <DialogDescription>
              Oferta com tempo e estoque limitados. Preço agressivo para escoamento rápido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Produto / Substância</Label>
              <Select value={createFlashProductId} onValueChange={setCreateFlashProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.substance?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input 
                  type="datetime-local" 
                  value={createFlashStart} 
                  onChange={(e) => setCreateFlashStart(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Término</Label>
                <Input 
                  type="datetime-local" 
                  value={createFlashEnd} 
                  onChange={(e) => setCreateFlashEnd(e.target.value)} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Especial (R$/un)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min={0} 
                    value={createFlashPrice} 
                    onChange={(e) => setCreateFlashPrice(e.target.value)} 
                    placeholder="0,00"
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estoque Total para Deal</Label>
                <Input 
                  type="number" 
                  min={0} 
                  value={createFlashStock} 
                  onChange={(e) => setCreateFlashStock(e.target.value)} 
                  placeholder="0" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Limite por Cooperado (opcional)</Label>
              <Input 
                type="number" 
                min={0} 
                value={createFlashLimit} 
                onChange={(e) => setCreateFlashLimit(e.target.value)} 
                placeholder="Sem limite" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFlashOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleCreateFlash} 
              disabled={creatingFlash}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {creatingFlash ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Oferta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
