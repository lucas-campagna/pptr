const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { runCli } = require('./helpers');

describe('CLI', () => {
  it('lists browsers without error', async function () {
    this.timeout(10000);
    const res = await runCli(['--list-browsers']);
    assert.strictEqual(res.code, 0);
    // output should contain either 'No browsers found' or 'Browsers found'
    assert(/Browsers found|No browsers found/.test(res.stdout));
  });

  it('shows help when no args', async function () {
    this.timeout(5000);
    const res = await runCli([]);
    // program.help exits with code 1
    assert.ok(res.code !== undefined);
    assert(/Usage: pptr/.test(res.stdout + res.stderr));
  });

  it('compiles script to output', async function () {
    const tmp = path.join(__dirname, 'out.sh');
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      const res = await runCli(['-o', tmp, 'scripts/example.yaml']);
      assert.strictEqual(res.code, 0);
      assert.ok(fs.existsSync(tmp));
    } finally {
      try { fs.unlinkSync(tmp); } catch (e) {}
    }
  });
});
