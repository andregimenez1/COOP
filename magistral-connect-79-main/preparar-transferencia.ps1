# Script para preparar o projeto para transferência
# Remove arquivos desnecessários que podem ser regenerados

Write-Host "Preparando projeto para transferencia..." -ForegroundColor Cyan

# Remover node_modules
if (Test-Path "node_modules") {
    Write-Host "Removendo node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
    Write-Host "✓ node_modules removido" -ForegroundColor Green
}

# Remover dist/build
if (Test-Path "dist") {
    Write-Host "Removendo dist..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
    Write-Host "✓ dist removido" -ForegroundColor Green
}

if (Test-Path "build") {
    Write-Host "Removendo build..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "build" -ErrorAction SilentlyContinue
    Write-Host "✓ build removido" -ForegroundColor Green
}

# Remover cache
if (Test-Path ".vite") {
    Write-Host "Removendo .vite..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".vite" -ErrorAction SilentlyContinue
    Write-Host "✓ .vite removido" -ForegroundColor Green
}

if (Test-Path ".cache") {
    Write-Host "Removendo .cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".cache" -ErrorAction SilentlyContinue
    Write-Host "✓ .cache removido" -ForegroundColor Green
}

# Remover arquivos ZIP
$zipFiles = Get-ChildItem -Filter "*.zip" -ErrorAction SilentlyContinue
if ($zipFiles) {
    Write-Host "Removendo arquivos ZIP..." -ForegroundColor Yellow
    $zipFiles | Remove-Item -Force
    Write-Host "✓ Arquivos ZIP removidos" -ForegroundColor Green
}

# Remover logs
$logFiles = Get-ChildItem -Filter "*.log" -Recurse -ErrorAction SilentlyContinue
if ($logFiles) {
    Write-Host "Removendo arquivos de log..." -ForegroundColor Yellow
    $logFiles | Remove-Item -Force
    Write-Host "✓ Logs removidos" -ForegroundColor Green
}

# Calcular tamanho final
$totalSize = (Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue | 
              Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($totalSize / 1MB, 2)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Projeto preparado para transferencia!" -ForegroundColor Green
Write-Host "Tamanho aproximado: $sizeMB MB" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "No computador de destino, execute:" -ForegroundColor Cyan
Write-Host "  npm install" -ForegroundColor White
Write-Host "  (ou yarn install / pnpm install)" -ForegroundColor DarkGray
