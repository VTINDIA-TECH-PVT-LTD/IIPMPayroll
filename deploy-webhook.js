const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');

// Configuration
const PORT = 9005;
const SECRET = 'iipm-payroll-secret-123';

http.createServer((req, res) => {
  // Support GET /status or /logs
  if (req.method === 'GET') {
    if (req.url === '/logs') {
      try {
        const log = fs.readFileSync('/var/www/html/iipm-repo/backend.log', 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end(log.slice(-4000));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('No log file found: ' + e.message);
      }
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
