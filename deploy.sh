#!/bin/bash
echo "Starting deployment at $(date)"

# Go to the repository directory
cd /var/www/html/iipm-repo || exit 1

# Pull the latest changes from GitHub
git pull origin main

# 1. Update frontend
if [ -d "frontend/build" ]; then
  \cp -r frontend/build/* /var/www/html/VTPMS/public/IIPMPayroll/
  echo "Frontend files copied successfully."
else
  echo "Warning: frontend/build directory not found."
fi

# 2. Update backend
echo "Restarting backend..."

# Kill any existing backend process
pkill -f "iipm-payroll-system" 2>/dev/null || true
sleep 3

# Find Java - check common locations first, then fallback to which
JAVA_BIN=""
for candidate in /usr/bin/java /usr/local/bin/java /opt/java/openjdk/bin/java /usr/lib/jvm/java-17-openjdk-amd64/bin/java; do
  if [ -x "$candidate" ]; then
    JAVA_BIN="$candidate"
    break
  fi
done
if [ -z "$JAVA_BIN" ]; then
  JAVA_BIN=$(which java 2>/dev/null)
fi
if [ -z "$JAVA_BIN" ]; then
  echo "ERROR: Java not found!"
  exit 1
fi

echo "Using Java: $JAVA_BIN"

# Start backend with explicit external config file to ensure MongoDB Atlas connection is used
nohup $JAVA_BIN -jar target/iipm-payroll-system-0.0.1-SNAPSHOT.jar --spring.config.additional-location=file:/var/www/html/iipm-repo/src/main/resources/application.yml > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"
sleep 5

# Verify it started
if kill -0 $BACKEND_PID 2>/dev/null; then
  echo "Backend is running OK."
else
  echo "WARNING: Backend may have crashed. Check backend.log"
fi

echo "Deployment finished at $(date)."
