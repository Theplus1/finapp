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

# Copy root package files for workspace resolution
COPY package*.json ./
COPY turbo.json ./

# Copy server package files
COPY apps/server/package*.json ./apps/server/

# Copy workspace packages (needed for workspace dependencies)
COPY packages/ ./packages/

# Install production dependencies from root (proper workspace resolution)
RUN npm ci --only=production --legacy-peer-deps --workspace=server

# Copy built application from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Set working directory to server
WORKDIR /app/apps/server

# Create necessary directories (app will populate them at runtime)
RUN mkdir -p public/exports

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
