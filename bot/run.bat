@echo off
setlocal EnableExtensions
chcp 65001 > nul
cd /d "%~dp0"

echo ============================================================
echo  Marketplace reklama-karta boti — ishga tushirish (Windows)
echo ============================================================

REM --- virtual muhit yaratish ---
if not exist ".venv\Scripts\python.exe" (
  echo [1/4] virtual muhit yaratilmoqda...
  where py >nul 2>nul
  if not errorlevel 1 (
    py -3.11 -m venv .venv 2>nul || py -3 -m venv .venv
  ) else (
    python -m venv .venv
  )
) else (
  echo [1/4] .venv tayyor.
)

set "PY=.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=python"

echo [2/4] kutubxonalar o'rnatilmoqda...
"%PY%" -m pip install --upgrade pip -q
"%PY%" -m pip install -r requirements.txt

REM --- .env yaratish (agar yo'q bo'lsa) ---
if not exist ".env" (
  echo [3/4] .env nusxa olindi — ichiga BOT_TOKEN yozing.
  copy /Y ".env.example" ".env" > nul
) else (
  echo [3/4] .env tayyor.
)

echo [4/4] diagnostika...
"%PY%" diagnose.py

echo.
echo Bot ishga tushirilmoqda. To'xtatish: Ctrl+C
"%PY%" bot.py

echo.
pause
endlocal
