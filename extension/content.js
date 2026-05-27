(function() {
  'use strict';

  const capturedActions = [];
  let isCapturing = true;
  let lastScrollPosition = { x: 0, y: 0 };

  function generateSelector(element) {
    if (!element || !element.tagName) return null;

    const tag = element.tagName.toLowerCase();

    if (element.id) {
      const idSelector = `#${CSS.escape(element.id)}`;
      if (document.querySelector(idSelector) === element) {
        return idSelector;
      }
    }

    const classes = Array.from(element.classList)
      .filter(c => c.trim() !== '')
      .map(c => `.${CSS.escape(c)}`)
      .join('');

    if (classes) {
      const selector = `${tag}${classes}`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }

    if (element.name && element.name.trim() !== '') {
      const selector = `${tag}[name="${CSS.escape(element.name)}"]`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }

    const dataAttrs = [];
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-') && attr.value.trim() !== '') {
        dataAttrs.push(`[${attr.name}="${CSS.escape(attr.value)}"]`);
      }
    }
    if (dataAttrs.length > 0) {
      const selector = `${tag}${dataAttrs.join('')}`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }

    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === element.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(element) + 1;
        const selector = `${tag}:nth-of-type(${index})`;
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }

    if (classes) {
      let depth = 2;
      let selector = `${tag}${classes}`;
      let checkEl = element.parentElement;

      while (checkEl && depth <= 5) {
        const parentClasses = Array.from(checkEl.classList)
          .filter(c => c.trim() !== '')
          .map(c => `.${CSS.escape(c)}`)
          .join('');

        if (parentClasses) {
          selector = `${checkEl.tagName.toLowerCase()}${parentClasses} > ${selector}`;
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
        }
        checkEl = checkEl.parentElement;
        depth++;
      }
    }

    return tag;
  }

  function getElementInfo(element) {
    if (!element) return null;

    const selector = generateSelector(element);
    const tag = element.tagName ? element.tagName.toLowerCase() : '';
    const text = element.textContent
      ? element.textContent.trim().substring(0, 100)
      : '';
    const rect = element.getBoundingClientRect
      ? element.getBoundingClientRect()
      : null;

    return {
      selector,
      tag,
      text,
      xpath: null,
      visible: rect ? rect.width > 0 && rect.height > 0 : true,
    };
  }

  function captureClick(e) {
    if (!isCapturing) return;

    const target = e.target.closest('button, a, input, select, textarea, [role="button"], [onclick], [data-action]');
    if (!target) return;

    if (target.closest('extension-popup, [data-extension-id]')) return;

    const info = getElementInfo(target);
    if (!info.selector) return;

    const action = {
      type: 'click',
      selector: info.selector,
      tag: info.tag,
      text: info.text,
      url: window.location.href,
      timestamp: Date.now(),
    };

    capturedActions.push(action);
    browser.runtime.sendMessage({ action: 'capture', data: action });
  }

  function captureInput(e) {
    if (!isCapturing) return;

    const target = e.target;
    if (!target.matches('input, textarea, [contenteditable="true"]')) return;

    const info = getElementInfo(target);
    if (!info.selector) return;

    const action = {
      type: 'type',
      selector: info.selector,
      tag: info.tag,
      value: target.value || target.textContent || '',
      url: window.location.href,
      timestamp: Date.now(),
    };

    capturedActions.push(action);
    browser.runtime.sendMessage({ action: 'capture', data: action });
  }

  function captureHover(e) {
    if (!isCapturing) return;

    const target = e.target.closest('button, a, input, select, textarea, [role="button"], [data-hover]');
    if (!target) return;

    const info = getElementInfo(target);
    if (!info.selector) return;

    const action = {
      type: 'hover',
      selector: info.selector,
      tag: info.tag,
      url: window.location.href,
      timestamp: Date.now(),
    };

    capturedActions.push(action);
    browser.runtime.sendMessage({ action: 'capture', data: action });
  }

  function captureSelect(e) {
    if (!isCapturing) return;

    const target = e.target;
    if (!target.matches('select')) return;

    const info = getElementInfo(target);
    if (!info.selector) return;

    const action = {
      type: 'select',
      selector: info.selector,
      value: target.value,
      url: window.location.href,
      timestamp: Date.now(),
    };

    capturedActions.push(action);
    browser.runtime.sendMessage({ action: 'capture', data: action });
  }

  let scrollTimeout = null;
  function captureScroll(e) {
    if (!isCapturing) return;

    if (scrollTimeout) return;

    scrollTimeout = setTimeout(() => {
      scrollTimeout = null;
    }, 500);

    const x = window.scrollX;
    const y = window.scrollY;

    if (x !== lastScrollPosition.x || y !== lastScrollPosition.y) {
      lastScrollPosition = { x, y };

      const action = {
        type: 'scroll',
        x,
        y,
        url: window.location.href,
        timestamp: Date.now(),
      };

      capturedActions.push(action);
      browser.runtime.sendMessage({ action: 'capture', data: action });
    }
  }

  function captureKeypress(e) {
    if (!isCapturing) return;

    if (e.key === 'Enter') {
      const target = e.target;
      if (target.matches('input, textarea')) {
        const info = getElementInfo(target);
        if (info.selector && target.value) {
          const action = {
            type: 'type',
            selector: info.selector,
            tag: info.tag,
            value: target.value,
            url: window.location.href,
            timestamp: Date.now(),
          };

          capturedActions.push(action);
          browser.runtime.sendMessage({ action: 'capture', data: action });
        }
      }
    }
  }

  document.addEventListener('click', captureClick, true);
  document.addEventListener('input', captureInput, true);
  document.addEventListener('mouseover', captureHover, true);
  document.addEventListener('change', captureSelect, true);
  document.addEventListener('scroll', captureScroll, { passive: true });
  document.addEventListener('keypress', captureKeypress, true);

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getStatus') {
      sendResponse({
        isCapturing,
        actionCount: capturedActions.length,
        url: window.location.href,
      });
    } else if (message.action === 'setCapturing') {
      isCapturing = message.value;
      sendResponse({ isCapturing });
    } else if (message.action === 'getActions') {
      sendResponse({ actions: capturedActions });
    } else if (message.action === 'clearActions') {
      capturedActions.length = 0;
      sendResponse({ success: true });
    }
    return true;
  });

  window.addEventListener('beforeunload', () => {
    if (capturedActions.length > 0) {
      browser.runtime.sendMessage({
        action: 'flush',
        data: capturedActions.slice(),
      });
    }
  });
})();