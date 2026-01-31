# Correção de Encoding UTF-8

## Problema
Os acentos (como "á" em "Farmácia") estão aparecendo como "?" (ex: "Farm?cia") nos dados do banco.

**Causa**: O problema pode ocorrer em duas situações:
1. **Cadastro manual**: Quando o usuário é cadastrado manualmente através da interface, o encoding pode não estar sendo tratado corretamente na comunicação entre frontend e backend.
2. **Dados existentes**: Dados que já foram salvos com encoding incorreto no banco de dados.

## Solução Implementada

### 1. Atualização da DATABASE_URL
A `DATABASE_URL` no arquivo `.env` foi atualizada para incluir `charset=utf8mb4`:
```
DATABASE_URL="mysql://root@localhost:3306/magistral_connect?charset=utf8mb4"
```

### 2. Migração de Encoding
Foi criada uma migração em `backend/prisma/migrations/20260125000000_fix_encoding/migration.sql` que:
- Altera o charset do banco de dados para `utf8mb4`
- Converte todas as tabelas para usar `utf8mb4_unicode_ci`

### 3. Script de Correção de Dados
Foi criado um script em `backend/prisma/scripts/fix-encoding.ts` para corrigir dados existentes que podem estar com encoding incorreto.

### 4. Configuração do Express e API
- **Backend**: Express configurado para aceitar e responder com UTF-8 explicitamente
- **Frontend**: API client configurado para enviar requisições com charset UTF-8

### 5. Script de Correção de Usuário Específico
Foi criado um script em `backend/prisma/scripts/fix-user-encoding.ts` para corrigir um usuário específico que está com encoding incorreto.

## Como Aplicar

### Passo 1: Aplicar a Migração
Execute no terminal (na pasta `backend`):
```bash
npx prisma migrate deploy
```

OU, se preferir aplicar manualmente, execute o SQL diretamente no MySQL:
```sql
-- Copie e cole o conteúdo de:
-- backend/prisma/migrations/20260125000000_fix_encoding/migration.sql
```

### Passo 2: Executar o Script de Correção

**Opção A - Corrigir todos os usuários:**
```bash
npm run fix-encoding
```

OU diretamente:
```bash
npx tsx prisma/scripts/fix-encoding.ts
```

**Opção B - Corrigir um usuário específico:**
```bash
npm run fix-user-encoding "Farm?cia Natural" "Farmácia Natural"
```

OU diretamente:
```bash
npx tsx prisma/scripts/fix-user-encoding.ts "Farm?cia Natural" "Farmácia Natural"
```

### Passo 3: Reiniciar o Backend
Após aplicar as correções, reinicie o servidor backend:
```bash
npm run dev
```

## Verificação

Após aplicar as correções, verifique se os dados estão corretos:
1. Acesse a página de Usuários
2. Verifique se "Farmácia Natural" aparece corretamente (não como "Farm?cia")
3. Verifique outros usuários com acentos

## Notas Importantes

- **Backup**: Antes de aplicar, faça backup do banco de dados
- **Dados Existentes**: O script tentará corrigir dados existentes, mas pode ser necessário atualizar manualmente alguns registros
- **Novos Dados**: Com a DATABASE_URL atualizada, novos dados serão salvos corretamente com UTF-8

## Se o Problema Persistir

Se após aplicar as correções o problema ainda existir:
1. Verifique se o MySQL está configurado com `utf8mb4` como charset padrão
2. Verifique se os dados no banco realmente estão com encoding incorreto (pode ser apenas um problema de exibição)
3. Atualize manualmente os registros problemáticos via SQL ou interface
