import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from app.config import get_settings
from app.db.migrations import ensure_schema_ready
from app.db.models import (
    Category,
    MenuItem,
    MenuItemAddon,
    MenuItemAddonGroup,
    MenuItemAddonGroupItem,
    MenuItemVariant,
    Order,
)
from app.db.session import async_session_factory, engine
from app.web.main import app

pytestmark = pytest.mark.asyncio


async def cleanup_smoke_data() -> None:
    async with async_session_factory() as session:
        await session.execute(delete(Order).where(Order.note.like("%Codex admin CRUD test%")))
        await session.execute(
            delete(MenuItemAddonGroupItem).where(
                MenuItemAddonGroupItem.sort_order.in_([9701, 9702, 9703])
            )
        )
        await session.execute(
            delete(MenuItemAddonGroup).where(MenuItemAddonGroup.name.like("Codex Admin CRUD%"))
        )
        await session.execute(
            delete(MenuItemVariant).where(MenuItemVariant.name.like("Codex Admin CRUD%"))
        )
        await session.execute(
            delete(MenuItemAddon).where(MenuItemAddon.name.like("Codex Admin CRUD%"))
        )
        await session.execute(delete(MenuItem).where(MenuItem.name.like("Codex Admin CRUD%")))
        await session.execute(delete(Category).where(Category.name.like("Codex Admin CRUD%")))
        await session.commit()


async def expect_json(response, status_code: int, label: str):
    assert response.status_code == status_code, (
        f"{label}: expected {status_code}, got {response.status_code}: {response.text[:500]}"
    )
    return response.json() if response.content else None


def find_by_id(rows: list[dict], item_id: int) -> dict | None:
    return next((row for row in rows if row["id"] == item_id), None)


@pytest.fixture
async def admin_client():
    await engine.dispose()
    await ensure_schema_ready()
    await cleanup_smoke_data()

    settings = get_settings()
    password = settings.admin_password or settings.admin_key
    assert (
        settings.admin_login and password
    ), "ADMIN_LOGIN and ADMIN_PASSWORD/ADMIN_KEY are required"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        login = await expect_json(
            await client.post(
                "/api/admin/login",
                json={"login": settings.admin_login, "password": password},
            ),
            200,
            "admin login",
        )
        client.headers.update({"X-Admin-Token": login["access_token"]})
        yield client

    await cleanup_smoke_data()
    await engine.dispose()


async def assert_create_update_delete(
    client: AsyncClient,
    endpoint: str,
    create_payload: dict,
    update_payload: dict,
    create_assertions: dict,
    update_assertions: dict,
) -> int:
    created = await expect_json(
        await client.post(endpoint, json=create_payload),
        200,
        f"create {endpoint}",
    )
    item_id = created["id"]
    for field, expected in create_assertions.items():
        assert created[field] == expected

    rows = await expect_json(await client.get(endpoint), 200, f"list after create {endpoint}")
    listed = find_by_id(rows, item_id)
    assert listed is not None
    for field, expected in create_assertions.items():
        assert listed[field] == expected

    updated = await expect_json(
        await client.patch(f"{endpoint}/{item_id}", json=update_payload),
        200,
        f"update {endpoint}",
    )
    for field, expected in update_assertions.items():
        assert updated[field] == expected

    rows = await expect_json(await client.get(endpoint), 200, f"list after update {endpoint}")
    listed = find_by_id(rows, item_id)
    assert listed is not None
    for field, expected in update_assertions.items():
        assert listed[field] == expected

    await expect_json(await client.delete(f"{endpoint}/{item_id}"), 200, f"delete {endpoint}")
    rows = await expect_json(await client.get(endpoint), 200, f"list after delete {endpoint}")
    assert find_by_id(rows, item_id) is None
    return item_id


async def create_category(client: AsyncClient) -> int:
    category = await expect_json(
        await client.post(
            "/api/admin/categories",
            json={
                "name": "Codex Admin CRUD Category",
                "description": "create category",
                "image_url": None,
                "sort_order": 9701,
                "is_active": True,
            },
        ),
        200,
        "create category dependency",
    )
    return category["id"]


