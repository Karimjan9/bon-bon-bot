import sys
import asyncio
import json

from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove

from app.bot.keyboards import main_keyboard
from app.config import get_settings
from app.db.migrations import ensure_schema_ready
from app.db.session import async_session_factory
from app.services.orders import create_order

router = Router()

# =========================
# BOT DESCRIPTION
# =========================
BOT_DESCRIPTION = (
    "BON-BON premium menyusi:\n"
    "🍫 Mualliflik bonbonlari\n"
    "🎂 Nafis tort va desertlar\n"
    "🎁 Sovga uchun shirin toplamlari\n"
    "🥐 Fresh pastry va non mahsulotlari\n"
    "☕ Coffee va premium ichimliklar\n"
    "🚚 Yetkazib berish: 10:00-22:00\n"
    "💬 Bot: @bonik_testbot"
)

BOT_SHORT_DESCRIPTION = (
    "BON-BON: premium bonbonlar, desertlar va ichimliklar."
)

async def configure_bot_profile(bot: Bot) -> None:
    await bot.set_my_description(description=BOT_DESCRIPTION)
    await bot.set_my_short_description(short_description=BOT_SHORT_DESCRIPTION)


# =========================
# BOT START
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

    await message.answer(
        "Tilni tanlang / Выберите язык / Choose language:",
        reply_markup=kb
    )


# =========================
# LANGUAGE HANDLER
# =========================
@router.message(F.text.in_({"🇺🇿 O'zbekcha", "🇷🇺 Русский", "🇬🇧 English"}))
async def language_handler(message: Message) -> None:
    settings = get_settings()

    await message.answer(
        "Til tanlandi 👍",
        reply_markup=ReplyKeyboardRemove()
    )

    await message.answer(
        "📲 Menyuni ochish:",
        reply_markup=main_keyboard(settings.web_app_url)
    )


# =========================
# WEB APP ORDER
# =========================
@router.message(F.web_app_data)
async def web_app_data_handler(message: Message) -> None:
    settings = get_settings()

    try:
        payload = message.web_app_data.data
        data = json.loads(payload)
    except Exception:
        await message.answer("❌ WebApp data xato!")
        return

    try:
        async with async_session_factory() as session:
            order = await create_order(
                session=session,
                payload=data,
                telegram_user=message.from_user,
                admin_ids=settings.admin_ids,
            )
    except Exception as e:
        await message.answer(f"❌ Buyurtma xatosi: {e}")
        return

    items_text = ", ".join(
        f"{i.product_title} x {i.quantity}" for i in order.items
    )

    await message.answer(
        f"✅ Buyurtma qabul qilindi!\n\n"
        f"🧾 ID: #{order.id}\n"
        f"🍔 {items_text}\n"
        f"💰 {order.total_amount} {order.currency}"
    )


# =========================
# USER ID
# =========================
@router.message(Command("id"))
async def id_handler(message: Message) -> None:
    await message.answer(f"🆔 ID: {message.from_user.id}")


# =========================
# MAIN
# =========================
async def main() -> None:
    settings = get_settings()

    if not settings.bot_token:
        raise RuntimeError("BOT_TOKEN yo‘q!")

    bot = Bot(token=settings.bot_token)
    dp = Dispatcher()
    dp.include_router(router)

    try:
        await ensure_schema_ready()
    except Exception as e:
        print(f"⚠ DB error ignored: {e}")

    await configure_bot_profile(bot)

    await bot.delete_webhook(drop_pending_updates=True)

    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()

        try:
            await async_session_factory().close()
        except:
            pass


if __name__ == "__main__":
    asyncio.run(main())