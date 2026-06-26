@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"
set "BACKEND_URL=http://127.0.0.1:8751"
set "FRONTEND_URL=http://localhost:5173"
set "ADMIN_URL=http://localhost:5173/admin"

echo =========================================
echo   SiliconScope v2 Start
echo =========================================
echo.

echo [1/3] Starting backend...
start "SiliconScope Backend" /D "%BACKEND_DIR%" cmd /k set IC_SEEKER_LOCAL_ADMIN=1 ^&^& npx tsx watch src/index.ts

timeout /t 2 /nobreak >nul

echo [2/3] Starting frontend...
start "SiliconScope Frontend" /D "%FRONTEND_DIR%" cmd /k npm run dev

timeout /t 3 /nobreak >nul

echo [3/3] Opening frontend and admin console...
start "" "%FRONTEND_URL%"
start "" "%ADMIN_URL%"

echo.
echo =========================================
echo   SiliconScope v2 Started
echo =========================================
echo   Backend:       %BACKEND_URL%
echo   Frontend:      %FRONTEND_URL%
echo   Admin Console: %ADMIN_URL%
echo.
pause
