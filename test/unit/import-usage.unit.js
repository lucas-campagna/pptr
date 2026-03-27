const assert = require('assert');
const core = require('pptr-core');
const Interpreter = core.Interpreter || require('../../src/interpreter');
const VariableEngine = core.VariableEngine || require('../../src/variables');
const Logger = core.Logger || require('../../src/logger');

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

describe('Imported actions usage', () => {
  it('inlines imported actions', async () => {
    const script = {
      actions: [
        { 'scr1.actions': null }
      ]
    };

    const imported = {
      actions: [ { type: 'log', message: 'from-import' } ]
    };

    const it = makeInterpreterWithImports({ scr1: imported });
    await it.executeActions({}, script.actions);
    const msgs = it.logger.logs.map(l => l.message);
    assert.ok(msgs.includes('from-import'));
  });

  it('calls imported function with params', async () => {
    const imported = {
      functions: {
        sum: {
          params: { x: 0, y: 0 },
          actions: [ { type: 'return', value: '${x + y}' } ]
        }
      }
    };

    const it = makeInterpreterWithImports({ scr1: imported });
    const actions = [ { 'scr1.functions.sum': { x: 2, y: 3 } } ];
    await it.executeActions({}, actions);
    assert.strictEqual(it.vars.get('$result'), '5');
  });
});
