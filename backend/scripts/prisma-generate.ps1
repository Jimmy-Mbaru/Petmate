# Stop Node processes that may be locking the Prisma engine, then run prisma generate.
# Use when you get EPERM on "query_engine-windows.dll.node" (e.g. dev server was running).
# After this runs, start the dev server again: npm run start:dev

$ErrorActionPreference = "Stop"
Write-Host "Stopping Node processes to release Prisma engine lock..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "Running prisma generate..." -ForegroundColor Cyan
Set-Location $PSScriptRoot\..
npx prisma generate
if ($LASTEXITCODE -eq 0) {
  Write-Host "Done. You can run 'npm run start:dev' again." -ForegroundColor Green
}
