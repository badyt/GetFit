# GetFit Docker Quick Reference

## 🚀 Quick Start

### Using Build Scripts (Recommended)

**Windows:**
```cmd
docker-build.bat
```

**Linux/Mac:**
```bash
chmod +x docker-build.sh
./docker-build.sh
```

### Manual Setup

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# 2. Start all services
docker-compose up -d

# 3. View logs
docker-compose logs -f
```

## 📦 Docker Commands

### Build Images

```bash
# Build both images
docker-compose build

# Build specific service
docker-compose build server
docker-compose build frontend

# Build without cache
docker-compose build --no-cache
```

### Start/Stop Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d server

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Restart a service
docker-compose restart server
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f frontend
docker-compose logs -f database

# Last 100 lines
docker-compose logs --tail=100 server
```

### Service Status

```bash
# Check status of all services
docker-compose ps

# Check resource usage
docker stats

# View service health
docker inspect --format='{{.State.Health.Status}}' getfit-server
```

### Database Operations

```bash
# Access PostgreSQL shell
docker-compose exec database psql -U postgres -d getfit

# Run Prisma migrations
docker-compose exec server npx prisma migrate deploy

# Generate Prisma client
docker-compose exec server npx prisma generate

# View database data
docker-compose exec database psql -U postgres -d getfit -c "SELECT * FROM \"User\";"

# Backup database
docker-compose exec database pg_dump -U postgres getfit > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
docker-compose exec -T database psql -U postgres getfit < backup.sql

# Reset database (⚠️ deletes all data)
docker-compose exec server npx prisma migrate reset --force
```

### Server Operations

```bash
# Access server shell
docker-compose exec server sh

# Run import scripts
docker-compose exec server node src/scripts/importExercises.js
docker-compose exec server node src/scripts/importFoods.js

# View environment variables
docker-compose exec server env

# Test API endpoint
curl http://localhost:3000/api/auth/health
```

### Frontend Operations

```bash
# Access frontend container
docker-compose exec frontend sh

# Rebuild frontend
docker-compose up -d --build frontend
```

## 🔧 Troubleshooting

### Service Won't Start

```bash
# Check logs for errors
docker-compose logs server

# Restart service
docker-compose restart server

# Rebuild and restart
docker-compose up -d --build server
```

### Database Connection Issues

```bash
# Check database is running
docker-compose ps database

# Test database connection
docker-compose exec database pg_isready -U postgres

# Restart database
docker-compose restart database
```

### Port Already in Use

```bash
# Find process using port
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/Mac

# Change ports in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

### Clean Up Everything

```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove all unused Docker data
docker system prune -a

# Remove specific images
docker rmi getfit-server getfit-frontend
```

### View Container Internals

```bash
# List files in container
docker-compose exec server ls -la

# Check Node.js version
docker-compose exec server node --version

# View package.json
docker-compose exec server cat package.json
```

## 🌍 Environment Variables

### Server (.env for docker-compose)

```bash
# Required
DATABASE_URL=postgresql://postgres:password@database:5432/getfit
JWT_SECRET=your-secure-secret-key

# Optional
PORT=3000
NODE_ENV=production
APP_URL=http://localhost:3000
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Frontend

```bash
API_URL=http://localhost:3000/api
```

### Update Environment Variables

```bash
# 1. Edit .env file
nano .env

# 2. Recreate containers with new env
docker-compose up -d --force-recreate
```

## 📊 Monitoring

### Resource Usage

```bash
# Live resource monitoring
docker stats

# Disk usage
docker system df

# Service-specific stats
docker stats getfit-server getfit-frontend getfit-database
```

### Health Checks

```bash
# Check health status
docker-compose ps

# Manual health check
curl http://localhost:3000/api/auth/health
curl http://localhost/health
```

## 🚀 Production Deployment

### Build for Production

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Tag images for registry
docker tag getfit-server:latest your-registry.com/getfit-server:v1.0.0
docker tag getfit-frontend:latest your-registry.com/getfit-frontend:v1.0.0

# Push to registry
docker push your-registry.com/getfit-server:v1.0.0
docker push your-registry.com/getfit-frontend:v1.0.0
```

### Deploy to Production

```bash
# Pull images on production server
docker pull your-registry.com/getfit-server:v1.0.0
docker pull your-registry.com/getfit-frontend:v1.0.0

# Start with production compose
docker-compose -f docker-compose.yml up -d
```

## 🔐 Security Best Practices

1. **Never commit .env files**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use strong secrets**
   ```bash
   # Generate JWT secret
   openssl rand -base64 32
   
   # Generate database password
   openssl rand -base64 24
   ```

3. **Keep images updated**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

4. **Scan for vulnerabilities**
   ```bash
   docker scan getfit-server
   docker scan getfit-frontend
   ```

## 🆘 Common Issues

### "Port already allocated"
Change port mappings in `docker-compose.yml`

### "Database connection refused"
Wait for database to be healthy: `docker-compose ps database`

### "Image not found"
Build images first: `docker-compose build`

### "Permission denied"
On Linux, add user to docker group:
```bash
sudo usermod -aG docker $USER
```

### "Out of disk space"
Clean up Docker:
```bash
docker system prune -a --volumes
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Guide](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
