import asyncio
from dataclasses import dataclass
from pathlib import Path

import pymysql
from alembic import command
from alembic.config import Config
from sqlalchemy import text

from app.config import get_settings
from app.db.session import engine

BASE_DIR = Path(__file__).resolve().parents[2]

REQUIRED_APP_TABLES = {
    "telegram_users",
    "product_categories",
    "products",
    "orders",
    "order_items",
    "admin_audit_logs",
}


@dataclass(frozen=True)
class SchemaCheckResult:
    migrated: bool
    existing_tables: set[str]
    missing_tables: set[str]


async def get_existing_tables() -> set[str]:
    settings = get_settings()
    query = text(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = :database_name
        """
    )

    async with engine.connect() as connection:
        result = await connection.execute(query, {"database_name": settings.db_name})
        return {str(row[0]) for row in result.fetchall()}


async def ensure_schema_ready() -> SchemaCheckResult:
    await asyncio.to_thread(ensure_database_exists)

    existing_tables = await get_existing_tables()
    missing_tables = REQUIRED_APP_TABLES - existing_tables

    if not missing_tables:
        return SchemaCheckResult(
            migrated=False,
            existing_tables=existing_tables,
            missing_tables=set(),
        )

    await engine.dispose()
    await asyncio.to_thread(run_alembic_upgrade)

    existing_tables = await get_existing_tables()
    missing_tables = REQUIRED_APP_TABLES - existing_tables
    if missing_tables:
        missing = ", ".join(sorted(missing_tables))
        raise RuntimeError(
            "MySQL schema migration tugadi, lekin tablelar yetishmayapti: "
            f"{missing}"
        )

    return SchemaCheckResult(
        migrated=True,
        existing_tables=existing_tables,
        missing_tables=set(),
    )


def run_alembic_upgrade() -> None:
    config = Config(str(BASE_DIR / "alembic.ini"))
    command.upgrade(config, "head")


def ensure_database_exists() -> None:
    settings = get_settings()
    database_name = quote_identifier(settings.db_name)
    charset = validate_charset(settings.db_charset)

    connection = pymysql.connect(
        host=settings.db_host,
        port=settings.db_port,
        user=settings.db_user,
        password=settings.db_password,
        charset=settings.db_charset,
        autocommit=True,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS {database_name} "
                f"CHARACTER SET {charset}"
            )
    finally:
        connection.close()


def quote_identifier(value: str) -> str:
    return f"`{value.replace('`', '``')}`"


def validate_charset(value: str) -> str:
    normalized = value.strip().lower()
    if not normalized.replace("_", "").isalnum():
        raise ValueError("DB_CHARSET faqat harf, raqam va underscore bo'lishi mumkin.")
    return normalized
