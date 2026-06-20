@echo off
setlocal

echo =========================================
echo   SiliconScope v2 Stop
echo =========================================
echo.

echo [1] Stopping all Node processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% == 0 (
    echo   node.exe stopped.
) else (
    echo   node.exe not found.
)

taskkill /F /IM node_repl.exe >nul 2>&1
if %errorlevel% == 0 (
    echo   node_repl.exe stopped.
) else (
    echo   node_repl.exe not found.
)

echo.
echo [2] Checking port status...
echo   Backend 8751:
netstat -ano | findstr :8751

echo   Frontend 5173-5180:
netstat -ano | findstr ":517[3-6]"

echo.
echo Done.
echo.
pause
