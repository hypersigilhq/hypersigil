# Multi-stage Dockerfile for Hypersigil
# Stage 1: Build UI (Vue.js frontend)
FROM node:20-alpine AS ui-builder

WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm install --silent

COPY ui/ ./
# Remove the symbolic link to ./backend
RUN rm -rf ./src/services/definitions
# Copy API definitions from backend to UI
COPY backend/src/api/definitions/ ./src/services/definitions/
RUN npm run build

# Stage 2: Build Backend (Node.js/TypeScript)
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

COPY backend/ ./
RUN npm run build

# Stage 3: Production Runtime
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    tini

# Create app directory
WORKDIR /app

# Install production dependencies for backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev --silent

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./backend/dist

# Copy built frontend
COPY --from=ui-builder /app/ui/dist ./frontend

# Create necessary directories
RUN mkdir -p /var/log/supervisor \
    /var/log/nginx \
    /var/log/hypersigil \
    /app/data \
    /run/nginx

# Copy configuration files
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/start.sh /app/start.sh

# Make start script executable
RUN chmod +x /app/start.sh

# Create nginx user and set permissions
RUN adduser -D -s /bin/sh nginx || true
RUN chown -R nginx:nginx /var/log/nginx /run/nginx
RUN chown -R node:node /app

# Expose port 80 for nginx
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/api/health || curl -f http://localhost/ || exit 1

# Use tini as init system and run supervisor
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/start.sh"]
