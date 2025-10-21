# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
# Force rebuild with fs-extra dependency

# Copy root package files (monorepo)
COPY package*.json ./
COPY turbo.json ./

# Copy workspace package files
COPY apps/server/package*.json ./apps/server/
COPY packages/ ./packages/

# Install all dependencies
RUN npm ci --legacy-peer-deps

# Copy server source code
COPY apps/server/ ./apps/server/

# Build the application
RUN npm run build:server

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy server package files
COPY apps/server/package*.json ./apps/server/

# Copy workspace packages (needed for dependencies)
COPY packages/ ./packages/

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps

# Copy built application from builder
COPY --from=builder /app/apps/server/dist ./dist

# Create necessary directories (app will populate them at runtime)
RUN mkdir -p logs public/exports

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
