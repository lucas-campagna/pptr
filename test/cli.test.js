const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { runCli } = require('./helpers');

describe('CLI', () => {
  beforeAll(() => {
    jest.setTimeout(15000);
  });

  it('lists browsers without error', async () => {
    const res = await runCli(['--list-browsers']);
    expect(res.code).toBe(0);
    expect(/Browsers found|No browsers found/.test(res.stdout)).toBeTruthy();
  });

  it('shows help when no args', async () => {
    const res = await runCli([]);
    expect(res.code).toBeDefined();
    expect(/Usage: pptr/.test(res.stdout + res.stderr)).toBeTruthy();
  });

  it('compiles script to output', async () => {
    const tmp = path.join(__dirname, 'out.sh');
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      const res = await runCli(['-o', tmp, 'scripts/example.yaml']);
      expect(res.code).toBe(0);
      expect(fs.existsSync(tmp)).toBeTruthy();
    } finally {
      try { fs.unlinkSync(tmp); } catch (e) {}
    }
  });
});
