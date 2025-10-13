# FinApp Monorepo

A Turborepo monorepo for the FinApp project with multiple applications and shared packages.

## Quick Start

```bash
# Install dependencies
npm install

# Run all apps in development mode
npm run dev

# Run specific app
npm run dev:web      # Main app
npm run dev:admin    # Admin dashboard
npm run dev:server   # Backend server
npm run dev:docs     # Documentation
```

## Project Structure

### Apps
- **web** - Main Next.js application (port 3000)
- **docs** - Documentation Next.js app (port 3001)
- **admin-web** - Admin dashboard Next.js app (port 3002)
- **server** - NestJS backend server

### Packages
- **@repo/ui** - Shared React component library
- **@repo/eslint-config** - Shared ESLint configurations
- **@repo/typescript-config** - Shared TypeScript configurations

## Common Commands

```bash
# Development
npm run dev          # Run all apps
npm run dev:web      # Run web app only
npm run dev:admin    # Run admin app only
npm run dev:server   # Run server only
npm run dev:docs     # Run docs only

# Build
npm run build        # Build all apps

# Lint & Type Check
npm run lint         # Lint all apps
npm run check-types  # Type check all apps

# Format
npm run format       # Format all files

# Testing (server only)
npm run test:server  # Run unit tests
npm run test:e2e     # Run e2e tests
```

## Environment Variables

Each app has its own `.env` file:
- `apps/web/.env.local` - Web app environment variables
- `apps/admin-web/.env.local` - Admin web environment variables
- `apps/server/.env` - Server environment variables
- `apps/docs/.env.local` - Docs environment variables

Copy `.env.example` files to create your local environment files.

## Deployment

Automated deployment workflows are configured for:
- **Server** - Deploys to VPS using Docker
- **Admin Web** - Deploys to VPS using PM2

See [.github/workflows/README.md](.github/workflows/README.md) for deployment setup instructions.

## Tech Stack

- **Framework**: Next.js 15, NestJS 10
- **Language**: TypeScript
- **Build Tool**: Turborepo
- **Package Manager**: npm
- **Styling**: TailwindCSS
- **UI Components**: Radix UI, shadcn/ui

## Learn More

- [Turborepo Documentation](https://turborepo.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
