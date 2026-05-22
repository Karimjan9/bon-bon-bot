# Bon Bon Bot

Professional Python Telegram bot, Telegram Mini App, admin panel va MySQL backend muhiti.

## Stack

- `aiogram` - Telegram bot polling
- `FastAPI` - Mini App API va admin API
- `SQLAlchemy async` - MySQL bilan async database layer
- `Alembic` - productionga yaqin schema migration
- `MySQL/MariaDB` - asosiy va yagona database
- `Vanilla HTML/CSS/JS` - Telegram Mini App frontend

## O'rnatish

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

`.env` ichida kamida `BOT_TOKEN`, `WEB_APP_URL`, `ADMIN_KEY`, `ADMIN_TELEGRAM_IDS` va MySQL sozlamalarini to'ldiring.

## MySQL

Default sozlama XAMPP MySQL/MariaDB uchun:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=bon_bon_bot
DB_USER=root
DB_PASSWORD=
DB_CHARSET=utf8mb4
```

Database yaratish:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\mysql_create_database.ps1
```

Migration ishga tushirish:

```powershell
.\.venv\Scripts\Activate.ps1
alembic upgrade head
```

Bot ishga tushganda ham MySQL database va asosiy tablelarni tekshiradi. Agar tablelar yetishmasa `alembic upgrade head` avtomatik bajariladi, tablelar bor bo'lsa migration skip qilinadi.

Default katalog mahsulotlarini qo'shish:

```powershell
python -m app.db.seed
```

MySQL ulanishini tekshirish:

```powershell
python -m app.db.check
```

## Admin

Admin panel:

```text
http://127.0.0.1:8000/admin
```

Local brauzer test uchun `.env` ichidagi `ADMIN_KEY`ni `/admin` sahifasida kiriting. Telegram ichida admin avtomatik ochilishi uchun Telegram ID raqamingizni `.env`ga yozing:

```env
ADMIN_TELEGRAM_IDS=123456789
```

Telegram ID raqamingizni botdagi `/id` buyrug'i orqali ko'rishingiz mumkin.

## Ishga tushirish

Web app va API:

```powershell
.\.venv\Scripts\Activate.ps1
python -m app.web.main
```

Bot:

```powershell
.\.venv\Scripts\Activate.ps1
python -m app.bot.main
```

Health endpointlar:

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/health/db
```

## Mini App

Telegram Mini App uchun `WEB_APP_URL` public HTTPS bo'lishi kerak. Local testda `ngrok`, `cloudflared tunnel` yoki boshqa HTTPS tunnel ishlating.

Botda `/start` yuboring, keyin `Mini ilovani ochish` tugmasini bosing.

## Keyingi kengaytirish uchun asos

Hozirgi schema katalog, mahsulotlar, buyurtma itemlari, status lifecycle, admin stats va audit log uchun tayyor. Keyin bemalol delivery, payment, coupon, media upload, filiallar, operator rollari va CRM integratsiyalarini shu asosga qo'shish mumkin.
