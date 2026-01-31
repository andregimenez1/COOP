# Script Manual de Setup - Execute passo a passo
# Se o npm install automático não funcionar, execute cada comando manualmente

Write-Host "=== Setup Manual do Backend ===" -ForegroundColor Cyan
Write-Host "`nExecute os comandos abaixo UM POR VEZ no PowerShell:" -ForegroundColor Yellow

Write-Host "`n1. Limpar configurações problemáticas:" -ForegroundColor Green
Write-Host '   $env:npm_config_offline = $null' -ForegroundColor White
Write-Host '   npm config delete proxy' -ForegroundColor White
Write-Host '   npm config delete https-proxy' -ForegroundColor White

Write-Host "`n2. Instalar dependências:" -ForegroundColor Green
Write-Host '   npm install' -ForegroundColor White

Write-Host "`n3. Gerar cliente Prisma:" -ForegroundColor Green
Write-Host '   npx prisma generate' -ForegroundColor White

Write-Host "`n4. Criar banco e migrações:" -ForegroundColor Green
Write-Host '   npx prisma migrate dev --name init' -ForegroundColor White

Write-Host "`n5. (Opcional) Abrir Prisma Studio:" -ForegroundColor Green
Write-Host '   npm run prisma:studio' -ForegroundColor White

Write-Host "`n6. Iniciar servidor:" -ForegroundColor Green
Write-Host '   npm run dev' -ForegroundColor White

Write-Host "`n=== Verifique o arquivo SETUP_MYSQL.md para mais detalhes ===" -ForegroundColor Cyan
