#!/bin/bash
# Docker Setup Validation Script

echo "🔍 GetFit Docker Setup Validation"
echo "=================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo "Checking Docker installation..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓${NC} Docker is installed: $DOCKER_VERSION"
else
    echo -e "${RED}✗${NC} Docker is not installed"
    echo "  Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
echo "Checking Docker Compose..."
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    echo -e "${GREEN}✓${NC} Docker Compose is installed: $COMPOSE_VERSION"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "${GREEN}✓${NC} Docker Compose is installed: $COMPOSE_VERSION"
else
    echo -e "${RED}✗${NC} Docker Compose is not installed"
    echo "  Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

# Check required files
echo ""
echo "Checking required files..."

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1 (missing)"
        return 1
    fi
}

MISSING_FILES=0

check_file "docker-compose.yml" || ((MISSING_FILES++))
check_file ".env.example" || ((MISSING_FILES++))
check_file "server/Dockerfile" || ((MISSING_FILES++))
check_file "server/.dockerignore" || ((MISSING_FILES++))
check_file "server/.env.example" || ((MISSING_FILES++))
check_file "frontend/Dockerfile" || ((MISSING_FILES++))
check_file "frontend/.dockerignore" || ((MISSING_FILES++))
check_file "frontend/.env.example" || ((MISSING_FILES++))

if [ $MISSING_FILES -gt 0 ]; then
    echo -e "${RED}✗${NC} Missing $MISSING_FILES required file(s)"
    exit 1
fi

# Check .env file
echo ""
echo "Checking environment configuration..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    
    # Check for required variables
    if grep -q "JWT_SECRET.*change.*this" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠${NC}  Warning: JWT_SECRET has default value"
    fi
    
    if grep -q "DB_PASSWORD=postgres" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠${NC}  Warning: Using default database password"
    fi
else
    echo -e "${YELLOW}⚠${NC}  .env file not found"
    echo "  Run: cp .env.example .env"
    echo "  Then edit .env with your configuration"
fi

# Check Docker daemon
echo ""
echo "Checking Docker daemon..."
if docker info &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker daemon is running"
else
    echo -e "${RED}✗${NC} Docker daemon is not running"
    echo "  Please start Docker Desktop or Docker daemon"
    exit 1
fi

# Validate docker-compose.yml
echo ""
echo "Validating docker-compose.yml..."
if docker compose -f docker-compose.yml config &> /dev/null; then
    echo -e "${GREEN}✓${NC} docker-compose.yml is valid"
else
    echo -e "${RED}✗${NC} docker-compose.yml has errors"
    echo "  Run: docker compose -f docker-compose.yml config"
    exit 1
fi

# Check for port conflicts
echo ""
echo "Checking for port conflicts..."
check_port() {
    PORT=$1
    NAME=$2
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠${NC}  Port $PORT ($NAME) is already in use"
        return 1
    else
        echo -e "${GREEN}✓${NC} Port $PORT ($NAME) is available"
        return 0
    fi
}

check_port 80 "Frontend"
check_port 3000 "Backend"
check_port 5432 "Database"

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}✅ Validation Complete${NC}"
echo ""
echo "Next steps:"
echo "  1. Ensure .env is configured with your settings"
echo "  2. Run: docker-compose up -d"
echo "  3. Check status: docker-compose ps"
echo "  4. View logs: docker-compose logs -f"
echo ""
echo "For detailed instructions, see DOCKER_DEPLOYMENT.md"
