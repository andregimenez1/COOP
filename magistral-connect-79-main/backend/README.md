# Magistral Connect - Backend API

Backend completo para o sistema Magistral Connect, construído com Node.js, TypeScript, Express e Prisma ORM.

## 🚀 Tecnologias

- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **Prisma** - ORM moderno e type-safe
- **MySQL** - Banco de dados
- **JWT** - Autenticação
- **bcryptjs** - Hash de senhas
- **Zod** - Validação de dados

## 📋 Pré-requisitos

- Node.js 18+ 
- MySQL 8.0+
- npm ou yarn

## 🔧 Instalação

1. **Instalar dependências:**
```bash
cd backend
npm install
```

2. **Configurar variáveis de ambiente:**
```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure:
- `DATABASE_URL` - URL de conexão do MySQL
- `JWT_SECRET` - Chave secreta para JWT (use um valor seguro)
- `PORT` - Porta do servidor (padrão: 3001)
- `CORS_ORIGIN` - URL do frontend

3. **Configurar banco de dados:**
```bash
# Gerar cliente Prisma
npm run prisma:generate

# Executar migrações
npm run prisma:migrate

# (Opcional) Popular banco com dados iniciais
npm run prisma:seed
```

## 🏃 Executar

**Desenvolvimento:**
```bash
npm run dev
```

**Produção:**
```bash
npm run build
npm start
```

## 📚 Estrutura do Projeto

```
backend/
├── src/
│   ├── controllers/     # Lógica de negócio
│   ├── routes/          # Definição de rotas
│   ├── middleware/      # Middlewares (auth, error handling)
│   ├── utils/           # Utilitários (JWT, bcrypt)
│   └── server.ts        # Ponto de entrada
├── prisma/
│   ├── schema.prisma    # Schema do banco de dados
│   └── seed.ts          # Dados iniciais (opcional)
└── dist/                # Código compilado (gerado)
```

## 🔐 Autenticação

Todas as rotas (exceto `/api/auth/login` e `/api/auth/register`) requerem autenticação via JWT.

**Header:**
```
Authorization: Bearer <token>
```

## 📡 Endpoints Principais

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Obter usuário atual
- `POST /api/auth/refresh` - Renovar token

### Usuários
- `GET /api/users` - Listar usuários (master only)
- `GET /api/users/:id` - Obter usuário
- `PATCH /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Deletar usuário (master only)

### Solicitações
- `GET /api/requests/bank-data` - Listar solicitações de dados bancários
- `POST /api/requests/bank-data` - Criar solicitação
- `PATCH /api/requests/bank-data/:id/approve` - Aprovar (master only)
- `PATCH /api/requests/bank-data/:id/reject` - Rejeitar (master only)

- `GET /api/requests/extra-users` - Listar solicitações de usuários extras
- `POST /api/requests/extra-users` - Criar solicitação
- `PATCH /api/requests/extra-users/:id/approve` - Aprovar (master only)
- `PATCH /api/requests/extra-users/:id/reject` - Rejeitar (master only)

- `GET /api/requests/exit` - Listar solicitações de saída
- `POST /api/requests/exit` - Criar solicitação
- `PATCH /api/requests/exit/:id/approve` - Aprovar (master only)
- `PATCH /api/requests/exit/:id/reject` - Rejeitar (master only)

- `GET /api/requests/suppliers` - Listar solicitações de fornecedores
- `POST /api/requests/suppliers` - Criar solicitação
- `PATCH /api/requests/suppliers/:id/approve` - Aprovar (master only)
- `PATCH /api/requests/suppliers/:id/reject` - Rejeitar (master only)

- `GET /api/requests/substances` - Listar sugestões de substâncias
- `POST /api/requests/substances` - Criar sugestão
- `PATCH /api/requests/substances/:id/approve` - Aprovar (master only)
- `PATCH /api/requests/substances/:id/reject` - Rejeitar (master only)

### Fornecedores
- `GET /api/suppliers` - Listar fornecedores do usuário
- `GET /api/suppliers/:id` - Obter fornecedor
- `POST /api/suppliers` - Criar fornecedor
- `PATCH /api/suppliers/:id` - Atualizar fornecedor
- `DELETE /api/suppliers/:id` - Deletar fornecedor

### Substâncias
- `GET /api/substances` - Listar substâncias
- `GET /api/substances/:id` - Obter substância
- `POST /api/substances` - Criar substância
- `PATCH /api/substances/:id` - Atualizar substância
- `DELETE /api/substances/:id` - Deletar substância

## 🗄️ Banco de Dados

O Prisma gerencia o schema do banco. Para fazer alterações:

1. Edite `prisma/schema.prisma`
2. Execute: `npm run prisma:migrate`
3. Gere o cliente: `npm run prisma:generate`

**Visualizar dados:**
```bash
npm run prisma:studio
```

## 🔒 Segurança

- Senhas são hasheadas com bcrypt
- JWT para autenticação
- Validação de roles (master, cooperado, padrao)
- CORS configurado
- Helmet para headers de segurança

## 📝 Notas

- As rotas de Marketplace, Quotations, Notifications, Financial e Voting estão como placeholders e podem ser implementadas conforme necessário.
- O sistema suporta múltiplos tipos de solicitações com workflow de aprovação/rejeição.
- Todos os dados são persistidos no MySQL.

## 🐛 Troubleshooting

**Erro de conexão com banco:**
- Verifique se o MySQL está rodando
- Confirme a `DATABASE_URL` no `.env`

**Erro de migração:**
- Certifique-se de que o banco existe
- Execute `npm run prisma:generate` antes das migrações

**Token inválido:**
- Verifique se o `JWT_SECRET` está configurado
- Tokens expiram em 7 dias (configurável)

## 📄 Licença

ISC
