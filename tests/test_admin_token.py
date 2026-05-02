import time

from app.config import get_settings
from app.web.main import ADMIN_TOKEN_TTL_SECONDS, sign_admin_token, verify_admin_token


def test_admin_token_ttl_is_six_hours() -> None:
    assert ADMIN_TOKEN_TTL_SECONDS == 6 * 60 * 60


def test_admin_token_verifies_until_expiration() -> None:
    settings = get_settings()
    token = sign_admin_token(
        {"login": settings.admin_login, "exp": int(time.time()) + ADMIN_TOKEN_TTL_SECONDS}
    )

    assert verify_admin_token(token)


def test_admin_token_rejects_expired_token() -> None:
    settings = get_settings()
    token = sign_admin_token({"login": settings.admin_login, "exp": int(time.time()) - 1})

    assert not verify_admin_token(token)
