#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
let Command;
try {
  ({ Command } = require('commander'));
} catch (e) {
  // Minimal fallback command parser used in test environments where
  // `commander` isn't installed. It supports the small subset of flags
  // used by the test suite.
  class MinimalCommand {
    constructor() { this._action = null; this._options = []; }
    name() { return this; }
    version() { return this; }
    argument() { return this; }
    option(flag, desc, fn, defaultVal) {
      const key = flag.split(/[ ,|]+/)[0].replace(/^-+/,'');
      this._options.push({ flag, key, defaultVal });
      return this;
    }
    action(cb) { this._action = cb; return this; }
    parse(argv) {
      const raw = argv.slice(2);
      const opts = {};
      const positionals = [];
      let i = 0;
      while (i < raw.length) {
        const a = raw[i];
        if (a === '--') { positionals.push(...raw.slice(i+1)); break; }
        if (a.startsWith('-')) {
          if (a === '-e' || a === '--execute') { opts.execute = raw[i+1]; i += 2; continue; }
          if (a === '-o' || a === '--output') { opts.output = raw[i+1]; i += 2; continue; }
          if (a === '--list-browsers') { opts.listBrowsers = true; i++; continue; }
          if (a === '--no-headless') { opts.headless = false; i++; continue; }
          if (a === '--headless') { opts.headless = true; i++; continue; }
          if (a === '-d' || a === '--debug') { opts.debug = true; i++; continue; }
          if (a === '--log') { opts.log = raw[i+1]; i += 2; continue; }
          if (a === '-v' || a === '--var') { opts.var = opts.var || []; const next = raw[i+1]; opts.var.push({ key: next.split('=')[0], value: next.split('=').slice(1).join('=') }); i += 2; continue; }
          if (a === '--wrapper') { opts.wrapper = raw[i+1]; i += 2; continue; }
          if (a === '-s' || a === '--session') { opts.session = raw[i+1]; i += 2; continue; }
          if (a === '--clear-session') { opts.clearSession = true; i++; continue; }
          // unknown flag: consume next if it doesn't start with -
          if (raw[i+1] && !raw[i+1].startsWith('-')) { i += 2; } else { i++; }
        } else {
          positionals.push(a); i++;
        }
      }
      const script = positionals[0];
      const subs = positionals.slice(1);
      try { if (this._action) this._action(script, subs, opts); } catch (err) { console.error(err && err.message ? err.message : err); process.exit(1); }
    }
    help() { console.log('Usage: pptr [script] [subcommands] [options]'); process.exit(0); }
  }
  Command = MinimalCommand;
}
// Maintain compatibility with monorepo layout: prefer workspace packages but
// fall back to top-level `src` modules during tests. If the monorepo has
// `libs/pptr-core` installed, use it instead of duplicating logic here.
let Runner, Compile;
try {
  const core = require('pptr-core');
  Runner = core.Runner;
  Compile = { compileYamlString: core.compileYamlString, inlineImports: core.inlineImports };
} catch (e) {
  try {
    // local shim to monorepo library (libs/pptr-core/src)
    const core = require('./shim-core');
    Runner = core.Runner;
    Compile = { compileYamlString: core.compileYamlString, inlineImports: core.inlineImports };
  } catch (e2) {
    Runner = require('./runner');
    Compile = require('./compile');
  }
}

const version = process.env.PPTR_VERSION || require('../package.json').version || '1.0.0';

function parseVar(arg) {
  const match = arg.match(/^([^=]+)=(.*)$/);
  if (match) {
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    return { key: match[1], value };
  }
  return null;
}

function collectVars(value, previous) {
  const parsed = parseVar(value);
  if (parsed) {
    previous.push(parsed);
  }
  return previous;
}

