# Migração: localStorage → MySQL

## 📊 Situação Atual

### ✅ O que está pronto:
- **Backend MySQL configurado** com todas as rotas e controllers
- **Schema Prisma completo** com todas as tabelas
- **API REST funcionando** em `http://localhost:3001/api`

### ⚠️ O que precisa ser feito:
- **Frontend ainda usa localStorage** para todos os dados
- **Não há integração** entre frontend e backend
- **Contextos e páginas** precisam ser migrados para usar a API

## 🔄 Estratégia de Migração

### Fase 1: Serviços de API (✅ Criado)
- [x] `src/lib/api.ts` - Cliente HTTP base
- [x] `src/services/auth.service.ts` - Serviço de autenticação

### Fase 2: Serviços por Módulo (Pendente)
Criar serviços para cada módulo:
- [ ] `src/services/substance.service.ts` - Substâncias
- [ ] `src/services/supplier.service.ts` - Fornecedores
- [ ] `src/services/marketplace.service.ts` - Marketplace
- [ ] `src/services/request.service.ts` - Solicitações
- [ ] `src/services/quotation.service.ts` - Cotações
- [ ] `src/services/laudo.service.ts` - Laudos
- [ ] `src/services/user.service.ts` - Usuários
- [ ] `src/services/financial.service.ts` - Financeiro
- [ ] `src/services/voting.service.ts` - Votações

### Fase 3: Migrar Contextos (Pendente)
Atualizar contextos para usar serviços em vez de localStorage:
- [ ] `src/contexts/AuthContext.tsx` - Usar `authService`
- [ ] `src/contexts/SubstanceContext.tsx` - Usar `substanceService`
- [ ] `src/contexts/LaudoContext.tsx` - Usar `laudoService`
- [ ] `src/contexts/NotificationContext.tsx` - Usar API de notificações

### Fase 4: Migrar Páginas (Pendente)
Atualizar páginas para usar contextos migrados:
- [ ] Todas as páginas que usam localStorage diretamente

### Fase 5: Migração de Dados (Pendente)
Script para migrar dados existentes do localStorage para MySQL:
- [ ] Criar script de migração
- [ ] Exportar dados do localStorage
- [ ] Importar no MySQL via API

## 📝 Exemplo de Migração

### Antes (localStorage):
```typescript
// SubstanceContext.tsx
const [substances, setSubstances] = useState<Substance[]>(() => {
  const loaded = safeGetItem<Substance[]>(SUBSTANCES_STORAGE_KEY, []);
  return loaded;
});

useEffect(() => {
  safeSetItem({ storageKey: SUBSTANCES_STORAGE_KEY, data: substances });
}, [substances]);
```

### Depois (API):
```typescript
// SubstanceContext.tsx
const [substances, setSubstances] = useState<Substance[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const loadSubstances = async () => {
    try {
      setIsLoading(true);
      const data = await substanceService.getAll();
      setSubstances(data);
    } catch (error) {
      console.error('Erro ao carregar substâncias:', error);
    } finally {
      setIsLoading(false);
    }
  };
  loadSubstances();
}, []);

const addSubstance = async (substance: Substance) => {
  try {
    const newSubstance = await substanceService.create(substance);
    setSubstances(prev => [...prev, newSubstance]);
  } catch (error) {
    console.error('Erro ao criar substância:', error);
    throw error;
  }
};
```

## 🚀 Como Proceder

1. **Criar serviços de API** para cada módulo
2. **Migrar contextos** um por um, testando cada migração
3. **Manter compatibilidade** durante a transição (usar localStorage como fallback se API falhar)
4. **Migrar dados existentes** do localStorage para MySQL
5. **Remover código de localStorage** após migração completa

## ⚠️ Importante

- **NÃO perder dados existentes** durante a migração
- **Manter fallback** para localStorage durante transição
- **Testar cada módulo** após migração
- **Fazer backup** dos dados do localStorage antes de migrar

## 📋 Checklist de Migração

Para cada módulo:
- [ ] Criar serviço de API
- [ ] Atualizar contexto para usar serviço
- [ ] Testar CRUD completo (Create, Read, Update, Delete)
- [ ] Verificar se dados estão sendo salvos no MySQL
- [ ] Remover código de localStorage do módulo
- [ ] Atualizar páginas que usam o módulo
