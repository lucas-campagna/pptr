const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
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

  findBundledChrome() {
    const exePath = process.execPath;
    const exeDir = path.dirname(exePath);
    
    const chromePaths = [
      path.join(exeDir, 'chrome', 'chrome'),
      path.join(exeDir, '..', 'chrome', 'chrome'),
      path.join(exeDir, 'chrome', 'chrome-linux64', 'chrome'),
      path.join(exeDir, 'pptr', 'chrome', 'chrome'),
    ];

    for (const chromePath of chromePaths) {
      if (fs.existsSync(chromePath)) {
        return chromePath;
      }
    }

    const possibleDirs = [
      exeDir,
      path.join(exeDir, '..'),
      path.join(exeDir, 'dist'),
      path.join(exeDir, 'release'),
    ];

    for (const dir of possibleDirs) {
      const chromeBin = path.join(dir, 'chrome', 'chrome');
      if (fs.existsSync(chromeBin)) {
        return chromeBin;
      }
      
      const chromeLinuxDir = path.join(dir, 'chrome', 'chrome-linux64');
      if (fs.existsSync(chromeLinuxDir)) {
        const chrome = path.join(chromeLinuxDir, 'chrome');
        if (fs.existsSync(chrome)) {
          return chrome;
        }
      }
    }

    return null;
  }

  setupChromeEnvironment() {
    const chromePath = this.findBundledChrome();
    if (chromePath) {
      const chromeDir = path.dirname(chromePath);
      process.env.PUPPETEER_EXECUTABLE_PATH = chromePath;
      process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
      if (process.env.LD_LIBRARY_PATH) {
        process.env.LD_LIBRARY_PATH = `${chromeDir}:${process.env.LD_LIBRARY_PATH}`;
      } else {
        process.env.LD_LIBRARY_PATH = chromeDir;
      }
      return chromePath;
    }
    return null;
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

    const launchOptions = {
      headless: this.options.headless,
      slowMo: meta.slowMo || this.options.slowMo,
      args: browserArgs,
    };

    const bundledChrome = this.setupChromeEnvironment();
    if (bundledChrome) {
      logger.info(`Using bundled Chrome: ${bundledChrome}`);
      launchOptions.executablePath = bundledChrome;
    }

    const browser = await puppeteer.launch(launchOptions);

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

    const launchOptions = {
      headless: this.options.headless,
      slowMo: meta.slowMo || this.options.slowMo,
      args: browserArgs,
    };

    const bundledChrome = this.setupChromeEnvironment();
    if (bundledChrome) {
      logger.info(`Using bundled Chrome: ${bundledChrome}`);
      launchOptions.executablePath = bundledChrome;
    }

    const browser = await puppeteer.launch(launchOptions);

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