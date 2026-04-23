from app.config import get_settings


async def init_db() -> None:
    settings = get_settings()
    message = (
        "MySQL schema Alembic orqali boshqariladi. "
        f"Avval `{settings.db_name}` bazasini yarating, keyin `alembic upgrade head` ishlating."
    )
    raise RuntimeError(message)


if __name__ == "__main__":
    import asyncio

    asyncio.run(init_db())
