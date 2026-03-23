#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { Command } = require('commander');
const Runner = require('./runner');

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

function compile(scriptPath, options) {
  let yamlContent;

  if (options.execute) {
    yamlContent = options.execute;
  } else {
    const resolvedPath = path.resolve(scriptPath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: Script file not found: ${resolvedPath}`);
      process.exit(1);
    }
    yamlContent = fs.readFileSync(resolvedPath, 'utf-8');
  }

  const outputPath = path.resolve(options.output);

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

  const escapedYaml = escapeShell(yamlContent);

  const shellScript = `#!/usr/bin/env bash
set -e

if ! command -v pptr &> /dev/null; then
    echo "Error: 'pptr' not found in PATH"
    echo "Make sure pptr is installed and available in your PATH"
    exit 1
fi

exec pptr -e '${escapedYaml}' ${varArgs} ${defaultArgs} "$@"
`;

  fs.writeFileSync(outputPath, shellScript);
  fs.chmodSync(outputPath, '755');
  console.log(`Compiled successfully: ${outputPath}`);
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
  .option('-o, --output <path>', 'compile script to standalone shell script')
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
      compile(effectiveScriptPath, options);
      return;
    }

    const runOptions = {
      headless: options.headless,
      logPath: options.log || null,
      debug: options.debug || false,
      vars: {},
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
