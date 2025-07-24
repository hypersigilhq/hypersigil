# Docker Build System

## Overview

Implemented a comprehensive Docker build system for Hypersigil that creates a production-ready single container with both frontend and backend services. The system uses a multi-stage build process with nginx serving the frontend and proxying API requests to the Node.js backend.

## Architecture

### Multi-Stage Build Process

1. **UI Build Stage**: Builds the Vue.js frontend using Node.js
   - Installs dependencies with `npm ci`
   - Runs production build with `npm run build`
   - Outputs optimized static files

2. **Backend Build Stage**: Compiles TypeScript backend
   - Installs production dependencies
   - Compiles TypeScript to JavaScript with `npm run build`
   - Outputs compiled Node.js application

3. **Production Runtime**: Combines builds in Alpine Linux container
   - Uses `node:18-alpine` as base image
   - Installs nginx, supervisord, curl, and tini
   - Copies built applications from previous stages

### Container Components

- **nginx**: Serves static frontend files and proxies `/api/*` requests to backend
- **Node.js Backend**: Runs the compiled TypeScript application on port 3000
- **supervisord**: Process manager that monitors and restarts both services
- **tini**: Init system for proper signal handling and zombie process reaping

## Implementation Details

### Files Created

1. **`build-docker.sh`**: Main build script
   - Builds UI and backend applications
   - Creates Docker image with proper error handling
   - Provides usage instructions after successful build

2. **`Dockerfile`**: Multi-stage Docker configuration
   - Optimized for production with minimal image size
   - Proper user permissions and security considerations
   - Health checks for container monitoring

3. **`docker/nginx.conf`**: nginx configuration
   - Serves static files with proper caching headers
   - Proxies API requests to backend with connection pooling
   - Security headers and gzip compression
   - SPA routing support for Vue.js

4. **`docker/supervisord.conf`**: Process management configuration
   - Manages both nginx and Node.js processes
   - Automatic restart on failure
   - Proper logging and monitoring

5. **`docker/start.sh`**: Container startup script
   - Environment variable loading from mounted `.env` file
   - Directory permissions setup
   - Configuration validation
   - Graceful shutdown handling

6. **`.dockerignore`**: Build optimization
   - Excludes unnecessary files from Docker context
   - Reduces build time and image size

7. **`docker/README.md`**: Comprehensive documentation
   - Usage instructions and examples
   - Troubleshooting guide
   - Security and performance considerations

### Backend Health Check

Added `/api/health` endpoint to the backend application for Docker health monitoring:

```typescript
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});
```

## Key Features

### Process Management
- **supervisord** manages both nginx and Node.js processes
- Automatic restart on process failure
- Proper signal handling for graceful shutdowns
- Process monitoring and logging

### External Configuration
- Environment variables loaded from mounted `.env` file
- Database persistence through mounted data directory
- No need to rebuild image for configuration changes

### Security
- nginx runs as root (required for port 80), backend runs as `node` user
- Security headers included in nginx configuration
- Proper file permissions and user isolation

### Performance Optimizations
- Gzip compression for static assets
- Proper caching headers for frontend files
- Connection pooling for backend requests
- Optimized nginx configuration

### Health Monitoring
- Docker health checks for container status
- nginx health endpoint at `/health`
- Backend health endpoint at `/api/health`
- Comprehensive logging for troubleshooting

## Usage

### Build and Run

```bash
# Build the Docker image
./build-docker.sh

# Run the container
docker run -d \
  --name hypersigil \
  -p 80:80 \
  -v $(pwd)/backend/.env:/app/.env \
  -v $(pwd)/backend/data:/app/data \
  --init \
  hypersigil:latest
```

### Volume Mounts

- **Environment File**: `-v $(pwd)/backend/.env:/app/.env`
  - Required for API keys and configuration
  - Changes take effect on container restart

- **Data Directory**: `-v $(pwd)/backend/data:/app/data`
  - Persists SQLite database and application data
  - Survives container restarts and updates

### Container Management

```bash
# View logs
docker logs -f hypersigil

# Check service status
docker exec hypersigil supervisorctl status

# Restart services
docker exec hypersigil supervisorctl restart backend
docker exec hypersigil supervisorctl restart nginx

# Health checks
curl http://localhost/api/health
curl http://localhost/health
```

## Benefits

1. **Single Container Deployment**: Simplified deployment with one container
2. **Process Resilience**: Automatic restart of failed processes
3. **External Configuration**: Easy configuration management without rebuilds
4. **Data Persistence**: Database and files persist across container updates
5. **Production Ready**: Optimized for production with proper security and performance
6. **Comprehensive Monitoring**: Health checks and logging for operational visibility
7. **Graceful Shutdowns**: Proper signal handling for clean container stops

## Technical Considerations

### Build Process
- Uses Docker BuildKit for optimized builds
- Multi-stage build reduces final image size
- Proper dependency caching for faster rebuilds

### Runtime Environment
- Alpine Linux base for minimal attack surface
- Node.js 18 for modern JavaScript features
- nginx for high-performance static file serving

### Monitoring and Debugging
- Structured logging for both services
- Health check endpoints for monitoring systems
- Easy access to container shell for debugging
- Comprehensive documentation for troubleshooting

This Docker build system provides a robust, production-ready deployment solution for Hypersigil with proper process management, security considerations, and operational visibility.
