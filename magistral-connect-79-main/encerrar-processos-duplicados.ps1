# Script para encerrar processos Node.js duplicados
Write-Host "Encerrando processos Node.js duplicados..." -ForegroundColor Yellow
Write-Host ""

# Verificar processos Node.js
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if (-not $nodeProcesses) {
    Write-Host "Nenhum processo Node.js encontrado." -ForegroundColor Green
    exit
}

# Identificar processos do Cursor (helpers) - NÃO encerrar
$cursorProcesses = $nodeProcesses | Where-Object { $_.Path -like "*cursor*" }

# Identificar processos que NÃO são do Cursor
$otherProcesses = $nodeProcesses | Where-Object { $_.Path -notlike "*cursor*" }

Write-Host "Processos do Cursor (serao mantidos):" -ForegroundColor Cyan
foreach ($proc in $cursorProcesses) {
    Write-Host "  PID: $($proc.Id) - MANTIDO" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Processos Node.js encontrados (nao-Cursor):" -ForegroundColor Yellow
foreach ($proc in $otherProcesses) {
    Write-Host "  PID: $($proc.Id) | Iniciado: $($proc.StartTime)" -ForegroundColor White
}

Write-Host ""

# Verificar portas
$port3001 = netstat -ano | findstr ":3001" | findstr "LISTENING"
$port8080 = netstat -ano | findstr ":8080" | findstr "LISTENING"

$pid3001 = $null
$pid8080 = $null

if ($port3001) {
    $pid3001 = ($port3001 -split '\s+')[-1]
    Write-Host "Porta 3001 (Backend): PID $pid3001 - MANTIDO" -ForegroundColor Green
}

if ($port8080) {
    $pid8080 = ($port8080 -split '\s+')[-1]
    Write-Host "Porta 8080 (Frontend): PID $pid8080 - MANTIDO" -ForegroundColor Green
}

Write-Host ""

# Encerrar processos que nao sao do Cursor e nao estao usando portas importantes
$toKill = $otherProcesses | Where-Object { 
    $_.Id -ne $pid3001 -and $_.Id -ne $pid8080 
}

if ($toKill) {
    Write-Host "Encerrando processos duplicados:" -ForegroundColor Red
    foreach ($proc in $toKill) {
        Write-Host "  Encerrando PID: $($proc.Id)..." -ForegroundColor Yellow
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
            Write-Host "    OK - Processo $($proc.Id) encerrado" -ForegroundColor Green
        } catch {
            Write-Host "    ERRO - Nao foi possivel encerrar PID $($proc.Id)" -ForegroundColor Red
        }
    }
    Write-Host ""
    Write-Host "Processos duplicados encerrados!" -ForegroundColor Green
} else {
    Write-Host "Nenhum processo duplicado encontrado para encerrar." -ForegroundColor Green
    Write-Host "Todos os processos parecem ser necessarios." -ForegroundColor Green
}

Write-Host ""
Write-Host "Processos restantes:" -ForegroundColor Cyan
$remaining = Get-Process -Name node -ErrorAction SilentlyContinue
foreach ($proc in $remaining) {
    Write-Host "  PID: $($proc.Id)" -ForegroundColor White
}
