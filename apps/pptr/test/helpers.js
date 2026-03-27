// If the repo-level shim is available prefer it, otherwise fallback to a
// local helper that spawns the app CLI. This keeps tests runnable in both
// workspace and non-workspace environments.
try {
  module.exports = require('../../src/shim-tests-helpers');
} catch (e) {
  // fallback implementation
  const path = require('path');
  const { spawn } = require('child_process');
  module.exports = {
    runCli: (args, opts = {}) => new Promise((resolve) => {
      const cli = path.join(__dirname, '..', 'src', 'cli.js');
      // spawn the CLI with cwd explicitly set to the app root so relative
      // requires inside the CLI resolve consistently when tests spawn it
      // from the repo root.
      const proc = spawn(process.execPath, [cli, ...args], {
        // allow callers to override cwd via opts.cwd, otherwise run from the
        // repository root (process.cwd()) so script path arguments like
        // 'scripts/example.yaml' resolve as test authors expect.
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
}
