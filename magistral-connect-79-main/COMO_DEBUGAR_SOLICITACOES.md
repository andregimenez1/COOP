# 🔍 Como Debugar: Solicitações não aparecem para o admin

## ✅ Correções Aplicadas

1. **Logs de debug adicionados** em:
   - `Perfil.tsx` - Ao criar solicitação
   - `Solicitacoes.tsx` - Ao carregar solicitações
   - `use-requests-data.ts` - No hook de carregamento

2. **Status garantido** no backend - Solicitações sempre criadas com `status: 'pending'`

## 🧪 Como Testar

### Passo 1: Criar uma solicitação

1. Faça login como usuário comum (não admin)
2. Vá em **Perfil**
3. Altere CNPJ, PIX ou Razão Social
4. Preencha a justificativa e salve
5. **Abra o console (F12)** e verifique os logs:
   - Deve aparecer: `📤 [Perfil] Criando solicitação...`
   - Deve aparecer: `✅ [Perfil] Solicitação criada com sucesso`
   - Deve mostrar o ID da solicitação

### Passo 2: Verificar como admin

1. **Faça logout** e **login como admin** (admin@magistral.com)
2. Vá em **Solicitações** → aba **Dados Bancários/PIX**
3. **Abra o console (F12)** e verifique os logs:
   - Deve aparecer: `🔄 [useRequestsData] Carregando solicitações...`
   - Deve aparecer: `✅ [useRequestsData] Dados carregados`
   - Deve mostrar quantas solicitações foram encontradas

### Passo 3: Teste direto no console

Execute no console do navegador (logado como admin):

```javascript
// Copie e cole o conteúdo do arquivo TESTAR_SOLICITACOES.js
```

Ou execute diretamente:

```javascript
// Verificar solicitações
fetch('http://localhost:3001/api/requests/bank-data', {
  headers: {
    'Authorization': `Bearer ${JSON.parse(localStorage.getItem('magistral_auth_user')).token}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('📋 Total:', data.requests.length);
  console.log('📊 Todas:', data.requests);
  console.log('⏳ Pendentes:', data.requests.filter(r => r.status === 'pending' || !r.status).length);
});
```

## 🔍 O que verificar nos logs

### Ao criar solicitação (Perfil):
- ✅ `📤 [Perfil] Criando solicitação...` - Confirma que tentou criar
- ✅ `✅ [Perfil] Solicitação criada com sucesso` - Confirma criação
- ✅ `📋 [Perfil] ID da solicitação: xxx` - ID gerado
- ❌ Se aparecer erro, verifique a mensagem

### Ao carregar (Solicitações):
- ✅ `🔄 [useRequestsData] Carregando...` - Confirma que tentou carregar
- ✅ `✅ [useRequestsData] Dados carregados: { bankData: X }` - Quantas encontrou
- ✅ `📋 [useRequestsData] Bank Data Requests: [...]` - Detalhes
- ❌ Se aparecer erro, verifique a mensagem

## 🐛 Problemas Comuns

### ❌ "Erro de conexão com o servidor"
**Causa**: Backend não está rodando
**Solução**: Inicie o backend (`cd backend && npm run dev`)

### ❌ "Access denied" ou 403
**Causa**: Token inválido ou expirado
**Solução**: Faça logout e login novamente

### ❌ Solicitação criada mas não aparece
**Causa**: Problema na query do backend ou filtro
**Solução**: Verifique no phpMyAdmin se a solicitação foi criada

### ❌ Backend retorna 0 solicitações
**Causa**: 
- Solicitações foram criadas com outro usuário
- Problema de permissão (role não é master)
- Status da solicitação não é 'pending'

**Solução**: Execute o script de teste no console

## 📝 Próximos Passos

Se após os testes você ainda não ver as solicitações:

1. Execute o script `TESTAR_SOLICITACOES.js` no console
2. Verifique os logs no console do navegador
3. Verifique os logs no terminal do backend
4. Verifique no phpMyAdmin se as solicitações foram criadas
