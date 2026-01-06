#!/bin/bash

# NeoArchive Clean Deployment Script
# Rebuilds without cache - use when you have build errors or need fresh build

set -e  # Exit on error

echo "🧹 Starting NeoArchive CLEAN deployment (no cache)..."
echo "⚠️  This will take longer but ensures fresh build"
echo ""

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images
echo "🗑️  Removing old images..."
docker rmi neoarchive_neoarchive 2>/dev/null || true
docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null || true

# Clean build cache
echo "🧹 Cleaning Docker build cache..."
docker builder prune -f

# Build without cache
echo "🔨 Building WITHOUT cache (this may take 5-10 minutes)..."
docker-compose build --no-cache

# Start containers
echo "🚀 Starting containers..."
docker-compose up -d

# Show logs
echo ""
echo "✅ Clean deployment complete!"
echo ""
echo "📊 Container status:"
docker-compose ps

echo ""
echo "📝 View logs with: docker-compose logs -f"
echo "🔄 Restart with: docker-compose restart"
echo "🛑 Stop with: docker-compose down"
