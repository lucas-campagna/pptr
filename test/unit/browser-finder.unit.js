const assert = require('assert');
const path = require('path');

describe('browser-finder (unit)', () => {
  it('expandHomeAndEnv expands ~ and env vars', () => {
  let core;
  try { core = require('pptr-core'); } catch (e) { core = require('../../libs/pptr-core/src'); }
  const bf = core.BrowserFinder || require('../../libs/pptr-core/src/browser-finder');
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
  let core2;
  try { core2 = require('pptr-core'); } catch (e) { core2 = require('../../libs/pptr-core/src'); }
  const bf2 = core2.BrowserFinder || require('../../libs/pptr-core/src/browser-finder');
    // We don't assert a specific value here because CI may run in WSL.
    // Just ensure the function returns a boolean.
    const val = bf2.isWSL();
    assert.strictEqual(typeof val, 'boolean');
  });
});
