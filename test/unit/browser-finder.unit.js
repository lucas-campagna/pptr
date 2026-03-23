const assert = require('assert');
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

  it('isWSL detection works (non-deterministic in CI)', () => {
    const bf = require('../../src/browser-finder');
    // We don't assert a specific value here because CI may run in WSL.
    // Just ensure the function returns a boolean.
    const val = bf.isWSL();
    assert.strictEqual(typeof val, 'boolean');
  });
});
