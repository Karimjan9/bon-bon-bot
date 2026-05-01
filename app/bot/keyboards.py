from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    WebAppInfo,
)


def is_https_url(url: str) -> bool:
    return url.lower().startswith("https://")


def language_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text="🇺🇿 O'zbek"),
                KeyboardButton(text="🇷🇺 Русский"),
                KeyboardButton(text="🇬🇧 English"),
            ]
        ],
        resize_keyboard=True,
    )


def contact_request_keyboard(button_text: str = "Kontaktni ulashish") -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(
                    text=button_text,
                    request_contact=True,
                )
            ]
        ],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def main_keyboard(web_app_url: str) -> ReplyKeyboardMarkup:
    if not is_https_url(web_app_url):
        return ReplyKeyboardMarkup(
            keyboard=[
                [KeyboardButton(text="Mini ilovani ochish")],
                [KeyboardButton(text="Yordam")],
            ],
            resize_keyboard=True,
        )

    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(
                    text="Mini ilovani ochish",
                    web_app=WebAppInfo(url=web_app_url),
                )
            ],
            [KeyboardButton(text="Yordam")],
        ],
        resize_keyboard=True,
    )


def menu_inline_keyboard(
    web_app_url: str,
    button_text: str = "Menyuni ko'rish",
) -> InlineKeyboardMarkup:
    button = InlineKeyboardButton(
        text=button_text,
        web_app=WebAppInfo(url=web_app_url),
    )
    if not is_https_url(web_app_url):
        button = InlineKeyboardButton(
            text=button_text,
            url=web_app_url,
        )

    return InlineKeyboardMarkup(
        inline_keyboard=[[button]]
    )
