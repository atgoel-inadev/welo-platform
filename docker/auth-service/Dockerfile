# Multi-stage build for Welo Auth Service
# syntax=docker/dockerfile:1.4

# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files first (best layer caching)
COPY package*.json ./

# Install ALL dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy config files
COPY tsconfig*.json nest-cli.json ./

# Copy only necessary source code
COPY libs/ ./libs/
COPY apps/auth-service/ ./apps/auth-service/

# Build the application
RUN npm run build auth-service

# Stage 2: Production
FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist/apps/auth-service ./dist

# Copy mock users data file
COPY --from=builder /app/apps/auth-service/src/auth/mock-users.json ./dist/

# Expose the service port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/main.js"]
