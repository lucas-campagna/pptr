// Provide compatibility for imports that require the old package name.
// Prefer the merged in-repo implementation at ../../src/libs, otherwise fall
// back to an installed pptr-core package if present.
try {
  module.exports = require('../../src/libs');
} catch (e) {
  module.exports = require('pptr-core');
}
