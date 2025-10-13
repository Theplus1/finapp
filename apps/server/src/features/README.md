# Features

This directory contains feature modules organized by business domain.

## Structure

Each feature module should follow this structure:

```
feature-name/
├── feature-name.module.ts      # Module definition
├── handlers/
│   └── feature.handler.ts      # Telegram command/action handlers
├── services/
│   └── feature.service.ts      # Business logic
├── dto/
│   └── feature.dto.ts          # Data transfer objects
└── guards/
    └── feature.guard.ts        # Feature-specific guards
```

## Implemented Features

### Menu
- `/start` - Welcome message
- `/help` - Command list
- `/menu` - Main menu
- About section

### Subscription
- `/subscribe` - Subscribe to notifications
- `/unsubscribe` - Unsubscribe
- `/status` - Check status
- Notification settings UI

## Planned Features

### Cards (TODO)
- List cards (masked CVV)
- Card detail with full info (including CVV)
- Card access guard
- Auto-delete sensitive messages

**Commands:**
- `/cards` - List all cards
- `/card <number>` - Get card details

### OTP (TODO)
- Receive OTP from fin system
- Deliver to user via Telegram
- Audit logging
- Expiry handling

**Integration:**
- Webhook endpoint from fin system
- Real-time delivery

### Transactions (TODO)
- List transactions (daily/weekly/monthly)
- Transaction detail
- Scheduled reports
- On-demand queries

**Commands:**
- `/transactions` - List recent transactions
- `/transaction <id>` - Get transaction detail

**Jobs:**
- Daily transaction report (9 AM)

## Adding a New Feature

1. Create feature directory:
```bash
mkdir -p src/features/feature-name/{handlers,services,dto,guards}
```

2. Create module:
```typescript
// feature-name.module.ts
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [],
  exports: [],
})
export class FeatureNameModule {}
```

3. Create handler:
```typescript
// handlers/feature-name.handler.ts
import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';

@Injectable()
export class FeatureNameHandler {
  async handleCommand(ctx: Context) {
    // Implementation
  }
}
```

4. Register in bot.module.ts:
```typescript
import { FeatureNameModule } from '../features/feature-name/feature-name.module';

@Module({
  imports: [
    // ...
    FeatureNameModule,
  ],
})
```

5. Use in bot.update.ts:
```typescript
constructor(
  private readonly featureNameHandler: FeatureNameHandler,
) {}

@Command('command')
async command(@Ctx() ctx: Context) {
  return this.featureNameHandler.handleCommand(ctx);
}
```

## Best Practices

- **Single Responsibility**: Each handler handles one feature
- **Reusable Services**: Extract business logic to services
- **Constants**: Use shared constants for messages/keyboards
- **Guards**: Add feature-specific guards for security
- **DTOs**: Define data structures for type safety
- **Testing**: Write unit tests for handlers and services
