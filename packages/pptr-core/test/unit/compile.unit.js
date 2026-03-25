const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { compileYamlString, inlineImports } = require('../../src/compile');

describe('Compile inlining', () => {
  it('inlines imported actions and functions', async () => {
    const base = path.join(__dirname, '..', '..', 'test_tmp');
    try {
      fs.rmSync(base, { recursive: true, force: true });
      fs.mkdirSync(base, { recursive: true });

      const script1 = `actions:\n  - log: I'm in script 1\n`;
      const script1Path = path.join(base, 'script1.yml');
      fs.writeFileSync(script1Path, script1);

      const script2 = `import:\n  scr1: ./script1.yml\nactions:\n  - log: I'm in script 2\n  - scr1.actions\n`;
      const compiled = await compileYamlString(script2, base);
      assert(compiled.includes("I'm in script 2"));
      assert(compiled.includes("I'm in script 1"));
    } finally {
      try { fs.rmSync(base, { recursive: true }); } catch (e) {}
    }
  });
});
