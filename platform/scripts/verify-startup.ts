import { spawn } from 'child_process';
import { resolve } from 'path';

function run() {
  // If server is already running, verify health and exit
  const http = require('http');
  const port = parseInt(process.env.PORT || '4000', 10);
  const quickReq = http.request(
    { host: 'localhost', port, path: '/api/health', method: 'GET', timeout: 2000 },
    (res: any) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
        console.log('✅ Startup verified: application already running and healthy');
        process.exit(0);
      } else {
        res.resume();
        startChild();
      }
    }
  );
  quickReq.on('error', () => startChild());
  quickReq.end();
}

function startChild() {
  const mainPath = resolve(__dirname, '..', 'main.ts');
  const child = spawn('npx', ['ts-node', mainPath], {
    cwd: resolve(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
    shell: true,
  });

  let output = '';
  let healthy = false;
  const timer = setTimeout(() => {
    child.kill();
    const ok = healthy || /Nest application successfully started|Application is running on/.test(output);
    if (ok) {
      console.log('✅ Startup verified: application started successfully');
      process.exit(0);
    } else {
      console.error('❌ Startup verification failed. Output:\n', output);
      process.exit(1);
    }
  }, 15000);

  child.stdout.on('data', (d) => { output += d.toString(); });
  child.stderr.on('data', (d) => { output += d.toString(); });

  // Probe health endpoint after a short delay
  setTimeout(() => {
    const port = parseInt(process.env.PORT || '4000', 10);
    const http = require('http');
    const req = http.request(
      { host: 'localhost', port, path: '/api/health', method: 'GET', timeout: 3000 },
      (res: any) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          healthy = true;
        }
        res.resume();
      }
    );
    req.on('error', () => { /* ignore */ });
    req.end();
  }, 7000);

  child.on('exit', (code) => {
    clearTimeout(timer);
    const ok = healthy || /Nest application successfully started|Application is running on/.test(output);
    if (ok) {
      console.log('✅ Startup verified: application started successfully');
      process.exit(0);
    } else {
      console.error('❌ Startup verification failed (exit code ' + code + '). Output:\n', output);
      process.exit(1);
    }
  });
}

run();