function escapeShell(str) {
  return str.replace(/'/g, "'\\''");
}

async function compile(scriptPath, options) {
  const outputPath = path.resolve(options.output);

  const baseDir = options.execute ? process.cwd() : path.dirname(path.resolve(scriptPath || '.'));
  let finalYaml;
  try {
    if (options.execute) {
      finalYaml = await Compile.compileYamlString(options.execute, baseDir);
    } else {
      const resolvedPath = path.resolve(scriptPath);
      if (!fs.existsSync(resolvedPath)) {
        console.error(`Error: Script file not found: ${resolvedPath}`);
        process.exit(1);
      }
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      finalYaml = await Compile.compileYamlString(content, baseDir);
    }
  } catch (e) {
    console.error('Failed to compile script:', e && e.message ? e.message : e);
    process.exit(1);
  }

  const defaultVars = [];
  if (options.var) {
    for (const { key, value } of options.var) {
      defaultVars.push(`-v ${key}=${value}`);
    }
  }

  const headlessFlag = options.headless ? '' : '--no-headless';
  const debugFlag = options.debug ? '-d' : '';
  const logFlag = options.log ? `--log ${options.log}` : '';

  const defaultArgs = [headlessFlag, debugFlag, logFlag].filter(Boolean).join(' ');
  const varArgs = defaultVars.join(' ');
  // Build an args array token-wise (best-effort; keep existing behavior for spacing)
  const extraArgsArray = [];
  if (defaultVars && defaultVars.length > 0) extraArgsArray.push(...defaultVars);
  if (defaultArgs) extraArgsArray.push(...defaultArgs.split(/\s+/).filter(Boolean));

  // Decide wrapper type based on output extension or host platform
  let outPath = outputPath;
  const outExt = path.extname(outPath).toLowerCase();
  let wrapper = options && options.wrapper ? options.wrapper : 'auto';
  if (outExt === '.ps1') {
    wrapper = 'powershell';
  } else if (outExt === '.bat' || outExt === '.cmd') {
    // prefer PowerShell even for .bat/.cmd outputs because batch escaping is fragile
    wrapper = 'powershell';
  } else if (outExt === '.command') {
    wrapper = 'bash';
  } else {
    if (wrapper === 'auto') {
      if (process.platform === 'win32') {
        wrapper = 'powershell';
        if (!outExt) outPath = `${outPath}.ps1`;
      } else {
        // default to bash on macOS and Linux
        wrapper = 'bash';
        if (!outExt && process.platform === 'darwin') outPath = `${outPath}.command`;
      }
    }
  }

  // Generate platform-specific wrapper
  let wrapperContent = '';
  // choose executable name: on Windows use pptr.exe; otherwise pptr
  const exeName = (process.platform === 'win32' || wrapper === 'powershell' || outPath.toLowerCase().endsWith('.ps1')) ? 'pptr.exe' : 'pptr';
  if (wrapper === 'bash') {
    const escapedYaml = escapeShell(finalYaml);
    const argStr = extraArgsArray.join(' ');
    wrapperContent = `#!/usr/bin/env bash\nset -e\n\nif ! command -v ${exeName} &> /dev/null; then\n    echo \"Error: '${exeName}' not found in PATH\"\n    echo \"Make sure ${exeName} is installed and available in your PATH\"\n    exit 1\nfi\n\nexec ${exeName} -e '${escapedYaml}' ${argStr} \"$@\"\n`;
  } else if (wrapper === 'powershell') {
    // Build PowerShell array literal for extra args
    function psEscape(s) { return s.replace(/'/g, "''"); }
    const extraLiteral = extraArgsArray.length > 0 ? `@(${extraArgsArray.map(a => `'${psEscape(a)}'`).join(', ')})` : '@()';
    // Use a here-string for YAML so we don't need to escape it
    // If user requested a .ps1 output but used a bash wrapper previously, ensure file starts with BOM-less content and Windows EOLs.
    let yamlBlock = finalYaml;
    // Normalize newlines for PowerShell
    yamlBlock = yamlBlock.replace(/\r?\n/g, '\r\n');
    wrapperContent = `# PowerShell wrapper generated by pptr\r\n$ErrorActionPreference = 'Stop'\r\n$yaml = @'\r\n${yamlBlock}\r\n'@\r\n$extra = ${extraLiteral}\r\n$argList = @('-e', $yaml)\r\nif ($extra.Count -gt 0) { $argList += $extra }\r\n$argList += $args\r\n& '${exeName}' @argList\r\nexit $LASTEXITCODE\r\n`;
  }

  fs.writeFileSync(outPath, wrapperContent, { encoding: 'utf8' });
  try { fs.chmodSync(outPath, '755'); } catch (e) {}
  console.log(`Compiled successfully: ${outPath}`);
}

const program = new Command();

program
  .name('pptr')
  .version(version)
  .argument('[script]', 'path to YAML script file')
  .argument('[subcommands...]', 'subcommands to execute')
  .option('-e, --execute <yaml>', 'YAML content to execute directly')
  .option('--headless', 'run in headless mode (default)', true)
  .option('--no-headless', 'run in visible browser')
  .option('-d, --debug', 'enable debug level logging', false)
  .option('--log <path>', 'path to log file')
  .option('-v, --var <VAR=VALUE>', 'override variable (can be used multiple times)', collectVars, [])
  .option('-s, --session <name>', 'persist session (name or path)')
  .option('--clear-session', 'remove session directory before running')
  .option('-o, --output <path>', 'compile script to standalone shell script')
  .option('--wrapper <type>', "force wrapper (bash|powershell|auto)", 'auto')
  .option('--list-browsers', 'list all detected browser executables and exit')
  .action((scriptPath, subcommands, options) => {
    const rawArgs = process.argv.slice(2);
    let subcommandList = subcommands || [];
    let effectiveScriptPath = scriptPath;
    let yamlContent = null;

    if (options.execute) {
      yamlContent = options.execute;
      const scriptIndex = rawArgs.indexOf('-e') + 1;
      const executeIndex = rawArgs.indexOf('--execute') + 1;
      const foundIndex = scriptIndex > 0 ? scriptIndex : executeIndex;
      
      if (foundIndex > 0 && foundIndex < rawArgs.length) {
        const potentialSubcommands = [];
        for (let i = foundIndex + 1; i < rawArgs.length; i++) {
          const arg = rawArgs[i];
          if (arg.startsWith('-')) break;
          potentialSubcommands.push(arg);
        }
        if (potentialSubcommands.length > 0) {
          subcommandList = potentialSubcommands;
        }
      }
    }

    if (options.output) {
      // compile may be async now
      compile(effectiveScriptPath, options).then(() => process.exit(0));
      return;
    }

    const runOptions = {
      headless: options.headless,
      logPath: options.log || null,
      debug: options.debug || false,
      vars: {},
      session: options.session || null,
      clearSession: !!options.clearSession,
      version,
      subcommands: subcommandList,
    };

    if (options.var) {
      for (const { key, value } of options.var) {
        runOptions.vars[key] = value;
      }
    }

    const runner = new Runner(runOptions);

    const runPromise = yamlContent
      ? runner.runFromString(yamlContent)
      : runner.run(effectiveScriptPath);

    // Add support for --list-browsers option
    const listBrowsers = options.listBrowsers || false;
    if (listBrowsers) {
      try {
        const BrowserFinder = require('./browser-finder');
        const list = BrowserFinder.listBrowsers({ platform: process.platform });
        if (!list || list.length === 0) {
          console.log('No browsers found on system');
        } else {
          console.log('Browsers found:');
          for (const p of list) console.log(`  - ${p}`);
        }
        process.exit(0);
      } catch (err) {
        console.error('Failed to list browsers:', err && err.message ? err.message : err);
        process.exit(1);
      }
    }

    runPromise
      .then(() => {
        console.log('Script completed successfully');
        process.exit(0);
      })
      .catch((err) => {
        // Provide more actionable messages for browser discovery errors
        if (err && err.name === 'MultipleFoundError' && Array.isArray(err.found)) {
          console.error('Error: Multiple browser executables found:');
          for (const p of err.found) console.error(`  - ${p}`);
          console.error("Set BROWSER_PATH to the exact executable you want to use, or set AUTO_BROWSER=1 to pick the first automatically.");
          process.exit(1);
        } else if (err && err.name === 'InvalidEnvError') {
          console.error(`Error: invalid BROWSER_PATH: ${err.value}`);
          process.exit(1);
        }

        console.error('Script failed:', err && err.message ? err.message : err);
        process.exit(1);
      });
  });

// Only run the CLI if this file is executed directly. When required as a
// module (for tests) we export helper functions instead of invoking the
// command parser immediately.
if (require.main === module) {
  program.parse(process.argv);

  if (process.argv.length < 3) {
    program.help();
  }
}

// Export helpers for unit tests
module.exports = {
  parseVar,
  collectVars,
  escapeShell,
  compile,
};
