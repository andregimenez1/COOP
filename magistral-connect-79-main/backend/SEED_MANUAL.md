# Como Executar o Seed Manualmente

Se o script automático não funcionar, siga estes passos:

## 1. Verificar se o banco existe

No phpMyAdmin (http://localhost/phpmyadmin):
- Verifique se o banco `magistral_connect` existe
- Se não existir, crie manualmente ou execute: `npx prisma migrate dev`

## 2. Gerar Prisma Client

```powershell
cd backend
npx prisma generate
```

## 3. Executar Migrações (se necessário)

```powershell
npx prisma migrate dev --name init
```

## 4. Executar o Seed

**Opção A - Via npm:**
```powershell
npm run prisma:seed
```

**Opção B - Via npx diretamente:**
```powershell
npx tsx prisma/seed.ts
```

**Opção C - Via Prisma (se configurado):**
```powershell
npx prisma db seed
```

## 5. Verificar no phpMyAdmin

Após executar o seed, verifique a tabela `User` no phpMyAdmin:
- Deve ter 6 usuários criados
- Emails: admin@magistral.com, cooperado@magistral.com, etc.

## Troubleshooting

### Erro "EPERM" ou permissão negada:
- Feche outros terminais/processos Node.js
- Execute o PowerShell como Administrador
- Tente executar diretamente: `node --loader tsx/esm prisma/seed.ts`

### Erro de conexão com MySQL:
- Verifique se o MySQL está rodando no XAMPP
- Verifique o arquivo `.env` - DATABASE_URL deve ser: `mysql://root@localhost:3306/magistral_connect`
- Teste a conexão: `npx prisma studio` (deve abrir o Prisma Studio)

### Tabela não existe:
- Execute primeiro: `npx prisma migrate dev --name init`
- Isso cria todas as tabelas no banco
