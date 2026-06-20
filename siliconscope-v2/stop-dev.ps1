#!/usr/bin/env pwsh
# SiliconScope v2 停止脚本（PowerShell 版）

$ErrorActionPreference = "SilentlyContinue"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  SiliconScope v2 停止脚本" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# [1] 杀掉所有 Node 进程
Write-Host "[1] 停止所有 Node 进程..." -ForegroundColor Yellow

$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcs) {
    foreach ($proc in $nodeProcs) {
        Write-Host "    停止 node.exe (PID: $($proc.Id))" -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force
    }
    Write-Host "    node.exe 已停止" -ForegroundColor Green
} else {
    Write-Host "    node.exe 未运行" -ForegroundColor Gray
}

$replProcs = Get-Process -Name "node_repl" -ErrorAction SilentlyContinue
if ($replProcs) {
    foreach ($proc in $replProcs) {
        Write-Host "    停止 node_repl.exe (PID: $($proc.Id))" -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force
    }
    Write-Host "    node_repl.exe 已停止" -ForegroundColor Green
} else {
    Write-Host "    node_repl.exe 未运行" -ForegroundColor Gray
}

# [2] 检查端口状态
Write-Host ""
Write-Host "[2] 检查端口状态..." -ForegroundColor Yellow

$ports = @(8751, 5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "    端口 $port 仍被占用: $($proc.ProcessName) (PID: $($conn.OwningProcess))" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  SiliconScope v2 已停止！" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
