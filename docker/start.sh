#!/bin/sh

# Hypersigil Docker Container Startup Script
set -e

echo "🚀 Starting Hypersigil container..."

# Function to print colored output
print_info() {
    echo "ℹ️  [INFO] $1"
}

print_success() {
    echo "✅ [SUCCESS] $1"
}

print_warning() {
    echo "⚠️  [WARNING] $1"
}

print_error() {
    echo "❌ [ERROR] $1"
}

# Check if .env file is mounted
if [ -f "/app/.env" ]; then
    print_info "Environment file found, loading variables..."
    # Export environment variables from .env file
    set -a
    . /app/.env
    set +a
    print_success "Environment variables loaded"
else
    print_warning "No .env file found at /app/.env"
    print_warning "Using default environment variables"
    export NODE_ENV=production
    export PORT=3000
fi

# Ensure data directory exists and has correct permissions
if [ ! -d "/app/data" ]; then
    print_info "Creating data directory..."
    mkdir -p /app/data
fi

# Set ownership of data directory to node user
chown -R node:node /app/data
print_success "Data directory permissions set"

# Ensure log directories exist
mkdir -p /var/log/hypersigil /var/log/nginx /var/log/supervisor
chown -R node:node /var/log/hypersigil

# Test nginx configuration
print_info "Testing nginx configuration..."
nginx -t
if [ $? -eq 0 ]; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Check if backend files exist
if [ ! -f "/app/backend/dist/index.js" ]; then
    print_error "Backend application not found at /app/backend/dist/index.js"
    exit 1
fi

if [ ! -d "/app/frontend" ]; then
    print_error "Frontend files not found at /app/frontend"
    exit 1
fi

print_success "All required files found"

# Set up signal handlers for graceful shutdown
trap 'echo "🛑 Received SIGTERM, shutting down gracefully..."; supervisorctl shutdown; exit 0' TERM
trap 'echo "🛑 Received SIGINT, shutting down gracefully..."; supervisorctl shutdown; exit 0' INT

print_info "Starting supervisord..."
print_info "Backend will be available internally on port 3000"
print_info "Frontend and API will be available on port 80"

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
