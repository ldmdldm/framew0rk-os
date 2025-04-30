#!/bin/bash

# Load production environment variables
set -a
source .env.production
set +a

# Build and deploy using Docker Compose
echo "Building and deploying services..."
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 30

# Run database migrations if needed
echo "Running database migrations..."
docker-compose exec backend npm run migrate

# Setup cron job for database backup
(crontab -l 2>/dev/null; echo "0 0 * * * /bin/bash $(pwd)/backend/scripts/backup.sh") | crontab -

# Monitor deployment
echo "Monitoring deployment..."
docker-compose logs -f