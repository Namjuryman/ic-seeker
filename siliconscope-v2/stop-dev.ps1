#!/usr/bin/env pwsh

$ErrorActionPreference = "SilentlyContinue"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  SiliconScope v2 Stop" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$ports = @(8751, 5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180)
$stopped = New-Object System.Collections.Generic.HashSet[int]

Write-Host "[1] Stopping SiliconScope dev servers by port..." -ForegroundColor Yellow

foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Host "    port ${port}: not running" -ForegroundColor DarkGray
    continue
  }

  foreach ($connection in $connections) {
    $pid = [int]$connection.OwningProcess
    if ($pid -le 0 -or $stopped.Contains($pid)) {
      continue
    }

    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Host "    stopping port $port -> $($proc.ProcessName).exe (PID: $pid)" -ForegroundColor Gray
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
      [void]$stopped.Add($pid)
    }
  }
}

Write-Host ""
Write-Host "[2] Closing leftover SiliconScope dev windows..." -ForegroundColor Yellow

$titles = @(
  "SiliconScope v2 Backend",
  "SiliconScope v2 Frontend",
  "SiliconScope v2 Admin"
)

$closedWindows = 0
Get-Process -Name powershell, pwsh -ErrorAction SilentlyContinue |
  Where-Object { $titles -contains $_.MainWindowTitle } |
  ForEach-Object {
    Write-Host "    closing $($_.MainWindowTitle) (PID: $($_.Id))" -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    $closedWindows += 1
  }

if ($closedWindows -eq 0) {
  Write-Host "    no leftover dev windows" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "[3] Checking ports..." -ForegroundColor Yellow

$busy = $false
foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($connections) {
    $busy = $true
    foreach ($connection in $connections) {
      $proc = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
      Write-Host "    port ${port} still busy: $($proc.ProcessName) (PID: $($connection.OwningProcess))" -ForegroundColor Red
    }
  }
}

if (-not $busy) {
  Write-Host "    all SiliconScope dev ports are free" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
