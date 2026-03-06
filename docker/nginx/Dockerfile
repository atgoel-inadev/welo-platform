# Multi-stage: build UI then serve via nginx API-gateway
# Stage 1 — Build the React/Vite app
FROM node:20-alpine AS ui-builder

WORKDIR /app

COPY welo-platform-ui/package*.json ./
RUN npm ci

COPY welo-platform-ui/ .

# Vite env vars baked into the JS bundle at build time
ARG VITE_AUTH_SERVICE_URL
ARG VITE_TASK_MANAGEMENT_URL
ARG VITE_PROJECT_MANAGEMENT_URL
ARG VITE_WORKFLOW_ENGINE_URL
ARG VITE_ANNOTATION_QA_URL
ARG VITE_API_URL

RUN npm run build

# Stage 2 — Nginx: API gateway + static UI
FROM nginx:1.27-alpine

# Copy the built UI assets
COPY --from=ui-builder /app/dist /usr/share/nginx/html

# Copy the API-gateway + SPA nginx config
COPY welo-platform/docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
