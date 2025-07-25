#!/bin/bash

# Hypersigil Docker Multi-Architecture Build and Push Script
# This script builds and pushes multi-architecture hypersigil images to Docker Hub using Docker Buildx

set -e  # Exit on any error

echo "🚀 Starting Hypersigil Docker multi-architecture build and push process..."

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

# Docker Hub repository
DOCKER_REPO="codefibers/hypersigil"

# Default platforms for multi-architecture build
DEFAULT_PLATFORMS="linux/amd64,linux/arm64"

# Check if Docker Buildx is available
print_status "Checking Docker Buildx availability..."
if ! docker buildx version >/dev/null 2>&1; then
    print_error "Docker Buildx is not available!"
    print_error "Please install Docker Desktop or enable Buildx in your Docker installation."
    exit 1
fi

print_success "Docker Buildx is available"

# Check if user is logged into Docker Hub
print_status "Checking Docker Hub authentication..."
if ! docker info | grep -q "Username:"; then
    print_warning "You don't appear to be logged into Docker Hub."
    print_status "Please run 'docker login' first."
    read -p "Do you want to login now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker login
    else
        print_error "Docker login required to push images."
        exit 1
    fi
fi

print_success "Docker Hub authentication verified"

# Check if required directories exist
if [ ! -d "ui" ]; then
    print_error "UI directory not found!"
    exit 1
fi

if [ ! -d "backend" ]; then
    print_error "Backend directory not found!"
    exit 1
fi

# Prompt for tag name
echo ""
print_status "Available tag suggestions:"
echo "  - latest (most recent stable version)"
echo "  - v1.0.0, v1.0.1, etc. (semantic versioning)"
echo "  - dev, staging, prod (environment-specific)"
echo "  - $(date +%Y-%m-%d) (date-based)"
echo ""

while true; do
    read -p "Enter tag name for $DOCKER_REPO: " TAG_NAME
    
    if [ -z "$TAG_NAME" ]; then
        print_error "Tag name cannot be empty. Please enter a valid tag."
        continue
    fi
    
    # Validate tag name (Docker tag naming rules)
    if [[ ! "$TAG_NAME" =~ ^[a-zA-Z0-9._-]+$ ]]; then
        print_error "Invalid tag name. Use only letters, numbers, dots, underscores, and hyphens."
        continue
    fi
    
    break
done

FULL_TAG="$DOCKER_REPO:$TAG_NAME"

# Prompt for platform selection
echo ""
print_status "Platform options:"
echo "  1. Multi-architecture (linux/amd64,linux/arm64) - Recommended"
echo "  2. AMD64 only (linux/amd64)"
echo "  3. ARM64 only (linux/arm64)"
echo "  4. Custom platforms"
echo ""

while true; do
    read -p "Select platform option (1-4): " PLATFORM_CHOICE
    
    case $PLATFORM_CHOICE in
        1)
            PLATFORMS="$DEFAULT_PLATFORMS"
            break
            ;;
        2)
            PLATFORMS="linux/amd64"
            break
            ;;
        3)
            PLATFORMS="linux/arm64"
            break
            ;;
        4)
            read -p "Enter custom platforms (comma-separated, e.g., linux/amd64,linux/arm64,linux/arm/v7): " PLATFORMS
            if [ -z "$PLATFORMS" ]; then
                print_error "Platforms cannot be empty."
                continue
            fi
            break
            ;;
        *)
            print_error "Invalid choice. Please select 1-4."
            continue
            ;;
    esac
done

# Create or use existing buildx builder
BUILDER_NAME="hypersigil-builder"
print_status "Setting up Docker Buildx builder..."

if ! docker buildx inspect $BUILDER_NAME >/dev/null 2>&1; then
    print_status "Creating new buildx builder '$BUILDER_NAME'..."
    docker buildx create --name $BUILDER_NAME --driver docker-container --bootstrap
else
    print_status "Using existing buildx builder '$BUILDER_NAME'..."
fi

# Use the builder
docker buildx use $BUILDER_NAME

# Confirm the build and push
echo ""
print_status "Ready to build and push:"
echo "  Repository:   $DOCKER_REPO"
echo "  Tag:          $TAG_NAME"
echo "  Full tag:     $FULL_TAG"
echo "  Platforms:    $PLATFORMS"
echo ""

read -p "Do you want to proceed with the multi-architecture build and push? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Build and push cancelled by user."
    exit 0
fi

# Build and push multi-architecture image
print_status "Building and pushing multi-architecture image..."
print_status "This may take several minutes depending on your internet connection and the number of platforms..."

docker buildx build \
    --platform $PLATFORMS \
    --tag $FULL_TAG \
    --push \
    --progress=plain \
    .

if [ $? -eq 0 ]; then
    print_success "Multi-architecture image built and pushed successfully!"
    echo ""
    print_status "Your multi-architecture image is now available at:"
    echo "  https://hub.docker.com/r/$DOCKER_REPO"
    echo ""
    print_status "Supported platforms: $PLATFORMS"
    echo ""
    print_status "To pull this image:"
    echo "  docker pull $FULL_TAG"
    echo ""
    print_status "To run this image:"
    echo "  docker run -d \\"
    echo "    --name hypersigil \\"
    echo "    -p 80:80 \\"
    echo "    -v \$(pwd)/backend/.env:/app/.env \\"
    echo "    -v \$(pwd)/backend/data:/app/data \\"
    echo "    --init \\"
    echo "    $FULL_TAG"
    echo ""
    print_status "Docker will automatically pull the correct architecture for your platform."
else
    print_error "Failed to build and push multi-architecture image"
    exit 1
fi

# Optional: Clean up builder
echo ""
read -p "Do you want to remove the buildx builder '$BUILDER_NAME'? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Removing buildx builder '$BUILDER_NAME'..."
    docker buildx rm $BUILDER_NAME
    print_success "Buildx builder removed"
else
    print_status "Buildx builder '$BUILDER_NAME' kept for future use"
fi

print_success "Multi-architecture Docker build and push process completed!"
