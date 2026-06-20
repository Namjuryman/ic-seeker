#!/usr/bin/env pwsh
# SiliconScope v2 启动脚本（PowerShell 版）

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  SiliconScope v2 启动脚本" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] 启动后端服务..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$BackendDir'; npx tsx watch src/index.ts"
) -Title "SiliconScope v2 Backend"

Start-Sleep -Seconds 2

Write-Host "[2/2] 启动前端服务..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$FrontendDir'; npm run dev"
) -Title "SiliconScope v2 Frontend"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  SiliconScope v2 已启动！" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  后端 API:  http://127.0.0.1:8751" -ForegroundColor White
Write-Host "  前端页面: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "按 Enter 键关闭此窗口（服务会在后台继续运行）" -ForegroundColor Gray
Read-Host
