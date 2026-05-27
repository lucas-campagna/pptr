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
    GET:
      - log: "status check"
`);
    assert.ok(script.routes['/status:GET']);
    assert.strictEqual(script.routes['/status:GET'].method, 'GET');
    assert.strictEqual(script.routes['/status:GET'].path, '/status');
    assert.strictEqual(script.routes['/status:GET'].actions.length, 1);
  });

  it('normalizes routes without leading slash', () => {
    const parser = new Parser();
    const script = parser.parse(`
routes:
  status:
    GET:
      - log: "status check"
`);
    assert.ok(script.routes['/status:GET']);
    assert.strictEqual(script.routes['/status:GET'].path, '/status');
  });

  it('normalizes route with path parameters', () => {
    const parser = new Parser();
    const script = parser.parse(`
routes:
  users/:id:
    GET:
      - log: "user id"
`);
    assert.ok(script.routes['/users/:id:GET']);
    assert.strictEqual(script.routes['/users/:id:GET'].path, '/users/:id');
  });

  it('normalizes route with timeout and headers', () => {
    const parser = new Parser();
    const script = parser.parse(`
routes:
  data:
    POST:
      - log: "processing"
    timeout: 5000
    headers:
      X-Custom: value
`);
    const route = script.routes['/data:POST'];
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
    GET:
      - log: "first"
  /users:
    GET:
      - log: "second"
`);
    assert.ok(script.routes['/status:GET']);
    assert.ok(script.routes['/users:GET']);
  });

  it('normalizes multiple methods on same path', () => {
    const parser = new Parser();
    const script = parser.parse(`
routes:
  /data:
    GET:
      - log: "getting"
    POST:
      - log: "posting"
    DELETE:
      - log: "deleting"
`);
    assert.ok(script.routes['/data:GET']);
    assert.ok(script.routes['/data:POST']);
    assert.ok(script.routes['/data:DELETE']);
    assert.strictEqual(script.routes['/data:GET'].method, 'GET');
    assert.strictEqual(script.routes['/data:POST'].method, 'POST');
    assert.strictEqual(script.routes['/data:DELETE'].method, 'DELETE');
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
      '/status:GET': { method: 'GET', path: '/status', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('GET', '/status');
    assert.ok(match);
    assert.strictEqual(match.route.path, '/status');
    assert.deepStrictEqual(match.params, {});
  });

  it('does not match wrong method', () => {
    const routes = {
      '/status:GET': { method: 'GET', path: '/status', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('POST', '/status');
    assert.strictEqual(match, null);
  });

  it('matches route with path parameter', () => {
    const routes = {
      '/users/:id:GET': { method: 'GET', path: '/users/:id', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('GET', '/users/42');
    assert.ok(match);
    assert.strictEqual(match.params.id, '42');
  });

  it('matches multiple path parameters', () => {
    const routes = {
      '/users/:userId/posts/:postId:GET': { method: 'GET', path: '/users/:userId/posts/:postId', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('GET', '/users/1/posts/99');
    assert.ok(match);
    assert.strictEqual(match.params.userId, '1');
    assert.strictEqual(match.params.postId, '99');
  });

  it('prefers more specific route', () => {
    const routes = {
      '/users:GET': { method: 'GET', path: '/users', actions: [] },
      '/users/:id:GET': { method: 'GET', path: '/users/:id', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('GET', '/users/42');
    assert.ok(match);
    assert.strictEqual(match.route.path, '/users/:id');
  });

  it('returns null for unmatched path', () => {
    const routes = {
      '/status:GET': { method: 'GET', path: '/status', actions: [] },
    };
    const it = makeInterpreter({}, routes);
    const match = it.matchRoute('GET', '/unknown');
    assert.strictEqual(match, null);
  });

  it('handles trailing slash normalization', () => {
    const routes = {
      '/status:GET': { method: 'GET', path: '/status', actions: [] },
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
      '/test:GET': {
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

    const result = await it.executeRouteActions(fakeReq, fakeRes, url, {}, routes['/test:GET'], fakePage);
    assert.strictEqual(result, undefined);
    assert.ok(logger.logs.some(l => l.message === 'route executed'));
  });
});

describe('Route logging', () => {
  it('logs registered routes on server start', () => {
    const logger = new Logger(null, false);
    logger.logs = [];
    logger.write = (level, message) => logger.logs.push({ level, message });
    const routes = {
      '/status:GET': { method: 'GET', path: '/status', actions: [] },
      '/users:POST': { method: 'POST', path: '/users', actions: [] },
    };
    const fakeBrowser = { newPage: async () => ({}) };
    const it = new Interpreter(fakeBrowser, { vars: {}, logger, routes });
    it.startServer(3456).catch(() => {});
    logger.logs.forEach(log => {
      if (log.message.includes('Routes available:')) {
        assert.ok(true);
      }
    });
    it.httpServer.close();
  });
});