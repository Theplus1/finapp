export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  bot: {
    token: process.env.BOT_TOKEN,
    mode: process.env.MODE || 'polling',
    webhookUrl: process.env.WEBHOOK_URL,
  },
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/telegram-bot',
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
