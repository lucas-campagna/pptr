const assert = require('assert');
let core;
try { core = require('pptr-core'); } catch (e) { core = require('../../libs/pptr-core/src'); }
const Interpreter = core.Interpreter || require('../../libs/pptr-core/src/interpreter');
const VariableEngine = core.VariableEngine || require('../../libs/pptr-core/src/variables');
const Logger = core.Logger || require('../../libs/pptr-core/src/logger');

function makeLogger() {
  const logs = [];
  const logger = new Logger(null, false);
  logger.logs = logs;
  logger.write = (level, message) => logs.push({ level, message });
  logger.debug = () => {};
  return logger;
}

function makeInterpreterWithImports(imports) {
  const fakeBrowser = { newPage: async () => ({}) };
  const logger = makeLogger();
  const vars = new VariableEngine({}, []);
  vars.setAllowUndeclared(true);
  return new Interpreter(fakeBrowser, { vars, logger, imports });
}

describe('Imports inside control structures', () => {
  it('works inside for loop', async () => {
    const imported = { actions: [ { type: 'log', message: '${item}' }, { type: 'result', value: '${item}' } ] };
    const it = makeInterpreterWithImports({ scr1: imported });
    const actions = [ { type: 'for', items: ['a','b'], as: 'item', actions: [ { 'scr1.actions': null } ] } ];
    await it.executeActions({}, actions);
    // last item should be 'b'
    assert.strictEqual(it.vars.get('item'), 'b');
    assert.strictEqual(it.vars.get('result'), 'b');
  });

  it('works inside if/else', async () => {
    const imported = { actions: [ { type: 'log', message: 'then-run' } ] };
    const it = makeInterpreterWithImports({ scr1: imported });
    const actions = [ { type: 'if', condition: 'true', then: [ { 'scr1.actions': null } ], else: [] } ];
    await it.executeActions({}, actions);
    const msgs = it.logger.logs.map(l => l.message);
    assert.ok(msgs.includes('then-run'));
  });

  it('works inside parallel', async () => {
    const imported = { actions: [ { type: 'log', message: 'P' } ] };
    const it = makeInterpreterWithImports({ scr1: imported });
    const actions = [ { type: 'parallel', branches: [ { actions: [ { 'scr1.actions': null } ] }, { actions: [ { 'scr1.actions': null } ] } ] } ];
    await it.executeActions({}, actions);
    const msgs = it.logger.logs.map(l => l.message).filter(Boolean);
    // Expect at least two P messages
    const pCount = msgs.filter(m => m === 'P').length;
    assert.ok(pCount >= 2);
  });

  it('works inside repeat', async () => {
    const imported = { actions: [ { type: 'log', message: 'R' } ] };
    const it = makeInterpreterWithImports({ scr1: imported });
    const actions = [ { type: 'repeat', times: 3, actions: [ { 'scr1.actions': null } ] } ];
    await it.executeActions({}, actions);
    const msgs = it.logger.logs.map(l => l.message).filter(Boolean);
    const count = msgs.filter(m => m === 'R').length;
    assert.strictEqual(count, 3);
  });

  it('works inside subcommands resolution (inline actions)', async () => {
    // Import has subcommands.foo.actions
    const imported = { subcommands: { foo: { actions: [ { type: 'log', message: 'subcmd' } ] } } };
    const it = makeInterpreterWithImports({ scr1: imported });
    // referencing path scr1.subcommands.foo.actions should inline
    const actions = [ { 'scr1.subcommands.foo.actions': null } ];
    await it.executeActions({}, actions);
    const msgs = it.logger.logs.map(l => l.message);
    assert.ok(msgs.includes('subcmd'));
  });
});
