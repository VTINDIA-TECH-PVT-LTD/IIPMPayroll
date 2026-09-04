const http = require('http');
const crypto = require('crypto');
const { exec, spawn } = require('child_process');
const fs = require('fs');

// Configuration
const PORT = 9005;
const SECRET = 'iipm-payroll-secret-123';
const RESTART_TOKEN = 'iipm-restart-2024';
const JAR_PATH = '/var/www/html/iipm-repo/target/iipm-payroll-system-0.0.1-SNAPSHOT.jar';
const LOG_PATH = '/var/www/html/iipm-repo/backend.log';

function getJavaPath(callback) {
  const candidates = [
    '/usr/bin/java',
    '/usr/local/bin/java',
    '/opt/java/openjdk/bin/java',
    '/usr/lib/jvm/java-17-openjdk-amd64/bin/java',
    '/usr/lib/jvm/java-17-amazon-corretto/bin/java',
    '/usr/lib/jvm/temurin-17/bin/java',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return callback(c);
  }
  exec('which java', (err, stdout) => {
    callback(err ? null : stdout.trim());
  });
}

function restartBackend(callback) {
  exec('pkill -9 -f "iipm-payroll-system" 2>/dev/null; sleep 2', { shell: '/bin/bash' }, () => {
    getJavaPath((javaPath) => {
      if (!javaPath) {
        return callback(new Error('Java not found on this system'));
      }
      if (!fs.existsSync(JAR_PATH)) {
        return callback(new Error('JAR not found: ' + JAR_PATH));
      }
      console.log(`[${new Date().toISOString()}] Starting backend with: ${javaPath}`);
      const child = spawn(javaPath, ['-jar', JAR_PATH], {
        detached: true,
        stdio: ['ignore', fs.openSync(LOG_PATH, 'w'), fs.openSync(LOG_PATH, 'a')],
      });
      child.unref();
      callback(null, child.pid);
    });
  });
}

const server = http.createServer((req, res) => {
  const urlStr = req.url || '/';
  let pathname = urlStr.split('?')[0];
  const params = new URLSearchParams(urlStr.includes('?') ? urlStr.split('?')[1] : '');

  // ─── GET endpoints ───────────────────────────────────────────────────────────
  if (req.method === 'GET') {

    // /logs — tail the backend log
    if (pathname === '/logs') {
      try {
        const log = fs.readFileSync(LOG_PATH, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(log.slice(-8000));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('No log file yet: ' + e.message);
      }
    }

    // /restart?token=iipm-restart-2024 — manual restart without GitHub signature
    if (pathname === '/restart') {
      if (params.get('token') !== RESTART_TOKEN) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Invalid token');
      }
      console.log(`[${new Date().toISOString()}] Manual restart via /restart`);
      restartBackend((err, pid) => {
        if (err) console.error('Restart error:', err.message);
        else console.log(`Backend restarted, PID: ${pid}`);
      });
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('Backend restart triggered! Check /logs in ~60 seconds.');
    }

    // /status — check if Java process is running
    if (pathname === '/status') {
      exec('pgrep -f "iipm-payroll-system" && echo "RUNNING" || echo "STOPPED"', { shell: '/bin/bash' }, (err, stdout) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Backend status: ' + (stdout || '').trim());
      });
      return;
    }

    // / — health check
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('IIPM Deploy Webhook Listener OK');
  }

  // ─── POST — GitHub webhook ───────────────────────────────────────────────────
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });

  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('No signature found');
    }

    const expectedSig = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      console.log(`[${new Date().toISOString()}] Invalid signature.`);
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Invalid signature');
    }

    console.log(`[${new Date().toISOString()}] Valid webhook received — running deploy.sh...`);

    const scriptPath = fs.existsSync('/var/www/html/iipm-repo/deploy.sh')
      ? '/var/www/html/iipm-repo/deploy.sh'
      : 'deploy.sh';

    exec(`bash ${scriptPath}`, { cwd: '/var/www/html/iipm-repo', shell: '/bin/bash' }, (err, stdout, stderr) => {
      const out = `STDOUT:\n${stdout || ''}\nSTDERR:\n${stderr || ''}${err ? '\nERROR:\n' + err.message : ''}`;
      console.log(`Deploy finished:\n${out}`);
    });

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Deployment triggered successfully!');
  });
});

server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] IIPM Deploy Webhook running on port ${PORT}`);
});
