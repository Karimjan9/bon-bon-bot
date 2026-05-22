import asyncio

from sqlalchemy import text

from app.config import get_settings
from app.db.session import engine


async def check_database_connection() -> None:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


async def main() -> None:
    settings = get_settings()
    try:
        await check_database_connection()
        print(
            "MySQL connection OK: "
            f"{settings.db_user}@{settings.db_host}:{settings.db_port}/{settings.db_name}"
        )
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
