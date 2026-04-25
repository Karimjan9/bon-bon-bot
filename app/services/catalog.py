from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    Category,
    MenuItem,
    MenuItemAddon,
    MenuItemAddonGroup,
    MenuItemAddonGroupItem,
    MenuItemVariant,
    Product,
    ProductCategory,
)


async def list_active_products(session: AsyncSession) -> list[Product]:
    result = await session.execute(
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.is_active.is_(True))
        .order_by(Product.sort_order.asc(), Product.title.asc())
    )
    return list(result.scalars().all())


async def list_categories(session: AsyncSession, active_only: bool = True) -> list[Category]:
    query = select(Category).order_by(Category.sort_order.asc(), Category.name.asc())
    if active_only:
        query = query.where(Category.is_active.is_(True))

    result = await session.execute(query)
    return list(result.scalars().all())


async def list_menu_items(session: AsyncSession, active_only: bool = True) -> list[MenuItem]:
    query = (
        select(MenuItem)
        .options(selectinload(MenuItem.category), selectinload(MenuItem.variants))
        .options(
            selectinload(MenuItem.addon_groups)
            .selectinload(MenuItemAddonGroup.items)
            .selectinload(MenuItemAddonGroupItem.addon)
        )
        .join(MenuItem.category)
        .order_by(Category.sort_order.asc(), MenuItem.sort_order.asc(), MenuItem.name.asc())
    )
    if active_only:
        query = query.where(
            Category.is_active.is_(True),
            MenuItem.is_available.is_(True),
        )

    result = await session.execute(query)
    return list(result.scalars().all())


async def list_addons(session: AsyncSession, active_only: bool = True) -> list[MenuItemAddon]:
    query = select(MenuItemAddon).order_by(MenuItemAddon.name.asc())
    if active_only:
        query = query.where(MenuItemAddon.is_available.is_(True))

    result = await session.execute(query)
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


async def upsert_default_menu_catalog(session: AsyncSession) -> None:
    categories = [
        {
            "name": "Burgerlar",
            "description": "Burgerlar va sendvichlar.",
            "sort_order": 20,
        },
        {
            "name": "Lavashlar",
            "description": "Kichik, standart va katta lavashlar.",
            "sort_order": 10,
        },
        {
            "name": "Ichimliklar",
            "description": "Salqin ichimliklar.",
            "sort_order": 30,
        },
        {
            "name": "Desertlar",
            "description": "Shirinlik va desertlar.",
            "sort_order": 40,
        },
    ]

    category_by_name = {}
    for item in categories:
        category = await _get_or_create_menu_category(session, item["name"])
        category.description = item["description"]
        category.sort_order = item["sort_order"]
        category.is_active = True
        category_by_name[category.name] = category

    menu_items = [
        {
            "category": "Lavashlar",
            "name": "Mol go'shtli lavash",
            "description": "Mol go'shti, sous, sabzavot va lavash noni.",
            "base_price": Decimal("32000.00"),
            "sort_order": 10,
            "preparation_time_minutes": 12,
            "calories": 680,
            "weight_grams": 350,
            "is_popular": True,
            "variants": [
                {
                    "name": "Kichik",
                    "price": Decimal("26000.00"),
                    "weight_grams": 280,
                    "sort_order": 10,
                },
                {
                    "name": "Standart",
                    "price": Decimal("32000.00"),
                    "weight_grams": 350,
                    "is_default": True,
                    "sort_order": 20,
                },
                {
                    "name": "Katta",
                    "price": Decimal("39000.00"),
                    "weight_grams": 430,
                    "sort_order": 30,
                },
            ],
        },
        {
            "category": "Burgerlar",
            "name": "Cheeseburger",
            "description": "Kotlet, cheddar pishloq, bodring va maxsus sous.",
            "base_price": Decimal("28000.00"),
            "sort_order": 10,
            "preparation_time_minutes": 10,
            "calories": 540,
            "weight_grams": 260,
            "is_popular": True,
            "variants": [],
        },
        {
            "category": "Ichimliklar",
            "name": "Coca-Cola",
            "description": "Sovutilgan gazli ichimlik.",
            "base_price": Decimal("9000.00"),
            "sort_order": 10,
            "weight_grams": 500,
            "variants": [
                {"name": "0.5L", "price": Decimal("9000.00"), "is_default": True, "sort_order": 10},
                {"name": "1L", "price": Decimal("15000.00"), "sort_order": 20},
            ],
        },
        {
            "category": "Desertlar",
            "name": "Shokoladli desert",
            "description": "Yumshoq shokoladli desert.",
            "base_price": Decimal("22000.00"),
            "sort_order": 10,
            "calories": 410,
            "weight_grams": 160,
            "is_new": True,
            "variants": [],
        },
    ]

    for item in menu_items:
        menu_item = await _get_or_create_menu_item(
            session=session,
            category=category_by_name[item["category"]],
            name=item["name"],
        )
        menu_item.description = item["description"]
        menu_item.base_price = item["base_price"]
        menu_item.sort_order = item["sort_order"]
        menu_item.preparation_time_minutes = item.get("preparation_time_minutes")
        menu_item.calories = item.get("calories")
        menu_item.weight_grams = item.get("weight_grams")
        menu_item.is_available = True
        menu_item.is_popular = bool(item.get("is_popular", False))
        menu_item.is_new = bool(item.get("is_new", False))

        for variant_item in item["variants"]:
            variant = await _get_or_create_variant(session, menu_item, variant_item["name"])
            variant.price = variant_item["price"]
            variant.weight_grams = variant_item.get("weight_grams")
            variant.is_default = bool(variant_item.get("is_default", False))
            variant.is_available = True
            variant.sort_order = variant_item.get("sort_order", 0)

    addons = [
        {
            "name": "Pishloq",
            "description": "Qo'shimcha cheddar pishloq.",
            "price": Decimal("5000.00"),
        },
        {
            "name": "Sarimsoqli sous",
            "description": "Yumshoq sarimsoqli sous.",
            "price": Decimal("3000.00"),
        },
        {
            "name": "Achchiq sous",
            "description": "Achchiq sous.",
            "price": Decimal("3000.00"),
        },
        {
            "name": "Qo'shimcha go'sht",
            "description": "Mol go'shtidan qo'shimcha porsiya.",
            "price": Decimal("12000.00"),
        },
        {
            "name": "Fri kartoshka",
            "description": "Kichik porsiya fri kartoshka.",
            "price": Decimal("10000.00"),
        },
    ]

    addon_by_name = {}
    for item in addons:
        addon = await _get_or_create_addon(session, item["name"])
        addon.description = item["description"]
        addon.price = item["price"]
        addon.is_available = True
        addon_by_name[addon.name] = addon

    lavash = await _get_or_create_menu_item(
        session=session,
        category=category_by_name["Lavashlar"],
        name="Mol go'shtli lavash",
    )
    sauce_group = await _get_or_create_addon_group(session, lavash, "Sous tanlang")
    sauce_group.min_select = 0
    sauce_group.max_select = 1
    sauce_group.is_required = False
    sauce_group.sort_order = 10
    await _sync_addon_group_items(
        session=session,
        addon_group=sauce_group,
        addons=[addon_by_name["Sarimsoqli sous"], addon_by_name["Achchiq sous"]],
    )

    extras_group = await _get_or_create_addon_group(session, lavash, "Qo'shimchalar")
    extras_group.min_select = 0
    extras_group.max_select = 3
    extras_group.is_required = False
    extras_group.sort_order = 20
    await _sync_addon_group_items(
        session=session,
        addon_group=extras_group,
        addons=[
            addon_by_name["Pishloq"],
            addon_by_name["Qo'shimcha go'sht"],
            addon_by_name["Fri kartoshka"],
        ],
    )

    burger = await _get_or_create_menu_item(
        session=session,
        category=category_by_name["Burgerlar"],
        name="Cheeseburger",
    )
    burger_extras = await _get_or_create_addon_group(session, burger, "Burger qo'shimchalari")
    burger_extras.min_select = 0
    burger_extras.max_select = 2
    burger_extras.is_required = False
    burger_extras.sort_order = 10
    await _sync_addon_group_items(
        session=session,
        addon_group=burger_extras,
        addons=[addon_by_name["Pishloq"], addon_by_name["Fri kartoshka"]],
    )

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