async def create_menu_item(client: AsyncClient, category_id: int) -> int:
    item = await expect_json(
        await client.post(
            "/api/admin/menu-items",
            json={
                "category_id": category_id,
                "name": "Codex Admin CRUD Item",
                "description": "create item",
                "base_price": "11111.00",
                "image_url": None,
                "is_available": True,
                "is_popular": False,
                "is_new": False,
                "sort_order": 9701,
                "preparation_time_minutes": 5,
                "calories": 100,
                "weight_grams": 200,
            },
        ),
        200,
        "create menu item dependency",
    )
    return item["id"]


async def create_addon(client: AsyncClient) -> int:
    addon = await expect_json(
        await client.post(
            "/api/admin/addons",
            json={
                "name": "Codex Admin CRUD Addon",
                "description": "create addon",
                "price": "1000.00",
                "is_available": True,
            },
        ),
        200,
        "create addon dependency",
    )
    return addon["id"]


async def create_addon_group(client: AsyncClient, menu_item_id: int) -> int:
    group = await expect_json(
        await client.post(
            "/api/admin/addon-groups",
            json={
                "menu_item_id": menu_item_id,
                "name": "Codex Admin CRUD Group",
                "min_select": 0,
                "max_select": 1,
                "is_required": False,
                "sort_order": 9701,
            },
        ),
        200,
        "create addon group dependency",
    )
    return group["id"]


async def test_admin_categories_create_edit_delete(admin_client: AsyncClient):
    await assert_create_update_delete(
        admin_client,
        "/api/admin/categories",
        {
            "name": "Codex Admin CRUD Category",
            "description": "create category",
            "image_url": None,
            "sort_order": 9701,
            "is_active": True,
        },
        {
            "name": "Codex Admin CRUD Category Edited",
            "description": "edit category",
            "image_url": None,
            "sort_order": 9702,
            "is_active": False,
        },
        {"name": "Codex Admin CRUD Category", "sort_order": 9701, "is_active": True},
        {"name": "Codex Admin CRUD Category Edited", "sort_order": 9702, "is_active": False},
    )


async def test_admin_menu_items_create_edit_delete(admin_client: AsyncClient):
    category_id = await create_category(admin_client)
    await assert_create_update_delete(
        admin_client,
        "/api/admin/menu-items",
        {
            "category_id": category_id,
            "name": "Codex Admin CRUD Item",
            "description": "create item",
            "base_price": "11111.00",
            "image_url": None,
            "is_available": True,
            "is_popular": False,
            "is_new": False,
            "sort_order": 9701,
            "preparation_time_minutes": 5,
            "calories": 100,
            "weight_grams": 200,
        },
        {
            "category_id": category_id,
            "name": "Codex Admin CRUD Item Edited",
            "description": "edit item",
            "base_price": "22222.00",
            "image_url": None,
            "is_available": False,
            "is_popular": True,
            "is_new": True,
            "sort_order": 9702,
            "preparation_time_minutes": 6,
            "calories": 110,
            "weight_grams": 210,
        },
        {"name": "Codex Admin CRUD Item", "is_available": True, "sort_order": 9701},
        {"name": "Codex Admin CRUD Item Edited", "is_available": False, "sort_order": 9702},
    )


async def test_admin_variants_create_edit_delete(admin_client: AsyncClient):
    category_id = await create_category(admin_client)
    item_id = await create_menu_item(admin_client, category_id)
    await assert_create_update_delete(
        admin_client,
        "/api/admin/variants",
        {
            "menu_item_id": item_id,
            "name": "Codex Admin CRUD Variant",
            "price": "3000.00",
            "weight_grams": 50,
            "is_default": False,
            "is_available": True,
            "sort_order": 9701,
        },
        {
            "menu_item_id": item_id,
            "name": "Codex Admin CRUD Variant Edited",
            "price": "4000.00",
            "weight_grams": 60,
            "is_default": True,
            "is_available": False,
            "sort_order": 9702,
        },
        {"name": "Codex Admin CRUD Variant", "is_default": False, "sort_order": 9701},
        {"name": "Codex Admin CRUD Variant Edited", "is_default": True, "sort_order": 9702},
    )


