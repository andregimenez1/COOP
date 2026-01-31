# Guia de Configuração do Backend com MySQL

## ✅ Passo 1: Arquivo .env criado

O arquivo `.env` já foi criado com a seguinte configuração:
```
DATABASE_URL="mysql://root@localhost:3306/magistral_connect"
```

## 📦 Passo 2: Instalar Dependências

Abra o PowerShell ou Terminal na pasta `backend` e execute:

```powershell
cd "c:\Users\NatuS ADM\Desktop\magistral-connect-79-main\backend"

# Desabilitar modo offline (se necessário)
$env:npm_config_offline = $null

# Instalar dependências
npm install
```

**Nota:** Se houver problemas de conexão/proxy, verifique:
- Sua conexão com a internet
- Configurações de proxy/firewall
- Execute como Administrador se necessário

## 🔧 Passo 3: Gerar Cliente Prisma

Após instalar as dependências, gere o cliente Prisma:

```powershell
npx prisma generate
```

## 🗄️ Passo 4: Criar Banco de Dados e Executar Migrações

Execute as migrações para criar o banco de dados e todas as tabelas:

```powershell
npx prisma migrate dev --name init
```

Este comando irá:
- Criar o banco de dados `magistral_connect` (se não existir)
- Criar todas as tabelas definidas no schema
- Aplicar todos os relacionamentos e índices

## ✅ Verificação

Após as migrações, você pode verificar o banco de dados:

### Opção 1: phpMyAdmin (XAMPP)
1. Acesse: http://localhost/phpmyadmin
2. Verifique se o banco `magistral_connect` foi criado
3. Verifique se todas as tabelas foram criadas

### Opção 2: Prisma Studio
```powershell
npm run prisma:studio
```
Isso abrirá uma interface visual para gerenciar o banco de dados.

## 🚀 Iniciar o Servidor

Após tudo configurado, inicie o servidor:

```powershell
npm run dev
```

O servidor estará rodando em: http://localhost:3001

## 📋 Resumo dos Comandos

```powershell
# 1. Instalar dependências
npm install

# 2. Gerar cliente Prisma
npx prisma generate

# 3. Criar banco e migrações
npx prisma migrate dev --name init

# 4. (Opcional) Abrir Prisma Studio
npm run prisma:studio

# 5. Iniciar servidor
npm run dev
```

## ⚠️ Solução de Problemas

### Erro: "ECONNREFUSED" ou problemas de conexão
- Verifique sua conexão com a internet
- Desabilite proxy temporariamente: `npm config delete proxy`
- Tente executar como Administrador

### Erro: "Cannot connect to MySQL"
- Verifique se o MySQL está rodando no XAMPP
- Verifique se a porta 3306 está livre
- Confirme que o usuário `root` não tem senha

### Erro: "Database does not exist"
- O Prisma criará automaticamente, mas você pode criar manualmente no phpMyAdmin:
  - Acesse phpMyAdmin
  - Crie um novo banco chamado `magistral_connect`
  - Execute novamente `npx prisma migrate dev`
