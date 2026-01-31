# Guia de Otimização do Projeto

Este guia ajuda a reduzir o tamanho do projeto para facilitar a transferência entre computadores.

## 📦 Tamanho Atual do Projeto

- **Arquivo ZIP na raiz**: ~17 MB (deve ser removido do versionamento)
- **node_modules**: Pode ter centenas de MB (já está no .gitignore)

## ✅ O que fazer para reduzir o tamanho

### 1. **Remover arquivos desnecessários**

Execute estes comandos no PowerShell:

```powershell
# Remover o arquivo ZIP da raiz (já está no .gitignore agora)
Remove-Item "magistral-connect-79-main.zip" -ErrorAction SilentlyContinue

# Remover arquivos de lock duplicados (manter apenas um)
# Se usar npm, manter package-lock.json
# Se usar yarn, manter yarn.lock
# Se usar pnpm, manter pnpm-lock.yaml
# Se usar bun, manter bun.lockb
```

### 2. **Usar Git para versionamento (RECOMENDADO)**

**NÃO transfira o projeto inteiro via USB/Pen Drive!**

Use Git para sincronizar entre computadores:

```bash
# No computador 1 (atual)
git init
git add .
git commit -m "Initial commit"

# Criar repositório no GitHub/GitLab/Bitbucket
# Depois, no computador 2:
git clone <url-do-repositorio>
cd magistral-connect-79-main
npm install  # Instala apenas as dependências
```

**Vantagens:**
- ✅ Apenas código fonte é versionado (sem node_modules)
- ✅ Histórico de alterações
- ✅ Sincronização rápida via internet
- ✅ Backup automático na nuvem

### 3. **Se precisar transferir via USB/Pen Drive**

Crie um script para preparar o projeto:

```powershell
# Criar arquivo: preparar-transferencia.ps1

# Remover node_modules
Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue

# Remover dist/build
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "build" -ErrorAction SilentlyContinue

# Remover cache
Remove-Item -Recurse -Force ".vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".cache" -ErrorAction SilentlyContinue

# Remover arquivos temporários
Remove-Item "*.zip" -ErrorAction SilentlyContinue
Remove-Item "*.log" -ErrorAction SilentlyContinue

Write-Host "Projeto preparado para transferencia!" -ForegroundColor Green
Write-Host "Tamanho aproximado: ~5-10 MB (sem node_modules)" -ForegroundColor Yellow
```

**No computador de destino:**
```bash
npm install  # Instala as dependências
```

### 4. **Otimizar dependências**

Revise o `package.json` e remova dependências não utilizadas:

```bash
# Verificar dependências não utilizadas
npx depcheck

# Remover dependências não utilizadas manualmente
```

### 5. **Usar ferramentas de sincronização**

**Opções recomendadas:**

1. **Git + GitHub/GitLab** (Melhor opção)
   - Gratuito
   - Versionamento completo
   - Backup automático

2. **OneDrive / Google Drive / Dropbox**
   - Sincronização automática
   - Mas configure para ignorar node_modules

3. **VS Code Live Share** (para colaboração em tempo real)
   - Não precisa transferir arquivos
   - Trabalho colaborativo em tempo real

## 📊 Tamanho esperado após otimização

- **Código fonte apenas**: ~2-5 MB
- **Com node_modules**: ~100-300 MB (não versionar!)
- **Build (dist)**: ~5-20 MB (não versionar!)

## ⚠️ O que NUNCA versionar

- ❌ `node_modules/` (instalar com `npm install`)
- ❌ `dist/` ou `build/` (gerado automaticamente)
- ❌ `.vite/`, `.cache/` (cache de build)
- ❌ Arquivos `.zip`, `.rar` (arquivos de backup)
- ❌ `.env` com senhas/chaves
- ❌ Arquivos de log (`*.log`)

## 🚀 Comandos úteis

```bash
# Ver tamanho do projeto (sem node_modules)
du -sh . --exclude=node_modules

# Limpar cache do npm
npm cache clean --force

# Verificar tamanho de cada pasta
Get-ChildItem -Directory | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | 
             Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{
        Name = $_.Name
        SizeMB = [math]::Round($size / 1MB, 2)
    }
} | Sort-Object SizeMB -Descending
```

## 📝 Checklist antes de transferir

- [ ] Remover `node_modules/`
- [ ] Remover `dist/` ou `build/`
- [ ] Remover arquivos `.zip`, `.rar`
- [ ] Remover `.vite/`, `.cache/`
- [ ] Verificar que `.gitignore` está atualizado
- [ ] Se usar Git, fazer commit e push
- [ ] No destino, executar `npm install`
