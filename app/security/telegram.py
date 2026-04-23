import hashlib
import hmac
import json
import time
from typing import Any
from urllib.parse import parse_qsl


class TelegramInitDataError(ValueError):
    pass


def verify_telegram_init_data(
    init_data: str,
    bot_token: str,
    max_age_seconds: int = 86_400,
) -> dict[str, Any]:
    if not init_data:
        raise TelegramInitDataError("Telegram initData bo'sh.")

    if not bot_token:
        raise TelegramInitDataError("BOT_TOKEN sozlanmagan.")

    data = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = data.pop("hash", None)
    if not received_hash:
        raise TelegramInitDataError("initData hash topilmadi.")

    check_string = "\n".join(f"{key}={value}" for key, value in sorted(data.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(
        secret_key,
        check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise TelegramInitDataError("initData hash noto'g'ri.")

    auth_date = int(data.get("auth_date", "0") or 0)
    if max_age_seconds and time.time() - auth_date > max_age_seconds:
        raise TelegramInitDataError("initData muddati o'tgan.")

    if "user" in data:
        data["user"] = json.loads(data["user"])

    return data
