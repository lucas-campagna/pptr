const puppeteer = require('puppeteer');
const Logger = require('./logger');
const Parser = require('./parser');
const VariableEngine = require('./variables');
const Interpreter = require('./interpreter');

class Runner {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      slowMo: options.slowMo || 0,
      timeout: options.timeout || 30000,
      logPath: options.logPath,
      vars: options.vars || {},
      ...options,
    };
  }

  async run(scriptPath) {
    const parser = new Parser();
    const script = parser.parseFile(scriptPath);

    const meta = script.meta || {};
    const logPath = this.options.logPath || meta.logs;

    const logger = new Logger(logPath);
    logger.info('Initializing Puppeteer');

    const browserArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
    if (meta.headless === false) {
      this.options.headless = false;
    }

    const browser = await puppeteer.launch({
      headless: this.options.headless,
      slowMo: meta.slowMo || this.options.slowMo,
      args: browserArgs,
    });

    let result;
    try {
      const vars = new VariableEngine();
      vars.set('env', process.env);

      if (script.vars) {
        Object.entries(script.vars).forEach(([key, value]) => {
          if (typeof value === 'string' && value.startsWith('${env.')) {
            const envVar = value.match(/\$\{env\.([^}]+)\}/)?.[1];
            if (envVar) {
              vars.set(key, process.env[envVar] || '');
            }
          } else {
            vars.set(key, value);
          }
        });
      }

      if (this.options.vars && Object.keys(this.options.vars).length > 0) {
        Object.entries(this.options.vars).forEach(([key, value]) => {
          vars.set(key, value);
        });
      }

      const interpreter = new Interpreter(browser, {
        logger,
        vars,
        logPath,
      });

      result = await interpreter.run(script);
    } finally {
      await browser.close();
      logger.info('Browser closed');
    }

    return result;
  }

  async runFromString(content) {
    const parser = new Parser();
    const script = parser.parse(content);

    const meta = script.meta || {};
    const logPath = this.options.logPath || meta.logs;

    const logger = new Logger(logPath);
    logger.info('Initializing Puppeteer');

    const browserArgs = ['--no-sandbox', '--disable-setuid-sandbox'];

    const browser = await puppeteer.launch({
      headless: this.options.headless,
      slowMo: meta.slowMo || this.options.slowMo,
      args: browserArgs,
    });

    let result;
    try {
      const vars = new VariableEngine();
      vars.set('env', process.env);

      if (script.vars) {
        Object.entries(script.vars).forEach(([key, value]) => {
          if (typeof value === 'string' && value.startsWith('${env.')) {
            const envVar = value.match(/\$\{env\.([^}]+)\}/)?.[1];
            if (envVar) {
              vars.set(key, process.env[envVar] || '');
            }
          } else {
            vars.set(key, value);
          }
        });
      }

      if (this.options.vars && Object.keys(this.options.vars).length > 0) {
        Object.entries(this.options.vars).forEach(([key, value]) => {
          vars.set(key, value);
        });
      }

      const interpreter = new Interpreter(browser, {
        logger,
        vars,
        logPath,
      });

      result = await interpreter.run(script);
    } finally {
      await browser.close();
      logger.info('Browser closed');
    }

    return result;
  }
}

module.exports = Runner;