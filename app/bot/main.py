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
# 🌍 START - LANGUAGE SELECT
# =========================

LANGUAGE_BUTTONS = {"🇺🇿 O'zbek", "🇷🇺 Русский", "🇬🇧 English"}

BOT_DESCRIPTION = (
    "ВЫ МОЖЕТЕ ЗАКАЗАТЬ:\n"
    "🍦🍨🍧 Итальянское мороженое GIOTTO\n"
    "🥐🧇 Вафли льежские и бельгийские\n"
    "🥮🍰🍩 Пирожные\n"
    "🍞🥖🥨 Хлеб в ассортименте\n"
    "🍔🥪 Бургеры\n"
    "🍝🥗🍲 Пасты и горячие блюда\n"
    "🥗🥙 Салаты и сэндвичи\n"
    "☕️🍷 Кофе и напитки\n\n"
    "СЛУЖБА ДОСТАВКИ:\n"
    "⏰ 10:00-22:00\n"
    "📩 @Giottouz_bot\n"
    "☎️ +99890 010 2972"
)

BOT_SHORT_DESCRIPTION = (
    "GIOTTO: мороженое, десерты, выпечка, бургеры, паста, кофе и напитки с доставкой."
)


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
    "BON-BON: premium bonbonlar, desertlar, tortlar va sovga toplamlari."
)


async def configure_bot_profile(bot: Bot) -> None:
    await bot.set_my_description(description=BOT_DESCRIPTION)
    await bot.set_my_short_description(short_description=BOT_SHORT_DESCRIPTION)



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
# 🌍 LANGUAGE HANDLER
# =========================
@router.message(F.text.in_({"🇺🇿 O'zbekcha", "🇷🇺 Русский", "🇬🇧 English"}))
async def language_handler(message: Message) -> None:
    settings = get_settings()
    text = message.text

    await message.answer(
        "Til muvaffaqiyatli tanlandi! 👍",
        reply_markup=ReplyKeyboardRemove()
    )

    if text == "🇺🇿 O'zbekcha":
        await message.answer("🇺🇿 Xush kelibsiz BonBon Kafe!")
    elif text == "🇷🇺 Русский":
        await message.answer("🇷🇺 Добро пожаловать в BonBon Cafe!")
    elif text == "🇬🇧 English":
        await message.answer("🇬🇧 Welcome to BonBon Cafe!")

    await message.answer (

        "📲 Menyuni ochish uchun pastdagi tugmani bosing:",
        reply_markup=main_keyboard(settings.web_app_url)

        "Menyuni ko'rish uchun pastdagi tugmani bosing.",
        reply_markup=menu_inline_keyboard(settings.web_app_url),

    )


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