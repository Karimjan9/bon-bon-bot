from aiogram.types import Contact, User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Guest


async def upsert_guest_contact(
    session: AsyncSession,
    telegram_user: User,
    contact: Contact,
) -> Guest:
    result = await session.execute(
        select(Guest).where(Guest.telegram_id == telegram_user.id)
    )
    guest = result.scalar_one_or_none()
    if guest is None:
        guest = Guest(telegram_id=telegram_user.id)
        session.add(guest)

    guest.contact_user_id = contact.user_id
    guest.phone_number = contact.phone_number
    guest.username = telegram_user.username
    guest.first_name = contact.first_name or telegram_user.first_name
    guest.last_name = contact.last_name or telegram_user.last_name
    guest.language_code = telegram_user.language_code

    await session.commit()
    return guest
