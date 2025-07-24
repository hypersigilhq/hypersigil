#!/bin/bash

# Hypersigil Docker Build Script
# This script builds both UI and backend, then creates a Docker image

set -e  # Exit on any error

echo "🚀 Starting Hypersigil Docker build process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required directories exist
if [ ! -d "ui" ]; then
    print_error "UI directory not found!"
    exit 1
fi

if [ ! -d "backend" ]; then
    print_error "Backend directory not found!"
    exit 1
fi

# Build UI
print_status "Building UI (Vue.js frontend)..."
cd ui
if [ ! -f "package.json" ]; then
    print_error "UI package.json not found!"
    exit 1
fi

print_status "Installing UI dependencies..."
npm install

print_status "Building UI for production..."
npm run build

if [ ! -d "dist" ]; then
    print_error "UI build failed - dist directory not created!"
    exit 1
fi

print_success "UI build completed successfully"
cd ..

# Build Backend
print_status "Building Backend (Node.js/TypeScript)..."
cd backend
if [ ! -f "package.json" ]; then
    print_error "Backend package.json not found!"
    exit 1
fi

print_status "Installing Backend dependencies..."
npm install

print_status "Building Backend TypeScript..."
npm run build

if [ ! -d "dist" ]; then
    print_error "Backend build failed - dist directory not created!"
    exit 1
fi

print_success "Backend build completed successfully"
cd ..

# Check if .env.example exists and warn about .env
if [ -f "backend/.env.example" ]; then
    if [ ! -f "backend/.env" ]; then
        print_warning "No .env file found in backend directory."
        print_warning "Make sure to create backend/.env before running the container."
        print_warning "You can use backend/.env.example as a template."
    fi
fi

# Build Docker image
print_status "Building Docker image..."
DOCKER_BUILDKIT=1 docker build -t hypersigil:latest .

if [ $? -eq 0 ]; then
    print_success "Docker image built successfully!"
    print_success "Image name: hypersigil:latest"
    echo ""
    print_status "To run the container:"
    echo "docker run -d \\"
    echo "  --name hypersigil \\"
    echo "  -p 80:80 \\"
    echo "  -v \$(pwd)/backend/.env:/app/.env \\"
    echo "  -v \$(pwd)/backend/data:/app/data \\"
    echo "  --init \\"
    echo "  hypersigil:latest"
    echo ""
    print_status "To run with custom port (e.g., 8080):"
    echo "docker run -d \\"
    echo "  --name hypersigil \\"
    echo "  -p 8080:80 \\"
    echo "  -v \$(pwd)/backend/.env:/app/.env \\"
    echo "  -v \$(pwd)/backend/data:/app/data \\"
    echo "  --init \\"
    echo "  hypersigil:latest"
else
    print_error "Docker build failed!"
    exit 1
fi
