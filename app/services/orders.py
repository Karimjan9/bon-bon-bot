import json
from decimal import Decimal
from typing import Any

from aiogram.types import User as AiogramUser
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Order, OrderItem, Product, TelegramUser

VALID_ORDER_STATUSES = {"new", "processing", "done", "cancelled"}


async def upsert_telegram_user(
    session: AsyncSession,
    telegram_user: AiogramUser | dict[str, Any],
    admin_ids: set[int],
) -> TelegramUser:
    if isinstance(telegram_user, dict):
        telegram_id = int(telegram_user["id"])
        username = telegram_user.get("username")
        first_name = telegram_user.get("first_name")
        last_name = telegram_user.get("last_name")
        language_code = telegram_user.get("language_code")
    else:
        telegram_id = telegram_user.id
        username = telegram_user.username
        first_name = telegram_user.first_name
        last_name = telegram_user.last_name
        language_code = telegram_user.language_code

    result = await session.execute(
        select(TelegramUser).where(TelegramUser.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        user = TelegramUser(telegram_id=telegram_id)
        session.add(user)

    user.username = username
    user.first_name = first_name
    user.last_name = last_name
    user.language_code = language_code
    user.is_admin = telegram_id in admin_ids
    return user


async def create_order(
    session: AsyncSession,
    payload: dict[str, Any],
    telegram_user: AiogramUser | dict[str, Any] | None,
    admin_ids: set[int],
) -> Order:
    user = None
    if telegram_user is not None:
        user = await upsert_telegram_user(session, telegram_user, admin_ids)

    product_slug = str(payload.get("product_slug") or payload.get("product") or "custom")
    quantity = max(1, int(payload.get("quantity") or 1))
    product = await find_product_by_slug(session, product_slug)
    unit_price = (
        product.price
        if product is not None
        else Decimal(str(payload.get("unit_price") or "0"))
    )
    total_price = unit_price * quantity
    product_title = product.title if product is not None else product_slug.replace("-", " ").title()

    order = Order(
        user=user,
        customer_name=payload.get("customer_name"),
        customer_phone=payload.get("customer_phone"),
        delivery_address=payload.get("delivery_address"),
        note=str(payload.get("note") or ""),
        total_amount=total_price,
        currency=product.currency if product is not None else str(payload.get("currency") or "UZS"),
        raw_payload=json.dumps(payload, ensure_ascii=False),
    )
    order.items.append(
        OrderItem(
            product=product,
            product_title=product_title,
            product_slug=product.slug if product is not None else product_slug,
            quantity=quantity,
            unit_price=unit_price,
            total_price=total_price,
        )
    )
    session.add(order)
    await session.commit()
    return order


async def find_product_by_slug(session: AsyncSession, slug: str) -> Product | None:
    result = await session.execute(
        select(Product).where(Product.slug == slug, Product.is_active.is_(True))
    )
    return result.scalar_one_or_none()


async def list_orders(session: AsyncSession, limit: int = 100) -> list[Order]:
    result = await session.execute(
        select(Order)
        .options(selectinload(Order.user), selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def update_order_status(
    session: AsyncSession,
    order_id: int,
    status: str,
) -> Order | None:
    if status not in VALID_ORDER_STATUSES:
        raise ValueError(f"Invalid order status: {status}")

    result = await session.execute(
        select(Order)
        .options(selectinload(Order.user), selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        return None

    order.status = status
    await session.commit()
    return order


async def get_order_stats(session: AsyncSession) -> dict[str, int | str]:
    total_orders = await session.scalar(select(func.count(Order.id)))
    new_orders = await session.scalar(select(func.count(Order.id)).where(Order.status == "new"))
    processing_orders = await session.scalar(
        select(func.count(Order.id)).where(Order.status == "processing")
    )
    done_orders = await session.scalar(select(func.count(Order.id)).where(Order.status == "done"))
    revenue = await session.scalar(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(Order.status != "cancelled")
    )

    return {
        "total_orders": int(total_orders or 0),
        "new_orders": int(new_orders or 0),
        "processing_orders": int(processing_orders or 0),
        "done_orders": int(done_orders or 0),
        "revenue": str(revenue or "0.00"),
    }
