const Logger = require('./logger');
const VariableEngine = require('./variables');

class Interpreter {
  constructor(browser, options = {}) {
    this.browser = browser;
    if (options.vars instanceof VariableEngine) {
      this.vars = options.vars;
    } else {
      this.vars = new VariableEngine(options.vars || {});
    }
    this.logger = options.logger || new Logger(options.logPath, options.debug || false);
    this.pages = [];
    this.currentIndex = 0;
    this.functions = {};
    this.closureScopes = [{}];
    this.scopeNewVars = [{}];
    this.scopeDepth = 0;
    this.closureDepth = 0;
    this.subcommands = options.subcommands || [];
    this.imports = options.imports || {};
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isXPath(selector) {
    return typeof selector === 'string' && selector.startsWith('/');
  }

  toXPathSelector(selector) {
    return `xpath/${selector}`;
  }

  async waitForElement(page, selector, options = {}) {
    if (this.isXPath(selector)) {
      try {
        const locator = page.locator(this.toXPathSelector(selector));
        if (locator.waitFor) {
          await locator.waitFor({ timeout: options.timeout || 3000 });
        } else {
          await page.waitForSelector(this.toXPathSelector(selector), options);
        }
      } catch (e) {
        await page.waitForSelector(this.toXPathSelector(selector), options);
      }
    } else {
      await page.waitForSelector(selector, options);
    }
  }

  async findElement(page, selector) {
    if (this.isXPath(selector)) {
      const locator = page.locator(this.toXPathSelector(selector));
      try {
        if (locator.first) {
          return await locator.first().elementHandle();
        }
        if (locator.elementHandle) {
          return await locator.elementHandle();
        }
      } catch (e) {}
      return await page.$(this.toXPathSelector(selector));
    }
    return await page.$(selector);
  }

  async findElements(page, selector) {
    if (this.isXPath(selector)) {
      const locator = page.locator(this.toXPathSelector(selector));
      try {
        if (locator.elementHandles) {
          return await locator.elementHandles();
        }
      } catch (e) {}
      return await page.$$(this.toXPathSelector(selector));
    }
    return await page.$$(selector);
  }

  async clickElement(page, selector) {
    if (this.isXPath(selector)) {
      try {
        await page.locator(this.toXPathSelector(selector)).click();
      } catch (e) {
        const element = await this.findElement(page, selector);
        if (element) await element.click();
      }
    } else {
      await page.click(selector);
    }
  }

  async typeInElement(page, selector, text, options = {}) {
    if (this.isXPath(selector)) {
      try {
        await page.locator(this.toXPathSelector(selector)).fill(text);
      } catch (e) {
        const element = await this.findElement(page, selector);
        if (element) await element.type(text, options);
      }
    } else {
      await page.type(selector, text, options);
    }
  }

  async hoverElement(page, selector) {
    if (this.isXPath(selector)) {
      try {
        await page.locator(this.toXPathSelector(selector)).hover();
      } catch (e) {
        const element = await this.findElement(page, selector);
        if (element) await element.hover();
      }
    } else {
      await page.hover(selector);
    }
  }

  async selectInElement(page, selector, value) {
    if (this.isXPath(selector)) {
      const element = await this.findElement(page, selector);
      if (element) {
        await element.select(value);
      }
    } else {
      await page.select(selector, value);
    }
  }

  async findElementInContext(context, page, selector) {
    if (this.isXPath(selector)) {
      const allElements = await this.findElements(page, selector);
      for (const el of allElements) {
        try {
          const isChild = await page.evaluate((parent, child) => parent.contains(child), context, el);
          if (isChild) return el;
        } catch (e) {}
      }
      return null;
    }
    return await context.$(selector);
  }

  async findElementsInContext(context, page, selector) {
    if (this.isXPath(selector)) {
      const allElements = await this.findElements(page, selector);
      const results = [];
      for (const el of allElements) {
        try {
          const isChild = await page.evaluate((parent, child) => parent.contains(child), context, el);
          if (isChild) results.push(el);
        } catch (e) {}
      }
      return results;
    }
    return await context.$$(selector);
  }

  async run(script) {
    this.logger.debug('Starting automation');

    let content = script;

    if (this.subcommands.length > 0) {
      content = this.resolveSubcommand(script, this.subcommands);
    }

    if (content.vars) {
      const parentVars = script.vars || {};
      const subVars = content.vars || {};
      const mergedVars = { ...parentVars, ...subVars };
      
      const interpolated = this.vars.interpolateDeep(mergedVars);
      Object.entries(interpolated).forEach(([key, value]) => {
        if (!this.vars.vars[key]) {
          this.vars.set(key, value);
        }
      });
    }

    this.functions = content.functions || {};

    let page;
    if (content.open) {
      const url = this.vars.interpolate(content.open);
      this.logger.debug(`Navigating to ${url}`);
      page = await this.browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      this.pages.push(page);
    } else {
      page = await this.browser.newPage();
      this.pages.push(page);
    }

    if (content.actions && content.actions.length > 0) {
      await this.executeActions(page, content.actions);
    }

    if (content.tabs && content.tabs.length > 0) {
      for (const tab of content.tabs) {
        await this.executeTab(tab);
      }
    }

    this.logger.debug('Automation complete');
    return this.vars.getAll();
  }

  resolveSubcommand(script, subcommandPath) {
    let current = script;
    const pathStr = [];

    for (const sub of subcommandPath) {
      pathStr.push(sub);
      
      if (!current.subcommands || !current.subcommands[sub]) {
        const available = Object.keys(current.subcommands || {}).join(', ');
        const path = pathStr.join(' -> ');
        throw new Error(`Subcommand '${sub}' not found at path '${path}'. Available: ${available || 'none'}`);
      }
      current = current.subcommands[sub];
    }

    return current;
  }

  async executeTab(tabConfig) {
    const url = this.vars.interpolate(tabConfig.open);
    this.logger.debug(`Opening new tab: ${url}`);
    
    const page = await this.browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    this.pages.push(page);
    this.currentIndex = this.pages.length - 1;

    if (tabConfig.actions) {
      await this.executeActions(page, tabConfig.actions);
    }
  }

  async executeActions(page, actions) {
    for (const action of actions) {
      const resolved = await this.resolveImportedAction(action);
      if (Array.isArray(resolved)) {
        await this.executeActions(page, resolved);
      } else {
        await this.executeAction(page, resolved);
      }
    }
  }

  async resolveImportedAction(action) {
    if (!action || typeof action !== 'object') return action;

    if (!action.type && Object.keys(action).length === 1) {
      const key = Object.keys(action)[0];
      const val = action[key];
      if (key.includes('.')) {
        const [alias, ...rest] = key.split('.');
        const remainder = rest.join('.');
        const imported = this.imports[alias];
        if (!imported) {
          throw new Error(`Import alias not found: ${alias}`);
        }

        const segments = remainder.split('.');
        let cursor = imported;
        for (const seg of segments) {
          if (cursor && typeof cursor === 'object' && cursor[seg] !== undefined) {
            cursor = cursor[seg];
          } else {
            cursor = undefined;
            break;
          }
        }

        if (cursor === undefined) {
          throw new Error(`Imported path not found: ${key}`);
        }

        if (cursor && typeof cursor === 'object' && cursor.params && cursor.actions) {
          const funcName = remainder.replace(/^functions\./, '');
          const uniqueName = `__import_${alias}_${funcName}_${Math.random().toString(36).slice(2,8)}`;
          this.functions[uniqueName] = { params: cursor.params, actions: cursor.actions };
          const provided = val && typeof val === 'object' ? val : {};
          return { type: 'func', name: uniqueName, args: provided };
        }

        if (Array.isArray(cursor)) {
          return JSON.parse(JSON.stringify(cursor));
        }
        if (cursor && Array.isArray(cursor.actions)) {
          return JSON.parse(JSON.stringify(cursor.actions));
        }
      }
    }

    return action;
  }

  async executeAction(page, action) {
    switch (action.type) {
      case 'click':
        await this.handleClick(page, action);
        break;

      case 'type':
        await this.handleType(page, action);
        break;

      case 'fill':
        await this.handleFill(page, action);
        break;

      case 'wait':
        await this.handleWait(page, action);
        break;

      case 'screenshot':
        await this.handleScreenshot(page, action);
        break;

      case 'log':
        await this.handleLog(action);
        break;

      case 'open':
        await this.handleOpen(page, action);
        break;

      case 'back':
        this.logger.debug('Navigating back');
        await page.goBack();
        break;

      case 'forward':
        this.logger.debug('Navigating forward');
        await page.goForward();
        break;

      case 'reload':
        this.logger.debug('Reloading page');
        await page.reload();
        break;

      case 'hover':
        await this.handleHover(page, action);
        break;

      case 'select':
        await this.handleSelect(page, action);
        break;

      case 'scroll':
        await this.handleScroll(page, action);
        break;

      case 'press':
        this.logger.debug(`Pressing ${action.key}`);
        await page.keyboard.press(action.key);
        break;

      case 'newTab':
        await this.handleNewTab(action);
        break;

      case 'switchTab':
        await this.handleSwitchTab(action);
        break;

      case 'closeTab':
        await this.handleCloseTab();
        break;

      case 'if':
        await this.handleIf(page, action);
        break;

      case 'for':
        await this.handleFor(page, action);
        break;

      case 'repeat':
        await this.handleRepeat(page, action);
        break;

      case 'parallel':
        await this.handleParallel(page, action);
        break;

      case 'retry':
        await this.handleRetry(page, action);
        break;

      case 'try':
        await this.handleTry(page, action);
        break;

      case 'extract':
        await this.handleExtract(page, action);
        break;

      case 'pdf':
        await this.handlePdf(page, action);
        break;

      case 'write':
        await this.handleWrite(action);
        break;

      case 'break':
        throw new Error('BREAK');

      case 'continue':
        throw new Error('CONTINUE');

      case 'func':
        await this.handleFunc(page, action);
        break;

      case 'return':
        this.vars.set('$result', typeof action.value === 'string' ? this.vars.interpolate(action.value) : action.value);
        throw new Error('RETURN');

      case 'input':
        await this.handleInput(action);
        break;

      case 'fn':
        await this.handleFn(action);
        break;

      case 'closure':
        await this.handleClosure(page, action);
        break;

      default:
        if (!(await this.handleUnknownAction(page, action))) {
          this.logger.warn(`Unknown action type: ${action.type}`);
        }
    }
  }

  async handleClick(page, action) {
    const selector = this.vars.interpolate(action.selector);
    this.logger.debug(`Clicking ${selector}`);
    await this.waitForElement(page, selector, { visible: true });
    await this.clickElement(page, selector);
    
    if (action.wait) {
      if (typeof action.wait === 'number') {
        await this.delay(action.wait);
      } else {
        await this.waitForElement(page, action.wait, { visible: true });
      }
    }
  }

  async handleType(page, action) {
    const selector = this.vars.interpolate(action.selector);
    const text = this.vars.interpolate(action.text);
    this.logger.debug(`Typing into ${selector}`);
    await this.waitForElement(page, selector, { visible: true });
    await this.typeInElement(page, selector, text, { delay: action.delay || 0 });
  }

  async handleFill(page, action) {
    const selector = this.vars.interpolate(action.selector);
    const text = this.vars.interpolate(action.text);
    this.logger.debug(`Filling ${selector}`);
    await this.waitForElement(page, selector, { visible: true });
    await this.fillElement(page, selector, text);
  }

  async fillElement(page, selector, text) {
    if (this.isXPath(selector)) {
      try {
        await page.locator(this.toXPathSelector(selector)).fill(text);
      } catch (e) {
        const element = await this.findElement(page, selector);
        if (element) await element.type(text, { delay: 0 });
      }
    } else {
      await page.locator(selector).fill(text);
    }
  }

  async handleWait(page, action) {
    if (action.selector) {
      const selector = this.vars.interpolate(action.selector);
      this.logger.debug(`Waiting for ${selector}`);
      await this.waitForElement(page, selector, { visible: true, timeout: action.timeout || 3000 });
    } else if (action.timeout) {
      this.logger.debug(`Waiting ${action.timeout}ms`);
      await this.delay(action.timeout);
    } else if (action.navigation) {
      this.logger.debug('Waiting for navigation');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } else if (action.condition) {
      this.logger.debug(`Waiting for condition: ${action.condition}`);
      await page.waitForFunction(
        (cond) => {
          try {
            return eval(cond);
          } catch {
            return false;
          }
        },
        { timeout: action.timeout || 3000 },
        action.condition
      );
    }
  }

  async handleScreenshot(page, action) {
    const path = this.vars.interpolate(action.path);
    this.logger.debug(`Saving screenshot to ${path}`);
    
    if (action.selector) {
      const element = await this.findElement(page, action.selector);
      if (element) {
        await element.screenshot({ path });
      }
    } else {
      await page.screenshot({ path, fullPage: action.fullPage || false });
    }
  }

  async handleLog(action) {
    const message = this.vars.interpolate(action.message);
    this.logger.write(action.level || 'INFO', message);
  }

  async handleOpen(page, action) {
    const url = this.vars.interpolate(action.url);
    this.logger.debug(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async handleHover(page, action) {
    const selector = this.vars.interpolate(action.selector);
    this.logger.debug(`Hovering over ${selector}`);
    await this.waitForElement(page, selector, { visible: true });
    await this.hoverElement(page, selector);
  }

  async handleSelect(page, action) {
    const selector = this.vars.interpolate(action.selector);
    const value = this.vars.interpolate(action.value);
    this.logger.debug(`Selecting ${value} in ${selector}`);
    await this.waitForElement(page, selector, { visible: true });
    await this.selectInElement(page, selector, value);
  }

  async handleScroll(page, action) {
    this.logger.debug('Scrolling');
    if (action.selector) {
      const selector = this.vars.interpolate(action.selector);
      const element = await this.findElement(page, selector);
      if (element) {
        await element.evaluate(el => el.scrollIntoView());
      }
    } else if (action.y !== undefined) {
      await page.evaluate(y => window.scrollTo(0, y), action.y);
    }
  }

  async handleNewTab(action) {
    const url = this.vars.interpolate(action.url);
    this.logger.debug(`Opening new tab: ${url}`);
    const page = await this.browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    this.pages.push(page);
    this.currentIndex = this.pages.length - 1;
    
    if (action.actions) {
      await this.executeActions(page, action.actions);
    }
  }

  async handleSwitchTab(action) {
    const index = action.index;
    this.logger.debug(`Switching to tab ${index}`);
    if (index >= 0 && index < this.pages.length) {
      this.currentIndex = index;
      await this.pages[index].bringToFront();
    } else {
      this.logger.warn(`Invalid tab index: ${index}`);
    }
  }

  async handleCloseTab() {
    this.logger.debug('Closing current tab');
    if (this.pages.length > 1) {
      await this.pages[this.currentIndex].close();
      this.pages.splice(this.currentIndex, 1);
      this.currentIndex = Math.max(0, this.currentIndex - 1);
    }
  }

  async handleIf(page, action) {
    let condition = false;

    if (action.selector) {
      const selector = this.vars.interpolate(action.selector);
      const element = await this.findElement(page, selector);
      condition = !!element;
      
      if (action.visible !== undefined && element) {
        condition = await element.isIntersectingViewport();
        if (!action.visible) condition = !condition;
      }
    } else if (action.condition) {
      condition = this.vars.evaluateCondition(action.condition);
    }

    if (condition) {
      await this.executeActions(page, action.then || []);
    } else if (action.else && action.else.length > 0) {
      await this.executeActions(page, action.else);
    }
  }

  async handleFor(page, action) {
    let items = [];

    if (action.items) {
      items = Array.isArray(action.items) ? action.items : this.vars.get(action.items) || [];
    } else if (action.selector) {
      const selector = this.vars.interpolate(action.selector);
      items = await this.findElements(page, selector);
    }

    const varName = action.as || 'item';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      this.vars.set(varName, typeof item === 'object' && item !== null && item.selector ? item : item);
      this.vars.set(`${varName}_index`, i);

      try {
        await this.executeActions(page, action.actions || []);
      } catch (e) {
        if (e.message === 'BREAK') {
          this.logger.debug(`Loop broken at iteration ${i}`);
          break;
        }
        if (e.message === 'CONTINUE') {
          this.logger.debug(`Loop continued at iteration ${i}`);
          continue;
        }
        throw e;
      }
    }
  }

  async handleRepeat(page, action) {
    const times = action.times || 1;

    for (let i = 0; i < times; i++) {
      try {
        await this.executeActions(page, action.actions || []);
        if (action.delay) {
          await this.delay(action.delay);
        }
      } catch (e) {
        if (e.message === 'BREAK') {
          break;
        }
        if (e.message === 'CONTINUE') {
          continue;
        }
        throw e;
      }
    }
  }

  async handleParallel(page, action) {
    const branches = action.branches || [];
    await Promise.all(
      branches.map(branch => this.executeActions(page, branch.actions || []))
    );
  }

  async handleRetry(page, action) {
    const times = action.times || 3;
    const delay = action.delay || 1000;
    let lastError;

    for (let i = 0; i < times; i++) {
      try {
        await this.executeActions(page, action.action || []);
        this.logger.debug(`Action succeeded on attempt ${i + 1}`);
        return;
      } catch (e) {
        lastError = e;
        this.logger.warn(`Attempt ${i + 1} failed: ${e.message}`);
        if (i < times - 1) {
          const waitTime = action.backoff === 'exponential' ? delay * Math.pow(2, i) : delay;
          await this.delay(waitTime);
        }
      }
    }

    throw lastError;
  }

  async handleTry(page, action) {
    try {
      await this.executeActions(page, action.action || []);
    } catch (e) {
      this.logger.warn(`Try failed: ${e.message}`);
      if (action.catch && action.catch.length > 0) {
        await this.executeActions(page, action.catch);
      }
    }
  }

  async handleExtract(page, action) {
    const selector = this.vars.interpolate(action.selector);

    if (action.fields) {
      const results = await this.findElements(page, selector);
      const extracted = await Promise.all(
        results.map(async (el) => {
          const obj = {};
          for (const field of action.fields) {
            const fieldSelector = this.vars.interpolate(field.selector);
            const fieldEl = await this.findElementInContext(el, page, fieldSelector);
            obj[field.name] = fieldEl ? await fieldEl.evaluate(e => e.textContent.trim()) : null;
          }
          return obj;
        })
      );
      this.vars.set(action.save, extracted);
      this.logger.debug(`Extracted ${extracted.length} items`);
    } else if (action.multiple) {
      const elements = await this.findElements(page, selector);
      const values = await Promise.all(
        elements.map(el => el.evaluate(e => e.textContent.trim()))
      );
      this.vars.set(action.save, values);
      this.logger.debug(`Extracted ${values.length} values`);
    } else {
      const element = await this.findElement(page, selector);
      const value = element ? await element.evaluate(e => e.textContent.trim()) : null;
      this.vars.set(action.save, value);
      this.logger.debug(`Extracted value: ${value}`);
    }
  }

  async handlePdf(page, action) {
    const path = this.vars.interpolate(action.path);
    await page.pdf({ path, format: 'A4' });
    this.logger.debug(`PDF saved: ${path}`);
  }

  async handleWrite(action) {
    const fs = require('fs');
    const path = this.vars.interpolate(action.file);
    const content = this.vars.interpolate(action.content);
    
    if (action.append) {
      fs.appendFileSync(path, content);
    } else {
      fs.writeFileSync(path, content);
    }
    this.logger.debug(`Wrote to file: ${path}`);
  }

  async handleFunc(page, action) {
    const funcName = action.name;
    const func = this.functions[funcName];

    if (!func) {
      this.logger.warn(`Function not found: ${funcName}`);
      return;
    }

    const params = func.params || {};
    const providedArgs = action.args || {};

    const savedVars = { ...this.vars.getAll() };

    const baseDepth = this.scopeDepth;
    this.scopeDepth++;
    this.closureScopes[this.scopeDepth] = {};
    this.scopeNewVars[this.scopeDepth] = [];

    const paramKeys = Object.keys(params);
    for (const key of paramKeys) {
      const value = providedArgs[key] !== undefined ? providedArgs[key] : params[key];
      const setVal = typeof value === 'string' ? this.vars.interpolate(value) : value;
      this.vars.set(key, setVal);
    }

    try {
      await this.executeActions(page, func.actions);
    } catch (e) {
      if (e.message === 'RETURN') {
      } else {
        throw e;
      }
    } finally {
      for (const key of paramKeys) {
        if (savedVars.hasOwnProperty(key)) {
          this.vars.set(key, savedVars[key]);
        } else {
          this.vars.delete(key);
        }
      }
      const newVars = this.scopeNewVars[this.scopeDepth] || [];
      for (const key of newVars) {
        this.vars.delete(key);
      }
      this.scopeNewVars[this.scopeDepth] = [];
      if (this.closureDepth === 0) {
        this.closureScopes[this.scopeDepth] = null;
        this.scopeDepth = baseDepth;
      }
    }
  }

  async handleFn(action) {
    const closure = {
      name: action.name,
      params: action.params || {},
      actions: action.actions || [],
      depth: this.scopeDepth,
    };

    this.closureScopes[this.scopeDepth][action.name] = closure;
    this.logger.debug(`Defined closure: ${action.name}`);
  }

  async handleClosure(page, action) {
    const closureName = action.name;
    let closure = null;

    const startDepth = this.scopeDepth;
    for (let d = startDepth; d >= 0; d--) {
      if (this.closureScopes[d] && this.closureScopes[d][closureName]) {
        closure = this.closureScopes[d][closureName];
        break;
      }
    }

    if (!closure) {
      this.logger.warn(`Closure not found: ${closureName}`);
      return;
    }

    const params = closure.params || {};
    const providedArgs = action.args || {};

    const savedVars = { ...this.vars.getAll() };

    this.closureDepth++;
    const callDepth = closure.depth;
    this.scopeDepth = callDepth + 1;
    this.closureScopes[this.scopeDepth] = {};
    this.scopeNewVars[this.scopeDepth] = [];

    const paramKeys = Object.keys(params);
    for (const key of paramKeys) {
      const value = providedArgs[key] !== undefined ? providedArgs[key] : params[key];
      const setVal = typeof value === 'string' ? this.vars.interpolate(value) : value;
      this.vars.set(key, setVal);
    }

    try {
      await this.executeActions(page, closure.actions);
    } catch (e) {
      if (e.message === 'RETURN') {
        this.vars.set('$result', this.vars.get('$result'));
      } else {
        throw e;
      }
    } finally {
      for (const key of paramKeys) {
        if (savedVars.hasOwnProperty(key)) {
          this.vars.set(key, savedVars[key]);
        } else {
          this.vars.delete(key);
        }
      }
      const newVars = this.scopeNewVars[this.scopeDepth] || [];
      for (const key of newVars) {
        this.vars.delete(key);
      }
      this.scopeNewVars[this.scopeDepth] = [];
      this.closureScopes[this.scopeDepth] = null;
      this.scopeDepth--;
      this.closureDepth--;
    }
  }

  async handleUnknownAction(page, action) {
    const actionType = action.type;

    if (!actionType || typeof actionType !== 'string') {
      return false;
    }

    let closure = null;
    for (let d = this.scopeDepth; d >= 0; d--) {
      if (this.closureScopes[d] && this.closureScopes[d][actionType]) {
        closure = this.closureScopes[d][actionType];
        break;
      }
    }

    if (closure) {
      const args = action.value !== undefined ? action.value : {};
      await this.handleClosure(page, { name: actionType, args });
      return true;
    }

    if (this.functions[actionType]) {
      const args = action.value !== undefined ? action.value : {};
      await this.handleFunc(page, { name: actionType, args });
      return true;
    }

    return await this.handleVarAssignment(action);
  }

  async handleVarAssignment(action) {
    const actionType = action.type;
    if (action.value === null || 
        typeof action.value === 'string' || 
        typeof action.value === 'number' || 
        typeof action.value === 'boolean') {
      const isNew = this.vars.get(actionType) === undefined;
      if (isNew && this.scopeDepth > 0) {
        if (!this.scopeNewVars[this.scopeDepth]) {
          this.scopeNewVars[this.scopeDepth] = [];
        }
        this.scopeNewVars[this.scopeDepth].push(actionType);
      }
      const value = typeof action.value === 'string' 
        ? this.vars.interpolate(action.value) 
        : action.value;
      this.vars.set(actionType, value);
      return true;
    }
    return false;
  }

  async handleInput(action) {
    const readline = require('readline');

    if (!this._inputRl) {
      this._inputRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
        crlfDelay: Infinity,
      });
      this._inputQueue = [];
      this._inputWaiting = null;

      this._inputRl.on('line', (line) => {
        if (this._inputWaiting) {
          this._inputWaiting(line);
          this._inputWaiting = null;
        } else {
          this._inputQueue.push(line);
        }
      });
    }

    const prompt = this.vars.interpolate(action.prompt || 'Enter value: ');

    const answer = await new Promise((resolve) => {
      if (this._inputQueue.length > 0) {
        resolve(this._inputQueue.shift());
      } else {
        this._inputWaiting = resolve;
        process.stdout.write(prompt);
        if (action.hide) {
          process.stdout.write('\n');
        }
      }
    });

    const trimmed = answer.trim();
    const value = trimmed === '' 
      ? (action.default !== undefined ? action.default : null)
      : trimmed;

    if (action.var) {
      this.vars.set(action.var, value);
    } else {
      this.vars.set('$result', value);
    }
  }
}

module.exports = Interpreter;
