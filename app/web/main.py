from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.check import check_database_connection
from app.db.models import Order, Product
from app.db.session import get_session
from app.security.telegram import TelegramInitDataError, verify_telegram_init_data
from app.services.catalog import list_active_products
from app.services.orders import create_order, get_order_stats, list_orders, update_order_status
from app.web.schemas import (
    AdminStatsRead,
    MeRead,
    OrderCreate,
    OrderItemRead,
    OrderRead,
    OrderStatusUpdate,
    ProductCategoryRead,
    ProductRead,
    UserRead,
)

BASE_DIR = Path(__file__).resolve().parents[2]
MINI_APP_DIR = BASE_DIR / "mini_app"


@asynccontextmanager
async def lifespan(_: FastAPI):
    await check_database_connection()
    yield


app = FastAPI(title="Bon Bon Bot Mini App", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=MINI_APP_DIR), name="static")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(MINI_APP_DIR / "index.html")


@app.get("/admin")
async def admin() -> FileResponse:
    return FileResponse(MINI_APP_DIR / "index.html")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
async def database_health() -> dict[str, str]:
    await check_database_connection()
    return {"database": "ok"}


def serialize_product(product: Product) -> ProductRead:
    category = None
    if product.category is not None:
        category = ProductCategoryRead(
            id=product.category.id,
            title=product.category.title,
            slug=product.category.slug,
        )

    return ProductRead(
        id=product.id,
        title=product.title,
        slug=product.slug,
        description=product.description,
        price=product.price,
        currency=product.currency,
        image_url=product.image_url,
        category=category,
    )


def serialize_order(order: Order) -> OrderRead:
    user = None
    if order.user is not None:
        user = UserRead(
            telegram_id=order.user.telegram_id,
            username=order.user.username,
            first_name=order.user.first_name,
            last_name=order.user.last_name,
        )

    return OrderRead(
        id=order.id,
        status=order.status,
        note=order.note,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        delivery_address=order.delivery_address,
        total_amount=order.total_amount,
        currency=order.currency,
        created_at=order.created_at,
        items=[
            OrderItemRead(
                product_title=item.product_title,
                product_slug=item.product_slug,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
            )
            for item in order.items
        ],
        user=user,
    )


def get_verified_telegram_user(init_data: str | None) -> dict | None:
    if not init_data:
        return None

    settings = get_settings()
    try:
        data = verify_telegram_init_data(init_data, settings.bot_token)
    except TelegramInitDataError:
        return None

    user = data.get("user")
    return user if isinstance(user, dict) else None


def is_admin_request(
    init_data: str | None,
    admin_key: str | None,
) -> tuple[bool, dict | None]:
    settings = get_settings()
    if settings.admin_key and admin_key and admin_key == settings.admin_key:
        return True, None

    user = get_verified_telegram_user(init_data)
    if user and int(user["id"]) in settings.admin_ids:
        return True, user

    return False, user


async def require_admin(
    x_telegram_init_data: Annotated[str | None, Header()] = None,
    x_admin_key: Annotated[str | None, Header()] = None,
) -> dict | None:
    is_admin, user = is_admin_request(x_telegram_init_data, x_admin_key)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin ruxsati kerak.",
        )
    return user


@app.get("/api/me", response_model=MeRead)
async def me(
    x_telegram_init_data: Annotated[str | None, Header()] = None,
    x_admin_key: Annotated[str | None, Header()] = None,
) -> MeRead:
    is_admin, user = is_admin_request(x_telegram_init_data, x_admin_key)
    if not user:
        return MeRead(is_admin=is_admin, user=None)

    return MeRead(
        is_admin=is_admin,
        user=UserRead(
            telegram_id=int(user["id"]),
            username=user.get("username"),
            first_name=user.get("first_name"),
            last_name=user.get("last_name"),
        ),
    )


@app.get("/api/catalog/products", response_model=list[ProductRead])
async def catalog_products(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ProductRead]:
    products = await list_active_products(session)
    return [serialize_product(product) for product in products]


@app.post("/api/orders", response_model=OrderRead)
async def create_order_endpoint(
    payload: OrderCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
    x_telegram_init_data: Annotated[str | None, Header()] = None,
) -> OrderRead:
    settings = get_settings()
    user = get_verified_telegram_user(x_telegram_init_data)
    order = await create_order(
        session=session,
        payload=payload.model_dump(),
        telegram_user=user,
        admin_ids=settings.admin_ids,
    )
    return serialize_order(order)


@app.get("/api/admin/orders", response_model=list[OrderRead])
async def admin_orders(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[OrderRead]:
    orders = await list_orders(session, limit=limit)
    return [serialize_order(order) for order in orders]


@app.get("/api/admin/stats", response_model=AdminStatsRead)
async def admin_stats(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> dict[str, int | str]:
    return await get_order_stats(session)


@app.patch("/api/admin/orders/{order_id}/status", response_model=OrderRead)
async def admin_update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> OrderRead:
    try:
        order = await update_order_status(session, order_id, payload.status)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buyurtma topilmadi.",
        )
    return serialize_order(order)


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        "app.web.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    main()
