#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting health check..."

# Check frontend
echo -n "Checking frontend... "
if curl -s http://localhost:80 > /dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed${NC}"
fi

# Check backend
echo -n "Checking backend... "
if curl -s http://localhost:8000/health | grep -q "connected"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed${NC}"
fi

# Check MongoDB
echo -n "Checking MongoDB... "
if docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed${NC}"
fi

# Check Redis
echo -n "Checking Redis... "
if docker-compose exec redis redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed${NC}"
fi

# Check Web3 connection
echo -n "Checking Web3 connection... "
if curl -s -X POST http://localhost:8000/api/web3/check | grep -q "connected"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed${NC}"
fi

# Check AI services
echo -n "Checking AI services... "
if curl -s -X POST http://localhost:8000/api/ai/check | grep -q "available"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed${NC}"
fi

echo "Health check complete!" 