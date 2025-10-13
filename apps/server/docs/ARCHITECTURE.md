# Architecture
## Project Structure

```
finapp-server/
├── src/
│   ├── app.module.ts              # Root module
│   ├── app.controller.ts          # Health check
│   ├── main.ts                    # Bootstrap
│   │
│   ├── bot/                       # Bot Orchestration
│   │   ├── bot.module.ts          # Imports feature modules
│   │   ├── bot.update.ts          # Thin orchestrator (delegates to handlers)
│   │   ├── bot.service.ts         # Message sending
│   │   ├── constants/
│   │   │   ├── messages.constant.ts   # All messages
│   │   │   └── keyboards.constant.ts  # All keyboards
│   │   └── interfaces/
│   │       └── bot-context.interface.ts
│   │
│   ├── features/                  # Business Features
│   │   ├── menu/
│   │   │   ├── menu.module.ts
│   │   │   └── handlers/
│   │   │       └── menu.handler.ts
│   │   ├── subscription/
│   │   │   ├── subscription.module.ts
│   │   │   └── handlers/
│   │   │       └── subscription.handler.ts
│   │   ├── cards/                 # TODO: Card management
│   │   ├── otp/                   # TODO: OTP delivery
│   │   └── transactions/          # TODO: Transaction reports
│   │
│   ├── shared/                    # Shared Utilities
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── rate-limit.guard.ts
│   │   ├── filters/
│   │   │   └── sensitive-data.filter.ts
│   │   └── utils/
│   │       └── masking.util.ts
│   ├── users/                     # Users Module
│   │   ├── users.module.ts
│   │   ├── users.schema.ts
│   │   └── users.service.ts
│   │
│   └── notifications/             # Notifications## Modules

### Core Modules
- **App**: Root module, MongoDB/Telegraf config, health endpoint
- **Bot**: Orchestrates feature handlers, thin layer
- **Users**: MongoDB persistence, CRUD operations
- **Notifications**: Cron jobs, scheduled messages

### Feature Modules (Domain-Driven)
- **Menu**: Welcome, help, main menu, about
- **Subscription**: Subscribe/unsubscribe, status
- **Cards** (TODO): Card list, detail, CVV handling
- **OTP** (TODO): OTP delivery from fin system
- **Transactions** (TODO): Transaction list, detail, reports

### Shared Modules
- **Guards**: Auth, rate limiting
- **Filters**: Sensitive data sanitization
- **Utils**: Masking, encryption

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode) |
| Bot Library | Telegraf 4 + nestjs-telegraf |
| Database | MongoDB + Mongoose |
| Scheduling | @nestjs/schedule |
| Logging | Winston |
| Container | Docker + Docker Compose |


## Adding Features

### Step-by-Step Guide

1. **Create Feature Module**
```bash
mkdir -p src/features/feature-name/{handlers,services,dto,guards}
```

2. **Create Handler**
```typescript
// features/feature-name/handlers/feature.handler.ts
@Injectable()
export class FeatureHandler {
  async handleCommand(ctx: Context) {
    // Implementation
  }
}
```

3. **Create Module**
```typescript
// features/feature-name/feature.module.ts
@Module({
  imports: [UsersModule],
  providers: [FeatureHandler],
  exports: [FeatureHandler],
})
export class FeatureModule {}
```

4. **Register in bot.module.ts**
```typescript
imports: [
  MenuModule,
  SubscriptionModule,
  FeatureModule, // Add here
]
```

5. **Use in bot.update.ts**
```typescript
constructor(
  private readonly featureHandler: FeatureHandler,
) {}

@Command('command')
async command(@Ctx() ctx: Context) {
  return this.featureHandler.handleCommand(ctx);
}
```

See `src/features/README.md` for detailed guide.

## Configuration

- Environment: `@nestjs/config`, validated at startup
- Modes: Polling (dev), Webhook (prod)
- Logging: Winston, files in `logs/`, console in dev
