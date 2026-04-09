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
    enableScheduledSync: false, // monthly sync disabled, only full sync runs
    enableScheduledSyncFull: process.env.GOOGLE_SHEETS_ENABLE_SCHEDULED_SYNC_FULL !== 'false',
    syncCron: process.env.GOOGLE_SHEETS_SYNC_CRON || '*/15 * * * *',
    chunkSize: process.env.GOOGLE_SHEETS_CHUNK_SIZE || '5000', // rows per chunk
    syncDelayBetweenAccounts: process.env.GOOGLE_SHEETS_SYNC_DELAY_BETWEEN_ACCOUNTS || '20000', // milliseconds
  },
  cardDetailTimeout: 60000,
  balanceAlert: {
    enable: process.env.BALANCE_ALERT_ENABLE !== 'false', // Default: true
    cron: process.env.BALANCE_ALERT_CRON || '0 * * * *', // Default: every hour
    thresholdUsd: parseFloat(process.env.BALANCE_ALERT_THRESHOLD_USD || '5000'), // Default: 5000 USD
    cooldownHours: parseFloat(process.env.BALANCE_ALERT_COOLDOWN_HOURS || '0'), // Default: 0 hours (supports decimals, e.g., 0.1 = 6 minutes)
  },
  cardSpendingAlert: {
    enable: process.env.CARD_SPENDING_ALERT_ENABLE !== 'false', // Default: true
    cron: process.env.CARD_SPENDING_ALERT_CRON || '0 * * * *', // Default: every hour
    thresholdUsd: parseFloat(process.env.CARD_SPENDING_ALERT_THRESHOLD_USD || '1000'), // Default: 1000 USD
    cooldownHours: parseFloat(process.env.CARD_SPENDING_ALERT_COOLDOWN_HOURS || '0'), // Default: 0 hours
  },
});
