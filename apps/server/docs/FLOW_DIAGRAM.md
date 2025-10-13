# System Flow Diagrams

## Request Flow

```
User (Telegram)
    ↓
Telegram API
    ↓
bot.update.ts (Orchestrator)
    ↓
Feature Handler (Business Logic)
    ↓
Service Layer (Data Operations)
    ↓
Database / External API
    ↓
Response back to User
```

## Module Dependencies

```
app.module.ts
    ├── ConfigModule (global)
    ├── MongooseModule (database)
    ├── ScheduleModule (cron jobs)
    ├── TelegrafModule (bot)
    │
    ├── BotModule
    │   ├── MenuModule
    │   │   └── UsersModule
    │   └── SubscriptionModule
    │       └── UsersModule
    │
    ├── UsersModule
    └── NotificationsModule
        ├── BotModule
        └── UsersModule
```

## Command Flow Example

### /subscribe Command

```
1. User sends "/subscribe"
   ↓
2. bot.update.ts @Command('subscribe')
   ↓
3. subscriptionHandler.handleSubscribe(ctx)
   ↓
4. usersService.updateSubscription(userId, true)
   ↓
5. MongoDB: Update user.isSubscribed = true
   ↓
6. ctx.reply(Messages.subscribed)
   ↓
7. User receives confirmation
```

## Future Feature Flow

### Card Detail Request (Planned)

```
1. User sends "/card 1234"
   ↓
2. bot.update.ts @Command('card')
   ↓
3. AuthGuard: Verify user
   ↓
4. CardAccessGuard: Verify user owns card
   ↓
5. cardsHandler.handleCardDetail(ctx, '1234')
   ↓
6. finSystemService.getCardDetail('1234')
   ↓
7. Unmask CVV
   ↓
8. ctx.reply(cardDetail)
   ↓
9. Auto-delete after 30s (security)
```

### OTP Delivery (Planned)

```
1. Fin System generates OTP
   ↓
2. POST /webhook/otp
   ↓
3. otpHandler.receiveOtp(userId, otp, purpose)
   ↓
4. botService.sendMessage(userId, otpMessage)
   ↓
5. Telegram delivers to user
   ↓
6. Log delivery for audit
```

### Transaction Report (Planned)

```
Cron Job (Daily 9 AM)
   ↓
transactionsJob.sendDailyReport()
   ↓
usersService.getSubscribedUsers()
   ↓
For each user:
   ↓
   transactionsService.getTransactions(userId, 'today')
   ↓
   botService.sendMessage(userId, report)
   ↓
   User receives report
```

## Data Flow

### User Registration

```
/start command
   ↓
menuHandler.handleStart()
   ↓
usersService.findOrCreate()
   ↓
Check if user exists in MongoDB
   ├── Exists: Return user
   └── Not exists:
       ↓
       Create new user document
       ↓
       Save to MongoDB
       ↓
       Return user
```

### Notification Delivery

```
Cron trigger (9 AM daily)
   ↓
notificationsJob.handleDailyNotification()
   ↓
usersService.getSubscribedUsers()
   ↓
Filter users where isSubscribed = true
   ↓
For each subscribed user:
   ↓
   botService.sendMessage(userId, notification)
   ↓
   Telegram API delivers message
```

## Security Flow

### Rate Limiting

```
User sends command
   ↓
RateLimitGuard.canActivate()
   ↓
Check request count in last 60s
   ├── < 10 requests: Allow
   └── >= 10 requests: Block
```

### Sensitive Data Masking

```
Card data retrieved
   ↓
MaskingUtil.maskCardNumber()
   ↓
"1234567890123456" → "************3456"
   ↓
Display to user
```

## Error Handling Flow

```
Error occurs
   ↓
SensitiveDataFilter catches
   ↓
Remove sensitive data (CVV, full card numbers)
   ↓
Log sanitized error
   ↓
Return safe error message to user
```
