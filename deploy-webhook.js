const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');

// Configuration
const PORT = 9005;
const SECRET = 'iipm-payroll-secret-123';

const RESTART_TOKEN = 'iipm-restart-2024';

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Support GET requests
  if (req.method === 'GET') {
    // /logs - show last 4000 chars of backend log
    if (url.pathname === '/logs') {
      try {
        const log = fs.readFileSync('/var/www/html/iipm-repo/backend.log', 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end(log.slice(-4000));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('No log file found: ' + e.message);
      }
    }

    // /restart?token=iipm-restart-2024 - restart the backend without GitHub signature
    if (url.pathname === '/restart') {
      const token = url.searchParams.get('token');
      if (token !== RESTART_TOKEN) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Invalid token');
      }
      console.log(`[${new Date().toISOString()}] Manual restart triggered via /restart endpoint`);
      exec(
        'pkill -9 -f "iipm-payroll-system" || true; sleep 2; setsid nohup java -jar /var/www/html/iipm-repo/target/iipm-payroll-system-0.0.1-SNAPSHOT.jar > /var/www/html/iipm-repo/backend.log 2>&1 < /dev/null &',
        { shell: '/bin/bash' },
        (err, stdout, stderr) => {
          console.log(`Restart result: ${stdout} ${stderr} ${err ? err.message : ''}`);
        }
      );
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('Backend restart triggered! Check /logs in ~30 seconds.');
    }

    // /status - check if backend process is running
    if (url.pathname === '/status') {
      exec('pgrep -f "iipm-payroll-system" && echo "RUNNING" || echo "STOPPED"', { shell: '/bin/bash' }, (err, stdout) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Backend status: ' + stdout.trim());
      });
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('Deploy Webhook Listener OK');
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      res.writeHead(403);
      return res.end('No signature found');
    }

    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
    
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      console.log(`[${new Date().toISOString()}] Valid signature received! Executing deploy.sh...`);
      
      const scriptPath = fs.existsSync('/var/www/html/iipm-repo/deploy.sh') 
        ? '/var/www/html/iipm-repo/deploy.sh' 
        : 'deploy.sh';

      exec(`bash ${scriptPath}`, { cwd: '/var/www/html/iipm-repo' }, (err, stdout, stderr) => {
        let output = `Stdout:\n${stdout || ''}\nStderr:\n${stderr || ''}`;
        if (err) output += `\nError:\n${err.message}`;
        console.log(`Deploy finished:\n${output}`);
      });
      
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Deployment triggered successfully!');
    } else {
      console.log(`[${new Date().toISOString()}] Invalid signature received.`);
      res.writeHead(403);
      res.end('Invalid signature');
    }
  });
}).listen(PORT, () => console.log(`GitHub Webhook listener running on port ${PORT}...`));
