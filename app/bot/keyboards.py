from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    WebAppInfo,
)


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


def main_keyboard(web_app_url: str) -> ReplyKeyboardMarkup:
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


def menu_inline_keyboard(web_app_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Menyuni ko'rish",
                    web_app=WebAppInfo(url=web_app_url),
                )
            ]
        ]
    )
