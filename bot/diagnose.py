"""Tekshiruv skripti: muhitni, tokenlarni, kutubxonalarni va shriftlarni tekshiradi.

Ishga tushirish:  python diagnose.py
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

if sys.platform == "win32":
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

BASE = Path(__file__).resolve().parent
ENV_FILE = BASE / ".env"

OK, WARN, ERR = "OK", "WARN", "XATO"


def status_print(tag: str, label: str, detail: str = "") -> None:
    print(f"[{tag:4s}] {label}{(' — ' + detail) if detail else ''}")


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if ENV_FILE.exists():
        text = ENV_FILE.read_text(encoding="utf-8-sig")
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def check_python() -> None:
    ver = sys.version_info
    tag = OK if ver >= (3, 11) else ERR
    status_print(tag, "Python versiyasi", f"{sys.version.split()[0]} (kerak: >= 3.11)")


def check_imports() -> None:
    mods = ["aiogram", "PIL", "aiohttp", "dotenv", "onnxruntime", "rembg"]
    for name in mods:
        try:
            __import__(name)
            status_print(OK, f"import {name}")
        except Exception as exc:  # noqa: BLE001
            level = ERR if name in ("aiogram", "PIL", "aiohttp", "dotenv") else WARN
            status_print(level, f"import {name}", f"{type(exc).__name__}: {exc}")


def check_env(env: dict[str, str]) -> None:
    status_print(OK if ENV_FILE.exists() else ERR, ".env fayli", "topildi" if ENV_FILE.exists() else "yo'q (copy .env.example .env)")
    token = env.get("BOT_TOKEN", "")
    status_print(OK if token else ERR, "BOT_TOKEN", "belgilangan" if token else "bo'sh")
    gem = env.get("GEMINI_API_KEY", "")
    status_print(OK if gem else WARN, "GEMINI_API_KEY", "belgilangan (AI matn)" if gem else "yo'q — fallback matn ishlatiladi")
    model = env.get("GEMINI_MODEL", "gemini-2.0-flash")
    status_print(OK, "GEMINI_MODEL", model)
    use_rembg = env.get("USE_REMBG", "1").lower() not in ("0", "false", "no")
    status_print(OK, "USE_REMBG", "yoqilgan" if use_rembg else "o'chirilgan")
    status_print(OK, "DEFAULT_LANG", env.get("DEFAULT_LANG", "uz"))
    status_print(OK, "MAX_PARALLEL", env.get("MAX_PARALLEL", "2"))


def check_fonts() -> None:
    required = ["Montserrat-Bold.ttf", "Montserrat-Medium.ttf"]
    fonts_dir = BASE / "fonts"
    for f in required:
        p = fonts_dir / f
        tag = OK if p.exists() else WARN
        status_print(tag, f"shrift {f}", "topildi" if p.exists() else "yo'q — fallback Arial/DejaVu ishlatiladi")


def check_getme(token: str) -> None:
    if not token:
        return
    url = f"https://api.telegram.org/bot{token}/getMe"
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data.get("ok"):
            u = data["result"]
            status_print(OK, "Telegram getMe", f"@{u.get('username')}")
        else:
            status_print(ERR, "Telegram getMe", str(data))
    except Exception as exc:  # noqa: BLE001
        status_print(ERR, "Telegram getMe", f"{type(exc).__name__}: {exc}")


def main() -> int:
    print("=" * 60)
    print("Diagnostika — Marketplace reklama-karta boti")
    print("=" * 60)
    check_python()
    check_imports()
    env = load_env()
    check_env(env)
    check_fonts()
    check_getme(env.get("BOT_TOKEN", ""))
    print("=" * 60)
    print("Agar hammasi OK bo'lsa: python bot.py (yoki run.bat)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
