let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  // fall back to a tiny shim during migrations/tests where puppeteer
  // isn't installed to avoid heavy native deps.
  puppeteer = require('./vendor/puppeteer-shim');
}
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const Logger = require('./logger');
const Parser = require('./parser');
const VariableEngine = require('./variables');
const Interpreter = require('./interpreter');

class Runner {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      slowMo: options.slowMo || 0,
      timeout: options.timeout || 3000,
      logPath: options.logPath,
      debug: options.debug || false,
      vars: options.vars || {},
      version: options.version || "1.0.0",
      subcommands: options.subcommands || [],
      ...options,
    };
  }

  getVersion() {
    return this.options.version || "1.0.0";
  }

  getDepsDir() {
    return `/tmp/pptr-deps`;
  }

  getChromeDir() {
    return path.join(this.getDepsDir(), "chrome");
  }

  resolveSessionDir(session) {
    if (!session) return null;
    // If looks like a path, use it
    if (path.isAbsolute(session) || session.includes(path.sep)) {
      return path.resolve(session);
    }
    // default sessions directory under home
    return path.join(os.homedir(), '.pptr', 'sessions', session);
  }

  async ensureDependencies(logger) {
    const depsDir = this.getDepsDir();
    const chromeDir = this.getChromeDir();

    if (fs.existsSync(chromeDir)) {
      logger.debug(`Using cached dependencies from ${depsDir}`);
      return chromeDir;
    }

    logger.debug(`Downloading dependencies for v${this.getVersion()}...`);

    fs.mkdirSync(depsDir, { recursive: true });

    const tarball = path.join(depsDir, "deps.tar.gz");
    const url = `https://github.com/lucas-campagna/pptr/releases/download/base-deps/deps.tar.gz`;

    await this.downloadWithProgress(url, tarball, logger);

    logger.debug("Extracting dependencies...");
    await this.extractTarGz(tarball, depsDir, logger);

    try {
      fs.unlinkSync(tarball);
    } catch (e) {}

    logger.debug("Dependencies ready");
    return chromeDir;
  }

  async downloadWithProgress(url, dest, logger) {
    const https = require("https");
    const http = require("http");
    const { URL } = require("url");

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === "https:" ? https : http;

      const request = client.get(urlObj, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          const redirectUrl = response.headers.location;
          logger.debug(`Following redirect to ${redirectUrl}`);
          return this.downloadWithProgress(redirectUrl, dest, logger)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          return reject(
            new Error(`Failed to download: ${response.statusCode}`),
          );
        }

        const total = parseInt(response.headers["content-length"], 10);
        let downloaded = 0;

        const file = fs.createWriteStream(dest);

        response.on("data", (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const percent = ((downloaded / total) * 100).toFixed(1);
            process.stdout.write(`\rDownloading... ${percent}%`);
          }
        });

        file.on("finish", () => {
          process.stdout.write("\n");
          resolve();
        });

        file.on("error", reject);
        response.on("error", reject);

        response.pipe(file);
      });

      request.on("error", reject);
    });
  }

  async extractTarGz(tarball, dest) {
    return new Promise((resolve, reject) => {
      const tar = spawn("tar", ["-xzf", tarball, "-C", dest]);
      tar.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`tar exited with code ${code}`));
      });
      tar.on("error", reject);
    });
  }

  createVariableEngine(script) {
    const declaredVars = [];

    function collectVars(obj) {
      if (!obj) return;
      if (obj.vars && typeof obj.vars === "object") {
        declaredVars.push(...Object.keys(obj.vars));
      }
      if (obj.subcommands && typeof obj.subcommands === "object") {
        for (const sub of Object.values(obj.subcommands)) {
          collectVars(sub);
        }
      }
    }

    collectVars(script);

    if (this.options.vars && Object.keys(this.options.vars).length > 0) {
      declaredVars.push(...Object.keys(this.options.vars));
    }

    const vars = new VariableEngine({}, declaredVars);
    vars.set("env", process.env);

    for (const [key, value] of Object.entries(process.env)) {
      if (key.match(/^[A-Z][A-Z0-9_]*$/)) {
        vars.set(key, value);
      }
    }

    vars.setAllowUndeclared(true);

    function setVars(obj) {
      if (!obj || !obj.vars) return;
      Object.entries(obj.vars).forEach(([key, value]) => {
        if (typeof value === "string" && value.startsWith("${env.")) {
          const envVar = value.match(/\${env\.([^}]+)\}/)?.[1];
          if (envVar) {
            vars.set(key, process.env[envVar] || "");
          }
        } else if (!vars.vars[key]) {
          vars.set(key, value);
        }
      });
    }

    setVars(script);

    function setSubcommandVars(obj) {
      if (!obj || !obj.subcommands) return;
      for (const sub of Object.values(obj.subcommands)) {
        setVars(sub);
        setSubcommandVars(sub);
      }
    }
    setSubcommandVars(script);

    vars.setAllowUndeclared(false);

    if (this.options.vars && Object.keys(this.options.vars).length > 0) {
      Object.entries(this.options.vars).forEach(([key, value]) => {
        vars.set(key, value);
      });
    }

    return vars;
  }

  async run(scriptPath) {
    const parser = new Parser();
    const script = parser.parseFile(scriptPath);

    const meta = script.meta || {};
    const logPath = this.options.logPath || meta.logs;

    const logger = new Logger(logPath, this.options.debug);
    logger.debug("Initializing Puppeteer");

    const importsRegistry = {};
    if (script.import && typeof script.import === 'object') {
      try {
        const Importer = require('./importer');
        const baseDir = path.dirname(scriptPath);
        Object.assign(importsRegistry, await Importer.loadImports(script.import, baseDir, { logger }));
        logger.debug(`Loaded imports: ${Object.keys(importsRegistry).join(', ')}`);
      } catch (e) {
        logger.debug(`Failed to load imports: ${e.message}`);
        throw e;
      }
    }

    const browserArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-zygote",
      "--disable-gpu",
      "--ignore-certificate-errors",
    ];

    if (meta.headless === false) {
      this.options.headless = false;
    } else {
      browserArgs.push("--headless=new");
    }

    const { HTTP_PROXY, HTTPS_PROXY, http_proxy, https_proxy, ...restEnv } =
      process.env;

    const launchOptions = {
      headless: this.options.headless,
      slowMo: meta.slowMo || this.options.slowMo,
      args: browserArgs,
      env: { ...restEnv },
      dumpio: !!this.options.debug,
    };

    // Session support: if a session name/path was provided, resolve it to a
    // directory and pass it to Puppeteer as `userDataDir` so profile and
    // cookies/cache are persisted across runs. Respect the `clearSession`
    // option by removing the directory before launching.
    try {
      const sessionDir = this.resolveSessionDir(this.options.session);
      if (sessionDir) {
        if (this.options.clearSession) {
          try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (e) {}
        }
        try { fs.mkdirSync(sessionDir, { recursive: true }); } catch (e) {}
        launchOptions.userDataDir = sessionDir;
        logger.debug(`Using session directory: ${sessionDir}`);
      }
    } catch (e) {
      // Do not fail runs just because session handling couldn't be set up.
      logger.debug(`Failed to setup session dir: ${e && e.message ? e.message : e}`);
    }

    let chromeDir;
    let usedSystemBrowser = false;
    let browser;

    try {
      const BrowserFinder = require('./browser-finder');
      const systemBrowser = await BrowserFinder.findBrowser({
        platform: process.platform,
      });
      if (systemBrowser) {
        logger.debug(`Using system browser executable: ${systemBrowser}`);
        launchOptions.executablePath = systemBrowser;
        usedSystemBrowser = true;
      }
    } catch (err) {
      const BrowserFinder = require('./browser-finder');
      if (err instanceof BrowserFinder.NotFoundError) {
        logger.debug("No system browser found; will use bundled dependencies");
      } else if (err instanceof BrowserFinder.InvalidEnvError) {
        logger.debug(`Invalid BROWSER_PATH provided: ${err.value}`);
        throw err;
      } else if (err instanceof BrowserFinder.MultipleFoundError) {
        const found = err.found || [];
        if (found.length > 0) {
          logger.debug(`Multiple browser executables found: ${found.join(', ')}`);
          console.warn('Multiple browser executables found:');
          for (const p of found) console.warn(`  - ${p}`);
          console.warn(`Using the first one: ${found[0]} (set BROWSER_PATH to choose a different one)`);
          launchOptions.executablePath = found[0];
          usedSystemBrowser = true;
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    if (!launchOptions.executablePath) {
      chromeDir = await this.ensureDependencies(logger);
      launchOptions.executablePath = path.join(chromeDir, "chrome");
      launchOptions.env = {
        ...restEnv,
        LD_LIBRARY_PATH: path.join(chromeDir, "lib"),
      };
      usedSystemBrowser = false;
    }

    try {
      browser = await puppeteer.launch(launchOptions);
      const currentBundledPath = chromeDir
        ? path.join(chromeDir, "chrome")
        : path.join(this.getDepsDir(), "chrome");
      usedSystemBrowser = launchOptions.executablePath !== currentBundledPath;
    } catch (err) {
      if (launchOptions.executablePath && (!chromeDir || launchOptions.executablePath !== path.join(chromeDir, "chrome"))) {
        logger.debug(
          `System browser launch failed (${launchOptions.executablePath}), falling back to bundled deps: ${err.message}`,
        );
        chromeDir = chromeDir || (await this.ensureDependencies(logger));
        launchOptions.executablePath = path.join(chromeDir, "chrome");
        launchOptions.env = {
          ...restEnv,
          LD_LIBRARY_PATH: path.join(chromeDir, "lib"),
        };
        browser = await puppeteer.launch(launchOptions);
        usedSystemBrowser = false;
      } else {
        throw err;
      }
    }

    try {
      browser.on("disconnected", () => logger.debug("Browser disconnected"));
    } catch (e) {}

    let result;
    try {
      const vars = this.createVariableEngine(script);

      const interpreter = new Interpreter(browser, {
        logger,
        vars,
        logPath,
        debug: this.options.debug,
        subcommands: this.options.subcommands,
        imports: importsRegistry,
      });

      result = await interpreter.run(script);
    } catch (err) {
      const isTargetClosed =
        err &&
        typeof err.message === "string" &&
        err.message.includes("Target closed");
      if (usedSystemBrowser && isTargetClosed) {
        logger.debug(
          "System browser closed during run; retrying with bundled dependencies",
        );
        try {
          await browser.close();
        } catch (e) {}
        launchOptions.executablePath = bundledPath;
        browser = await puppeteer.launch(launchOptions);
        try {
          const vars2 = this.createVariableEngine(script);
          const interpreter2 = new Interpreter(browser, {
            logger,
            vars: vars2,
            logPath,
            debug: this.options.debug,
            subcommands: this.options.subcommands,
          });
          result = await interpreter2.run(script);
        } finally {
        }
      } else {
        throw err;
      }
    } finally {
      try {
        if (browser) await browser.close();
      } catch (e) {}
      logger.debug("Browser closed");
    }

    return result;
  }

  async runFromString(content) {
    const parser = new Parser();
    const script = parser.parse(content);

    const meta = script.meta || {};
    const logPath = this.options.logPath || meta.logs;

    const logger = new Logger(logPath, this.options.debug);
    logger.debug("Initializing Puppeteer");

    const browserArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-zygote",
      "--disable-gpu",
      "--ignore-certificate-errors",
    ];

    if (meta.headless === false) {
      this.options.headless = false;
    } else {
      browserArgs.push("--headless=new");
    }

    const { HTTP_PROXY, HTTPS_PROXY, http_proxy, https_proxy, ...restEnv } =
      process.env;

    const launchOptions = {
      headless: this.options.headless,
      slowMo: meta.slowMo || this.options.slowMo,
      args: browserArgs,
      env: { ...restEnv },
      dumpio: !!this.options.debug,
    };

    let chromeDir;
    let usedSystemBrowser = false;
    let browser;

    try {
      const BrowserFinder = require('./browser-finder');
      const systemBrowser = await BrowserFinder.findBrowser({
        platform: process.platform,
      });
      if (systemBrowser) {
        logger.debug(`Using system browser executable: ${systemBrowser}`);
        launchOptions.executablePath = systemBrowser;
        usedSystemBrowser = true;
      }
    } catch (err) {
      const BrowserFinder = require('./browser-finder');
      if (err instanceof BrowserFinder.NotFoundError) {
        logger.debug("No system browser found; will use bundled dependencies");
      } else if (err instanceof BrowserFinder.InvalidEnvError) {
        logger.debug(`Invalid BROWSER_PATH provided: ${err.value}`);
        throw err;
      } else if (err instanceof BrowserFinder.MultipleFoundError) {
        const found = err.found || [];
        if (found.length > 0) {
          logger.debug(`Multiple browser executables found: ${found.join(', ')}`);
          console.warn('Multiple browser executables found:');
          for (const p of found) console.warn(`  - ${p}`);
          console.warn(`Using the first one: ${found[0]} (set BROWSER_PATH to choose a different one)`);
          launchOptions.executablePath = found[0];
          usedSystemBrowser = true;
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    if (!launchOptions.executablePath) {
      chromeDir = await this.ensureDependencies(logger);
      launchOptions.executablePath = path.join(chromeDir, "chrome");
      launchOptions.env = {
        ...restEnv,
        LD_LIBRARY_PATH: path.join(chromeDir, "lib"),
      };
      usedSystemBrowser = false;
    }

    try {
      browser = await puppeteer.launch(launchOptions);
    } catch (err) {
      if (launchOptions.executablePath && (!chromeDir || launchOptions.executablePath !== path.join(chromeDir, "chrome"))) {
        logger.debug(
          `System browser launch failed (${launchOptions.executablePath}), falling back to bundled deps: ${err.message}`,
        );
        chromeDir = chromeDir || (await this.ensureDependencies(logger));
        launchOptions.executablePath = path.join(chromeDir, "chrome");
        launchOptions.env = {
          ...restEnv,
          LD_LIBRARY_PATH: path.join(chromeDir, "lib"),
        };
        browser = await puppeteer.launch(launchOptions);
        usedSystemBrowser = false;
      } else {
        throw err;
      }
    }

    let result;
    try {
      const vars = this.createVariableEngine(script);

      const interpreter = new Interpreter(browser, {
        logger,
        vars,
        logPath,
        debug: this.options.debug,
        subcommands: this.options.subcommands,
      });

      result = await interpreter.run(script);
    } finally {
      await browser.close();
      logger.debug("Browser closed");
    }

    return result;
  }
}

module.exports = Runner;
