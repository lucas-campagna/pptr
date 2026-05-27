const assert = require('assert');
const path = require('path');
const { runCli } = require('./helpers');

describe('CLI --dev mode', () => {
  beforeAll(() => {
    jest.setTimeout(15000);
  });

  it('shows updated help text mentioning --dev', async () => {
    const res = await runCli(['--help']);
    expect(res.code).toBeDefined();
    expect(res.stdout).toContain('not needed with -e or --dev');
  });

  it('parses --dev without script (capture mode)', async () => {
    const res = await runCli(['--dev']);
    // Should fail due to browser not being available in test env,
    // but should NOT fail with "path argument must be string"
    const combined = res.stdout + res.stderr;
    expect(combined).not.toMatch(/path.*must be of type string|Received undefined/);
  });

  it('parses --dev --capture-file with custom path', async () => {
    const res = await runCli(['--dev', '--capture-file', '/tmp/test-capture.yaml']);
    const combined = res.stdout + res.stderr;
    expect(combined).not.toMatch(/path.*must be of type string|Received undefined/);
  });
});