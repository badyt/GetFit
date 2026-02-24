@echo off
REM GetFit Docker Build and Run Script for Windows

echo ================================
echo GetFit Docker Setup
echo ================================
echo.

REM Check if .env exists
if not exist .env (
    echo [WARNING] .env file not found. Creating from .env.example...
    copy .env.example .env
    echo [SUCCESS] Created .env file. Please edit it with your configuration before continuing.
    echo.
    echo Minimum required changes:
    echo   - DB_PASSWORD
    echo   - JWT_SECRET (generate with: openssl rand -base64 32^)
    echo   - EMAIL_USER and EMAIL_PASSWORD (if you need email functionality^)
    echo.
    pause
)

echo.
echo Building Docker images...
echo.

REM Build backend
echo Building backend server...
docker build -t getfit-server:latest ./server
if errorlevel 1 (
    echo [ERROR] Backend build failed!
    exit /b 1
)

REM Build frontend
echo Building frontend...
docker build -t getfit-frontend:latest ./frontend
if errorlevel 1 (
    echo [ERROR] Frontend build failed!
    exit /b 1
)


echo.
echo [SUCCESS] Build complete!
echo.

echo Starting services with docker-compose...
docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Failed to start services!
    exit /b 1
)

echo.
echo Waiting for services to be healthy...
timeout /t 5 /nobreak >nul

REM Check service health
docker-compose ps

echo.
echo ================================
echo [SUCCESS] Deployment complete!
echo ================================
echo.
echo Access your application:
echo   Frontend:  http://localhost
echo   Backend:   http://localhost:3000
echo   Database:  localhost:5432
echo.
echo View logs:
echo   docker-compose logs -f
echo.
echo Stop services:
echo   docker-compose down
echo.
pause
