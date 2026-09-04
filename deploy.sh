#!/bin/bash
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$JAVA_HOME/bin"
echo "Starting deployment at $(date)"

# Go to the repository directory
cd /var/www/html/iipm-repo || exit

# Fetch and force reset to latest main
git fetch origin main
git reset --hard origin/main

# 1. Update frontend
if [ -d "frontend/build" ]; then
  mkdir -p /var/www/html/VTPMS/public/IIPMPayroll/
  \cp -rf frontend/build/* /var/www/html/VTPMS/public/IIPMPayroll/
  echo "Frontend files copied successfully."
else
  echo "Warning: frontend/build directory not found."
fi

# 2. Update backend
echo "Restarting backend..."
pkill -9 -f "iipm-payroll-system" || true
pkill -9 -f "target/iipm-payroll-system" || true
sleep 2

# Verify java location
which java || echo "java command check"

# Start backend cleanly detached with setsid and input redirection
setsid nohup java -jar /var/www/html/iipm-repo/target/iipm-payroll-system-0.0.1-SNAPSHOT.jar > /var/www/html/iipm-repo/backend.log 2>&1 < /dev/null &
sleep 2

echo "Deployment script finished at $(date)."
