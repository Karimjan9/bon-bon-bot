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
# WEB APP ORDER (SAFE VERSION)
# =========================
@router.message(F.web_app_data)
async def web_app_data_handler(message: Message) -> None:
    settings = get_settings()

    try:
        payload = message.web_app_data.data
        data = json.loads(payload)
    except Exception:
        await message.answer("❌ WebApp data xato yoki buzilgan!")
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
# MAIN APP (STABLE STARTUP)
# =========================
async def main() -> None:
    settings = get_settings()

    if not settings.bot_token:
        raise RuntimeError("BOT_TOKEN yo‘q!")

    bot = Bot(token=settings.bot_token)
    dp = Dispatcher()
    dp.include_router(router)

    # ⚡ SAFE DB INIT (crash qilmasin)
    try:
        await ensure_schema_ready()
    except Exception as e:
        print(f"⚠ DB error ignored: {e}")

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