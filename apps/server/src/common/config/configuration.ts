export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  resourceBaseUrl: process.env.RESOURCE_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`,
  bot: {
    token: process.env.BOT_TOKEN,
    mode: process.env.MODE || 'polling',
    webhookUrl: process.env.WEBHOOK_URL,
    rateLimit: {
      window: parseInt(process.env.BOT_RATE_LIMIT_WINDOW || '60000', 10),
      limit: parseInt(process.env.BOT_RATE_LIMIT_MAX || '10', 10),
    },
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
    secret: process.env.EXPORT_SECRET || 'your-secret-key-change-in-production',
  },
  notification: {
    cron: process.env.NOTIFICATION_CRON || '0 9 * * *',
  },
  slash: {
    apiKey: process.env.SLASH_API_KEY,
    baseUrl: process.env.SLASH_BASE_URL || 'https://api.joinslash.com',
    timeout: parseInt(process.env.SLASH_TIMEOUT || '30000', 10),
    webhookSecret: process.env.SLASH_WEBHOOK_SECRET,
    enableScheduledSync: process.env.SLASH_ENABLE_SCHEDULED_SYNC !== 'false', // Default: true
  },
  googleSheets: {
    accountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    enableScheduledSync: process.env.GOOGLE_SHEETS_ENABLE_SCHEDULED_SYNC !== 'true', // disable sync monthly
    enableScheduledSyncFull: process.env.GOOGLE_SHEETS_ENABLE_SCHEDULED_SYNC_FULL !== 'false', // enable sync full daily
    syncCron: process.env.GOOGLE_SHEETS_SYNC_CRON || '*/15 * * * *',
    syncDelayBetweenAccounts: process.env.GOOGLE_SHEETS_SYNC_DELAY_BETWEEN_ACCOUNTS || '30000', // milliseconds
    chunkSize: process.env.GOOGLE_SHEETS_CHUNK_SIZE || '5000', // rows per chunk
  },
  cardDetailTimeout: 60000
});
