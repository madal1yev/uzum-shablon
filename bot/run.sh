#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "============================================================"
echo " Marketplace reklama-karta boti — ishga tushirish (Linux/macOS)"
echo "============================================================"

# --- virtual muhit ---
if [ ! -f ".venv/bin/python" ]; then
  echo "[1/4] virtual muhit yaratilmoqda..."
  python3 -m venv .venv
else
  echo "[1/4] .venv tayyor."
fi

PY=".venv/bin/python"
[ -x "$PY" ] || PY="python3"

echo "[2/4] kutubxonalar o'rnatilmoqda..."
"$PY" -m pip install --upgrade pip -q
"$PY" -m pip install -r requirements.txt

# --- .env ---
if [ ! -f ".env" ]; then
  echo "[3/4] .env nusxa olindi — ichiga BOT_TOKEN yozing."
  cp ".env.example" ".env"
else
  echo "[3/4] .env tayyor."
fi

echo "[4/4] diagnostika..."
"$PY" diagnose.py

echo
echo "Bot ishga tushirilmoqda. To'xtatish: Ctrl+C"
"$PY" bot.py
