const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logPath, debug = false) {
    this.logPath = logPath;
    this._debug = debug;
    if (logPath) {
      const dir = path.dirname(logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  formatMessage(level, message) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    return `[${timestamp}] ${level.padEnd(5)} ${message}`;
  }

  write(level, message) {
    if (level === 'DEBUG' && !this._debug) {
      return;
    }
    const formatted = this.formatMessage(level, message);
    console.log(formatted);
    if (this.logPath) {
      fs.appendFileSync(this.logPath, formatted + '\n');
    }
  }

  info(message) {
    this.write('INFO', message);
  }

  warn(message) {
    this.write('WARN', message);
  }

  error(message) {
    this.write('ERROR', message);
  }

  debug(message) {
    this.write('DEBUG', message);
  }
}

module.exports = Logger;