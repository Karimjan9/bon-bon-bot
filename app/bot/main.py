import asyncio
import json

from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton

from app.bot.keyboards import main_keyboard
from app.config import get_settings
from app.db.migrations import ensure_schema_ready
from app.db.session import async_session_factory
from app.services.orders import create_order

router = Router()

# =========================
# 🌍 START - LANGUAGE SELECT
# =========================
@router.message(CommandStart())
async def start_handler(message: Message) -> None:
    kb = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🇺🇿 O'zbekcha")],
            [KeyboardButton(text="🇷🇺 Русский")],
            [KeyboardButton(text="🇬🇧 English")]
        ],
        resize_keyboard=True
    )

    await message.answer("Tilni tanlang / Выберите язык / Choose language:", reply_markup=kb)


# =========================
# 🌍 LANGUAGE HANDLER
# =========================
@router.message()
async def language_handler(message: Message) -> None:
    text = message.text
    settings = get_settings()

    if text == "🇺🇿 O'zbekcha":
        await message.answer(
            "🇺🇿 Xush kelibsiz BonBon Kafe!",
            reply_markup=main_keyboard(settings.web_app_url)
        )

    elif text == "🇷🇺 Русский":
        await message.answer(
            "🇷🇺 Добро пожаловать в BonBon Cafe!",
            reply_markup=main_keyboard(settings.web_app_url)
        )

    elif text == "🇬🇧 English":
        await message.answer(
            "🇬🇧 Welcome to BonBon Cafe!",
            reply_markup=main_keyboard(settings.web_app_url)
        )

    elif text and text.lower() == "yordam":
        await help_handler(message)


# =========================
# 📦 WEB APP ORDER HANDLER
# =========================
@router.message(F.web_app_data)
async def web_app_data_handler(message: Message) -> None:
    payload = message.web_app_data.data if message.web_app_data else ""
    settings = get_settings()

    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        await message.answer("❌ JSON format xato!")
        return

    async with async_session_factory() as session:
        order = await create_order(
            session=session,
            payload=data,
            telegram_user=message.from_user,
            admin_ids=settings.admin_ids,
        )

    items_text = ", ".join(
        f"{item.product_title} x {item.quantity}" for item in order.items
    )

    await message.answer(
        "✅ Buyurtma qabul qilindi!\n\n"
        f"🧾 ID: #{order.id}\n"
        f"🍔 Mahsulotlar: {items_text}\n"
        f"💰 Jami: {order.total_amount} {order.currency}"
    )


# =========================
# ❓ HELP
# =========================
@router.message(F.text.casefold() == "yordam")
async def help_handler(message: Message) -> None:
    settings = get_settings()
    await message.answer(
        "📌 Bot buyruqlari:\n"
        "/start - boshlash\n"
        "/id - Telegram ID\n"
        "Mini ilova - menyu ochish\n\n"
        f"🌐 WEB_APP: {settings.web_app_url}"
    )


# =========================
# 🆔 USER ID
# =========================
@router.message(Command("id"))
async def id_handler(message: Message) -> None:
    if not message.from_user:
        await message.answer("ID topilmadi.")
        return

    await message.answer(f"🆔 Sizning ID: {message.from_user.id}")


# =========================
# 🚀 MAIN RUN
# =========================
async def main() -> None:
    settings = get_settings()

    if not settings.bot_token:
        raise RuntimeError("BOT_TOKEN topilmadi!")

    schema_result = await ensure_schema_ready()

    if schema_result.migrated:
        print("✅ DB migratsiya qilindi")
    else:
        print("ℹ️ DB tayyor")

    bot = Bot(token=settings.bot_token)
    dp = Dispatcher()

    dp.include_router(router)

    await bot.delete_webhook(drop_pending_updates=True)

    await dp.start_polling(
        bot,
        allowed_updates=dp.resolve_used_update_types(),
    )


if __name__ == "__main__":
    asyncio.run(main())