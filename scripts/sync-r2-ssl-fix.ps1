# PowerShell script untuk fix SSL issue sementara
# Usage: .\scripts\sync-r2-ssl-fix.ps1

Write-Host "🔧 Running R2 sync with SSL workaround..." -ForegroundColor Yellow
Write-Host "⚠️  WARNING: This temporarily disables SSL verification (for testing only!)" -ForegroundColor Red
Write-Host ""

# Set environment variable untuk menonaktifkan SSL verification sementara
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"

try {
    # Jalankan sync
    npm run r2:sync
    
    Write-Host ""
    Write-Host "✅ Sync completed!" -ForegroundColor Green
} finally {
    # Unset environment variable setelah selesai
    Remove-Item Env:\NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue
    Write-Host ""
    Write-Host "🔒 SSL verification restored" -ForegroundColor Green
}

