# ✅ Migração para MySQL apenas (sem localStorage para dados)

## O que foi feito

### 1. Backend
- **Seed Prisma** (`backend/prisma/seed.ts`): usuários iniciais para login.
  - Execute: `cd backend && npm run prisma:seed`
  - Usuários: admin@magistral.com / admin123, cooperado@magistral.com / coop123, usuario@magistral.com / user123, natural@, farmagna@, roseiras@ (senhas no seed).

### 2. Autenticação (só API)
- **AuthContext**: removidos usuários demo e fallback para localStorage.
- Login **apenas via API** (backend em http://localhost:3001).
- **localStorage** usado só para sessão: `magistral_auth_user` (token + user). Nada mais é persistido em localStorage para auth.

### 3. Substâncias (só API)
- **SubstanceContext**: remoção total de localStorage.
- Substâncias e sugestões vêm **só da API** (MySQL).

### 4. Solicitações (só API)
- **Solicitacoes**: uso de `useRequestsData` + `requestService` + `supplierService`.
- Bank data, extra users, exit, supplier requests e fornecedores **só via API**.
- Aprovação/rejeição e CRUD de fornecedores **todos pela API**.

### 5. Sidebar
- **AppSidebar**: contagens de pendências via **API** (useRequestsData + useSubstances). Sem localStorage.

---

## Onde ainda há localStorage

- **`magistral_auth_user`**: sessão (token + user). Necessário para manter login ao recarregar.
- **Outras páginas** ainda usam localStorage em parte:
  - Usuarios, Perfil, Dashboard
  - Fornecedores (qualificação, documentos)
  - Laudos, Marketplace, Cotacoes, Votacoes, ListaCompras, etc.

Essas páginas podem ser migradas para API aos poucos, seguindo o mesmo padrão das Solicitações.

---

## Como usar

1. **Backend**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate dev --name init
   npm run prisma:seed
   npm run dev
   ```

2. **Frontend**
   ```bash
   npm run dev
   ```

3. **Login**
   - Acesse http://localhost:8080/login
   - Use usuários do seed (ex.: admin@magistral.com / admin123)
   - **Backend precisa estar rodando**; sem API não há login.

---

## Resumo

- **Auth, substâncias, solicitações e contagens do sidebar**: **somente MySQL/API**.
- **localStorage** só para `magistral_auth_user` (sessão).
- Dados principais deixam de ser perdidos ao limpar localStorage (exceto o logout ao apagar a sessão).
