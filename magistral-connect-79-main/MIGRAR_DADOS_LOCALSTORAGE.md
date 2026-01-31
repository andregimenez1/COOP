# 📦 Script de Migração: localStorage → MySQL

## Como migrar dados existentes do localStorage para MySQL

Se você tem dados no localStorage que quer migrar para o MySQL, use o script de migração:

### 1. Abra o Console do Navegador

1. Faça login no sistema como **master** (admin@magistral.com)
2. Pressione **F12** para abrir o DevTools
3. Vá para a aba **Console**

### 2. Execute o Script de Migração

Copie e cole este código no console:

```javascript
// Importar e executar migração completa
import('/src/scripts/migrate-all-localStorage-to-api.ts').then(module => {
  module.migrateAllLocalStorageToAPI();
});
```

**OU** se o script já estiver carregado:

```javascript
migrateAllLocalStorageToAPI();
```

### 3. O que será migrado

O script migra automaticamente:

- ✅ **Substâncias** - Do localStorage para MySQL
- ✅ **Sugestões de substâncias** - Apenas pendentes
- ✅ **Fornecedores** - Do localStorage para MySQL
- ✅ **Solicitações de fornecedor** - Apenas pendentes
- ✅ **Solicitações de dados bancários** - Apenas pendentes
- ✅ **Solicitações de usuários extras** - Apenas pendentes
- ✅ **Solicitações de saída** - Apenas pendentes
- ✅ **Dados de usuários** - Atualiza campos (contribution, currentValue, etc.)

### 4. Verificação

Após executar, verifique:

1. **No console**: Veja o resumo da migração
2. **No phpMyAdmin**: Verifique as tabelas correspondentes
3. **No sistema**: Os dados devem aparecer automaticamente

### ⚠️ Importante

- **Apenas dados pendentes** são migrados (solicitações já aprovadas/rejeitadas são ignoradas)
- **Usuários** são atualizados, não criados (criação requer senha via registro)
- **Dados duplicados** são ignorados automaticamente

### 📝 Nota

Após migrar, você pode limpar o localStorage se quiser (exceto `magistral_auth_user` que é necessário para sessão):

```javascript
// CUIDADO: Isso remove todos os dados do localStorage
// Execute apenas se tiver certeza que tudo foi migrado
const keys = Object.keys(localStorage);
keys.forEach(key => {
  if (key !== 'magistral_auth_user') {
    localStorage.removeItem(key);
  }
});
console.log('✅ localStorage limpo (exceto sessão)');
```
