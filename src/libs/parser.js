let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  // fall back to bundled minimal YAML implementation when js-yaml isn't
  // available in the environment (useful for test runs without installing
  // dependencies)
  yaml = require('./vendor/js-yaml');
}
const fs = require('fs');

class Parser {
  parseFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return this.parse(content);
  }

  parse(content) {
    const doc = yaml.load(content);
    return this.normalize(doc);
  }

  normalize(doc) {
    if (!doc) {
      throw new Error('Empty script');
    }

    if (doc.import && typeof doc.import !== 'object') {
      throw new Error('import section must be a mapping of alias -> path');
    }

    if (Array.isArray(doc)) {
      return {
        meta: {},
        vars: {},
        open: null,
        functions: {},
        actions: this.normalizeActions(doc),
        tabs: [],
        subcommands: {},
      };
    }

    this.functions = this.normalizeFunctions(doc.functions || {});

    const script = {
      meta: doc.meta || {},
      vars: doc.vars || {},
      open: doc.open || null,
      functions: this.functions,
      actions: this.normalizeActions(doc.actions || []),
      tabs: this.normalizeTabs(doc.tabs || []),
      subcommands: this.normalizeSubcommands(doc.subcommands || {}),
    };

    return script;
  }

  normalizeSubcommands(subcommands) {
    if (typeof subcommands !== 'object' || subcommands === null) {
      return {};
    }

    const result = {};
    for (const [name, subDoc] of Object.entries(subcommands)) {
      result[name] = {
        meta: subDoc.meta || {},
        vars: subDoc.vars || {},
        open: subDoc.open || null,
        functions: this.normalizeFunctions(subDoc.functions || {}),
        actions: this.normalizeActions(subDoc.actions || []),
        tabs: this.normalizeTabs(subDoc.tabs || []),
        subcommands: this.normalizeSubcommands(subDoc.subcommands || {}),
      };
    }

    return result;
  }

  normalizeActions(actions) {
    // Support vendor YAML loader which may return an object with a
    // `_lastArray` property containing the raw list items. Convert that
    // representation into a normalized array of actions first.
    if (actions && typeof actions === 'object' && Array.isArray(actions._lastArray)) {
      const arr = actions._lastArray.map(item => {
        if (typeof item !== 'string') return item;
        const s = item.trim();
        // If item looks like a mapping `key: value` convert to object
        const idx = s.indexOf(':');
        if (idx !== -1) {
          const key = s.slice(0, idx).trim();
          const val = s.slice(idx + 1).trim();
          // if val empty, return empty object for nested mapping
          if (val === '') return { [key]: {} };
          return { [key]: val };
        }
        // otherwise return as a simple string reference
        return s;
      });
      return arr.map(action => this.normalizeAction(action));
    }

    if (!Array.isArray(actions)) {
      return [];
    }

    return actions.map(action => this.normalizeAction(action));
  }

  normalizeAction(action) {
    if (typeof action === 'object' && action !== null) {
      const keys = Object.keys(action);
      if (keys.length !== 1) {
        return action;
      }
      const type = keys[0];
      const value = action[type];

      switch (type) {
        case 'click':
          if (typeof value === 'string') {
            return { type: 'click', selector: value };
          }
          return { type: 'click', ...value };

        case 'type':
          if (typeof value === 'object') {
            return { type: 'type', selector: value.selector, text: value.text, delay: value.delay };
          }
          return { type: 'type', selector: value };

        case 'fill':
          if (typeof value === 'object') {
            return { type: 'fill', selector: value.selector, text: value.text };
          }
          return { type: 'fill', selector: value };

        case 'wait':
          if (typeof value === 'number') {
            return { type: 'wait', timeout: value };
          }
          if (typeof value === 'string') {
            if (value === 'navigation') {
              return { type: 'wait', navigation: true };
            }
            return { type: 'wait', selector: value };
          }
          return { type: 'wait', ...value };

        case 'screenshot':
          if (typeof value === 'string') {
            return { type: 'screenshot', path: value };
          }
          return { type: 'screenshot', ...value };

        case 'log':
          if (typeof value === 'string') {
            return { type: 'log', message: value };
          }
          return { type: 'log', ...value };

        case 'open':
          return { type: 'open', url: value };

        case 'back':
          return { type: 'back' };

        case 'forward':
          return { type: 'forward' };

        case 'reload':
          return { type: 'reload' };

        case 'hover':
          return { type: 'hover', selector: typeof value === 'string' ? value : value.selector };

        case 'select':
          if (typeof value === 'object') {
            return { type: 'select', selector: value.selector, value: value.value };
          }
          return { type: 'select', selector: value };

        case 'scroll':
          if (typeof value === 'object') {
            return { type: 'scroll', ...value };
          }
          return { type: 'scroll', selector: value };

        case 'press':
          return { type: 'press', key: value };

        case 'newTab':
          if (typeof value === 'object') {
            return { type: 'newTab', ...value };
          }
          return { type: 'newTab', url: value };

        case 'switchTab':
          return { type: 'switchTab', index: value };

        case 'closeTab':
          return { type: 'closeTab' };

        case 'if':
          return this.normalizeIf(value);

        case 'for':
          return this.normalizeFor(value);

        case 'repeat':
          return this.normalizeRepeat(value);

        case 'parallel':
          return { type: 'parallel', branches: value.map(b => ({ actions: this.normalizeActions(b.actions || []) })) };

        case 'retry':
          return this.normalizeRetry(value);

        case 'try':
          return this.normalizeTry(value);

        case 'extract':
          if (typeof value === 'object') {
            return { type: 'extract', ...value };
          }
          return { type: 'extract', selector: value };

        case 'pdf':
          if (typeof value === 'string') {
            return { type: 'pdf', path: value };
          }
          return { type: 'pdf', ...value };

        case 'write':
          return { type: 'write', ...value };

        case 'break':
          if (typeof value === 'object' && value.condition) {
            return { type: 'break', condition: value.condition };
          }
          return { type: 'break' };

        case 'continue':
          if (typeof value === 'object' && value.condition) {
            return { type: 'continue', condition: value.condition };
          }
          return { type: 'continue' };

        case 'input':
          if (typeof value === 'string') {
            return { type: 'input', prompt: value };
          }
          return {
            type: 'input',
            prompt: value.prompt || '',
            var: value.var || null,
            default: value.default !== undefined ? value.default : null,
            hide: value.hide || false,
          };

        case 'fn':
          return {
            type: 'fn',
            name: value.name,
            params: value.params || {},
            actions: this.normalizeActions(value.actions || []),
          };

        default:
          if (this.functions && this.functions[type]) {
            return {
              type: 'func',
              name: type,
              args: typeof value === 'object' && value !== null ? value : {},
            };
          }
          return { type, value };
      }
    }
    return action;
  }

  normalizeIf(value) {
    const result = { type: 'if' };
    
    if (value.selector) {
      result.selector = value.selector;
      result.visible = value.visible;
    } else if (value.condition) {
      result.condition = value.condition;
    }
    
    result.then = this.normalizeActions(value.then || []);
    result.else = this.normalizeActions(value.else || []);
    
    return result;
  }

  normalizeFor(value) {
    const result = { type: 'for', as: value.as || 'item' };
    
    if (value.items) {
      result.items = value.items;
    } else if (value.selector) {
      result.selector = value.selector;
    }
    
    if (value.break) {
      result.break = typeof value.break === 'object' ? value.break : { condition: value.break };
    }
    if (value.continue) {
      result.continue = typeof value.continue === 'object' ? value.continue : { condition: value.continue };
    }
    
    result.actions = this.normalizeActions(value.actions || []);
    
    return result;
  }

  normalizeRepeat(value) {
    const result = { type: 'repeat' };
    
    if (typeof value === 'number') {
      result.times = value;
      result.actions = [];
    } else {
      result.times = value.times || 1;
      result.delay = value.delay;
      result.actions = this.normalizeActions(value.actions || []);
    }
    
    return result;
  }

  normalizeRetry(value) {
    return {
      type: 'retry',
      times: value.times || 3,
      delay: value.delay || 1000,
      backoff: value.backoff,
      action: this.normalizeActions(value.action || []),
    };
  }

  normalizeTry(value) {
    return {
      type: 'try',
      timeout: value.timeout,
      action: this.normalizeActions(value.action || []),
      catch: this.normalizeActions(value.catch || []),
    };
  }

  normalizeFunctions(functions) {
    const result = {};
    if (typeof functions !== 'object' || functions === null) {
      return result;
    }

    for (const [name, def] of Object.entries(functions)) {
      if (typeof def !== 'object' || def === null) {
        continue;
      }
      result[name] = {
        params: def.params || {},
        actions: this.normalizeActions(def.actions || []),
      };
    }

    return result;
  }

  normalizeTabs(tabs) {
    if (!Array.isArray(tabs)) {
      return [];
    }

    return tabs.map(tab => ({
      open: tab.open || tab.url,
      actions: this.normalizeActions(tab.actions || []),
    }));
  }
}

module.exports = Parser;
