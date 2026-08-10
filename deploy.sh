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
# NOTE: These lines are commented out because you got a "Not a directory" error earlier.
# Once you run `ps aux | grep java` and find the exact path of your running JAR file,
# replace the path below and remove the '#' to uncomment these lines!

# \cp target/iipm-payroll-system-0.0.1-SNAPSHOT.jar /EXACT/PATH/TO/YOUR/RUNNING/JAR/FILE.jar
# sudo systemctl restart iipm-payroll

echo "Deployment script finished."