async def test_admin_addons_create_edit_delete(admin_client: AsyncClient):
    await assert_create_update_delete(
        admin_client,
        "/api/admin/addons",
        {
            "name": "Codex Admin CRUD Addon",
            "description": "create addon",
            "price": "1000.00",
            "is_available": True,
        },
        {
            "name": "Codex Admin CRUD Addon Edited",
            "description": "edit addon",
            "price": "2000.00",
            "is_available": False,
        },
        {"name": "Codex Admin CRUD Addon", "is_available": True},
        {"name": "Codex Admin CRUD Addon Edited", "is_available": False},
    )


async def test_admin_addon_groups_create_edit_delete(admin_client: AsyncClient):
    category_id = await create_category(admin_client)
    item_id = await create_menu_item(admin_client, category_id)
    await assert_create_update_delete(
        admin_client,
        "/api/admin/addon-groups",
        {
            "menu_item_id": item_id,
            "name": "Codex Admin CRUD Group",
            "min_select": 0,
            "max_select": 1,
            "is_required": False,
            "sort_order": 9701,
        },
        {
            "menu_item_id": item_id,
            "name": "Codex Admin CRUD Group Edited",
            "min_select": 1,
            "max_select": 2,
            "is_required": True,
            "sort_order": 9702,
        },
        {"name": "Codex Admin CRUD Group", "is_required": False, "sort_order": 9701},
        {"name": "Codex Admin CRUD Group Edited", "is_required": True, "sort_order": 9702},
    )


async def test_admin_addon_group_items_create_edit_delete(admin_client: AsyncClient):
    category_id = await create_category(admin_client)
    item_id = await create_menu_item(admin_client, category_id)
    addon_id = await create_addon(admin_client)
    group_id = await create_addon_group(admin_client, item_id)
    await assert_create_update_delete(
        admin_client,
        "/api/admin/addon-group-items",
        {"addon_group_id": group_id, "addon_id": addon_id, "sort_order": 9701},
        {"addon_group_id": group_id, "addon_id": addon_id, "sort_order": 9702},
        {"addon_group_id": group_id, "addon_id": addon_id, "sort_order": 9701},
        {"addon_group_id": group_id, "addon_id": addon_id, "sort_order": 9702},
    )


async def test_admin_validation_and_order_status(admin_client: AsyncClient):
    category_id = await create_category(admin_client)
    item_id = await create_menu_item(admin_client, category_id)
    addon_id = await create_addon(admin_client)
    group_id = await create_addon_group(admin_client, item_id)

    await expect_json(
        await admin_client.post(
            "/api/admin/addon-groups",
            json={
                "menu_item_id": item_id,
                "name": "Codex Admin CRUD Invalid Group",
                "min_select": 2,
                "max_select": 1,
                "is_required": False,
                "sort_order": 9701,
            },
        ),
        422,
        "invalid addon group",
    )

    await expect_json(
        await admin_client.post(
            "/api/admin/addon-group-items",
            json={"addon_group_id": group_id, "addon_id": addon_id, "sort_order": 9701},
        ),
        200,
        "create addon group item before duplicate validation",
    )
    await expect_json(
        await admin_client.post(
            "/api/admin/addon-group-items",
            json={"addon_group_id": group_id, "addon_id": addon_id, "sort_order": 9702},
        ),
        422,
        "duplicate addon group item",
    )

    order = await expect_json(
        await admin_client.post(
            "/api/orders",
            json={
                "product": "codex-admin-crud-order",
                "quantity": 2,
                "note": "Codex admin CRUD test order",
                "customer_name": "Codex Tester",
                "customer_phone": "+998901234567",
                "delivery_address": "Test address",
            },
        ),
        200,
        "create public order",
    )

    updated = await expect_json(
        await admin_client.patch(
            f"/api/admin/orders/{order['id']}/status",
            json={"status": "processing"},
        ),
        200,
        "update order status",
    )
    assert updated["status"] == "processing"

    await expect_json(
        await admin_client.patch(f"/api/admin/orders/{order['id']}/status", json={"status": "bad"}),
        422,
        "invalid order status",
    )

    stats = await expect_json(await admin_client.get("/api/admin/stats"), 200, "admin stats")
    assert {"total_orders", "new_orders", "processing_orders", "done_orders", "revenue"} <= set(
        stats
    )
