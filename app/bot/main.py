import asyncio

from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import Message, ReplyKeyboardRemove

from app.bot.keyboards import language_keyboard, menu_inline_keyboard
from app.config import get_settings
from app.db.migrations import ensure_schema_ready
from app.db.session import async_session_factory
from app.services.guests import upsert_guest_contact

router = Router()

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

BOT_DESCRIPTION = (
    "BON-BON premium menyusi:\n"
    "Mualliflik bonbonlari\n"
    "Nafis tort va desertlar\n"
    "Sovga uchun shirin toplamlari\n"
    "Fresh pastry va non mahsulotlari\n"
    "Coffee va premium ichimliklar\n"
    "Bot: @bonik_testbot"
)


async def configure_bot_profile(bot: Bot) -> None:
    await bot.set_my_description(description=BOT_DESCRIPTION)
    await bot.set_my_short_description(short_description=BOT_SHORT_DESCRIPTION)


@router.message(CommandStart())
async def start_handler(message: Message) -> None:
    await message.answer(
        "Kerakli tilni tanlang",
        reply_markup=language_keyboard(),
    )


@router.message(F.contact)
async def contact_handler(message: Message) -> None:
    if message.from_user is None or message.contact is None:
        return

    async with async_session_factory() as session:
        await upsert_guest_contact(
            session=session,
            telegram_user=message.from_user,
            contact=message.contact,
        )


@router.message(F.text.in_(LANGUAGE_BUTTONS))
async def language_handler(message: Message) -> None:
    settings = get_settings()
    await message.answer(
        "Til muvaffaqiyatli tanlandi!!",
        reply_markup=ReplyKeyboardRemove(),
    )
    await message.answer(
        "Menyuni ko'rish uchun pastdagi tugmani bosing.",
        reply_markup=menu_inline_keyboard(settings.web_app_url),
    )


@router.message(F.web_app_data)
async def web_app_data_handler(message: Message) -> None:
    await message.answer(
        "Mini ilova faqat menyuni ko'rish uchun ishlaydi. Buyurtma qabul qilinmaydi."
    )


@router.message(F.text.casefold() == "yordam")
async def help_handler(message: Message) -> None:
    settings = get_settings()
    await message.answer(
        "Bot buyruqlari:\n"
        "/start - til tanlash tugmalarini chiqaradi\n"
        "/id - Telegram ID raqamingizni ko'rsatadi\n"
        "Menyuni ko'rish - web appni Telegram ichida ochadi\n\n"
        f"Hozirgi WEB_APP_URL: {settings.web_app_url}"
    )


@router.message(Command("id"))
async def id_handler(message: Message) -> None:
    if message.from_user is None:
        await message.answer("Telegram ID topilmadi.")
        return

    await message.answer(f"Sizning Telegram ID raqamingiz: {message.from_user.id}")


async def main() -> None:
    settings = get_settings()
    if not settings.bot_token:
        raise RuntimeError("BOT_TOKEN .env faylida ko'rsatilmagan.")

    schema_result = await ensure_schema_ready()
    if schema_result.migrated:
        print("MySQL schema migratsiya qilindi.")
    else:
        print("MySQL schema tayyor, migration skip qilindi.")

    bot = Bot(token=settings.bot_token)
    await configure_bot_profile(bot)

    dispatcher = Dispatcher()
    dispatcher.include_router(router)

    await bot.delete_webhook(drop_pending_updates=True)
    await dispatcher.start_polling(
        bot,
        allowed_updates=dispatcher.resolve_used_update_types(),
    )


if __name__ == "__main__":
    asyncio.run(main())
