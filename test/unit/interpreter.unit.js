const assert = require('assert');
const core = require('pptr-core');
const Interpreter = core.Interpreter || require('../../src/interpreter');
const VariableEngine = core.VariableEngine || require('../../src/variables');
const Logger = core.Logger || require('../../src/logger');

describe('Interpreter control structures (unit)', () => {
  function makeLogger() {
    const logs = [];
    const logger = new Logger(null, false);
    // stub write to capture logs
    logger.logs = logs;
    logger.write = (level, message) => logs.push({ level, message });
    return logger;
  }

  function makeInterpreter(vars) {
    const fakeBrowser = { newPage: async () => ({}) };
    const logger = makeLogger();
    return new Interpreter(fakeBrowser, { vars, logger });
  }

  it('executes if-then branch when condition true', async () => {
    const vars = new VariableEngine({}, []);
    vars.set('flag', true);
    const it = makeInterpreter(vars);
    const actions = [
      {
        type: 'if',
        condition: '${flag} == true',
        then: [{ type: 'result', value: 'then' }],
        else: [{ type: 'result', value: 'else' }],
      },
    ];

    await it.executeActions({}, actions);
    assert.strictEqual(vars.get('result'), 'then');
  });

  it('executes else branch when condition false', async () => {
    const vars = new VariableEngine({}, []);
    vars.set('flag', false);
    const it = makeInterpreter(vars);
    const actions = [
      {
        type: 'if',
        condition: '${flag} == true',
        then: [{ type: 'result', value: 'then' }],
        else: [{ type: 'result', value: 'else' }],
      },
    ];

    await it.executeActions({}, actions);
    assert.strictEqual(vars.get('result'), 'else');
  });

  it('runs for loop and exposes loop variable to inner actions', async () => {
    const vars = new VariableEngine({}, []);
    vars.set('names', ['alice', 'bob']);
    const it = makeInterpreter(vars);

    const actions = [
      {
        type: 'for',
        items: 'names',
        as: 'name',
        actions: [{ type: 'last', value: '${name}' }],
      },
    ];

    await it.executeActions({}, actions);
    // loop variable should end up set to last item
    assert.strictEqual(vars.get('name'), 'bob');
    assert.strictEqual(vars.get('last'), 'bob');
  });

  it('repeats inner actions N times', async () => {
    const vars = new VariableEngine({}, []);
    const it = makeInterpreter(vars);
    const logger = it.logger;

    const actions = [
      {
        type: 'repeat',
        times: 3,
        delay: 0,
        actions: [{ type: 'log', message: 'tick' }],
      },
    ];

    await it.executeActions({}, actions);
    // logger stored messages in logger.logs
    assert.strictEqual(logger.logs.filter(l => l.message === 'tick').length, 3);
  });

  it('executes parallel branches', async () => {
    const vars = new VariableEngine({}, []);
    const it = makeInterpreter(vars);
    const logger = it.logger;

    const actions = [
      {
        type: 'parallel',
        branches: [
          { actions: [{ type: 'log', message: 'A' }] },
          { actions: [{ type: 'log', message: 'B' }] },
        ],
      },
    ];

    await it.executeActions({}, actions);
    const msgs = logger.logs.map(l => l.message);
    assert.ok(msgs.includes('A'));
    assert.ok(msgs.includes('B'));
  });
});
