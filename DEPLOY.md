# Bon Bon Bot deploy

Bu loyiha production serverda 3 ta asosiy qism bilan ishlaydi:

- FastAPI web/API: `app.web.main:app`
- Telegram bot polling: `app.bot.main`
- MySQL yoki MariaDB database

Telegram Mini App uchun public HTTPS domen shart. `.env` ichidagi `WEB_APP_URL`
shu domen bo'lishi kerak, masalan `https://bot.example.com`.

## Server talablari

Ubuntu/Debian server uchun minimal paketlar:

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip git nginx mysql-server
```

Python versiyasi 3.11 yoki yangi bo'lgani yaxshi.

## Projectni serverga olish

```bash
sudo mkdir -p /srv/bon-bon-bot
sudo chown -R $USER:$USER /srv/bon-bon-bot
cd /srv/bon-bon-bot
git clone <REPO_URL> .
```

Agar Git ishlatmasangiz, project fayllarini `/srv/bon-bon-bot` ichiga yuklang.
`.env`, `.venv`, cache va local database dump fayllarini Gitga qo'shmang.

## Python muhit

```bash
cd /srv/bon-bon-bot
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## MySQL database

```bash
sudo mysql
```

MySQL ichida:

```sql
CREATE DATABASE bon_bon_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bon_bon_bot'@'localhost' IDENTIFIED BY 'CHANGE_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON bon_bon_bot.* TO 'bon_bon_bot'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Production `.env`

Serverda `/srv/bon-bon-bot/.env` yarating:

```env
BOT_TOKEN=replace_with_real_token
WEB_APP_URL=https://bot.example.com
HOST=127.0.0.1
PORT=8000
APP_DEBUG=false
APP_ENV=production

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=bon_bon_bot
DB_USER=bon_bon_bot
DB_PASSWORD=CHANGE_STRONG_PASSWORD
DB_CHARSET=utf8mb4
DB_ECHO=false

ADMIN_KEY=CHANGE_RANDOM_ADMIN_KEY
ADMIN_LOGIN=admin
ADMIN_PASSWORD=CHANGE_STRONG_ADMIN_PASSWORD
ADMIN_TELEGRAM_IDS=123456789
```

`ADMIN_TELEGRAM_IDS` uchun Telegram ID ni botda `/id` orqali oling.

## Migration va seed

```bash
cd /srv/bon-bon-bot
. .venv/bin/activate
alembic upgrade head
python -m app.db.check
python -m app.db.seed
```

`seed` faqat boshlang'ich menyu kerak bo'lsa ishlatiladi.

## Systemd service

Namuna fayllar `deploy/` ichida:

- `deploy/bon-bon-web.service`
- `deploy/bon-bon-bot.service`

Ularni serverda `/etc/systemd/system/` ichiga nusxalang:

```bash
sudo cp deploy/bon-bon-web.service /etc/systemd/system/bon-bon-web.service
sudo cp deploy/bon-bon-bot.service /etc/systemd/system/bon-bon-bot.service
sudo systemctl daemon-reload
sudo systemctl enable --now bon-bon-web bon-bon-bot
```

Loglarni ko'rish:

```bash
journalctl -u bon-bon-web -f
journalctl -u bon-bon-bot -f
```

## Nginx va HTTPS

`deploy/nginx.conf.example` ichidagi `bot.example.com` ni domeningizga almashtiring,
keyin:

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/bon-bon-bot
sudo ln -s /etc/nginx/sites-available/bon-bon-bot /etc/nginx/sites-enabled/bon-bon-bot
sudo nginx -t
sudo systemctl reload nginx
```

HTTPS uchun:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d bot.example.com
```

## Tekshirish

```bash
curl https://bot.example.com/health
curl https://bot.example.com/health/db
systemctl status bon-bon-web bon-bon-bot
```

Telegram botda `/start` yuboring. Mini App tugmasi `WEB_APP_URL` bo'yicha ochilishi
kerak.

## Yangilash

```bash
cd /srv/bon-bon-bot
git pull
. .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
sudo systemctl restart bon-bon-web bon-bon-bot
```

