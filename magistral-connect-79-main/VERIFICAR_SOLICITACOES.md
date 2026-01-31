# 🔍 Como Verificar se as Solicitações Estão Sendo Criadas

## Problema
Você criou solicitações de atualização cadastral (CNPJ, PIX, Razão Social) mas elas não aparecem para o administrador.

## Verificações

### 1. Verificar no Banco de Dados (phpMyAdmin)

1. Acesse phpMyAdmin: http://localhost/phpmyadmin
2. Selecione o banco: `magistral_connect`
3. Abra a tabela: `BankDataChangeRequest`
4. Verifique se há registros com:
   - `status = 'pending'`
   - `newCnpj`, `newPixKey` ou `newRazaoSocial` preenchidos

### 2. Verificar no Console do Navegador

1. Faça login como **administrador** (admin@magistral.com)
2. Abra o console (F12)
3. Vá para a aba **Console**
4. Execute:

```javascript
// Verificar solicitações diretamente da API
fetch('http://localhost:3001/api/requests/bank-data', {
  headers: {
    'Authorization': `Bearer ${JSON.parse(localStorage.getItem('magistral_auth_user')).token}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('📋 Solicitações encontradas:', data.requests);
  console.log('📊 Total:', data.requests.length);
  console.log('⏳ Pendentes:', data.requests.filter(r => r.status === 'pending').length);
});
```

### 3. Verificar se o Backend Está Rodando

```bash
# Verificar se a porta 3001 está em uso
netstat -ano | findstr ":3001"
```

### 4. Verificar Logs do Backend

Se o backend estiver rodando, verifique os logs no terminal onde ele está executando.

### 5. Recarregar a Página de Solicitações

1. Na página de **Solicitações**, clique no botão **"Atualizar"** (novo botão adicionado)
2. Ou recarregue a página (F5)

## Possíveis Problemas

### ❌ Backend não está rodando
**Solução**: Inicie o backend:
```bash
cd backend
npm run dev
```

### ❌ Solicitações não estão sendo criadas
**Solução**: Verifique o console do navegador ao criar uma solicitação. Deve aparecer uma mensagem de sucesso.

### ❌ Problema de autenticação
**Solução**: Faça logout e login novamente como administrador.

### ❌ Cache do navegador
**Solução**: Limpe o cache (Ctrl+Shift+Delete) ou use modo anônimo.

## Teste Rápido

Execute no console do navegador (logado como admin):

```javascript
// Teste completo
(async () => {
  const auth = JSON.parse(localStorage.getItem('magistral_auth_user'));
  if (!auth) {
    console.error('❌ Não está logado!');
    return;
  }
  
  try {
    const res = await fetch('http://localhost:3001/api/requests/bank-data', {
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    });
    const data = await res.json();
    console.log('✅ API respondeu:', data);
    console.log('📋 Solicitações:', data.requests);
  } catch (err) {
    console.error('❌ Erro:', err);
  }
})();
```
