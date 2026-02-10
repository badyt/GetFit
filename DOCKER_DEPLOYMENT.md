# GetFit Docker Deployment Guide

This guide explains how to deploy the GetFit application using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (version 20.10 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0 or higher)

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set your configuration values:
- `DB_PASSWORD`: PostgreSQL database password
- `JWT_SECRET`: Secret key for JWT token generation (use: `openssl rand -base64 32`)
- `APP_URL`: Your application URL (e.g., https://yourapp.com)
- `EMAIL_USER`: Gmail address for sending emails
- `EMAIL_PASSWORD`: Gmail app password ([How to create](https://myaccount.google.com/apppasswords))
- `API_URL`: Backend API URL (e.g., https://api.yourapp.com/api)

### 2. Build and Run

Start all services (database, server, frontend):

```bash
docker-compose up -d
```

This will:
- Start a PostgreSQL database
- Build and start the backend server
- Build and start the frontend web application

### 3. Access the Application

- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432

### 4. View Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f server
docker-compose logs -f frontend
docker-compose logs -f database
```

### 5. Stop the Application

```bash
docker-compose down
```

To also remove volumes (database data):

```bash
docker-compose down -v
```

## Building Individual Images

### Backend Server

```bash
cd server
docker build -t getfit-server .
docker run -p 3000:3000 --env-file .env getfit-server
```

Environment variables for server:
- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT secret key
- `APP_URL`: Application base URL
- `EMAIL_USER`: Email address for sending emails
- `EMAIL_PASSWORD`: Email account password

### Frontend Web App

```bash
cd frontend
docker build --build-arg API_URL=http://localhost:3000/api -t getfit-frontend .
docker run -p 80:80 -e API_URL=http://localhost:3000/api getfit-frontend
```

Environment variables for frontend:
- `API_URL`: Backend API URL

## Production Deployment

### Security Considerations

1. **Use Strong Passwords**: Generate secure passwords for database and JWT secret
2. **HTTPS**: Use a reverse proxy (nginx, Traefik) with SSL certificates
3. **Environment Variables**: Never commit `.env` files to version control
4. **Database Backups**: Set up regular backups of the PostgreSQL database
5. **Update Base Images**: Regularly update Docker base images for security patches

### Example Production docker-compose.yml

```yaml
version: '3.8'

services:
  server:
    image: getfit-server:latest
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://user:pass@db:5432/getfit
      JWT_SECRET: ${JWT_SECRET}
      APP_URL: https://yourapp.com
      EMAIL_USER: ${EMAIL_USER}
      EMAIL_PASSWORD: ${EMAIL_PASSWORD}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 512M

  frontend:
    image: getfit-frontend:latest
    restart: always
    environment:
      API_URL: https://api.yourapp.com/api
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
```

### Reverse Proxy with SSL

Consider using Traefik or nginx for SSL termination:

```yaml
  traefik:
    image: traefik:v2.10
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik.yml:/traefik.yml
      - ./acme.json:/acme.json
```

## Troubleshooting

### Database Connection Issues

Check if the database is healthy:
```bash
docker-compose ps database
docker-compose exec database pg_isready -U postgres
```

### Server Won't Start

Check logs for errors:
```bash
docker-compose logs server
```

Common issues:
- Database not ready: Wait for database to be healthy
- Missing environment variables: Check `.env` file
- Prisma migrations failed: Run `docker-compose exec server npx prisma migrate deploy`

### Frontend Can't Connect to Backend

1. Verify `API_URL` environment variable is correct
2. Check if server is running: `docker-compose ps server`
3. Test backend directly: `curl http://localhost:3000/api/auth/health`

### Port Conflicts

If ports are already in use, modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "8080:80"  # Frontend on port 8080 instead of 80
  - "3001:3000"  # Backend on port 3001 instead of 3000
```

## Maintenance

### Database Backup

```bash
docker-compose exec database pg_dump -U postgres getfit > backup.sql
```

### Database Restore

```bash
docker-compose exec -T database psql -U postgres getfit < backup.sql
```

### Update Images

```bash
docker-compose pull
docker-compose up -d
```

### Clean Up

Remove unused images and containers:
```bash
docker system prune -a
```

## Development vs Production

The provided Dockerfiles are optimized for production. For development:

1. Use volume mounts for hot-reloading:
```yaml
volumes:
  - ./server:/app
  - /app/node_modules
```

2. Use nodemon for the server:
```yaml
command: npm run dev
```

3. Consider using `docker-compose.dev.yml` for development-specific configurations

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables are set correctly
3. Ensure all services are healthy: `docker-compose ps`
