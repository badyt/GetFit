#!/bin/bash
# GetFit Docker Build and Run Script

set -e

echo "🚀 GetFit Docker Setup"
echo "====================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your configuration before continuing."
    echo "   Minimum required changes:"
    echo "   - DB_PASSWORD"
    echo "   - JWT_SECRET (generate with: openssl rand -base64 32)"
    echo "   - EMAIL_USER and EMAIL_PASSWORD (if you need email functionality)"
    read -p "Press Enter after editing .env to continue..."
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo ""
echo "📦 Building Docker images..."
echo ""

# Build backend
echo "Building backend server..."
docker build -t getfit-server:latest ./server

# Build frontend
echo "Building frontend..."
docker build --build-arg API_URL="${API_URL:-http://localhost:3000/api}" -t getfit-frontend:latest ./frontend

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Starting services with docker-compose..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check service health
docker-compose ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Access your application:"
echo "   Frontend:  http://localhost"
echo "   Backend:   http://localhost:3000"
echo "   Database:  localhost:5432"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
