#!/bin/bash
echo "Starting deployment at $(date)"
echo "Running as user: $(whoami)"

# Go to the repository directory
cd /var/www/html/iipm-repo || exit 1

# Fetch and force reset to latest main
git fetch origin main
git reset --hard origin/main
echo "Git reset done."

# 1. Update frontend
if [ -d "frontend/build" ]; then
  mkdir -p /var/www/html/VTPMS/public/IIPMPayroll/
  \cp -rf frontend/build/* /var/www/html/VTPMS/public/IIPMPayroll/
  echo "Frontend files copied successfully."
else
  echo "Warning: frontend/build directory not found."
fi

# 2. Find Java - check common locations
JAVA_BIN=""
for candidate in \
  /usr/bin/java \
  /usr/local/bin/java \
  /opt/java/openjdk/bin/java \
  /usr/lib/jvm/java-17-openjdk-amd64/bin/java \
  /usr/lib/jvm/java-17-amazon-corretto/bin/java \
  /usr/lib/jvm/temurin-17/bin/java \
  /usr/lib/jvm/java-17/bin/java; do
  if [ -x "$candidate" ]; then
    JAVA_BIN="$candidate"
    break
  fi
done

# Also try which
if [ -z "$JAVA_BIN" ]; then
  JAVA_BIN=$(which java 2>/dev/null)
fi

if [ -z "$JAVA_BIN" ]; then
  echo "ERROR: Java not found! Cannot start backend."
  exit 1
fi

echo "Using Java: $JAVA_BIN"
$JAVA_BIN -version 2>&1

# 3. Stop any running backend
echo "Stopping existing backend..."
pkill -9 -f "iipm-payroll-system" 2>/dev/null || true
sleep 3

# 4. Verify the JAR exists
JAR_PATH="/var/www/html/iipm-repo/target/iipm-payroll-system-0.0.1-SNAPSHOT.jar"
if [ ! -f "$JAR_PATH" ]; then
  echo "ERROR: JAR not found at $JAR_PATH"
  ls -la /var/www/html/iipm-repo/target/ 2>/dev/null || echo "target/ directory missing"
  exit 1
fi

echo "JAR found: $(ls -lh $JAR_PATH)"

# 5. Start backend cleanly detached
echo "Starting backend..."
setsid nohup $JAVA_BIN -jar "$JAR_PATH" > /var/www/html/iipm-repo/backend.log 2>&1 < /dev/null &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"
sleep 5

# 6. Verify it started
if kill -0 $BACKEND_PID 2>/dev/null; then
  echo "Backend process is alive (PID: $BACKEND_PID)"
else
  echo "WARNING: Backend process may have exited - check backend.log"
  tail -50 /var/www/html/iipm-repo/backend.log 2>/dev/null || echo "No log yet"
fi

echo "Deployment script finished at $(date)."
