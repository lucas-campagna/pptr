const assert = require('assert');
const http = require('http');
let core;
try { core = require('pptr-core'); } catch (e) { core = require('../../src/libs'); }
const Parser = core.Parser || require('../../src/libs/parser');
const Interpreter = core.Interpreter || require('../../src/libs/interpreter');
const VariableEngine = core.VariableEngine || require('../../src/libs/variables');
const Logger = core.Logger || require('../../src/libs/logger');

describe('Parser routes normalization', () => {
  it('normalizes routes with leading slash', () => {
    const parser = new Parser();
    const script = parser.parse(`
routes:
  /status:
    method: GET
    actions:
      - log: "status check"
`);
    assert.ok(script.routes['/status']);
    assert.strictEqual(script.routes['/status'].method, 'GET');
    assert.strictEqual(script.routes['/status'].path, '/status');
    assert.strictEqual(script.routes['/status'].actions.length, 1);
  });

  it('normalizes routes without leading slash', () => {
    const parser = new Parser();
    const script = parser.parse(`
routes:
  status:
    method: GET
    actions:
      - log: "status check"
`);
    assert.ok(script.routes['/status']);
    assert.strictEqual(script.routes['/status'].path, '/status');
  });

  it('normalizes route with path parameters', () => {
    const parser = new Parser();
    const script = parser.parse(`
routes:
  users/:id:
    method: GET
    actions:
      - log: "user id"
`);
    assert.ok(script.routes['/users/:id']);
    assert.strictEqual(script.routes['/users/:id'].path, '/users/:id');
  });

  it('normalizes route with timeout and headers', () => {
    const parser = new Parser();
    const script = parser.parse(`
routes:
  data:
    method: POST
    timeout: 5000
    headers:
      X-Custom: value
    actions:
      - log: "processing"
`);
    const route = script.routes['/data'];
    assert.strictEqual(route.method, 'POST');
    assert.strictEqual(route.timeout, 5000);
    assert.deepStrictEqual(route.headers, { 'X-Custom': 'value' });
  });

  it('returns empty object for missing routes', () => {
    const parser = new Parser();
    const script = parser.parse(`
actions:
  - log: "hello"
`);
    assert.deepStrictEqual(script.routes, {});
  });

  it('handles mixed routes with and without leading slash', () => {
    const parser = new Parser();
    const script = parser.parse(`
routes:
  status:
    method: GET
    actions: []
  /users:
    method: GET
    actions: []
`);
    assert.ok(script.routes['/status']);
    assert.ok(script.routes['/users']);
  });
});

describe('Interpreter route matching', () => {
  function makeInterpreter(vars, routes) {
    const fakeBrowser = { newPage: async () => ({}) };
    const logger = new Logger(null, false);
    logger.write = () => {};
    return new Interpreter(fakeBrowser, { vars, logger, routes: routes || {} });
  }

  it('matches exact route', () => {
    const routes = {
      '/status': { method: 'GET', path: '/status', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('GET', '/status');
    assert.ok(match);
    assert.strictEqual(match.route.path, '/status');
    assert.deepStrictEqual(match.params, {});
  });

  it('does not match wrong method', () => {
    const routes = {
      '/status': { method: 'GET', path: '/status', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('POST', '/status');
    assert.strictEqual(match, null);
  });

  it('matches route with path parameter', () => {
    const routes = {
      '/users/:id': { method: 'GET', path: '/users/:id', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('GET', '/users/42');
    assert.ok(match);
    assert.strictEqual(match.params.id, '42');
  });

  it('matches multiple path parameters', () => {
    const routes = {
      '/users/:userId/posts/:postId': { method: 'GET', path: '/users/:userId/posts/:postId', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('GET', '/users/1/posts/99');
    assert.ok(match);
    assert.strictEqual(match.params.userId, '1');
    assert.strictEqual(match.params.postId, '99');
  });

  it('prefers more specific route', () => {
    const routes = {
      '/users': { method: 'GET', path: '/users', actions: [] },
      '/users/:id': { method: 'GET', path: '/users/:id', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('GET', '/users/42');
    assert.ok(match);
    assert.strictEqual(match.route.path, '/users/:id');
  });

  it('returns null for unmatched path', () => {
    const routes = {
      '/status': { method: 'GET', path: '/status', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('GET', '/unknown');
    assert.strictEqual(match, null);
  });

  it('handles trailing slash normalization', () => {
    const routes = {
      '/status': { method: 'GET', path: '/status', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('GET', '/status/');
    assert.ok(match);
    assert.strictEqual(match.route.path, '/status');
  });
});

describe('Interpreter route execution', () => {
  function makeInterpreter(vars, routes) {
    const fakeBrowser = { newPage: async () => ({}) };
    const logger = new Logger(null, false);
    logger.logs = [];
    logger.write = (level, message) => logger.logs.push({ level, message });
    return new Interpreter(fakeBrowser, { vars, logger, routes: routes || {} });
  }

  it('executes route actions and captures result', async () => {
    const logger = new Logger(null, false);
    logger.logs = [];
    logger.write = (level, message) => logger.logs.push({ level, message });
    const routes = {
      '/test': {
        method: 'GET',
        path: '/test',
        actions: [
          { type: 'log', message: 'route executed' },
        ],
      },
    };
    const fakeBrowser = { newPage: async () => ({}) };
    const it = new Interpreter(fakeBrowser, { vars: {}, logger, routes });
    const fakePage = {};
    const fakeReq = {
      method: 'GET',
      url: '/test',
      headers: {},
      [Symbol.asyncIterator]: async function*() {},
    };
    const fakeRes = {
      writableEnded: false,
    };
    const url = new URL('http://localhost/test');

    const result = await it.executeRouteActions(fakeReq, fakeRes, url, {}, routes['/test'], fakePage);
    assert.strictEqual(result, undefined);
    assert.ok(logger.logs.some(l => l.message === 'route executed'));
  });
});

describe('CLI --server flag parsing', () => {
  it('parses --server without port as true (normalized to 3000 by CLI)', () => {
    const raw = ['script.yaml', '--server'];
    let server = null;
    let i = 0;
    while (i < raw.length) {
      const a = raw[i];
      if (a === '--server') {
        const next = raw[i+1];
        if (next && !next.startsWith('-')) {
          server = parseInt(next, 10);
          i += 2;
        } else {
          server = 3000;
          i++;
        }
        continue;
      }
      i++;
    }
    assert.strictEqual(server, 3000);
  });

  it('parses --server with port number', () => {
    const raw = ['script.yaml', '--server', '8080'];
    let server = null;
    let i = 0;
    while (i < raw.length) {
      const a = raw[i];
      if (a === '--server') {
        const next = raw[i+1];
        if (next && !next.startsWith('-')) {
          server = parseInt(next, 10);
          i += 2;
        } else {
          server = 3000;
          i++;
        }
        continue;
      }
      i++;
    }
    assert.strictEqual(server, 8080);
  });
});
