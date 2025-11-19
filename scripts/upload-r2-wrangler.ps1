# PowerShell script untuk upload folder ke R2 menggunakan Wrangler CLI
# Usage: .\scripts\upload-r2-wrangler.ps1 [folder_path]

param(
    [string]$Folder = "public",
    [string]$Bucket = "silverking-assets"
)

Write-Host "🚀 Uploading files to R2 using Wrangler CLI" -ForegroundColor Green
Write-Host "📁 Folder: $Folder" -ForegroundColor Cyan
Write-Host "📦 Bucket: $Bucket" -ForegroundColor Cyan
Write-Host ""

# Check if wrangler is installed
$wranglerInstalled = Get-Command wrangler -ErrorAction SilentlyContinue
if (-not $wranglerInstalled) {
    Write-Host "❌ Wrangler CLI not found!" -ForegroundColor Red
    Write-Host "💡 Install with: npm install -g wrangler" -ForegroundColor Yellow
    Write-Host "💡 Then login with: wrangler login" -ForegroundColor Yellow
    exit 1
}

# Get all files from folder
$files = Get-ChildItem -Path $Folder -Recurse -File
$total = $files.Count
$current = 0

Write-Host "📊 Found $total files to upload" -ForegroundColor Cyan
Write-Host ""

foreach ($file in $files) {
    $current++
    # Get relative path from public folder
    $relPath = $file.FullName.Replace((Resolve-Path $Folder).Path + "\", "")
    # Convert to R2 path format (forward slashes)
    $r2Path = "$Bucket/$($relPath.Replace('\', '/'))"
    
    Write-Host "[$current/$total] Uploading: $relPath" -ForegroundColor Yellow
    
    try {
        wrangler r2 object put $r2Path --file=$file.FullName | Out-Null
        Write-Host "   ✅ Success: $relPath" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Failed: $relPath - $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✨ Upload completed!" -ForegroundColor Green

