# Script para executar o seed do Prisma
# Preenche o banco de dados com usuários iniciais

Write-Host "🌱 Executando seed do Prisma..." -ForegroundColor Yellow
Write-Host ""

# Navegar para o diretório do backend
Set-Location $PSScriptRoot

# Verificar se o Prisma Client foi gerado
Write-Host "1. Verificando Prisma Client..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules/.prisma/client")) {
    Write-Host "   ⚠️  Prisma Client não encontrado. Gerando..." -ForegroundColor Yellow
    npx prisma generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Erro ao gerar Prisma Client" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ Prisma Client gerado" -ForegroundColor Green
} else {
    Write-Host "   ✅ Prisma Client já existe" -ForegroundColor Green
}

# Executar o seed
Write-Host ""
Write-Host "2. Executando seed..." -ForegroundColor Cyan
npm run prisma:seed

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Seed executado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usuários criados:" -ForegroundColor Cyan
    Write-Host "   - admin@magistral.com / admin123 (master)" -ForegroundColor White
    Write-Host "   - cooperado@magistral.com / coop123" -ForegroundColor White
    Write-Host "   - usuario@magistral.com / user123" -ForegroundColor White
    Write-Host "   - natural@magistral.com / natural123" -ForegroundColor White
    Write-Host "   - farmagna@magistral.com / farmagna123" -ForegroundColor White
    Write-Host "   - roseiras@magistral.com / roseiras123" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Agora você pode fazer login no sistema!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Erro ao executar seed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique:" -ForegroundColor Yellow
    Write-Host "   1. MySQL está rodando no XAMPP" -ForegroundColor White
    Write-Host "   2. O banco 'magistral_connect' existe" -ForegroundColor White
    Write-Host "   3. As migrações foram executadas (npx prisma migrate dev)" -ForegroundColor White
    Write-Host "   4. O arquivo .env está configurado corretamente" -ForegroundColor White
    exit 1
}
