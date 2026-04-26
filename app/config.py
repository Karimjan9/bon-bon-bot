from functools import lru_cache
from urllib.parse import quote_plus

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = Field(default="local", validation_alias="APP_ENV")
    bot_token: str = Field(default="", validation_alias="BOT_TOKEN")
    web_app_url: str = Field(default="http://127.0.0.1:8000", validation_alias="WEB_APP_URL")
    host: str = Field(default="127.0.0.1", validation_alias="HOST")
    port: int = Field(default=8000, validation_alias="PORT")
    debug: bool = Field(default=True, validation_alias="APP_DEBUG")

    db_host: str = Field(default="127.0.0.1", validation_alias="DB_HOST")
    db_port: int = Field(default=3306, validation_alias="DB_PORT")
    db_name: str = Field(default="bon_bon_bot", validation_alias="DB_NAME")
    db_user: str = Field(default="root", validation_alias="DB_USER")
    db_password: str = Field(default="", validation_alias="DB_PASSWORD")
    db_charset: str = Field(default="utf8mb4", validation_alias="DB_CHARSET")
    db_echo: bool = Field(default=False, validation_alias="DB_ECHO")

    admin_key: str = Field(default="", validation_alias="ADMIN_KEY")
    admin_login: str = Field(default="admin", validation_alias="ADMIN_LOGIN")
    admin_password: str = Field(default="", validation_alias="ADMIN_PASSWORD")
    admin_telegram_ids: str = Field(default="", validation_alias="ADMIN_TELEGRAM_IDS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value: bool | str) -> bool | str:
        if not isinstance(value, str):
            return value

        normalized = value.strip().lower()
        if normalized in {"release", "prod", "production", "false", "0", "no", "off"}:
            return False
        if normalized in {"debug", "dev", "development", "true", "1", "yes", "on"}:
            return True

        return value

    @property
    def admin_ids(self) -> set[int]:
        ids: set[int] = set()
        for value in self.admin_telegram_ids.split(","):
            value = value.strip()
            if value.isdigit():
                ids.add(int(value))
        return ids

    @property
    def async_database_url(self) -> str:
        return self._mysql_url(driver="aiomysql")

    @property
    def sync_database_url(self) -> str:
        return self._mysql_url(driver="pymysql")

    def _mysql_url(self, driver: str) -> str:
        user = quote_plus(self.db_user)
        password = quote_plus(self.db_password)
        host = self.db_host
        database = quote_plus(self.db_name)
        charset = quote_plus(self.db_charset)
        return (
            f"mysql+{driver}://{user}:{password}@{host}:{self.db_port}/"
            f"{database}?charset={charset}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
