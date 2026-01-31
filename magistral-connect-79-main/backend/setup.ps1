# Script de configuração do Backend - Magistral Connect
Write-Host "=== Configurando Backend com MySQL ===" -ForegroundColor Cyan

# Desabilitar modo offline do npm
$env:npm_config_offline = $null
Remove-Item Env:\npm_config_offline -ErrorAction SilentlyContinue

# Navegar para o diretório do backend
Set-Location $PSScriptRoot

Write-Host "`n1. Instalando dependências..." -ForegroundColor Yellow
npm install --offline=false --prefer-online

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao instalar dependências. Tentando continuar..." -ForegroundColor Red
}

Write-Host "`n2. Gerando cliente Prisma..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao gerar cliente Prisma!" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Criando banco de dados e executando migrações..." -ForegroundColor Yellow
npx prisma migrate dev --name init

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao executar migrações!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Configuração concluída com sucesso! ===" -ForegroundColor Green
Write-Host "`nPróximos passos:" -ForegroundColor Cyan
Write-Host "  - Execute 'npm run dev' para iniciar o servidor" -ForegroundColor White
Write-Host "  - Execute 'npm run prisma:studio' para abrir o Prisma Studio" -ForegroundColor White
