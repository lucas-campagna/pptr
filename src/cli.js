#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const Runner = require('./runner');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: pptr <script.yaml> [options]');
  console.error('');
  console.error('Options:');
  console.error('  --headless         Run in headless mode (default: true)');
  console.error('  --no-headless      Run in visible browser');
  console.error('  --log <path>       Path to log file');
  console.error('  --var <VAR=VALUE>  Override variable (can use multiple times)');
  console.error('  -v <VAR=VALUE>     Override variable (shorthand)');
  process.exit(1);
}

const version = process.env.PPTR_VERSION || require('../package.json').version || '1.0.0';

const scriptPath = path.resolve(args[0]);
const options = {
  headless: true,
  logPath: null,
  vars: {},
  version: version,
};

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--no-headless') {
    options.headless = false;
  } else if (args[i] === '--headless') {
    options.headless = true;
  } else if (args[i] === '--log' && args[i + 1]) {
    options.logPath = args[++i];
  } else if (args[i] === '--var' && args[i + 1]) {
    parseVar(args[++i], options.vars);
  } else if (args[i].startsWith('-v') && args[i] !== '-v') {
    parseVar(args[i].substring(2), options.vars);
  } else if (args[i] === '-v' && args[i + 1]) {
    parseVar(args[++i], options.vars);
  } else if (args[i].includes('=') && !args[i].startsWith('--')) {
    parseVar(args[i], options.vars);
  }
}

function parseVar(arg, vars) {
  const match = arg.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1];
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
}

const runner = new Runner(options);

runner.run(scriptPath)
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