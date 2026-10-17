"""Gemini API orqali reklama matnini JSON qilib olish + fallback.

Kalit bo'lmasa yoki API xato bersa, til uchun tayyor fallback matn qaytadi.
JSON parse ham chiqishdagi ```json fence'larni tozalaydi.
"""

from __future__ import annotations

import base64
import json
import os
import re

import aiohttp

import cards
from cards import CardSpec

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

LANG_NAMES = {
    "uz": "Uzbek language (Latin script). Use plain apostrophe ' for o'/g'/ng' style words, never ʻ or ’.",
    "ru": "Russian language.",
    "en": "English language.",
}


def _api_key() -> str:
    return os.getenv("GEMINI_API_KEY", "").strip()


def _model() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip() or "gemini-2.0-flash"


def ai_available() -> bool:
    return bool(_api_key())


def _build_prompt(hint: str, lang: str) -> str:
    lang_name = LANG_NAMES.get(lang, LANG_NAMES["en"])
    hint = cards.clean(hint or "")
    return (
        "You are an e-commerce marketing copywriter. Write card text for a marketplace "
        "product-photo infographic (Uzum / Wildberries style). "
        f"Language: {lang_name}\n"
        "Write a JSON object (and nothing else, no markdown) with EXACTLY this schema:\n"
        "{\n"
        '  "title": "max 3 words",\n'
        '  "subtitle": "max 6 words",\n'
        '  "badge": "max 2 words, prefer HIT / NEW / TOP / SALE",\n'
        '  "features": [ {"title": "max 2 words", "text": "max 4 words"} ],  // exactly 4 items\n'
        '  "stats": [ {"value": "e.g. 256 GB", "label": "e.g. Memory"} ]      // empty OR 3 OR 4 items\n'
        "}\n"
        "Rules:\n"
        "- features must contain exactly 4 items.\n"
        "- stats must be [] if unknown, otherwise 3 or 4 items with real numbers/units you actually see.\n"
        "- Use ONLY facts visible in the photo or given in the hint. Do NOT invent specifications, "
        "brands, warranties, certificates, discounts, or 'original/authentic' claims.\n"
        "- If the hint gives the product name, put the key selling point in title/subtitle.\n"
        "- No emoji. No trailing punctuation. Keep it short and punchy.\n"
        + (f"Product hint from user: {hint}" if hint else "No extra hint provided.")
    )


def _extract_json(text: str) -> dict | None:
    """```json fence'larini tozalaydi va JSON topadi."""
    if not text:
        return None
    t = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", t, re.DOTALL | re.IGNORECASE)
    if fence:
        t = fence.group(1).strip()
    t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.IGNORECASE).strip()
    t = re.sub(r"\s*```$", "", t).strip()
    try:
        obj = json.loads(t)
        return obj if isinstance(obj, dict) else None
    except json.JSONDecodeError:
        start, end = t.find("{"), t.rfind("}")
        if start != -1 and end > start:
            try:
                obj = json.loads(t[start : end + 1])
                return obj if isinstance(obj, dict) else None
            except json.JSONDecodeError:
                return None
    return None


async def generate_spec(
    preview_jpeg: bytes,
    hint: str,
    lang: str,
    temperature: float = 0.9,
) -> tuple[CardSpec, bool]:
    """Gemini'dan CardSpec oladi. Returns (spec, fallback_used)."""
    fallback = cards.default_spec(lang)
    key = _api_key()
    if not key:
        return fallback, True

    url = f"{GEMINI_BASE}/{_model()}:generateContent"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": _build_prompt(hint, lang)},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64.b64encode(preview_jpeg).decode("ascii"),
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": max(0.0, min(2.0, float(temperature))),
            "maxOutputTokens": 800,
            "responseMimeType": "application/json",
        },
    }

    timeout = aiohttp.ClientTimeout(total=60)
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, headers=headers, json=payload) as resp:
                body = await resp.json(content_type=None)
                if resp.status != 200:
                    return fallback, True
                candidates = body.get("candidates") or []
                if not candidates:
                    return fallback, True
                parts = (candidates[0].get("content") or {}).get("parts") or []
                text = "".join(p.get("text", "") for p in parts if isinstance(p, dict))
                data = _extract_json(text)
                if not data:
                    return fallback, True
                return cards.CardSpec.from_ai(data, fallback=fallback), False
    except Exception:
        return fallback, True
