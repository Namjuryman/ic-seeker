@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"
set "ADMIN_DIR=%SCRIPT_DIR%frontend-admin"
set "BACKEND_URL=http://127.0.0.1:8751"
set "FRONTEND_URL=http://localhost:5173"
set "ADMIN_URL=http://localhost:5176"

echo =========================================
echo   SiliconScope v2 Start
echo =========================================
echo.

echo [1/4] Starting backend...
start "SiliconScope Backend" /D "%BACKEND_DIR%" cmd /k set IC_SEEKER_LOCAL_ADMIN=1 ^&^& npx tsx watch src/index.ts

timeout /t 2 /nobreak >nul

echo [2/4] Starting public frontend...
start "SiliconScope Frontend" /D "%FRONTEND_DIR%" cmd /k npm run dev

timeout /t 1 /nobreak >nul

echo [3/4] Starting independent admin frontend...
start "SiliconScope Admin" /D "%ADMIN_DIR%" cmd /k npm run dev

timeout /t 3 /nobreak >nul

echo [4/4] Opening frontend and admin console...
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
