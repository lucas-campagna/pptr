const path = require('path');
const fs = require('fs');
const assert = require('assert');
const core = require('pptr-core');
const { loadImports, ImportPathError, CircularImportError } = { loadImports: core.loadImports, ImportPathError: core.ImportPathError, CircularImportError: core.CircularImportError };

describe('Importer', () => {
  it('loads a simple import', async () => {
    const fixtures = path.join(__dirname, '..', '..', 'scripts');
    const map = { scr1: path.join(fixtures, 'example.yaml') };
    const res = await loadImports(map, fixtures, {});
    assert.ok(res.scr1);
    assert.ok(res.scr1.actions);
  });

  it('throws for missing path', async () => {
    await assert.rejects(async () => {
      await loadImports({ x: './no-such-file.yml' }, process.cwd(), {});
    }, ImportPathError);
  });
});
