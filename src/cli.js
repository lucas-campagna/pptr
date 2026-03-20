#!/usr/bin/env node

const path = require('path');
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

const program = new Command();

program
  .name('pptr')
  .version(version)
  .argument('<script>', 'path to YAML script file')
  .option('--headless', 'run in headless mode (default)', true)
  .option('--no-headless', 'run in visible browser')
  .option('-d, --debug', 'enable debug level logging', false)
  .option('--log <path>', 'path to log file')
  .option('-v, --var <VAR=VALUE>', 'override variable (can be used multiple times)', collectVars, [])
  .description('YAML-based Puppeteer automation script runner')
  .action((scriptPath, options) => {
    const resolvedPath = path.resolve(scriptPath);
    const vars = {};
    if (options.var) {
      for (const { key, value } of options.var) {
        vars[key] = value;
      }
    }

    const runnerOptions = {
      headless: options.headless,
      logPath: options.log || null,
      debug: options.debug || false,
      vars,
      version,
    };

    const runner = new Runner(runnerOptions);

    runner.run(resolvedPath)
      .then((result) => {
        console.log('Script completed successfully');
        if (result && Object.keys(result).length > 0) {
          console.log('Extracted data:', result);
        }
        process.exit(0);
      })
      .catch((err) => {
        console.error('Script failed:', err.message);
        process.exit(1);
      });
  });

program.parse(process.argv);

if (process.argv.length < 3) {
  program.help();
}
