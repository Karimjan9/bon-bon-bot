import base64
import hashlib
import hmac
import json
import time
import uuid
from asyncio import to_thread
from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from typing import Annotated

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

try:
    from pillow_heif import register_heif_opener
except ImportError:  # pragma: no cover - optional decoder until dependencies are installed.
    register_heif_opener = None

if register_heif_opener is not None:
    register_heif_opener()

from app.config import get_settings
from app.db.migrations import ensure_schema_ready
from app.db.models import (
    Category,
    Guest,
    MenuItem,
    MenuItemAddon,
    MenuItemAddonGroup,
    MenuItemAddonGroupItem,
    MenuItemVariant,
    Order,
    Product,
)
from app.db.session import get_session
from app.security.telegram import TelegramInitDataError, verify_telegram_init_data
from app.services.catalog import list_active_products, list_addons, list_categories, list_menu_items
from app.services.orders import create_order, get_order_stats, list_orders, update_order_status
from app.web.schemas import (
    AdminLogin,
    AdminStatsRead,
    AdminTokenRead,
    CategoryRead,
    CategoryWrite,
    GuestRead,
    MenuItemAddonGroupItemRead,
    MenuItemAddonGroupItemWrite,
    MenuItemAddonGroupRead,
    MenuItemAddonGroupWrite,
    MenuItemAddonRead,
    MenuItemAddonWrite,
    MenuItemRead,
    MenuItemVariantRead,
    MenuItemVariantWrite,
    MenuItemWrite,
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
IMAGE_UPLOAD_DIR = MINI_APP_DIR / "uploads" / "images"
ADMIN_TOKEN_TTL_SECONDS = 6 * 60 * 60
MAX_ORIGINAL_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_OPTIMIZED_IMAGE_UPLOAD_BYTES = 750_000
IMAGE_OUTPUT_OPTIONS = (
    ("image/webp", ".webp", {"format": "WEBP", "quality": 82, "method": 6}),
    (
        "image/jpeg",
        ".jpg",
        {"format": "JPEG", "quality": 86, "optimize": True, "progressive": True},
    ),
)
IMAGE_MAX_SIZES = (1200, 1000, 860, 720, 600)
IMAGE_QUALITY_STEPS = (1.0, 0.88, 0.76, 0.64)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await ensure_schema_ready()
    IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Bon Bon Bot Mini App", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=MINI_APP_DIR), name="static")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(MINI_APP_DIR / "index.html")


@app.get("/admin")
async def admin() -> FileResponse:
    return FileResponse(MINI_APP_DIR / "index.html")


@app.get("/admin/guests")
async def admin_guests_page() -> FileResponse:
    return FileResponse(MINI_APP_DIR / "index.html")


@app.get("/admin/{path:path}")
async def admin_fallback_page(path: str) -> FileResponse:
    return FileResponse(MINI_APP_DIR / "index.html")


@app.get("/login")
async def login() -> FileResponse:
    return FileResponse(MINI_APP_DIR / "index.html")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
async def database_health() -> dict[str, str]:
    await ensure_schema_ready()
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


def serialize_category(category: Category) -> CategoryRead:
    return CategoryRead(
        id=category.id,
        name=category.name,
        description=category.description,
        image_url=category.image_url,
        sort_order=category.sort_order,
        is_active=category.is_active,
        created_at=category.created_at,
        updated_at=category.updated_at,
    )


def serialize_variant(variant: MenuItemVariant) -> MenuItemVariantRead:
    return MenuItemVariantRead(
        id=variant.id,
        menu_item_id=variant.menu_item_id,
        name=variant.name,
        price=variant.price,
        weight_grams=variant.weight_grams,
        is_default=variant.is_default,
        is_available=variant.is_available,
        sort_order=variant.sort_order,
        created_at=variant.created_at,
        updated_at=variant.updated_at,
    )


def serialize_addon(addon: MenuItemAddon) -> MenuItemAddonRead:
    return MenuItemAddonRead(
        id=addon.id,
        name=addon.name,
        description=addon.description,
        price=addon.price,
        is_available=addon.is_available,
        created_at=addon.created_at,
        updated_at=addon.updated_at,
    )


def serialize_addon_group_item(
    group_item: MenuItemAddonGroupItem,
) -> MenuItemAddonGroupItemRead:
    return MenuItemAddonGroupItemRead(
        id=group_item.id,
        addon_group_id=group_item.addon_group_id,
        addon_id=group_item.addon_id,
        addon=serialize_addon(group_item.addon),
        sort_order=group_item.sort_order,
        created_at=group_item.created_at,
    )


def serialize_addon_group(addon_group: MenuItemAddonGroup) -> MenuItemAddonGroupRead:
    return MenuItemAddonGroupRead(
        id=addon_group.id,
        menu_item_id=addon_group.menu_item_id,
        name=addon_group.name,
        min_select=addon_group.min_select,
        max_select=addon_group.max_select,
        is_required=addon_group.is_required,
        sort_order=addon_group.sort_order,
        items=[
            serialize_addon_group_item(group_item)
            for group_item in sorted(addon_group.items, key=lambda item: item.sort_order)
        ],
        created_at=addon_group.created_at,
        updated_at=addon_group.updated_at,
    )


def serialize_menu_item(menu_item: MenuItem) -> MenuItemRead:
    return MenuItemRead(
        id=menu_item.id,
        category_id=menu_item.category_id,
        category=serialize_category(menu_item.category),
        name=menu_item.name,
        description=menu_item.description,
        base_price=menu_item.base_price,
        image_url=menu_item.image_url,
        is_available=menu_item.is_available,
        is_popular=menu_item.is_popular,
        is_new=menu_item.is_new,
        sort_order=menu_item.sort_order,
        preparation_time_minutes=menu_item.preparation_time_minutes,
        calories=menu_item.calories,
        weight_grams=menu_item.weight_grams,
        variants=[
            serialize_variant(variant)
            for variant in sorted(menu_item.variants, key=lambda item: item.sort_order)
        ],
        addon_groups=[
            serialize_addon_group(addon_group)
            for addon_group in sorted(menu_item.addon_groups, key=lambda item: item.sort_order)
        ],
        created_at=menu_item.created_at,
        updated_at=menu_item.updated_at,
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


def serialize_guest(guest: Guest) -> GuestRead:
    return GuestRead(
        id=guest.id,
        telegram_id=guest.telegram_id,
        contact_user_id=guest.contact_user_id,
        phone_number=guest.phone_number,
        username=guest.username,
        first_name=guest.first_name,
        last_name=guest.last_name,
        language_code=guest.language_code,
        created_at=guest.created_at,
        updated_at=guest.updated_at,
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


def base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def admin_token_secret() -> bytes:
    settings = get_settings()
    secret = settings.admin_password or settings.admin_key or settings.bot_token
    return secret.encode("utf-8")


def sign_admin_token(payload: dict[str, int | str]) -> str:
    body = base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(admin_token_secret(), body.encode("ascii"), hashlib.sha256).digest()
    return f"{body}.{base64url_encode(signature)}"


def verify_admin_token(token: str | None) -> bool:
    if not token or "." not in token:
        return False

    body, signature = token.split(".", 1)
    expected_signature = hmac.new(
        admin_token_secret(),
        body.encode("ascii"),
        hashlib.sha256,
    ).digest()
    try:
        provided_signature = base64url_decode(signature)
        payload = json.loads(base64url_decode(body))
    except (ValueError, json.JSONDecodeError):
        return False

    if not hmac.compare_digest(provided_signature, expected_signature):
        return False

    settings = get_settings()
    return payload.get("login") == settings.admin_login and int(payload.get("exp", 0)) > int(
        time.time()
    )


def is_valid_admin_credentials(login: str | None, password: str | None) -> bool:
    settings = get_settings()
    expected_password = settings.admin_password or settings.admin_key
    return bool(
        settings.admin_login
        and expected_password
        and login == settings.admin_login
        and password == expected_password
    )


def is_admin_request(
    init_data: str | None,
    admin_key: str | None,
    admin_login: str | None,
    admin_password: str | None,
    admin_token: str | None,
) -> tuple[bool, dict | None]:
    settings = get_settings()
    if verify_admin_token(admin_token):
        return True, None

    if settings.admin_key and admin_key and admin_key == settings.admin_key:
        return True, None

    if is_valid_admin_credentials(admin_login, admin_password):
        return True, None

    user = get_verified_telegram_user(init_data)
    if user and int(user["id"]) in settings.admin_ids:
        return True, user

    return False, user


async def require_admin(
    x_telegram_init_data: Annotated[str | None, Header()] = None,
    x_admin_key: Annotated[str | None, Header()] = None,
    x_admin_login: Annotated[str | None, Header()] = None,
    x_admin_password: Annotated[str | None, Header()] = None,
    x_admin_token: Annotated[str | None, Header()] = None,
) -> dict | None:
    is_admin, user = is_admin_request(
        x_telegram_init_data,
        x_admin_key,
        x_admin_login,
        x_admin_password,
        x_admin_token,
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin ruxsati kerak.",
        )
    return user


async def get_category_or_404(session: AsyncSession, category_id: int) -> Category:
    category = await session.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category topilmadi.")
    return category


async def get_menu_item_or_404(session: AsyncSession, menu_item_id: int) -> MenuItem:
    menu_item = await session.get(MenuItem, menu_item_id)
    if menu_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item topilmadi.")
    return menu_item


async def get_addon_or_404(session: AsyncSession, addon_id: int) -> MenuItemAddon:
    addon = await session.get(MenuItemAddon, addon_id)
    if addon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Addon topilmadi.")
    return addon


async def get_addon_group_or_404(
    session: AsyncSession,
    addon_group_id: int,
) -> MenuItemAddonGroup:
    addon_group = await session.get(MenuItemAddonGroup, addon_group_id)
    if addon_group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Addon group topilmadi.")
    return addon_group


async def get_addon_group_item_or_404(
    session: AsyncSession,
    group_item_id: int,
) -> MenuItemAddonGroupItem:
    group_item = await session.get(MenuItemAddonGroupItem, group_item_id)
    if group_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bog'lanma topilmadi.")
    return group_item


def apply_payload(model: object, payload: dict) -> None:
    for field, value in payload.items():
        setattr(model, field, value)


def normalize_image(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    image.load()
    if image.mode == "RGB":
        return image

    if image.mode in {"RGBA", "LA"} or (
        image.mode == "P" and "transparency" in image.info
    ):
        rgba_image = image.convert("RGBA")
        background = Image.new("RGBA", rgba_image.size, (255, 255, 255, 255))
        background.alpha_composite(rgba_image)
        return background.convert("RGB")

    return image.convert("RGB")


def resize_image(image: Image.Image, max_size: int) -> Image.Image:
    resized = image.copy()
    resized.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    return resized


def encode_image(image: Image.Image, options: dict, quality_multiplier: float) -> bytes:
    output = BytesIO()
    save_options = options.copy()
    if "quality" in save_options:
        save_options["quality"] = max(50, round(save_options["quality"] * quality_multiplier))
    image.save(output, **save_options)
    return output.getvalue()


def optimize_image_upload(data: bytes) -> tuple[bytes, str, str]:
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rasm fayli bo'sh.",
        )

    if len(data) > MAX_ORIGINAL_IMAGE_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Original rasm hajmi 8 MB dan oshmasin.",
        )

    try:
        with Image.open(BytesIO(data)) as opened_image:
            image = normalize_image(opened_image)
    except (OSError, UnidentifiedImageError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rasm formati qo'llab-quvvatlanmaydi yoki fayl buzilgan.",
        ) from exc

    fallback: tuple[bytes, str, str] | None = None
    for max_size in IMAGE_MAX_SIZES:
        resized = resize_image(image, max_size)
        for content_type, extension, options in IMAGE_OUTPUT_OPTIONS:
            for quality_multiplier in IMAGE_QUALITY_STEPS:
                try:
                    optimized = encode_image(resized, options, quality_multiplier)
                except OSError:
                    continue

                fallback = (optimized, content_type, extension)
                if len(optimized) <= MAX_OPTIMIZED_IMAGE_UPLOAD_BYTES:
                    return fallback

    if fallback is not None:
        return fallback

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Rasmni optimizatsiya qilib bo'lmadi.",
    )


async def fetch_menu_item_read(session: AsyncSession, menu_item_id: int) -> MenuItem:
    result = await session.execute(
        select(MenuItem)
        .options(selectinload(MenuItem.category), selectinload(MenuItem.variants))
        .options(
            selectinload(MenuItem.addon_groups)
            .selectinload(MenuItemAddonGroup.items)
            .selectinload(MenuItemAddonGroupItem.addon)
        )
        .where(MenuItem.id == menu_item_id)
    )
    menu_item = result.scalar_one_or_none()
    if menu_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item topilmadi.")
    return menu_item


async def fetch_addon_group_read(session: AsyncSession, addon_group_id: int) -> MenuItemAddonGroup:
    result = await session.execute(
        select(MenuItemAddonGroup)
        .options(
            selectinload(MenuItemAddonGroup.items).selectinload(MenuItemAddonGroupItem.addon)
        )
        .where(MenuItemAddonGroup.id == addon_group_id)
    )
    addon_group = result.scalar_one_or_none()
    if addon_group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Addon group topilmadi.")
    return addon_group


async def fetch_addon_group_item_read(
    session: AsyncSession,
    group_item_id: int,
) -> MenuItemAddonGroupItem:
    result = await session.execute(
        select(MenuItemAddonGroupItem)
        .options(selectinload(MenuItemAddonGroupItem.addon))
        .where(MenuItemAddonGroupItem.id == group_item_id)
    )
    group_item = result.scalar_one_or_none()
    if group_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bog'lanma topilmadi.")
    return group_item


async def ensure_addon_link_is_unique(
    session: AsyncSession,
    addon_group_id: int,
    addon_id: int,
    current_id: int | None = None,
) -> None:
    query = select(MenuItemAddonGroupItem).where(
        MenuItemAddonGroupItem.addon_group_id == addon_group_id,
        MenuItemAddonGroupItem.addon_id == addon_id,
    )
    if current_id is not None:
        query = query.where(MenuItemAddonGroupItem.id != current_id)

    result = await session.execute(query)
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bu addon group ichida addon allaqachon bor.",
        )


