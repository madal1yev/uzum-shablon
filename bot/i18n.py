"""Tillar: uz / ru / en. t(lang, key, **kw) bilan matn olish."""

from __future__ import annotations

LANGS = ("uz", "ru", "en")

_STRINGS: dict[str, dict[str, str]] = {
    "uz": {
        "choose_lang": "Tilni tanlang:",
        "send_photo": (
            "Mahsulot rasmini yuboring (photo yoki hujjat). \n"
            "Rasm tagiga mahsulot nomini yozishingiz mumkin: iPhone 15 Pro 256GB"
        ),
        "photo_received": "Rasm qabul qilindi, tahlil qilinmoqda...",
        "preparing": "⏳ Tayyorlanmoqda... fon ajratilmoqda va matn yozilmoqda.",
        "choose_size": "Karta o'lchamini tanlang:",
        "size_uzum": "Uzum 3:4 (1080×1440)",
        "size_square": "1:1 (1080×1080)",
        "size_ig": "Instagram 4:5 (1080×1350)",
        "size_stories": "Stories 9:16 (1080×1920)",
        "size_custom": "✏️ O'zim kiritaman",
        "custom_prompt": "O'lchamni quyidagi ko'rinishda yuboring:\n1200x1600\n\n300-4000 px oralig'idagi qiymatlar.",
        "custom_invalid": "Noto'g'ri format. Masalan: 1200x1600 (300-400 gacha).",
        "act_variant": "🔄 Boshqa variant",
        "act_text": "✍️ Boshqa matn",
        "act_file": "📥 Fayl (yuqori sifat)",
        "act_zip": "📦 Hammasi ZIP",
        "act_size": "📐 Boshqa o'lcham",
        "ai_fallback": "AI kaliti yo'q yoki xato, standart matn ishlatildi.",
        "new_text_done": "Yangi matn bilan qayta tayyorlandi.",
        "zip_done": "ZIP arxiv tayyor:",
        "error_generic": "⚠️ Xatolik yuz berdi. Iltimos, boshqa rasm yuboring.",
        "no_product": "Avval mahsulot rasmini yuboring.",
        "new_hint": "Matn qabul qilindi, karta qayta tayyorlanmoqda...",
        "lang_set": "Til tanlandi. Endi mahsulot rasmini yuboring.",
    },
    "ru": {
        "choose_lang": "Выберите язык:",
        "send_photo": (
            "Отправьте фото товара (фото или документ).\n"
            "Под фото можно указать название: iPhone 15 Pro 256GB"
        ),
        "photo_received": "Фото получено, анализирую...",
        "preparing": "⏳ Готовлю... убираю фон и пишу текст.",
        "choose_size": "Выберите размер карточки:",
        "size_uzum": "Uzum 3:4 (1080×1440)",
        "size_square": "1:1 (1080×1080)",
        "size_ig": "Instagram 4:5 (1080×1350)",
        "size_stories": "Stories 9:16 (1080×1920)",
        "size_custom": "✏️ Ввести свой",
        "custom_prompt": "Отправьте размер в виде:\n1200x1600\n\nДопустимые значения от 300 до 4000 px.",
        "custom_invalid": "Неверный формат. Например: 1200x1600 (от 300 до 4000).",
        "act_variant": "🔄 Другой вариант",
        "act_text": "✍️ Другой текст",
        "act_file": "📥 Файл (высокое качество)",
        "act_zip": "📦 Всё в ZIP",
        "act_size": "📐 Другой размер",
        "ai_fallback": "AI-ключ отсутствует или ошибка, использован стандартный текст.",
        "new_text_done": "Готово с новым текстом.",
        "zip_done": "ZIP-архив готов:",
        "error_generic": "⚠️ Произошла ошибка. Попробуйте другое фото.",
        "no_product": "Сначала отправьте фото товара.",
        "new_hint": "Текст принят, пересобираю карточку...",
        "lang_set": "Язык выбран. Теперь отправьте фото товара.",
    },
    "en": {
        "choose_lang": "Choose a language:",
        "send_photo": (
            "Send a product photo (photo or document).\n"
            "You can add the product name in the caption: iPhone 15 Pro 256GB"
        ),
        "photo_received": "Photo received, analyzing...",
        "preparing": "⏳ Preparing... removing background and writing copy.",
        "choose_size": "Choose a card size:",
        "size_uzum": "Uzum 3:4 (1080×1440)",
        "size_square": "1:1 (1080×1080)",
        "size_ig": "Instagram 4:5 (1080×1350)",
        "size_stories": "Stories 9:16 (1080×1920)",
        "size_custom": "✏️ Custom size",
        "custom_prompt": "Send the size like this:\n1200x1600\n\nAllowed range: 300-4000 px.",
        "custom_invalid": "Wrong format. Example: 1200x1600 (300-4000).",
        "act_variant": "🔄 Another design",
        "act_text": "✍️ New text",
        "act_file": "📥 File (high quality)",
        "act_zip": "📦 Everything as ZIP",
        "act_size": "📐 Another size",
        "ai_fallback": "AI key missing or error, standard text was used.",
        "new_text_done": "Done with new text.",
        "zip_done": "ZIP archive ready:",
        "error_generic": "⚠️ Something went wrong. Please try another photo.",
        "no_product": "Send a product photo first.",
        "new_hint": "Text received, rebuilding the card...",
        "lang_set": "Language set. Now send a product photo.",
    },
}


def t(lang: str, key: str, **kwargs) -> str:
    table = _STRINGS.get(lang) or _STRINGS["en"]
    text = table.get(key) or _STRINGS["en"].get(key) or key
    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, IndexError):
            return text
    return text


def template_label(lang: str, template: str) -> str:
    """Shablon nomini foydalanuvchi tilida ko'rsatish uchun."""
    names = {
        "light_chips": {"uz": "Yorug'", "ru": "Светлый", "en": "Light"},
        "dark_premium": {"uz": "Qora premium", "ru": "Тёмный премиум", "en": "Dark premium"},
        "color_bold": {"uz": "Rangli", "ru": "Яркий цвет", "en": "Bold color"},
        "stats_side": {"uz": "Raqamlar", "ru": "Цифры", "en": "Stats"},
        "ribbon_badge": {"uz": "Aksiya", "ru": "Акция", "en": "Sale ribbon"},
    }
    return names.get(template, {}).get(lang, template)
