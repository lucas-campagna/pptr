const Logger = require('./logger');
const VariableEngine = require('./variables');

class Interpreter {
  constructor(browser, options = {}) {
    this.browser = browser;
    this.vars = new VariableEngine(options.vars || {});
    this.logger = options.logger || new Logger(options.logPath);
    this.pages = [];
    this.currentIndex = 0;
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
          await locator.waitFor({ timeout: options.timeout || 30000 });
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
    this.logger.info('Starting automation');

    if (script.vars) {
      Object.entries(script.vars).forEach(([key, value]) => {
        this.vars.set(key, value);
      });
      this.vars = new VariableEngine(this.vars.interpolateDeep(script.vars));
    }

    let page;
    if (script.open) {
      const url = this.vars.interpolate(script.open);
      this.logger.info(`Navigating to ${url}`);
      page = await this.browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      this.pages.push(page);
    } else {
      page = await this.browser.newPage();
      this.pages.push(page);
    }

    if (script.actions && script.actions.length > 0) {
      await this.executeActions(page, script.actions);
    }

    if (script.tabs && script.tabs.length > 0) {
      for (const tab of script.tabs) {
        await this.executeTab(tab);
      }
    }

    this.logger.info('Automation complete');
    return this.vars.getAll();
  }

  async executeTab(tabConfig) {
    const url = this.vars.interpolate(tabConfig.open);
    this.logger.info(`Opening new tab: ${url}`);
    
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
      const interpolated = this.vars.interpolateDeep(action);
      await this.executeAction(page, interpolated);
    }
  }

  async executeAction(page, action) {
    switch (action.type) {
      case 'click':
        await this.handleClick(page, action);
        break;

      case 'type':
        await this.handleType(page, action);
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
        await page.goBack();
        this.logger.info('Navigated back');
        break;

      case 'forward':
        await page.goForward();
        this.logger.info('Navigated forward');
        break;

      case 'reload':
        await page.reload();
        this.logger.info('Page reloaded');
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
        await page.keyboard.press(action.key);
        this.logger.info(`Pressed ${action.key}`);
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

      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  async handleClick(page, action) {
    const selector = this.vars.interpolate(action.selector);
    await this.waitForElement(page, selector, { visible: true });
    await this.clickElement(page, selector);
    this.logger.info(`Clicked ${selector}`);
    
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
    await this.waitForElement(page, selector, { visible: true });
    await this.typeInElement(page, selector, text, { delay: action.delay || 0 });
    this.logger.info(`Typed into ${selector}`);
  }

  async handleWait(page, action) {
    if (action.selector) {
      const selector = this.vars.interpolate(action.selector);
      await this.waitForElement(page, selector, { visible: true, timeout: action.timeout || 30000 });
      this.logger.info(`Waited for ${selector}`);
    } else if (action.timeout) {
      await this.delay(action.timeout);
      this.logger.info(`Waited ${action.timeout}ms`);
    } else if (action.navigation) {
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      this.logger.info('Waited for navigation');
    } else if (action.condition) {
      await page.waitForFunction(
        (cond) => {
          try {
            return eval(cond);
          } catch {
            return false;
          }
        },
        { timeout: action.timeout || 30000 },
        action.condition
      );
      this.logger.info(`Waited for condition: ${action.condition}`);
    }
  }

  async handleScreenshot(page, action) {
    const path = this.vars.interpolate(action.path);
    
    if (action.selector) {
      const element = await this.findElement(page, action.selector);
      if (element) {
        await element.screenshot({ path });
      }
    } else {
      await page.screenshot({ path, fullPage: action.fullPage || false });
    }
    this.logger.info(`Screenshot saved: ${path}`);
  }

  async handleLog(action) {
    const message = this.vars.interpolate(action.message);
    this.logger.write(action.level || 'INFO', message);
  }

  async handleOpen(page, action) {
    const url = this.vars.interpolate(action.url);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    this.logger.info(`Navigated to ${url}`);
  }

  async handleHover(page, action) {
    const selector = this.vars.interpolate(action.selector);
    await this.waitForElement(page, selector, { visible: true });
    await this.hoverElement(page, selector);
    this.logger.info(`Hovered over ${selector}`);
  }

  async handleSelect(page, action) {
    const selector = this.vars.interpolate(action.selector);
    const value = this.vars.interpolate(action.value);
    await this.waitForElement(page, selector, { visible: true });
    await this.selectInElement(page, selector, value);
    this.logger.info(`Selected ${value} in ${selector}`);
  }

  async handleScroll(page, action) {
    if (action.selector) {
      const selector = this.vars.interpolate(action.selector);
      const element = await this.findElement(page, selector);
      if (element) {
        await element.evaluate(el => el.scrollIntoView());
      }
    } else if (action.y !== undefined) {
      await page.evaluate(y => window.scrollTo(0, y), action.y);
    }
    this.logger.info('Scrolled');
  }

  async handleNewTab(action) {
    const url = this.vars.interpolate(action.url);
    const page = await this.browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    this.pages.push(page);
    this.currentIndex = this.pages.length - 1;
    this.logger.info(`Opened new tab: ${url}`);
    
    if (action.actions) {
      await this.executeActions(page, action.actions);
    }
  }

  async handleSwitchTab(action) {
    const index = action.index;
    if (index >= 0 && index < this.pages.length) {
      this.currentIndex = index;
      await this.pages[index].bringToFront();
      this.logger.info(`Switched to tab ${index}`);
    } else {
      this.logger.warn(`Invalid tab index: ${index}`);
    }
  }

  async handleCloseTab() {
    if (this.pages.length > 1) {
      await this.pages[this.currentIndex].close();
      this.pages.splice(this.currentIndex, 1);
      this.currentIndex = Math.max(0, this.currentIndex - 1);
      this.logger.info('Closed current tab');
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
          this.logger.info(`Loop broken at iteration ${i}`);
          break;
        }
        if (e.message === 'CONTINUE') {
          this.logger.info(`Loop continued at iteration ${i}`);
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
        this.logger.info(`Action succeeded on attempt ${i + 1}`);
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
      this.logger.info(`Extracted ${extracted.length} items`);
    } else if (action.multiple) {
      const elements = await this.findElements(page, selector);
      const values = await Promise.all(
        elements.map(el => el.evaluate(e => e.textContent.trim()))
      );
      this.vars.set(action.save, values);
      this.logger.info(`Extracted ${values.length} values`);
    } else {
      const element = await this.findElement(page, selector);
      const value = element ? await element.evaluate(e => e.textContent.trim()) : null;
      this.vars.set(action.save, value);
      this.logger.info(`Extracted value: ${value}`);
    }
  }

  async handlePdf(page, action) {
    const path = this.vars.interpolate(action.path);
    await page.pdf({ path, format: 'A4' });
    this.logger.info(`PDF saved: ${path}`);
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
    this.logger.info(`Wrote to file: ${path}`);
  }
}

module.exports = Interpreter;