@app.get("/api/me", response_model=MeRead)
async def me(
    x_telegram_init_data: Annotated[str | None, Header()] = None,
    x_admin_key: Annotated[str | None, Header()] = None,
    x_admin_login: Annotated[str | None, Header()] = None,
    x_admin_password: Annotated[str | None, Header()] = None,
    x_admin_token: Annotated[str | None, Header()] = None,
) -> MeRead:
    is_admin, user = is_admin_request(
        x_telegram_init_data,
        x_admin_key,
        x_admin_login,
        x_admin_password,
        x_admin_token,
    )
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


@app.post("/api/admin/login", response_model=AdminTokenRead)
async def admin_login(payload: AdminLogin) -> AdminTokenRead:
    if not is_valid_admin_credentials(payload.login, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login yoki parol xato.",
        )

    expires_at = int(time.time()) + ADMIN_TOKEN_TTL_SECONDS
    access_token = sign_admin_token({"login": payload.login, "exp": expires_at})
    return AdminTokenRead(
        access_token=access_token,
        expires_at=expires_at,
        expires_in=ADMIN_TOKEN_TTL_SECONDS,
    )


@app.get("/api/catalog/products", response_model=list[ProductRead])
async def catalog_products(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ProductRead]:
    products = await list_active_products(session)
    return [serialize_product(product) for product in products]


