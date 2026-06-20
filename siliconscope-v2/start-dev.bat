@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"

echo =========================================
echo   SiliconScope v2 Start
echo =========================================
echo.

echo [1/2] Starting backend...
start "SiliconScope Backend" /D "%BACKEND_DIR%" cmd /k npx tsx watch src/index.ts

timeout /t 2 /nobreak >nul

echo [2/2] Starting frontend...
start "SiliconScope Frontend" /D "%FRONTEND_DIR%" cmd /k npm run dev

echo.
echo =========================================
echo   SiliconScope v2 Started
echo =========================================
echo   Backend:  http://127.0.0.1:8751
echo   Frontend: http://localhost:5173
echo.
pause
