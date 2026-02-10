# GetFit Docker Setup Summary

## ✅ Created Files

### Docker Configuration Files

1. **server/Dockerfile** - Production-optimized multi-stage build for backend
   - Uses Node.js 20 Alpine for small image size
   - Multi-stage build: deps → prisma-deps → builder → runner
   - Runs as non-root user for security
   - Includes health checks
   - Handles Prisma client generation

2. **frontend/Dockerfile** - Production build with Nginx
   - Expo web export
   - Nginx for serving static files
   - Runtime environment variable injection
   - Gzip compression and security headers
   - Health check endpoint

3. **docker-compose.yml** - Orchestrates all services
   - PostgreSQL database (port 5432)
   - Backend server (port 3000)
   - Frontend web app (port 80)
   - Automatic migrations on startup
   - Health checks and dependencies
   - Persistent volumes for data

### Environment Configuration

4. **server/.env.example** - Server environment template
5. **frontend/.env.example** - Frontend environment template
6. **.env.example** - Docker Compose environment template

### Ignore Files

7. **server/.dockerignore** - Excludes unnecessary files from server image
8. **frontend/.dockerignore** - Excludes unnecessary files from frontend image
9. **.dockerignore** - Root level Docker ignore

### Development Files

10. **docker-compose.dev.yml** - Development configuration with hot-reload
11. **frontend/Dockerfile.dev** - Development Dockerfile for Expo

### Scripts

12. **docker-build.sh** - Linux/Mac build and deployment script
13. **docker-build.bat** - Windows build and deployment script

### Documentation

14. **DOCKER_DEPLOYMENT.md** - Comprehensive deployment guide
15. **DOCKER_QUICK_REFERENCE.md** - Quick command reference

### Code Updates

16. **server/src/routes/authRoutes.js** - Added `/api/auth/health` endpoint

## 🎯 Key Features

### Security
- ✅ Non-root user in containers
- ✅ Multi-stage builds (smaller attack surface)
- ✅ Environment variables for secrets
- ✅ Security headers in Nginx
- ✅ Health checks for all services

### Performance
- ✅ Multi-stage builds (smaller images)
- ✅ Layer caching optimization
- ✅ Gzip compression
- ✅ Static asset caching
- ✅ Production-only dependencies

### Reliability
- ✅ Health checks on all services
- ✅ Automatic restarts
- ✅ Dependency ordering
- ✅ Database migrations on startup
- ✅ Persistent volumes

### Developer Experience
- ✅ One-command deployment
- ✅ Development docker-compose
- ✅ Comprehensive documentation
- ✅ Build scripts for Windows & Unix
- ✅ Hot-reload in development

## 🚀 How to Use

### Production Deployment

**Windows:**
```cmd
docker-build.bat
```

**Linux/Mac:**
```bash
chmod +x docker-build.sh
./docker-build.sh
```

**Manual:**
```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your values

# 2. Start services
docker-compose up -d

# 3. Check status
docker-compose ps

# 4. View logs
docker-compose logs -f
```

### Development

```bash
# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f server frontend
```

## 📋 Environment Variables Required

### Docker Compose (.env)
```env
DB_PASSWORD=postgres                    # Database password
JWT_SECRET=generate-secure-secret       # JWT signing key
APP_URL=http://localhost:3000          # App base URL
EMAIL_USER=your-email@gmail.com        # Email sender
EMAIL_PASSWORD=your-app-password       # Email password
API_URL=http://localhost:3000/api      # API endpoint
```

### Generate Secure JWT Secret
```bash
openssl rand -base64 32
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│                                             │
│  Frontend (Nginx on port 80)               │
│  - Expo web build                           │
│  - Static file serving                      │
│  - Reverse proxy ready                      │
│                                             │
└─────────────┬───────────────────────────────┘
              │ HTTP requests
              │
┌─────────────▼───────────────────────────────┐
│                                             │
│  Backend Server (Node.js on port 3000)     │
│  - Express API                              │
│  - JWT authentication                       │
│  - Prisma ORM                               │
│  - Email service                            │
│                                             │
└─────────────┬───────────────────────────────┘
              │ Prisma Client
              │
┌─────────────▼───────────────────────────────┐
│                                             │
│  PostgreSQL Database (port 5432)           │
│  - User data                                │
│  - Plans & history                          │
│  - Persistent volume                        │
│                                             │
└─────────────────────────────────────────────┘
```

## 🔍 Service Details

### Database (PostgreSQL 16 Alpine)
- **Port:** 5432
- **Volume:** `postgres_data`
- **Health Check:** `pg_isready`
- **Default DB:** getfit

### Backend Server (Node.js 20 Alpine)
- **Port:** 3000
- **Volume:** `server_uploads` (for user uploads)
- **Volume:** Frontend assets (read-only)
- **Health Check:** `/api/auth/health`
- **Start Command:** Migrates DB then starts server

### Frontend (Nginx Alpine)
- **Port:** 80
- **Health Check:** `/health`
- **Features:** Gzip, security headers, client-side routing

## 📊 Image Sizes (Approximate)

- **Server:** ~150-200 MB (multi-stage optimized)
- **Frontend:** ~50-80 MB (static files + Nginx)
- **Database:** ~80 MB (PostgreSQL Alpine)

**Total:** ~300 MB for all images

## 🛠️ Common Operations

### View Logs
```bash
docker-compose logs -f [service]
```

### Restart Service
```bash
docker-compose restart [service]
```

### Run Migrations
```bash
docker-compose exec server npx prisma migrate deploy
```

### Database Backup
```bash
docker-compose exec database pg_dump -U postgres getfit > backup.sql
```

### Access Database
```bash
docker-compose exec database psql -U postgres -d getfit
```

### Execute Import Scripts
```bash
docker-compose exec server node src/scripts/importExercises.js
docker-compose exec server node src/scripts/importFoods.js
```

## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Rebuild images
docker-compose build --no-cache
docker-compose up -d
```

### Database connection fails
```bash
# Check database health
docker-compose ps database

# Restart database
docker-compose restart database
```

### Port conflicts
Edit `docker-compose.yml` ports section:
```yaml
ports:
  - "8080:80"   # Frontend -> localhost:8080
  - "3001:3000" # Backend -> localhost:3001
```

## 📱 Accessing the Application

Once deployed:
- **Frontend:** http://localhost
- **Backend API:** http://localhost:3000
- **Health Checks:**
  - Backend: http://localhost:3000/api/auth/health
  - Frontend: http://localhost/health

## 🔐 Production Considerations

1. **Use HTTPS** - Add reverse proxy (Traefik/Nginx) with SSL
2. **Secure Secrets** - Use Docker secrets or vault
3. **Backup Database** - Set up automated backups
4. **Monitor Resources** - Use Prometheus/Grafana
5. **Update Regularly** - Keep base images updated
6. **Scale Services** - Use Docker Swarm or Kubernetes

## 📚 Further Reading

- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - Detailed deployment guide
- [DOCKER_QUICK_REFERENCE.md](DOCKER_QUICK_REFERENCE.md) - Command reference
- [README.md](README.md) - Application documentation

## ✅ Checklist

Before deploying:
- [ ] Copy .env.example to .env
- [ ] Configure DATABASE_URL
- [ ] Set strong JWT_SECRET
- [ ] Configure email settings (if needed)
- [ ] Update APP_URL for production
- [ ] Update API_URL for production
- [ ] Review docker-compose.yml ports
- [ ] Test locally first

## 🎉 Ready to Deploy!

Your GetFit application is now fully Dockerized and ready for deployment!
