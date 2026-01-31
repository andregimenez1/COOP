# 🔍 Debug: Por que as solicitações não aparecem para o admin?

## Verificações Necessárias

### 1. Verificar se a solicitação foi criada no banco

Execute no console do navegador (logado como usuário que criou a solicitação):

```javascript
// Verificar se a solicitação foi criada
(async () => {
  const auth = JSON.parse(localStorage.getItem('magistral_auth_user'));
  if (!auth) {
    console.error('❌ Não está logado!');
    return;
  }
  
  console.log('👤 Usuário logado:', auth.user.email, 'Role:', auth.user.role);
  
  try {
    // Tentar criar uma solicitação de teste
    const res = await fetch('http://localhost:3001/api/requests/bank-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        newPixKey: 'teste@teste.com',
        reason: 'Teste de criação'
      })
    });
    
    if (!res.ok) {
      const error = await res.text();
      console.error('❌ Erro ao criar:', res.status, error);
      return;
    }
    
    const data = await res.json();
    console.log('✅ Solicitação criada:', data);
    
    // Verificar se aparece na listagem
    const listRes = await fetch('http://localhost:3001/api/requests/bank-data', {
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    });
    
    const listData = await listRes.json();
    console.log('📋 Solicitações encontradas:', listData.requests.length);
    console.log('📊 Todas:', listData.requests);
    
  } catch (err) {
    console.error('❌ Erro:', err);
  }
})();
```

### 2. Verificar como admin

Execute no console do navegador (logado como admin):

```javascript
// Verificar como admin
(async () => {
  const auth = JSON.parse(localStorage.getItem('magistral_auth_user'));
  if (!auth || auth.user.role !== 'master') {
    console.error('❌ Você precisa estar logado como master!');
    return;
  }
  
  console.log('👤 Admin logado:', auth.user.email);
  
  try {
    const res = await fetch('http://localhost:3001/api/requests/bank-data', {
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    });
    
    if (!res.ok) {
      const error = await res.text();
      console.error('❌ Erro:', res.status, error);
      return;
    }
    
    const data = await res.json();
    console.log('📋 Total de solicitações:', data.requests.length);
    console.log('⏳ Pendentes:', data.requests.filter(r => r.status === 'pending').length);
    console.log('📊 Todas:', data.requests);
    
    // Verificar se há solicitações sem status
    const semStatus = data.requests.filter(r => !r.status || r.status === '');
    if (semStatus.length > 0) {
      console.log('⚠️ Solicitações sem status:', semStatus);
    }
    
  } catch (err) {
    console.error('❌ Erro:', err);
  }
})();
```

### 3. Verificar no banco de dados diretamente

No phpMyAdmin:
1. Banco: `magistral_connect`
2. Tabela: `BankDataChangeRequest`
3. Verifique se há registros com:
   - `status = 'pending'` ou `status IS NULL` ou `status = ''`
   - `newCnpj`, `newPixKey` ou `newRazaoSocial` preenchidos

### 4. Verificar logs do backend

No terminal onde o backend está rodando, verifique se há:
- Erros ao criar solicitação
- Erros ao listar solicitações
- Problemas de autenticação

### 5. Verificar se o token está sendo enviado

Execute no console:

```javascript
const auth = JSON.parse(localStorage.getItem('magistral_auth_user'));
console.log('Token:', auth?.token ? '✅ Presente' : '❌ Ausente');
console.log('User:', auth?.user);
console.log('Role:', auth?.user?.role);
```

## Possíveis Problemas

### ❌ Token JWT inválido ou expirado
**Solução**: Faça logout e login novamente

### ❌ Backend não está rodando
**Solução**: Verifique se a porta 3001 está ativa

### ❌ Problema de CORS
**Solução**: Verifique se o backend permite requisições do frontend

### ❌ Status da solicitação está NULL ou vazio
**Solução**: O filtro pode estar ignorando solicitações sem status

### ❌ Erro silencioso na criação
**Solução**: Verifique o console do navegador ao criar a solicitação
