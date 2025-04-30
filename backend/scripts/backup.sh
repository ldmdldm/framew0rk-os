#!/bin/bash

# Load environment variables
source ../.env

# Set backup directory
BACKUP_DIR="/backups/mongodb"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="agent_framework_backup_$DATE"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$BACKUP_NAME"

# Compress backup
cd $BACKUP_DIR
tar -czf "$BACKUP_NAME.tar.gz" $BACKUP_NAME
rm -rf $BACKUP_NAME

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -type f -mtime +7 -delete

# Log backup completion
echo "Backup completed: $BACKUP_NAME.tar.gz"