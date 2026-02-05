# Multi-stage build for Welo Task Management Service
# syntax=docker/dockerfile:1.4

# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy config files
COPY tsconfig*.json nest-cli.json ./

# Copy source code
COPY libs/ ./libs/
COPY apps/task-management/ ./apps/task-management/

# Build the application
RUN npm run build task-management

# Stage 2: Production
FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist/apps/task-management ./dist

# Expose the service port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/main.js"]
