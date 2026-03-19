const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
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
      version: options.version || '1.0.0',
      ...options,
    };
  }

  getVersion() {
    return this.options.version || '1.0.0';
  }

  getDepsDir() {
    return `/tmp/pptr-${this.getVersion()}`;
  }

  getChromeDir() {
    return path.join(this.getDepsDir(), 'chrome');
  }

  async ensureDependencies(logger) {
    const depsDir = this.getDepsDir();
    const chromeDir = this.getChromeDir();

    if (fs.existsSync(chromeDir)) {
      logger.info(`Using cached dependencies from ${depsDir}`);
      return chromeDir;
    }

    try {
      logger.info(`Downloading dependencies for v${this.getVersion()}...`);

      fs.mkdirSync(depsDir, { recursive: true });

      const tarball = path.join(depsDir, 'deps.tar.gz');
      const url = `https://github.com/lucas-campagna/pptr/releases/download/v${this.getVersion()}/deps.tar.gz`;

      await this.downloadWithProgress(url, tarball, logger);

      logger.info('Extracting dependencies...');
      await this.extractTarGz(tarball, depsDir, logger);

      try {
        fs.unlinkSync(tarball);
      } catch (e) {}

      logger.info('Dependencies ready');
      return chromeDir;
    } catch (e) {
      logger.info(`Could not download deps: ${e.message}`);
      logger.info('Trying to use local Chrome...');
      
      const localChrome = this.findLocalChrome();
      if (localChrome) {
        logger.info(`Using local Chrome: ${localChrome}`);
        return path.dirname(localChrome);
      }
      
      throw new Error('No Chrome available. Please download dependencies from GitHub releases.');
    }
  }

  findLocalChrome() {
    const possiblePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/home/pptruser/chrome/linux-*/chrome-linux*/chrome',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
    ];

    const { execSync } = require('child_process');
    
    for (const pattern of possiblePaths) {
      if (!pattern) continue;
      
      if (pattern.includes('*')) {
        try {
          const result = execSync(`ls -d ${pattern} 2>/dev/null | head -1`, { encoding: 'utf8' }).trim();
          if (result && fs.existsSync(result)) {
            return result;
          }
        } catch (e) {}
      } else if (fs.existsSync(pattern)) {
        return pattern;
      }
    }

    try {
      const result = execSync('which chromium chromium-browser google-chrome 2>/dev/null | head -1', { encoding: 'utf8' }).trim();
      if (result && fs.existsSync(result)) {
        return result;
      }
    } catch (e) {}

    return null;
  }

  async downloadWithProgress(url, dest, logger) {
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const request = client.get(urlObj, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          const redirectUrl = response.headers.location;
          logger.info(`Following redirect to ${redirectUrl}`);
          return this.downloadWithProgress(redirectUrl, dest, logger).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download: ${response.statusCode}`));
        }

        const total = parseInt(response.headers['content-length'], 10);
        let downloaded = 0;

        const file = fs.createWriteStream(dest);

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const percent = ((downloaded / total) * 100).toFixed(1);
            process.stdout.write(`\rDownloading... ${percent}%`);
          }
        });

        file.on('finish', () => {
          process.stdout.write('\n');
          resolve();
        });

        file.on('error', reject);
        response.on('error', reject);

        response.pipe(file);
      });

      request.on('error', reject);
    });
  }

  async extractTarGz(tarball, dest) {
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-xzf', tarball, '-C', dest]);
      tar.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`tar exited with code ${code}`));
      });
      tar.on('error', reject);
    });
  }

  async run(scriptPath) {
    const parser = new Parser();
    const script = parser.parseFile(scriptPath);

    const meta = script.meta || {};
    const logPath = this.options.logPath || meta.logs;

    const logger = new Logger(logPath);
    logger.info('Initializing Puppeteer');

    const chromeDir = await this.ensureDependencies(logger);

    const browserArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-software-rasterizer',
      '--disable-dev-shm-usage',
    ];

    if (meta.headless === false) {
      this.options.headless = false;
    } else {
      browserArgs.push('--headless=new');
    }

    const launchOptions = {
      headless: this.options.headless,
      slowMo: meta.slowMo || this.options.slowMo,
      args: browserArgs,
      executablePath: path.join(chromeDir, 'chrome'),
    };

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

    const chromeDir = await this.ensureDependencies(logger);

    const browserArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-software-rasterizer',
      '--disable-dev-shm-usage',
    ];

    if (meta.headless === false) {
      this.options.headless = false;
    } else {
      browserArgs.push('--headless=new');
    }

    const launchOptions = {
      headless: this.options.headless,
      slowMo: meta.slowMo || this.options.slowMo,
      args: browserArgs,
      executablePath: path.join(chromeDir, 'chrome'),
    };

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