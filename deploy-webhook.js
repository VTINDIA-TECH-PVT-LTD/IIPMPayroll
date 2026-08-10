const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');

// Configuration
const PORT = 9005;
const SECRET = 'iipm-payroll-secret-123'; // Make sure this matches your GitHub Webhook Secret!

http.createServer((req, res) => {
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
      
      exec('bash deploy.sh', (err, stdout, stderr) => {
        if (err) {
          console.error(`Execution Error: ${err}`);
        }
        if (stdout) console.log(`Output: ${stdout}`);
        if (stderr) console.error(`Stderr: ${stderr}`);
      });
      
      res.writeHead(200);
      res.end('Deployment triggered successfully!');
    } else {
      console.log(`[${new Date().toISOString()}] Invalid signature received.`);
      res.writeHead(403);
      res.end('Invalid signature');
    }
  });
}).listen(PORT, () => console.log(`GitHub Webhook listener running on port ${PORT}...`));
