# Multi-stage build for Project Management Service
# syntax=docker/dockerfile:1.4

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy config files
COPY tsconfig.json nest-cli.json ./

# Copy source code
COPY apps/project-management ./apps/project-management
COPY libs ./libs

# Build the application
RUN npm run build project-management

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3004/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/apps/project-management/main.js"]
