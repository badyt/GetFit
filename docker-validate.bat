@echo off
REM Docker Setup Validation Script for Windows

echo ================================
echo GetFit Docker Setup Validation
echo ================================
echo.

REM Check Docker
echo Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed
    echo Please install Docker from https://docs.docker.com/get-docker/
    exit /b 1
) else (
    docker --version
    echo [SUCCESS] Docker is installed
)

REM Check Docker Compose
echo.
echo Checking Docker Compose...
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Docker Compose is not installed
        echo Please install Docker Compose from https://docs.docker.com/compose/install/
        exit /b 1
    ) else (
        docker-compose --version
        echo [SUCCESS] Docker Compose is installed
    )
) else (
    docker compose version
    echo [SUCCESS] Docker Compose is installed
)

REM Check required files
echo.
echo Checking required files...

set MISSING_FILES=0

call :check_file "docker-compose.yml" || set /a MISSING_FILES+=1
call :check_file ".env.example" || set /a MISSING_FILES+=1
call :check_file "server\Dockerfile" || set /a MISSING_FILES+=1
call :check_file "server\.dockerignore" || set /a MISSING_FILES+=1
call :check_file "server\.env.example" || set /a MISSING_FILES+=1
call :check_file "frontend\Dockerfile" || set /a MISSING_FILES+=1
call :check_file "frontend\.dockerignore" || set /a MISSING_FILES+=1
call :check_file "frontend\.env.example" || set /a MISSING_FILES+=1

if %MISSING_FILES% gtr 0 (
    echo [ERROR] Missing %MISSING_FILES% required file^(s^)
    exit /b 1
)

REM Check .env file
echo.
echo Checking environment configuration...
if exist ".env" (
    echo [SUCCESS] .env file exists
    findstr /C:"change_this_in_production" .env >nul 2>&1
    if not errorlevel 1 (
        echo [WARNING] JWT_SECRET has default value
    )
    findstr /C:"DB_PASSWORD=postgres" .env >nul 2>&1
    if not errorlevel 1 (
        echo [WARNING] Using default database password
    )
) else (
    echo [WARNING] .env file not found
    echo Run: copy .env.example .env
    echo Then edit .env with your configuration
)

REM Check Docker daemon
echo.
echo Checking Docker daemon...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker daemon is not running
    echo Please start Docker Desktop
    exit /b 1
) else (
    echo [SUCCESS] Docker daemon is running
)

REM Validate docker-compose.yml
echo.
echo Validating docker-compose.yml...
docker compose -f docker-compose.yml config >nul 2>&1
if errorlevel 1 (
    echo [ERROR] docker-compose.yml has errors
    echo Run: docker compose -f docker-compose.yml config
    exit /b 1
) else (
    echo [SUCCESS] docker-compose.yml is valid
)

REM Check for port conflicts
echo.
echo Checking for port conflicts...
netstat -ano | findstr ":80 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 80 ^(Frontend^) is already in use
) else (
    echo [SUCCESS] Port 80 ^(Frontend^) is available
)

netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 3000 ^(Backend^) is already in use
) else (
    echo [SUCCESS] Port 3000 ^(Backend^) is available
)

netstat -ano | findstr ":5432 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 5432 ^(Database^) is already in use
) else (
    echo [SUCCESS] Port 5432 ^(Database^) is available
)

REM Summary
echo.
echo ================================
echo [SUCCESS] Validation Complete
echo ================================
echo.
echo Next steps:
echo   1. Ensure .env is configured with your settings
echo   2. Run: docker-compose up -d
echo   3. Check status: docker-compose ps
echo   4. View logs: docker-compose logs -f
echo.
echo For detailed instructions, see DOCKER_DEPLOYMENT.md
pause
exit /b 0

:check_file
if exist "%~1" (
    echo [SUCCESS] %~1
    exit /b 0
) else (
    echo [ERROR] %~1 ^(missing^)
    exit /b 1
)
