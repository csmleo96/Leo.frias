# Envia o Relatorio Executivo Diario
# Agendar no Windows Task Scheduler para rodar diariamente as 09:00

$url = "http://localhost:3000/api/reports/executive-daily-send"
$logFile = "$PSScriptRoot\report-log.txt"

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

try {
    $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 60
    $status = if ($response.ok) { "SUCESSO" } else { "FALHA" }
    Add-Content $logFile "[$timestamp] $status - Health: $($response.status) | Delivery: $($response.deliveryTime)ms"
    Write-Host "[$timestamp] Relatorio enviado com sucesso"
} catch {
    Add-Content $logFile "[$timestamp] ERRO - $($_.Exception.Message)"
    Write-Host "[$timestamp] Erro ao enviar relatorio: $($_.Exception.Message)"
}
