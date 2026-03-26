// Compatibility shim: re-export core library from libs/pptr-core so existing
// top-level imports (require('../src/...')) keep working after monorepo split.
module.exports = require('../libs/pptr-core/src');
