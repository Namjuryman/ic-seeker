@echo off
cd /d "%~dp0"
start "" /min node .\ic_seeker\server.mjs
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8750"
