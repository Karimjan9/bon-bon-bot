from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Product, ProductCategory


async def list_active_products(session: AsyncSession) -> list[Product]:
    result = await session.execute(
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.is_active.is_(True))
        .order_by(Product.sort_order.asc(), Product.title.asc())
    )
    return list(result.scalars().all())


async def upsert_default_catalog(session: AsyncSession) -> None:
    category = await _get_or_create_category(
        session=session,
        slug="bonbons",
        title="Bon Bonlar",
        sort_order=10,
    )

    products = [
        {
            "slug": "classic-bonbon",
            "title": "Classic Bon Bon",
            "description": "Klassik shokoladli bon bon.",
            "price": Decimal("25000.00"),
            "sort_order": 10,
        },
        {
            "slug": "choco-box",
            "title": "Choco Box",
            "description": "Aralash shokoladli quti.",
            "price": Decimal("85000.00"),
            "sort_order": 20,
        },
        {
            "slug": "gift-set",
            "title": "Gift Set",
            "description": "Sovg'a uchun premium to'plam.",
            "price": Decimal("140000.00"),
            "sort_order": 30,
        },
    ]

    for item in products:
        result = await session.execute(select(Product).where(Product.slug == item["slug"]))
        product = result.scalar_one_or_none()
        if product is None:
            product = Product(slug=item["slug"], category=category)
            session.add(product)

        product.title = item["title"]
        product.description = item["description"]
        product.price = item["price"]
        product.currency = "UZS"
        product.sort_order = item["sort_order"]
        product.is_active = True

    await session.commit()


async def _get_or_create_category(
    session: AsyncSession,
    slug: str,
    title: str,
    sort_order: int,
) -> ProductCategory:
    result = await session.execute(select(ProductCategory).where(ProductCategory.slug == slug))
    category = result.scalar_one_or_none()
    if category is None:
        category = ProductCategory(slug=slug)
        session.add(category)

    category.title = title
    category.sort_order = sort_order
    category.is_active = True
    return category
