"""Telegram bot: aiogram 3.x, polling. Mahsulot rasmin reklama kartochkasiga aylantiradi.

Ishga tushirish:  python bot.py
Og'ir ishlar (rembg, Pillow render, ZIP) asyncio.to_thread + Semaphore orqali.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

# Windows: konsolga utf-8
if sys.platform == "win32":
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env", encoding="utf-8-sig")

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    BufferedInputFile,
    CallbackQuery,
    FSInputFile,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

import ai
import cards
import imaging
import i18n
from cards import CardSpec, ProductAsset

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger("bot")

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
DEFAULT_LANG = os.getenv("DEFAULT_LANG", "uz").strip() or "uz"
USE_REMBG = os.getenv("USE_REMBG", "1").strip().lower() not in ("0", "false", "no", "")
MAX_PARALLEL = max(1, int(os.getenv("MAX_PARALLEL", "2") or "2"))

# Telegram cheklovlari: botdan yuklab olish ≤ 20 MB, hujjat ≤ 50 MB.
# Katta rasmlarni 2400 px gacha kichraytirish imaging.MAX_SIDE da.

bot = Bot(token=BOT_TOKEN, parse_mode=None) if BOT_TOKEN else None
dp = Dispatcher()
sessions: dict[int, "Session"] = {}
SEM = asyncio.Semaphore(MAX_PARALLEL)

SIZES: dict[str, tuple[int, int]] = {
    "1080x1440": (1080, 1440),
    "1080x1080": (1080, 1080),
    "1080x1350": (1080, 1350),
    "1080x1920": (1080, 1920),
}
SIZE_ORDER = list(SIZES.keys())
SIZE_LABELS = {
    "1080x1440": "size_uzum",
    "1080x1080": "size_square",
    "1080x1350": "size_ig",
    "1080x1920": "size_stories",
}


@dataclass
class Session:
    lang: str = DEFAULT_LANG
    photo_bytes: bytes = b""
    asset: ProductAsset | None = None
    spec: CardSpec | None = None
    hint: str = ""
    width: int = 1080
    height: int = 1440
    template_index: int = 0
    fallback_used: bool = False
    awaiting_custom_size: bool = False
    last_image: bytes | None = None  # oxirgi JPEG, "Fayl" uchun


def get_session(user_id: int) -> Session:
    s = sessions.get(user_id)
    if s is None:
        s = Session()
        sessions[user_id] = s
    return s


# ---------------------------------------------------------------------------
# Klaviaturalar
# ---------------------------------------------------------------------------


def lang_keyboard() -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🇺🇿 O'zbekcha", callback_data="lang:uz"),
                InlineKeyboardButton(text="🇷🇺 Русский", callback_data="lang:ru"),
                InlineKeyboardButton(text="🇬🇧 English", callback_data="lang:en"),
            ]
        ]
    )
    return kb


def size_keyboard(lang: str) -> InlineKeyboardMarkup:
    rows = []
    for key in SIZE_ORDER:
        rows.append([InlineKeyboardButton(text=i18n.t(lang, SIZE_LABELS[key]), callback_data=f"size:{key}")])
    rows.append([InlineKeyboardButton(text=i18n.t(lang, "size_custom"), callback_data="size:custom")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def actions_keyboard(lang: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=i18n.t(lang, "act_variant"), callback_data="act:variant"),
                InlineKeyboardButton(text=i18n.t(lang, "act_text"), callback_data="act:text"),
            ],
            [
                InlineKeyboardButton(text=i18n.t(lang, "act_file"), callback_data="act:file"),
                InlineKeyboardButton(text=i18n.t(lang, "act_zip"), callback_data="act:zip"),
            ],
            [InlineKeyboardButton(text=i18n.t(lang, "act_size"), callback_data="act:size")],
        ]
    )
    return kb


# ---------------------------------------------------------------------------
# Yordamchi: rasm render + yuborish
# ---------------------------------------------------------------------------


def _render(session: Session, template_key: str, width: int, height: int) -> bytes:
    img = imaging.render_card(session.asset, session.spec, template_key, width, height)
    return imaging.to_jpeg_bytes(img, 92)


async def send_card(target, session: Session, caption: str | None = None) -> None:
    template_key = cards.TEMPLATE_ORDER[session.template_index % len(cards.TEMPLATE_ORDER)]
    jpeg = await asyncio.to_thread(_render, session, template_key, session.width, session.height)
    session.last_image = jpeg
    name = imaging.render_card_name(template_key, session.width, session.height, session.template_index + 1)
    if bot is None:
        return
    await bot.send_photo(
        chat_id=target if isinstance(target, int) else target.chat.id,
        photo=BufferedInputFile(jpeg, filename=name),
        caption=caption,
        reply_markup=actions_keyboard(session.lang),
    )


async def process_product(target_chat: int, session: Session, photo_bytes: bytes, hint: str) -> None:
    session.photo_bytes = photo_bytes
    session.hint = cards.clean(hint or session.hint or "")
    status = None
    if bot is not None:
        status = await bot.send_message(target_chat, i18n.t(session.lang, "preparing"))

    async with SEM:
        asset = await asyncio.to_thread(imaging.prepare_product_sync, photo_bytes, USE_REMBG)
        spec, fallback_used = await ai.generate_spec(asset.preview_jpeg, session.hint, session.lang)
    session.asset = asset
    session.spec = spec
    session.fallback_used = fallback_used

    caption = None
    if fallback_used:
        caption = i18n.t(session.lang, "ai_fallback")

    if bot is None:
        return
    if status is not None:
        await status.edit_text(
            i18n.t(session.lang, "choose_size"), reply_markup=size_keyboard(session.lang)
        )
    else:
        await bot.send_message(
            target_chat, i18n.t(session.lang, "choose_size"), reply_markup=size_keyboard(session.lang)
        )
    if caption:
        await bot.send_message(target_chat, caption)


async def regenerate_text_and_resend(target_chat: int, session: Session) -> None:
    if session.asset is None:
        return
    await bot.send_message(target_chat, i18n.t(session.lang, "preparing"))
    async with SEM:
        spec, fallback_used = await ai.generate_spec(
            session.asset.preview_jpeg, session.hint, session.lang, temperature=1.05
        )
    session.spec = spec
    session.fallback_used = fallback_used
    await send_card(target_chat, session)
    if fallback_used:
        await bot.send_message(target_chat, i18n.t(session.lang, "ai_fallback"))
    else:
        await bot.send_message(target_chat, i18n.t(session.lang, "new_text_done"))


# ---------------------------------------------------------------------------
# Handlerlar
# ---------------------------------------------------------------------------


@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    s = get_session(message.from_user.id)
    s.lang = DEFAULT_LANG
    await message.answer(i18n.t(s.lang, "choose_lang"), reply_markup=lang_keyboard())


@dp.message(Command("cancel"))
async def cmd_cancel(message: Message) -> None:
    s = get_session(message.from_user.id)
    s.awaiting_custom_size = False
    await message.answer(i18n.t(s.lang, "lang_set"))


@dp.callback_query(F.data.startswith("lang:"))
async def cb_lang(call: CallbackQuery) -> None:
    lang = call.data.split(":", 1)[1]
    if lang not in i18n.LANGS:
        lang = DEFAULT_LANG
    s = get_session(call.from_user.id)
    s.lang = lang
    await call.answer()
    await call.message.answer(i18n.t(lang, "lang_set"))
    await call.message.answer(i18n.t(lang, "send_photo"))


async def _download_photo(message: Message) -> bytes | None:
    if message.photo:
        file_id = message.photo[-1].file_id
    elif message.document and (message.document.mime_type or "").startswith("image/"):
        file_id = message.document.file_id
    else:
        return None
    if bot is None:
        return None
    tg_file = await bot.get_file(file_id)
    data = await bot.download(tg_file)
    return bytes(data.read()) if hasattr(data, "read") else bytes(data)


@dp.message(F.photo | F.document)
async def on_photo(message: Message) -> None:
    s = get_session(message.from_user.id)
    photo = await _download_photo(message)
    if photo is None:
        await message.answer(i18n.t(s.lang, "send_photo"))
        return
    await message.answer(i18n.t(s.lang, "photo_received"))
    hint = message.caption or s.hint
    await process_product(message.chat.id, s, photo, hint)


@dp.message(F.text)
async def on_text(message: Message) -> None:
    s = get_session(message.from_user.id)
    text = (message.text or "").strip()

    if s.awaiting_custom_size:
        m = re.match(r"^(\d{3,4})\s*[x×*]\s*(\d{3,4})$", text, re.IGNORECASE)
        if not m:
            await message.answer(i18n.t(s.lang, "custom_invalid"))
            return
        w, h = int(m.group(1)), int(m.group(2))
        if not (300 <= w <= 4000 and 300 <= h <= 4000):
            await message.answer(i18n.t(s.lang, "custom_invalid"))
            return
        s.awaiting_custom_size = False
        s.width, s.height = w, h
        if s.asset is not None:
            await send_card(message.chat.id, s)
        return

    if s.asset is not None:
        # matn = yangi hint, karta qayta yaratiladi
        s.hint = cards.clean(text)
        await message.answer(i18n.t(s.lang, "new_hint"))
        async with SEM:
            spec, fb = await ai.generate_spec(s.asset.preview_jpeg, s.hint, s.lang)
        s.spec = spec
        s.fallback_used = fb
        await send_card(message.chat.id, s)
        if fb:
            await message.answer(i18n.t(s.lang, "ai_fallback"))
        return

    await message.answer(i18n.t(s.lang, "no_product"))


@dp.callback_query(F.data.startswith("size:"))
async def cb_size(call: CallbackQuery) -> None:
    key = call.data.split(":", 1)[1]
    s = get_session(call.from_user.id)
    await call.answer()
    if key == "custom":
        s.awaiting_custom_size = True
        await call.message.answer(i18n.t(s.lang, "custom_prompt"))
        return
    if key not in SIZES:
        return
    s.width, s.height = SIZES[key]
    if s.asset is None:
        await call.message.answer(i18n.t(s.lang, "no_product"))
        return
    await send_card(call.from_user.id, s)


@dp.callback_query(F.data.startswith("act:"))
async def cb_act(call: CallbackQuery) -> None:
    action = call.data.split(":", 1)[1]
    s = get_session(call.from_user.id)
    await call.answer()
    if s.asset is None:
        await call.message.answer(i18n.t(s.lang, "no_product"))
        return

    if action == "variant":
        s.template_index = (s.template_index + 1) % len(cards.TEMPLATE_ORDER)
        await send_card(call.from_user.id, s)
    elif action == "text":
        await regenerate_text_and_resend(call.from_user.id, s)
    elif action == "size":
        await call.message.answer(i18n.t(s.lang, "choose_size"), reply_markup=size_keyboard(s.lang))
    elif action == "file":
        if s.last_image is None:
            await send_card(call.from_user.id, s)
        name = f"card_{s.width}x{s.height}.jpg"
        await bot.send_document(
            chat_id=call.from_user.id,
            document=BufferedInputFile(s.last_image or b"", filename=name),
        )
    elif action == "zip":
        await send_zip(call.from_user.id, s)


async def send_zip(chat_id: int, s: Session) -> None:
    await bot.send_message(chat_id, i18n.t(s.lang, "preparing"))
    template_keys = cards.TEMPLATE_ORDER

    def build() -> bytes:
        items: list[tuple[str, bytes]] = []
        for i, tpl in enumerate(template_keys, start=1):
            img = imaging.render_card(s.asset, s.spec, tpl, s.width, s.height)
            name = imaging.render_card_name(tpl, s.width, s.height, i)
            items.append((name, imaging.to_jpeg_bytes(img, 92)))
        return imaging.build_zip(items)

    async with SEM:
        data = await asyncio.to_thread(build)
    await bot.send_document(
        chat_id=chat_id,
        document=BufferedInputFile(data, filename=f"cards_{s.width}x{s.height}.zip"),
        caption=i18n.t(s.lang, "zip_done"),
    )


# ---------------------------------------------------------------------------
# Global error handler
# ---------------------------------------------------------------------------


def _extract_chat_id(event) -> int | None:
    update = getattr(event, "update", None)
    if update is None:
        return None
    for obj in (
        getattr(update, "message", None),
        getattr(update, "callback_query", None),
        getattr(update, "edited_message", None),
    ):
        if obj is None:
            continue
        chat = getattr(obj, "chat", None)
        if chat is not None and getattr(chat, "id", None):
            return chat.id
        user = getattr(obj, "from_user", None)
        if user is not None and getattr(user, "id", None):
            return user.id
    return None


@dp.error()
async def on_error(event) -> bool:
    log.exception("Handler xatosi", exc_info=event.exception)
    try:
        chat_id = _extract_chat_id(event)
        if chat_id and bot is not None:
            await bot.send_message(chat_id, i18n.t(DEFAULT_LANG, "error_generic"))
    except Exception:
        log.exception("Xabarni yuborib bo'lmadi")
    return True


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------


@dp.startup()
async def on_startup() -> None:
    if USE_REMBG:
        log.info("rembg modeli yuklanmoqda (birinchi marta ~170 MB)...")
        try:
            info = await asyncio.to_thread(imaging.warmup_rembg)
            log.info("rembg tayyor: %s", info)
        except Exception as exc:  # noqa: BLE001
            log.warning("rembg ishga tushmadi, cutoutsiz ishlanadi: %s", exc)
    else:
        log.info("USE_REMBG=0 — fondan ajratish o'chirilgan.")
    if not ai.ai_available():
        log.warning("GEMINI_API_KEY topilmadi — fallback matnlar ishlatiladi.")


async def main() -> None:
    if not BOT_TOKEN:
        log.error("BOT_TOKEN topilmadi. .env faylini to'ldiring.")
        return
    me = await bot.get_me()
    log.info("Bot ishga tushdi: @%s", me.username)
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        log.info("Bot to'xtatildi.")
