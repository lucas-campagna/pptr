class Interpreter {
  constructor(browser, opts = {}) {
    this.browser = browser;
    this.logger = opts.logger || console;
    this.vars = opts.vars;
    this.logPath = opts.logPath;
    this.debug = opts.debug;
    this.subcommands = opts.subcommands || [];
    this.imports = opts.imports || {};
  }

  async run(script) {
    // Minimal stub to allow tests that only check wiring
    this.logger.debug && this.logger.debug('Interpreter run called');
    return true;
  }
}

module.exports = Interpreter;
