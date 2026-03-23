const assert = require('assert');
const proxyquire = require('proxyquire');
const path = require('path');

describe('browser-finder (unit)', () => {
  it('expandHomeAndEnv expands ~ and env vars', () => {
    const bf = require('../../src/browser-finder');
    const origHome = process.env.HOME;
    process.env.HOME = '/home/testuser';
    try {
      const p = bf.expandHomeAndEnv('~/bin/$NOEXIST/${HOME}');
      assert.ok(p.includes('/home/testuser'));
    } finally {
      process.env.HOME = origHome;
    }
  });

  it('isWSL false on non-WSL', () => {
    const bf = require('../../src/browser-finder');
    // this unit test assumes not running under WSL in CI
    assert.strictEqual(bf.isWSL(), false);
  });
});
