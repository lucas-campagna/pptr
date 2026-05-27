const path = require('path');
const fs = require('fs');

class CaptureReader {
  constructor(browser, options = {}) {
    this.browser = browser;
    this.captureFile = options.captureFile || null;
    this.pollingInterval = options.pollingInterval || 1000;
    this.pollingTimer = null;
    this.lastSeenCount = 0;
    this.isRecording = false;
    this.headerWritten = false;
    this.fileHandle = null;
  }

  generateFilename() {
    const now = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `pptr-capture-${timestamp}.yaml`;
  }

  async start() {
    if (!this.captureFile || this.captureFile === true) {
      this.captureFile = this.generateFilename();
    }

    const ext = path.extname(this.captureFile).toLowerCase();
    if (!ext || ext === '.yaml' || ext === '.yml') {
      this.captureFile = this.captureFile.replace(/\.(yaml|yml)$/, '') + '.yaml';
    }

    try {
      this.fileHandle = fs.openSync(this.captureFile, 'w');
      console.log(`Capturing interactions to: ${this.captureFile}`);
    } catch (e) {
      console.error(`Failed to open capture file: ${e.message}`);
      this.captureFile = path.join('/tmp', path.basename(this.captureFile));
      this.fileHandle = fs.openSync(this.captureFile, 'w');
      console.log(`Falling back to: ${this.captureFile}`);
    }

    this.isRecording = true;
    this.startPolling();
  }

  startPolling() {
    this.pollingTimer = setInterval(() => this.poll(), this.pollingInterval);
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  async poll() {
    if (!this.isRecording || !this.browser) return;

    try {
      const actions = await this.getActionsFromExtension();
      if (actions && actions.length > this.lastSeenCount) {
        const newActions = actions.slice(this.lastSeenCount);
        for (const action of newActions) {
          await this.writeAction(action);
        }
        this.lastSeenCount = actions.length;
      }
    } catch (e) {
      // Silently ignore polling errors - extension may not be fully loaded
    }
  }

  async getActionsFromExtension() {
    const pages = await this.browser.pages();
    for (const page of pages) {
      try {
        const url = page.url();
        if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
          const result = await page.evaluate(async () => {
            if (typeof browser !== 'undefined' && browser.runtime) {
              return new Promise((resolve) => {
                browser.runtime.sendMessage({ action: 'getActions' }, (response) => {
                  if (response && response.success) {
                    resolve(response.actions || []);
                  } else {
                    resolve([]);
                  }
                });
                setTimeout(() => resolve([]), 100);
              });
            }
            return [];
          });

          if (result && result.length > 0) {
            return result;
          }
        }
      } catch (e) {}
    }
    return [];
  }

  actionToYaml(action) {
    const type = action.type;
    const timestamp = action.timestamp ? new Date(action.timestamp).toISOString() : '';

    switch (type) {
      case 'click':
        return `    - click: ${this.quoteSelector(action.selector)}`;

      case 'type':
        return `    - type: { selector: ${this.quoteSelector(action.selector)}, text: ${this.quoteText(action.value)} }`;

      case 'hover':
        return `    - hover: ${this.quoteSelector(action.selector)}`;

      case 'select':
        return `    - select: { selector: ${this.quoteSelector(action.selector)}, value: ${this.quoteText(action.value)} }`;

      case 'scroll':
        return `    - scroll: { x: ${action.x}, y: ${action.y} }`;

      case 'open':
        return `    - open: ${this.quoteText(action.url)}`;

      default:
        return null;
    }
  }

  quoteSelector(selector) {
    if (!selector) return '""';
    if (/^[a-zA-Z][\w-]*$/.test(selector) && !selector.includes('.')) {
      return selector;
    }
    if (selector.includes('"') || selector.includes("'") || selector.includes('\n')) {
      return `"${selector.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }
    return `"${selector}"`;
  }

  quoteText(text) {
    if (!text) return '""';
    const str = String(text);
    if (str.includes('"') || str.includes("'") || str.includes(':') || str.includes('\n') || str.includes('#')) {
      return `"${str.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }
    return `"${str}"`;
  }

  async writeAction(action) {
    if (!this.fileHandle) return;

    const yaml = this.actionToYaml(action);
    if (!yaml) return;

    if (!this.headerWritten) {
      const now = new Date().toISOString();
      const header = `# Captured by pptr on ${now}\n# Format: pptr YAML automation script\n\nactions:\n`;
      fs.writeSync(this.fileHandle, header);
      this.headerWritten = true;
    }

    fs.writeSync(this.fileHandle, yaml + '\n');
  }

  async stop() {
    this.isRecording = false;
    this.stopPolling();

    if (this.fileHandle) {
      try {
        fs.closeSync(this.fileHandle);
      } catch (e) {}
      this.fileHandle = null;
    }

    console.log(`Capture complete: ${this.captureFile}`);
    return this.captureFile;
  }

  async finalize() {
    return this.stop();
  }
}

module.exports = CaptureReader;