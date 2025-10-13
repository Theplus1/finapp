# Quick Start

## Setup

```bash
npm install --legacy-peer-deps
cp .env.example .env
```

## Configure

Edit `.env`:
```env
BOT_TOKEN=<get_from_@BotFather>
MODE=polling
MONGO_URI=mongodb://localhost:27017/telegram-bot
```

## Run Server

```bash
npm run start:dev
```

## Test

Open Telegram, search for your bot, send `/start`

## Troubleshooting

- Bot not responding: Check BOT_TOKEN in `.env`
- MongoDB error: Verify MongoDB is running
- Port in use: Change PORT in `.env`
