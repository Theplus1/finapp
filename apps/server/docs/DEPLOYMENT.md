# Deployment

## Docker Compose

```bash
cp .env.example .env
# Edit .env with production values
docker-compose up -d
docker-compose logs -f bot
```

## Environment

```env
NODE_ENV=production
BOT_TOKEN=<token>
MODE=webhook
WEBHOOK_URL=https://yourdomain.com
MONGO_URI=mongodb://mongodb:27017/telegram-bot
```

## Verify

```bash
docker-compose ps
curl http://localhost:3000/health
```

## PM2 (Alternative)

```bash
npm run build
pm2 start dist/main.js --name telegram-bot
pm2 save
pm2 startup
```
