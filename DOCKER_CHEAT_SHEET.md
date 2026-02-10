# 🐳 GetFit Docker Cheat Sheet

## 🚀 Quick Start
```bash
# Windows
docker-validate.bat && docker-build.bat

# Linux/Mac
chmod +x docker-validate.sh docker-build.sh
./docker-validate.sh && ./docker-build.sh
```

## ⚙️ Essential Commands

### Start/Stop
```bash
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose restart            # Restart all services
docker-compose ps                 # Check status
```

### Logs
```bash
docker-compose logs -f            # All logs (follow)
docker-compose logs -f server     # Server logs only
docker-compose logs --tail=50     # Last 50 lines
```

### Rebuild
```bash
docker-compose build              # Rebuild images
docker-compose up -d --build      # Rebuild & restart
docker-compose build --no-cache   # Full rebuild
```

## 🗄️ Database

### Access
```bash
docker-compose exec database psql -U postgres -d getfit
```

### Backup/Restore
```bash
# Backup
docker-compose exec database pg_dump -U postgres getfit > backup.sql

# Restore
docker-compose exec -T database psql -U postgres getfit < backup.sql
```

### Migrations
```bash
docker-compose exec server npx prisma migrate deploy
docker-compose exec server npx prisma generate
```

## 🔧 Server Operations

### Execute Scripts
```bash
docker-compose exec server node src/scripts/importExercises.js
docker-compose exec server node src/scripts/importFoods.js
```

### Shell Access
```bash
docker-compose exec server sh
docker-compose exec database sh
```

## 🌐 Access Points

- **Frontend:** http://localhost
- **Backend:** http://localhost:3000
- **Database:** localhost:5432
- **Health Checks:**
  - Backend: http://localhost:3000/api/auth/health
  - Frontend: http://localhost/health

## 🐛 Troubleshooting

### Won't Start?
```bash
docker-compose logs              # Check errors
docker-compose down -v           # Clean restart
docker-compose up -d --build     # Rebuild & start
```

### Port Conflict?
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

### Clean Everything
```bash
docker-compose down -v           # Remove volumes too
docker system prune -a           # Clean all Docker data
```

## 📝 Environment Setup

Copy and edit:
```bash
cp .env.example .env
# Then edit .env with:
# - Strong DB_PASSWORD
# - Secure JWT_SECRET (openssl rand -base64 32)
# - Email credentials
# - Production URLs
```

## 📊 Monitoring

```bash
docker stats                     # Resource usage
docker-compose ps                # Service status
docker system df                 # Disk usage
```

## 🔐 Security Checklist

- [ ] Change default DB_PASSWORD
- [ ] Generate secure JWT_SECRET
- [ ] Configure email (EMAIL_USER, EMAIL_PASSWORD)
- [ ] Update APP_URL for production
- [ ] Update API_URL for production
- [ ] Never commit .env files
- [ ] Use HTTPS in production

## 📚 Documentation

- **Full Guide:** DOCKER_DEPLOYMENT.md
- **Commands:** DOCKER_QUICK_REFERENCE.md
- **Summary:** DOCKER_SETUP_SUMMARY.md

---

**Need Help?** Run the validation script:
```bash
./docker-validate.sh    # Linux/Mac
docker-validate.bat     # Windows
```
