from aiogram.types import KeyboardButton, ReplyKeyboardMarkup, WebAppInfo


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
