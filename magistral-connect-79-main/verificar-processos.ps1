# Script para verificar processos Node.js duplicados
Write-Host "Verificando processos Node.js..." -ForegroundColor Cyan
Write-Host ""

# Verificar processos Node.js
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Processos Node.js encontrados:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($proc in $nodeProcesses) {
        Write-Host "  PID: $($proc.Id) | Iniciado: $($proc.StartTime)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Verificando portas em uso..." -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar porta 3001 (backend)
    $port3001 = netstat -ano | findstr ":3001" | findstr "LISTENING"
    if ($port3001) {
        $pid3001 = ($port3001 -split '\s+')[-1]
        Write-Host "  Porta 3001 (Backend): PID $pid3001" -ForegroundColor Green
    } else {
        Write-Host "  Porta 3001 (Backend): Nenhum processo" -ForegroundColor Red
    }
    
    # Verificar porta 8080 (frontend)
    $port8080 = netstat -ano | findstr ":8080" | findstr "LISTENING"
    if ($port8080) {
        $pid8080 = ($port8080 -split '\s+')[-1]
        Write-Host "  Porta 8080 (Frontend): PID $pid8080" -ForegroundColor Green
    } else {
        Write-Host "  Porta 8080 (Frontend): Nenhum processo" -ForegroundColor Red
    }
    
    # Verificar porta 5173 (Vite alternativo)
    $port5173 = netstat -ano | findstr ":5173" | findstr "LISTENING"
    if ($port5173) {
        $pid5173 = ($port5173 -split '\s+')[-1]
        Write-Host "  Porta 5173 (Vite): PID $pid5173" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Para encerrar processos duplicados:" -ForegroundColor Yellow
    Write-Host "  Stop-Process -Id <PID> -Force" -ForegroundColor Gray
    
} else {
    Write-Host "Nenhum processo Node.js encontrado" -ForegroundColor Red
}
