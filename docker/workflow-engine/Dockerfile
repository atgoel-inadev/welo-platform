# Multi-stage build for Welo Workflow Engine Service

# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY libs/ ./libs/
COPY apps/workflow-engine/ ./apps/workflow-engine/

# Build the application
RUN npm run build workflow-engine

# Stage 2: Production
FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist/apps/workflow-engine ./dist

# Expose the service port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/main.js"]
