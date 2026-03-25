const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function runCli(args, opts = {}) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'cli.js'), ...args], {
      env: { ...process.env, ...opts.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (c) => (stdout += c.toString()));
    proc.stderr.on('data', (c) => (stderr += c.toString()));
    proc.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

module.exports = { runCli };
