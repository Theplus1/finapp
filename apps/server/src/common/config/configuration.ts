export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  resourceBaseUrl: process.env.RESOURCE_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`,
  bot: {
    token: process.env.BOT_TOKEN,
    mode: process.env.MODE || 'polling',
    webhookUrl: process.env.WEBHOOK_URL,
  },
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/telegram-bot',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  },
  notification: {
    cron: process.env.NOTIFICATION_CRON || '0 9 * * *',
  },
  slash: {
    apiKey: process.env.SLASH_API_KEY,
    baseUrl: process.env.SLASH_BASE_URL || 'https://api.joinslash.com',
    timeout: parseInt(process.env.SLASH_TIMEOUT || '30000', 10),
    webhookSecret: process.env.SLASH_WEBHOOK_SECRET,
  },
  cardDetailTimeout: 60000
});
