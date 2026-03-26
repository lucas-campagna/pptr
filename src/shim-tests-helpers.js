// Provide helper shims expected by tests in apps/pptr that `require('../helpers')`
// relative to the app test dir. This file will be required by apps tests when
// they try to load '../helpers' from their test folder.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function runCli(args, opts = {}) {
  return new Promise((resolve) => {
    const cli = path.join(__dirname, '..', 'src', 'cli.js');
    const proc = spawn(process.execPath, [cli, ...args], {
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
