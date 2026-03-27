// Local helper that spawns the app CLI; do not depend on top-level src/ shims.
const path = require('path');
const { spawn } = require('child_process');

module.exports = {
  runCli: (args, opts = {}) => new Promise((resolve) => {
    const cli = path.join(__dirname, '..', 'src', 'cli.js');
    const proc = spawn(process.execPath, [cli, ...args], {
      // default to repository root so script paths like `scripts/example.yaml`
      // resolve; callers can override via opts.cwd
      cwd: opts.cwd || process.cwd(),
      env: { ...process.env, ...opts.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (c) => (stdout += c.toString()));
    proc.stderr.on('data', (c) => (stderr += c.toString()));
    proc.on('close', (code) => resolve({ code, stdout, stderr }));
  }),
};
