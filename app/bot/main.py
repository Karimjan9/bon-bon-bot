import asyncio
import json

from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import Message

from app.bot.keyboards import main_keyboard
from app.config import get_settings
from app.db.migrations import ensure_schema_ready
from app.db.session import async_session_factory
from app.services.orders import create_order

router = Router()


@router.message(CommandStart())
async def start_handler(message: Message) -> None:
    settings = get_settings()
    await message.answer(
        "Assalomu alaykum! Mini ilovani pastdagi tugma orqali oching.",
        reply_markup=main_keyboard(settings.web_app_url),
    )


@router.message(F.web_app_data)
async def web_app_data_handler(message: Message) -> None:
    payload = message.web_app_data.data if message.web_app_data else ""
    settings = get_settings()

    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        await message.answer("Mini ilovadan kelgan ma'lumot JSON formatida emas.")
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
        "Buyurtma bazaga yozildi.\n"
        f"Buyurtma raqami: #{order.id}\n"
        f"Mahsulotlar: {items_text}\n"
        f"Jami: {order.total_amount} {order.currency}"
    )


@router.message(F.text.casefold() == "yordam")
async def help_handler(message: Message) -> None:
    settings = get_settings()
    await message.answer(
        "Bot buyruqlari:\n"
        "/start - mini ilova tugmasini chiqaradi\n"
        "/id - Telegram ID raqamingizni ko'rsatadi\n"
        "Mini ilovani ochish - web appni Telegram ichida ochadi\n\n"
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
    dispatcher = Dispatcher()
    dispatcher.include_router(router)

    await bot.delete_webhook(drop_pending_updates=True)
    await dispatcher.start_polling(
        bot,
        allowed_updates=dispatcher.resolve_used_update_types(),
    )


if __name__ == "__main__":
    asyncio.run(main())
