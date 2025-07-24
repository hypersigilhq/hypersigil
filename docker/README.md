# Hypersigil Docker Setup

This directory contains the Docker configuration for running Hypersigil in a production environment using a single container with nginx and Node.js.

## Architecture

The Docker setup uses a multi-stage build process:

1. **UI Build Stage**: Builds the Vue.js frontend using Node.js
2. **Backend Build Stage**: Compiles the TypeScript backend to JavaScript
3. **Production Runtime**: Combines both builds in a lightweight Alpine Linux container

### Container Components

- **nginx**: Serves static frontend files and proxies API requests
- **Node.js Backend**: Runs the compiled TypeScript application
- **supervisord**: Manages both processes with automatic restart capabilities
- **tini**: Provides proper signal handling and zombie process reaping

## Quick Start

### 1. Build the Docker Image

```bash
# Make the build script executable (if not already)
chmod +x build-docker.sh

# Run the build script
./build-docker.sh
```

### 2. Prepare Environment

Create your environment file:

```bash
# Copy the example environment file
cp backend/.env.example backend/.env

# Edit the environment file with your settings
nano backend/.env
```

### 3. Run the Container

```bash
# Run with default port 80
docker run -d \
  --name hypersigil \
  -p 80:80 \
  -v $(pwd)/backend/.env:/app/.env \
  -v $(pwd)/backend/data:/app/data \
  --init \
  hypersigil:latest

# Or run with custom port (e.g., 8080)
docker run -d \
  --name hypersigil \
  -p 8080:80 \
  -v $(pwd)/backend/.env:/app/.env \
  -v $(pwd)/backend/data:/app/data \
  --init \
  hypersigil:latest
```

## Configuration

### Environment Variables

The container reads configuration from the mounted `.env` file. Key variables include:

```bash
# Server Configuration
PORT=3000                    # Backend port (internal)
NODE_ENV=production         # Environment mode

# CORS Configuration
CORS_ORIGIN=http://localhost # Frontend origin

# API Configuration
API_PREFIX=/api/v1          # API prefix
ANTHROPIC_API_KEY=your_key  # Anthropic API key
OPENAI_API_KEY=your_key     # OpenAI API key
```

### Volume Mounts

- **Environment File**: `-v $(pwd)/backend/.env:/app/.env`
  - Mounts your local environment configuration
  - Required for API keys and configuration

- **Data Directory**: `-v $(pwd)/backend/data:/app/data`
  - Persists SQLite database and application data
  - Ensures data survives container restarts

## Container Management

### View Logs

```bash
# View all logs
docker logs hypersigil

# Follow logs in real-time
docker logs -f hypersigil

# View specific service logs (inside container)
docker exec hypersigil supervisorctl tail -f backend
docker exec hypersigil supervisorctl tail -f nginx
```

### Check Status

```bash
# Check container status
docker ps

# Check service status inside container
docker exec hypersigil supervisorctl status

# Health check
curl http://localhost/api/health
curl http://localhost/health  # nginx health check
```

### Restart Services

```bash
# Restart entire container
docker restart hypersigil

# Restart specific service inside container
docker exec hypersigil supervisorctl restart backend
docker exec hypersigil supervisorctl restart nginx
```

### Stop and Remove

```bash
# Stop the container
docker stop hypersigil

# Remove the container
docker rm hypersigil

# Remove the image (optional)
docker rmi hypersigil:latest
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   - Check if `.env` file exists and is properly formatted
   - Verify data directory permissions
   - Check Docker logs: `docker logs hypersigil`

2. **Frontend not loading**
   - Verify nginx configuration
   - Check if port is properly exposed
   - Test health endpoint: `curl http://localhost/health`

3. **API requests failing**
   - Check backend service status: `docker exec hypersigil supervisorctl status backend`
   - Verify API health: `curl http://localhost/api/health`
   - Check backend logs: `docker exec hypersigil supervisorctl tail backend`

4. **Database issues**
   - Ensure data directory is properly mounted
   - Check permissions on data directory
   - Verify SQLite database file exists in mounted volume

### Debug Mode

To run the container with more verbose logging:

```bash
docker run -d \
  --name hypersigil-debug \
  -p 8080:80 \
  -v $(pwd)/backend/.env:/app/.env \
  -v $(pwd)/backend/data:/app/data \
  -e NODE_ENV=development \
  --init \
  hypersigil:latest
```

### Access Container Shell

```bash
# Access container shell
docker exec -it hypersigil sh

# Check supervisord status
supervisorctl status

# View configuration files
cat /etc/nginx/nginx.conf
cat /etc/supervisor/conf.d/supervisord.conf
```

## Security Considerations

- The container runs nginx as root (required for port 80) but the Node.js backend runs as the `node` user
- Environment variables are loaded from the mounted `.env` file
- Database files are stored in the mounted data directory with proper permissions
- nginx includes security headers and basic protection against common attacks

## Performance Tuning

### nginx Configuration

The nginx configuration includes:
- Gzip compression for static assets
- Proper caching headers for static files
- Connection keep-alive for better performance
- Upstream connection pooling for backend requests

### Resource Limits

You can limit container resources:

```bash
docker run -d \
  --name hypersigil \
  --memory=1g \
  --cpus=1.0 \
  -p 80:80 \
  -v $(pwd)/backend/.env:/app/.env \
  -v $(pwd)/backend/data:/app/data \
  --init \
  hypersigil:latest
```

## Development vs Production

This Docker setup is designed for production use. For development:

- Use the regular `npm run dev` commands in separate terminals
- The Docker build process optimizes for production (minified assets, etc.)
- Development features like hot reload are not available in the container

## Backup and Recovery

### Database Backup

```bash
# Create backup of database
docker exec hypersigil cp /app/data/database.sqlite /app/data/database.backup.sqlite

# Copy backup to host
docker cp hypersigil:/app/data/database.backup.sqlite ./backup-$(date +%Y%m%d).sqlite
```

### Full Data Backup

Since data is mounted as a volume, you can backup the entire data directory:

```bash
# Create compressed backup
tar -czf hypersigil-backup-$(date +%Y%m%d).tar.gz backend/data/
