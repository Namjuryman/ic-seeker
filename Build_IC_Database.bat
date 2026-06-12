@echo off
cd /d "%~dp0"
node .\scripts\build-ic-database.mjs --years=2016-2026 --max-per-venue-year=500 --max-per-venue=6000 --no-source-backfill
pause
