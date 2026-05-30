let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
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
        models: {},
        actions: this.normalizeActions(doc),
        tabs: [],
        subcommands: {},
        routes: {},
      };
    }

    this.functions = this.normalizeFunctions(doc.functions || {});
    const modelsConfig = this.normalizeModelsConfig(doc.models || {});

    const script = {
      meta: doc.meta || {},
      vars: doc.vars || {},
      open: doc.open || null,
      functions: this.functions,
      models: modelsConfig,
      actions: this.normalizeActions(doc.actions || [], modelsConfig),
      tabs: this.normalizeTabs(doc.tabs || [], modelsConfig),
      subcommands: this.normalizeSubcommands(doc.subcommands || {}, modelsConfig),
      routes: this.normalizeRoutes(doc.routes || {}, modelsConfig),
    };

    return script;
  }

  normalizeSubcommands(subcommands, modelsConfig = {}) {
    if (typeof subcommands !== 'object' || subcommands === null) {
      return {};
    }

    const result = {};
    for (const [name, subDoc] of Object.entries(subcommands)) {
      result[name] = {
        meta: subDoc.meta || {},
        vars: subDoc.vars || {},
        open: subDoc.open || null,
        functions: this.normalizeFunctions(subDoc.functions || {}, modelsConfig),
        models: this.normalizeModelsConfig(subDoc.models || {}),
        actions: this.normalizeActions(subDoc.actions || [], modelsConfig),
        tabs: this.normalizeTabs(subDoc.tabs || [], modelsConfig),
        subcommands: this.normalizeSubcommands(subDoc.subcommands || {}, modelsConfig),
      };
    }

    return result;
  }

  normalizeActions(actions, modelsConfig = {}) {
    if (actions && typeof actions === 'object' && Array.isArray(actions._lastArray)) {
      const arr = actions._lastArray.map(item => {
        if (typeof item !== 'string') return item;
        const s = item.trim();
        const idx = s.indexOf(':');
        if (idx !== -1) {
          const key = s.slice(0, idx).trim();
          const val = s.slice(idx + 1).trim();
          if (val === '') return { [key]: {} };
          return { [key]: val };
        }
        return s;
      });
      return arr.map(action => this.normalizeAction(action, modelsConfig));
    }

    if (!Array.isArray(actions)) {
      return [];
    }

    return actions.map(action => this.normalizeAction(action, modelsConfig));
  }

  normalizeAction(action, modelsConfig = {}) {
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

        case 'run':
          return { type: 'run', code: value };

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
          return this.normalizeIf(value, modelsConfig);

        case 'for':
          return this.normalizeFor(value, modelsConfig);

        case 'repeat':
          return this.normalizeRepeat(value, modelsConfig);

        case 'parallel':
          return { type: 'parallel', branches: value.map(b => ({ actions: this.normalizeActions(b.actions || [], modelsConfig) })) };

        case 'retry':
          return this.normalizeRetry(value, modelsConfig);

        case 'try':
          return this.normalizeTry(value, modelsConfig);

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
            actions: this.normalizeActions(value.actions || [], modelsConfig),
          };

        case 'js':
          return { type: 'js', code: typeof value === 'string' ? value : value.code };

        case 'node':
          return { type: 'node', code: typeof value === 'string' ? value : value.code };

        case 'shell':
          return { type: 'shell', command: typeof value === 'string' ? value : value.command };

        case 'curl':
          if (typeof value === 'string') {
            return { type: 'curl', url: value };
          }
          return { type: 'curl', ...value };

        case 'choice':
          if (typeof value === 'string') {
            return { type: 'choice', prompt: value };
          }
          return {
            type: 'choice',
            prompt: value.prompt || 'Select an option:',
            options: value.options || [],
            var: value.var || '$result',
          };

        case 'ask':
          return this.normalizeAskAction(value, modelsConfig);

        default:
          if (this.functions && this.functions[type]) {
            return {
              type: 'func',
              name: type,
              args: typeof value === 'object' && value !== null ? value : {},
            };
          }
          if (modelsConfig && modelsConfig[type]) {
            return this.normalizeModelAction(type, value, modelsConfig);
          }
          return { type, value };
      }
    }
    return action;
  }

  normalizeAskAction(value, modelsConfig) {
    if (typeof value === 'string') {
      return { type: 'ask', prompt: value };
    }
    if (typeof value === 'object') {
      return {
        type: 'ask',
        prompt: value.prompt || '',
        model: value.model || null,
        temperature: value.temperature,
        max_tokens: value.max_tokens,
        context: this.normalizeContext(value.context),
        continue: value.continue,
        save: value.save || '$result',
      };
    }
    return { type: 'ask', prompt: String(value) };
  }

  normalizeModelAction(modelName, value, modelsConfig) {
    if (typeof value === 'string') {
      return { type: 'model', name: modelName, prompt: value };
    }
    if (typeof value === 'object') {
      return {
        type: 'model',
        name: modelName,
        prompt: value.prompt || '',
        model: value.model || null,
        temperature: value.temperature,
        max_tokens: value.max_tokens,
        context: this.normalizeContext(value.context),
        continue: value.continue,
        save: value.save || '$result',
      };
    }
    return { type: 'model', name: modelName, prompt: String(value) };
  }

  normalizeIf(value, modelsConfig = {}) {
    const result = { type: 'if' };
    
    if (value.selector) {
      result.selector = value.selector;
      result.visible = value.visible;
    } else if (value.condition) {
      result.condition = value.condition;
    }
    
    result.then = this.normalizeActions(value.then || [], modelsConfig);
    result.else = this.normalizeActions(value.else || [], modelsConfig);
    
    return result;
  }

  normalizeFor(value, modelsConfig = {}) {
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
    
    result.actions = this.normalizeActions(value.actions || [], modelsConfig);
    
    return result;
  }

  normalizeRepeat(value, modelsConfig = {}) {
    const result = { type: 'repeat' };
    
    if (typeof value === 'number') {
      result.times = value;
      result.actions = [];
    } else {
      result.times = value.times || 1;
      result.delay = value.delay;
      result.actions = this.normalizeActions(value.actions || [], modelsConfig);
    }
    
    return result;
  }

  normalizeRetry(value, modelsConfig = {}) {
    return {
      type: 'retry',
      times: value.times || 3,
      delay: value.delay || 1000,
      backoff: value.backoff,
      action: this.normalizeActions(value.action || [], modelsConfig),
    };
  }

  normalizeTry(value, modelsConfig = {}) {
    return {
      type: 'try',
      timeout: value.timeout,
      action: this.normalizeActions(value.action || [], modelsConfig),
      catch: this.normalizeActions(value.catch || [], modelsConfig),
    };
  }

  normalizeFunctions(functions, modelsConfig = {}) {
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
        actions: this.normalizeActions(def.actions || [], modelsConfig),
      };
    }

    return result;
  }

  normalizeModelsConfig(models) {
    if (typeof models !== 'object' || models === null) {
      return {};
    }

    const result = {};
    for (const [name, config] of Object.entries(models)) {
      if (typeof config === 'string') {
        result[name] = { model: config };
        continue;
      }
      if (typeof config !== 'object' || config === null) {
        continue;
      }
      result[name] = {
        model: config.model || name,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        seed: config.seed,
        response_format: config.response_format || 'text',
        tools: config.tools || [],
        context: this.normalizeContext(config.context),
      };
    }

    return result;
  }

  normalizeContext(context) {
    if (!context) return [];
    if (!Array.isArray(context)) return [];

    return context.map(msg => {
      if (typeof msg !== 'object' || msg === null) return null;
      const keys = Object.keys(msg);
      if (keys.length !== 1) return null;
      const role = keys[0];
      const content = msg[role];
      if (typeof content !== 'string') return null;
      return { role, content };
    }).filter(Boolean);
  }

  normalizeTabs(tabs, modelsConfig = {}) {
    if (!Array.isArray(tabs)) {
      return [];
    }

    return tabs.map(tab => ({
      open: tab.open || tab.url,
      actions: this.normalizeActions(tab.actions || [], modelsConfig),
    }));
  }

  normalizeRoutes(routes, modelsConfig = {}) {
    if (typeof routes !== 'object' || routes === null || Array.isArray(routes)) {
      return {};
    }

    const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const result = {};

    for (const [path, def] of Object.entries(routes)) {
      if (typeof def !== 'object' || def === null) {
        continue;
      }

      const normalizedPath = path.startsWith('/') ? path : '/' + path;

      for (const method of HTTP_METHODS) {
        if (def[method]) {
          const actions = Array.isArray(def[method]) ? def[method] : [def[method]];
          result[`${normalizedPath}:${method}`] = {
            method,
            path: normalizedPath,
            actions: this.normalizeActions(actions.flat(), modelsConfig),
            timeout: def.timeout || null,
            headers: def.headers || null,
          };
        }
      }
    }

    return result;
  }
}

module.exports = Parser;