async def _get_or_create_menu_category(session: AsyncSession, name: str) -> Category:
    result = await session.execute(select(Category).where(Category.name == name))
    category = result.scalar_one_or_none()
    if category is None:
        category = Category(name=name)
        session.add(category)
        await session.flush()
    return category


async def _get_or_create_menu_item(
    session: AsyncSession,
    category: Category,
    name: str,
) -> MenuItem:
    result = await session.execute(
        select(MenuItem).where(MenuItem.category_id == category.id, MenuItem.name == name)
    )
    menu_item = result.scalar_one_or_none()
    if menu_item is None:
        menu_item = MenuItem(category=category, name=name, base_price=Decimal("0.00"))
        session.add(menu_item)
        await session.flush()
    return menu_item


async def _get_or_create_variant(
    session: AsyncSession,
    menu_item: MenuItem,
    name: str,
) -> MenuItemVariant:
    result = await session.execute(
        select(MenuItemVariant).where(
            MenuItemVariant.menu_item_id == menu_item.id,
            MenuItemVariant.name == name,
        )
    )
    variant = result.scalar_one_or_none()
    if variant is None:
        variant = MenuItemVariant(menu_item=menu_item, name=name, price=Decimal("0.00"))
        session.add(variant)
        await session.flush()
    return variant


async def _get_or_create_addon(session: AsyncSession, name: str) -> MenuItemAddon:
    result = await session.execute(select(MenuItemAddon).where(MenuItemAddon.name == name))
    addon = result.scalar_one_or_none()
    if addon is None:
        addon = MenuItemAddon(name=name, price=Decimal("0.00"))
        session.add(addon)
        await session.flush()
    return addon


async def _get_or_create_addon_group(
    session: AsyncSession,
    menu_item: MenuItem,
    name: str,
) -> MenuItemAddonGroup:
    result = await session.execute(
        select(MenuItemAddonGroup).where(
            MenuItemAddonGroup.menu_item_id == menu_item.id,
            MenuItemAddonGroup.name == name,
        )
    )
    addon_group = result.scalar_one_or_none()
    if addon_group is None:
        addon_group = MenuItemAddonGroup(menu_item=menu_item, name=name)
        session.add(addon_group)
        await session.flush()
    return addon_group


async def _sync_addon_group_items(
    session: AsyncSession,
    addon_group: MenuItemAddonGroup,
    addons: list[MenuItemAddon],
) -> None:
    for index, addon in enumerate(addons, start=1):
        result = await session.execute(
            select(MenuItemAddonGroupItem).where(
                MenuItemAddonGroupItem.addon_group_id == addon_group.id,
                MenuItemAddonGroupItem.addon_id == addon.id,
            )
        )
        group_item = result.scalar_one_or_none()
        if group_item is None:
            group_item = MenuItemAddonGroupItem(addon_group=addon_group, addon=addon)
            session.add(group_item)
            await session.flush()

        group_item.sort_order = index * 10
