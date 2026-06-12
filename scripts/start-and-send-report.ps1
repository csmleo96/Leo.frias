# CS Cockpit — Inicia servidor se necessario e envia Relatorio Executivo Diario
# Agendado via Windows Task Scheduler para 09:00 diariamente

$projectDir = "C:\Users\Frias\CSM LEO\leonardo-cs-cockpit"
$logFile = "$projectDir\scripts\report-log.txt"
$url = "http://localhost:3000/api/reports/executive-daily-send"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Write-Log($msg) {
    Add-Content $logFile "[$timestamp] $msg"
    Write-Host "[$timestamp] $msg"
}

# 1. Verificar se servidor esta rodando
$serverRunning = $false
try {
    $check = Invoke-WebRequest -Uri "http://localhost:3000/" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    $serverRunning = $true
    Write-Log "Servidor ja esta rodando"
} catch {
    Write-Log "Servidor offline — iniciando..."
}

# 2. Iniciar servidor se necessario
if (-not $serverRunning) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$projectDir`" && npm run dev" -WindowStyle Hidden
    Write-Log "Servidor iniciado, aguardando 30 segundos..."
    Start-Sleep -Seconds 30

    # Verificar se subiu
    $retries = 0
    while ($retries -lt 6) {
        try {
            Invoke-WebRequest -Uri "http://localhost:3000/" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop | Out-Null
            Write-Log "Servidor pronto"
            $serverRunning = $true
            break
        } catch {
            $retries++
            Write-Log "Aguardando servidor... tentativa $retries/6"
            Start-Sleep -Seconds 10
        }
    }
}

if (-not $serverRunning) {
    Write-Log "ERRO - Servidor nao respondeu apos 90 segundos"
    exit 1
}

# 3. Enviar relatorio
try {
    $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 90
    if ($response.ok) {
        Write-Log "SUCESSO - Health: $($response.status) | Delivery: $($response.deliveryTime)ms | Destinatario: $($response.email)"
    } else {
        Write-Log "FALHA - $($response | ConvertTo-Json -Compress)"
    }
} catch {
    Write-Log "ERRO - $($_.Exception.Message)"
    exit 1
}
