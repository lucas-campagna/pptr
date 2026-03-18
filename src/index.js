const Runner = require('./runner');
const Parser = require('./parser');
const Logger = require('./logger');
const VariableEngine = require('./variables');
const Interpreter = require('./interpreter');

module.exports = {
  Runner,
  Parser,
  Logger,
  VariableEngine,
  Interpreter,
  
  async run(scriptPath, options = {}) {
    const runner = new Runner(options);
    return runner.run(scriptPath);
  },

  async runFromString(content, options = {}) {
    const runner = new Runner(options);
    return runner.runFromString(content);
  },
};