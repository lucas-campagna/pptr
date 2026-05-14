// Minimal puppeteer shim for test environments where puppeteer isn't installed.
// Provides a very small subset used by unit tests: a `launch` that returns
// an object with `newPage` and `close` stubs. This is only to keep unit
// tests fast and avoid installing the heavy real puppeteer dependency during
// migration; replace/remove when running in real environments.
class Page {
  constructor() {
    this._closed = false;
  }
  async goto() {}
  async waitForSelector() {}
  async $(selector) { return null; }
  async $$(selector) { return []; }
  async screenshot() {}
  async pdf() {}
  async close() { this._closed = true; }
  async evaluate() { return null; }
  async keyboard() { return { press: async () => {} }; }
}

class Browser {
  async newPage() { return new Page(); }
  async close() {}
  on() {}
}

module.exports = {
  launch: async () => new Browser(),
};
