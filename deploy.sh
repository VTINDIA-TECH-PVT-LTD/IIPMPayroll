#!/bin/bash
echo "Starting deployment at $(date)"

# Go to the repository directory
cd /var/www/html/iipm-repo || exit

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
# Kill any existing backend process running this specific JAR
pkill -f "target/iipm-payroll-system-0.0.1-SNAPSHOT.jar" || true
# Wait a couple of seconds for the process to fully stop
sleep 2
# Start the new backend process
nohup java -jar target/iipm-payroll-system-0.0.1-SNAPSHOT.jar > backend.log 2>&1 &
echo "Backend restarted successfully."

echo "Deployment script finished."
