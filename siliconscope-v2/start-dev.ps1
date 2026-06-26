#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"

function Start-NamedShell {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$WorkingPath,
    [Parameter(Mandatory = $true)][string]$Command
  )

  $escapedPath = $WorkingPath.Replace("'", "''")
  $escapedTitle = $Title.Replace("'", "''")
  $shellCommand = "`$host.UI.RawUI.WindowTitle = '$escapedTitle'; Set-Location -LiteralPath '$escapedPath'; $Command"

  Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $shellCommand
  )
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  SiliconScope v2 dev launcher" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Starting backend API..." -ForegroundColor Yellow
Start-NamedShell -Title "SiliconScope v2 Backend" -WorkingPath $BackendDir -Command "npx tsx watch src/index.ts"

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting frontend dev server..." -ForegroundColor Yellow
Start-NamedShell -Title "SiliconScope v2 Frontend" -WorkingPath $FrontendDir -Command "npm run dev"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  SiliconScope v2 is starting" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Backend API: http://127.0.0.1:8751" -ForegroundColor White
Write-Host "  Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter to close this launcher window. The service windows stay open." -ForegroundColor Gray
Read-Host