@app.get("/api/catalog/categories", response_model=list[CategoryRead])
async def catalog_categories(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[CategoryRead]:
    categories = await list_categories(session, active_only=True)
    return [serialize_category(category) for category in categories]


@app.get("/api/catalog/menu-items", response_model=list[MenuItemRead])
async def catalog_menu_items(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[MenuItemRead]:
    menu_items = await list_menu_items(session, active_only=True)
    return [serialize_menu_item(menu_item) for menu_item in menu_items]


@app.get("/api/catalog/addons", response_model=list[MenuItemAddonRead])
async def catalog_addons(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[MenuItemAddonRead]:
    addons = await list_addons(session, active_only=True)
    return [serialize_addon(addon) for addon in addons]


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


@app.get("/api/admin/guests", response_model=list[GuestRead])
async def admin_guests(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
) -> list[GuestRead]:
    result = await session.execute(
        select(Guest).order_by(Guest.updated_at.desc(), Guest.id.desc()).limit(limit)
    )
    return [serialize_guest(guest) for guest in result.scalars()]


@app.get("/api/admin/stats", response_model=AdminStatsRead)
async def admin_stats(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> dict[str, int | str]:
    return await get_order_stats(session)


@app.get("/api/admin/categories", response_model=list[CategoryRead])
async def admin_categories(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> list[CategoryRead]:
    categories = await list_categories(session, active_only=False)
    return [serialize_category(category) for category in categories]


@app.get("/api/admin/menu-items", response_model=list[MenuItemRead])
async def admin_menu_items(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> list[MenuItemRead]:
    menu_items = await list_menu_items(session, active_only=False)
    return [serialize_menu_item(menu_item) for menu_item in menu_items]


@app.get("/api/admin/addons", response_model=list[MenuItemAddonRead])
async def admin_addons(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> list[MenuItemAddonRead]:
    addons = await list_addons(session, active_only=False)
    return [serialize_addon(addon) for addon in addons]


@app.post("/api/admin/uploads/images")
async def admin_upload_image(
    request: Request,
    _: Annotated[dict | None, Depends(require_admin)],
    content_length: Annotated[int | None, Header()] = None,
) -> dict[str, int | str]:
    if content_length is not None and content_length > MAX_ORIGINAL_IMAGE_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Original rasm hajmi 8 MB dan oshmasin.",
        )

    data = await request.body()
    optimized_data, content_type, extension = optimize_image_upload(data)
    IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    file_name = f"{int(time.time())}-{uuid.uuid4().hex}{extension}"
    target = IMAGE_UPLOAD_DIR / file_name
    await to_thread(target.write_bytes, optimized_data)

    return {
        "url": f"/static/uploads/images/{file_name}",
        "absolute_url": str(request.url_for("static", path=f"uploads/images/{file_name}")),
        "size": len(optimized_data),
        "content_type": content_type,
    }


@app.post("/api/admin/categories", response_model=CategoryRead)
async def admin_create_category(
    payload: CategoryWrite,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> CategoryRead:
    category = Category()
    apply_payload(category, payload.model_dump())
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return serialize_category(category)


@app.patch("/api/admin/categories/{category_id}", response_model=CategoryRead)
async def admin_update_category(
    category_id: int,
    payload: CategoryWrite,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> CategoryRead:
    category = await get_category_or_404(session, category_id)
    apply_payload(category, payload.model_dump())
    await session.commit()
    await session.refresh(category)
    return serialize_category(category)


@app.delete("/api/admin/categories/{category_id}")
async def admin_delete_category(
    category_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> dict[str, str]:
    category = await get_category_or_404(session, category_id)
    await session.delete(category)
    await session.commit()
    return {"status": "deleted"}


@app.post("/api/admin/menu-items", response_model=MenuItemRead)
async def admin_create_menu_item(
    payload: MenuItemWrite,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> MenuItemRead:
    await get_category_or_404(session, payload.category_id)
    menu_item = MenuItem()
    apply_payload(menu_item, payload.model_dump())
    session.add(menu_item)
    await session.commit()
    return serialize_menu_item(await fetch_menu_item_read(session, menu_item.id))


@app.patch("/api/admin/menu-items/{menu_item_id}", response_model=MenuItemRead)
async def admin_update_menu_item(
    menu_item_id: int,
    payload: MenuItemWrite,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> MenuItemRead:
    await get_category_or_404(session, payload.category_id)
    menu_item = await get_menu_item_or_404(session, menu_item_id)
    apply_payload(menu_item, payload.model_dump())
    await session.commit()
    return serialize_menu_item(await fetch_menu_item_read(session, menu_item.id))


@app.delete("/api/admin/menu-items/{menu_item_id}")
async def admin_delete_menu_item(
    menu_item_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> dict[str, str]:
    menu_item = await get_menu_item_or_404(session, menu_item_id)
    await session.delete(menu_item)
    await session.commit()
    return {"status": "deleted"}


@app.get("/api/admin/variants", response_model=list[MenuItemVariantRead])
async def admin_variants(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
    menu_item_id: int | None = None,
) -> list[MenuItemVariantRead]:
    query = select(MenuItemVariant).order_by(
        MenuItemVariant.menu_item_id.asc(),
        MenuItemVariant.sort_order.asc(),
        MenuItemVariant.name.asc(),
    )
    if menu_item_id is not None:
        query = query.where(MenuItemVariant.menu_item_id == menu_item_id)

    result = await session.execute(query)
    return [serialize_variant(variant) for variant in result.scalars().all()]


@app.post("/api/admin/variants", response_model=MenuItemVariantRead)
async def admin_create_variant(
    payload: MenuItemVariantWrite,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> MenuItemVariantRead:
    await get_menu_item_or_404(session, payload.menu_item_id)
    variant = MenuItemVariant()
    apply_payload(variant, payload.model_dump())
    session.add(variant)
    await session.commit()
    await session.refresh(variant)
    return serialize_variant(variant)


@app.patch("/api/admin/variants/{variant_id}", response_model=MenuItemVariantRead)
async def admin_update_variant(
    variant_id: int,
    payload: MenuItemVariantWrite,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> MenuItemVariantRead:
    await get_menu_item_or_404(session, payload.menu_item_id)
    variant = await session.get(MenuItemVariant, variant_id)
    if variant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant topilmadi.")
    apply_payload(variant, payload.model_dump())
    await session.commit()
    await session.refresh(variant)
    return serialize_variant(variant)


@app.delete("/api/admin/variants/{variant_id}")
async def admin_delete_variant(
    variant_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> dict[str, str]:
    variant = await session.get(MenuItemVariant, variant_id)
    if variant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant topilmadi.")
    await session.delete(variant)
    await session.commit()
    return {"status": "deleted"}


@app.post("/api/admin/addons", response_model=MenuItemAddonRead)
async def admin_create_addon(
    payload: MenuItemAddonWrite,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> MenuItemAddonRead:
    addon = MenuItemAddon()
    apply_payload(addon, payload.model_dump())
    session.add(addon)
    await session.commit()
    await session.refresh(addon)
    return serialize_addon(addon)


@app.patch("/api/admin/addons/{addon_id}", response_model=MenuItemAddonRead)
async def admin_update_addon(
    addon_id: int,
    payload: MenuItemAddonWrite,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> MenuItemAddonRead:
    addon = await get_addon_or_404(session, addon_id)
    apply_payload(addon, payload.model_dump())
    await session.commit()
    await session.refresh(addon)
    return serialize_addon(addon)


@app.delete("/api/admin/addons/{addon_id}")
async def admin_delete_addon(
    addon_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> dict[str, str]:
    addon = await get_addon_or_404(session, addon_id)
    await session.delete(addon)
    await session.commit()
    return {"status": "deleted"}


@app.get("/api/admin/addon-groups", response_model=list[MenuItemAddonGroupRead])
async def admin_addon_groups(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
    menu_item_id: int | None = None,
) -> list[MenuItemAddonGroupRead]:
    query = (
        select(MenuItemAddonGroup)
        .options(
            selectinload(MenuItemAddonGroup.items).selectinload(MenuItemAddonGroupItem.addon)
        )
        .order_by(
            MenuItemAddonGroup.menu_item_id.asc(),
            MenuItemAddonGroup.sort_order.asc(),
            MenuItemAddonGroup.name.asc(),
        )
    )
    if menu_item_id is not None:
        query = query.where(MenuItemAddonGroup.menu_item_id == menu_item_id)

    result = await session.execute(query)
    return [serialize_addon_group(addon_group) for addon_group in result.scalars().all()]


@app.post("/api/admin/addon-groups", response_model=MenuItemAddonGroupRead)
async def admin_create_addon_group(
    payload: MenuItemAddonGroupWrite,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> MenuItemAddonGroupRead:
    if payload.max_select < payload.min_select:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="max_select min_select dan kichik bo'lmasin.",
        )
    await get_menu_item_or_404(session, payload.menu_item_id)
    addon_group = MenuItemAddonGroup()
    apply_payload(addon_group, payload.model_dump())
    session.add(addon_group)
    await session.commit()
    return serialize_addon_group(await fetch_addon_group_read(session, addon_group.id))


@app.patch("/api/admin/addon-groups/{addon_group_id}", response_model=MenuItemAddonGroupRead)
async def admin_update_addon_group(
    addon_group_id: int,
    payload: MenuItemAddonGroupWrite,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> MenuItemAddonGroupRead:
    if payload.max_select < payload.min_select:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="max_select min_select dan kichik bo'lmasin.",
        )
    await get_menu_item_or_404(session, payload.menu_item_id)
    addon_group = await get_addon_group_or_404(session, addon_group_id)
    apply_payload(addon_group, payload.model_dump())
    await session.commit()
    return serialize_addon_group(await fetch_addon_group_read(session, addon_group.id))


@app.delete("/api/admin/addon-groups/{addon_group_id}")
async def admin_delete_addon_group(
    addon_group_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> dict[str, str]:
    addon_group = await get_addon_group_or_404(session, addon_group_id)
    await session.delete(addon_group)
    await session.commit()
    return {"status": "deleted"}


@app.get("/api/admin/addon-group-items", response_model=list[MenuItemAddonGroupItemRead])
async def admin_addon_group_items(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
    addon_group_id: int | None = None,
) -> list[MenuItemAddonGroupItemRead]:
    query = (
        select(MenuItemAddonGroupItem)
        .options(selectinload(MenuItemAddonGroupItem.addon))
        .order_by(
            MenuItemAddonGroupItem.addon_group_id.asc(),
            MenuItemAddonGroupItem.sort_order.asc(),
            MenuItemAddonGroupItem.id.asc(),
        )
    )
    if addon_group_id is not None:
        query = query.where(MenuItemAddonGroupItem.addon_group_id == addon_group_id)

    result = await session.execute(query)
    return [serialize_addon_group_item(group_item) for group_item in result.scalars().all()]


@app.post("/api/admin/addon-group-items", response_model=MenuItemAddonGroupItemRead)
async def admin_create_addon_group_item(
    payload: MenuItemAddonGroupItemWrite,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> MenuItemAddonGroupItemRead:
    await get_addon_group_or_404(session, payload.addon_group_id)
    await get_addon_or_404(session, payload.addon_id)
    await ensure_addon_link_is_unique(session, payload.addon_group_id, payload.addon_id)
    group_item = MenuItemAddonGroupItem()
    apply_payload(group_item, payload.model_dump())
    session.add(group_item)
    await session.commit()
    return serialize_addon_group_item(await fetch_addon_group_item_read(session, group_item.id))


@app.patch(
    "/api/admin/addon-group-items/{group_item_id}",
    response_model=MenuItemAddonGroupItemRead,
)
async def admin_update_addon_group_item(
    group_item_id: int,
    payload: MenuItemAddonGroupItemWrite,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> MenuItemAddonGroupItemRead:
    await get_addon_group_or_404(session, payload.addon_group_id)
    await get_addon_or_404(session, payload.addon_id)
    await ensure_addon_link_is_unique(
        session,
        payload.addon_group_id,
        payload.addon_id,
        current_id=group_item_id,
    )
    group_item = await get_addon_group_item_or_404(session, group_item_id)
    apply_payload(group_item, payload.model_dump())
    await session.commit()
    return serialize_addon_group_item(await fetch_addon_group_item_read(session, group_item.id))


@app.delete("/api/admin/addon-group-items/{group_item_id}")
async def admin_delete_addon_group_item(
    group_item_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict | None, Depends(require_admin)],
) -> dict[str, str]:
    group_item = await get_addon_group_item_or_404(session, group_item_id)
    await session.delete(group_item)
    await session.commit()
    return {"status": "deleted"}


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
