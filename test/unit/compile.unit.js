const assert = require('assert');
const fs = require('fs');
const path = require('path');
let compileYamlString, inlineImports;
try {
  ({ compileYamlString, inlineImports } = require('pptr-core'));
} catch (e) {
  const core = require('../../src/libs');
  compileYamlString = core.compileYamlString;
  inlineImports = core.inlineImports;
}

describe('Compile inlining', () => {
  it('inlines imported actions and functions', async () => {
    // create temporary files under test/scripts
    const base = path.join(__dirname, '..', '..', 'test_tmp');
    try {
      fs.rmSync(base, { recursive: true, force: true });
      fs.mkdirSync(base, { recursive: true });

      const script1 = `actions:\n  - log: I'm in script 1\n`;
      const script1Path = path.join(base, 'script1.yml');
      fs.writeFileSync(script1Path, script1);

      const script2 = `import:\n  scr1: ./script1.yml\nactions:\n  - log: I'm in script 2\n  - scr1.actions\n`;
      const compiled = await compileYamlString(script2, base);
      // compiled should include both logs; allow either normal or YAML-escaped
      // single-quote variants (I''m) since different YAML dump implementations
      // may escape single quotes differently.
      const expected1 = compiled.includes("I'm in script 2") || compiled.includes("I''m in script 2");
      const expected2 = compiled.includes("I'm in script 1") || compiled.includes("I''m in script 1");
      assert(expected1);
      assert(expected2);
    } finally {
      try { fs.rmSync(base, { recursive: true }); } catch (e) {}
    }
  });
});
