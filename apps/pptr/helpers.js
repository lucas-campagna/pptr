// Forwarding shim so tests that require '../helpers' inside apps/pptr/test
// resolve to the test helpers implementation.
module.exports = require('./test/helpers');
