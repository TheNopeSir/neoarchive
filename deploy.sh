#!/bin/bash

# NeoArchive Deployment Script
# Normal deployment with Docker cache

set -e  # Exit on error

echo "🚀 Starting NeoArchive deployment..."
echo ""

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start (using cache for faster build)
echo "🔨 Building and starting containers..."
docker-compose up -d --build

# Show logs
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Container status:"
docker-compose ps

echo ""
echo "📝 View logs with: docker-compose logs -f"
echo "🔄 Restart with: docker-compose restart"
echo "🛑 Stop with: docker-compose down"
