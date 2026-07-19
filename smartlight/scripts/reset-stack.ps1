<#
.SYNOPSIS
  Reset toàn bộ SmartLight Docker stack (database + seed lại dữ liệu).

.DESCRIPTION
  Script này sẽ:
    1. Dừng và xóa toàn bộ containers, networks, volumes của docker compose.
    2. Build lại images.
    3. Khởi động lại stack (postgres + redis + api + web + admin + ...).
    4. Đợi Postgres + API sẵn sàng.
    5. Đẩy schema lên database (tạo tất cả bảng).
    6. Chạy seed đầy đủ (admin + customer demo + sản phẩm + inventory + voucher).

.EXAMPLE
  PS> .\scripts\reset-stack.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

function Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

Step "1/6 Đang dừng và xóa containers + volumes..."
docker compose down -v

Step "2/6 Đang build images..."
docker compose build

Step "3/6 Đang khởi động stack..."
docker compose up -d

Step "4/6 Đang đợi Postgres sẵn sàng..."
$ready = $false
for ($i = 1; $i -le 60; $i++) {
    try {
        docker compose exec -T postgres pg_isready -U smartlight -d smartlight 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    } catch { }
    Write-Host "    waiting postgres... ($i/60)"
    Start-Sleep -Seconds 2
}
if (-not $ready) {
    Write-Host "[!] Postgres chưa sẵn sàng sau 120s. Kiểm tra: docker compose logs postgres" -ForegroundColor Red
    exit 1
}

Step "5/6 Đang đợi API sẵn sàng..."
$apiReady = $false
for ($i = 1; $i -le 60; $i++) {
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:4000/health' -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $apiReady = $true; break }
    } catch { }
    Write-Host "    waiting api... ($i/60)"
    Start-Sleep -Seconds 2
}
if (-not $apiReady) {
    Write-Host "[!] API chưa sẵn sàng sau 120s. Kiểm tra: docker compose logs api" -ForegroundColor Red
    exit 1
}

Step "6/6 Đang đẩy schema + seed dữ liệu mẫu..."
Set-Location (Join-Path $root 'apps/api')
pnpm exec prisma db push --skip-generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] prisma db push thất bại" -ForegroundColor Red
    exit 1
}

# Install DB triggers / functions that Prisma schema cannot express.
$triggers = Join-Path $root 'apps/api/prisma/sql/triggers.sql'
if (Test-Path $triggers) {
    docker compose cp $triggers postgres:/tmp/triggers.sql | Out-Null
    docker compose exec -T postgres psql -U smartlight -d smartlight -v ON_ERROR_STOP=1 -f /tmp/triggers.sql | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] apply triggers.sql thất bại" -ForegroundColor Red
        exit 1
    }
}

pnpm exec ts-node -r tsconfig-paths/register --transpile-only --project tsconfig.json prisma/seed.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] seed thất bại" -ForegroundColor Red
    exit 1
}

Set-Location $root
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Stack đã sẵn sàng!" -ForegroundColor Green
Write-Host "  Admin:    admin@smartlight.vn   / Admin@SmartLight2026" -ForegroundColor Green
Write-Host "  Customer: customer@smartlight.vn / Customer@SmartLight2026" -ForegroundColor Green
Write-Host "  Web:      http://localhost:3000" -ForegroundColor Green
Write-Host "  Admin UI: http://localhost:5173" -ForegroundColor Green
Write-Host "  API:      http://localhost:4000/api/docs" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
