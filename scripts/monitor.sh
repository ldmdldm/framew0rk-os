#!/bin/bash

# Check services health
check_health() {
  echo "Checking services health..."
  
  # Check backend health
  backend_health=$(curl -s http://localhost:8000/health)
  if [ $? -eq 0 ]; then
    echo "Backend: OK"
    echo "$backend_health"
  else
    echo "Backend: FAIL"
  fi

  # Check MongoDB connection
  mongo_status=$(docker-compose exec mongodb mongo --eval "db.stats()" 2>/dev/null)
  if [ $? -eq 0 ]; then
    echo "MongoDB: OK"
  else
    echo "MongoDB: FAIL"
  fi

  # Check Redis connection
  redis_status=$(docker-compose exec redis redis-cli ping 2>/dev/null)
  if [ "$redis_status" == "PONG" ]; then
    echo "Redis: OK"
  else
    echo "Redis: FAIL"
  fi
}

# Monitor container resource usage
monitor_resources() {
  echo "Monitoring container resources..."
  docker stats --no-stream
}

# Monitor logs
monitor_logs() {
  echo "Tailing logs..."
  docker-compose logs -f --tail=100
}

# Main monitoring loop
while true; do
  clear
  date
  echo "============================"
  check_health
  echo "============================"
  monitor_resources
  echo "============================"
  sleep 60
done