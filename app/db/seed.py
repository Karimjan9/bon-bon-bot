import asyncio

from app.db.session import async_session_factory, engine
from app.services.catalog import upsert_default_catalog, upsert_default_menu_catalog


async def main() -> None:
    try:
        async with async_session_factory() as session:
            await upsert_default_catalog(session)
            await upsert_default_menu_catalog(session)
        print("Default MySQL catalog seed OK.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
