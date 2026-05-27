(function() {
  'use strict';

  const STORAGE_KEY = 'pptr_captured_actions';
  const MAX_BUFFER_SIZE = 1000;

  let actionBuffer = [];
  let isCapturing = true;
  let captureStartTime = null;

  function init() {
    captureStartTime = Date.now();
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      if (data && Array.isArray(data[STORAGE_KEY])) {
        actionBuffer = data[STORAGE_KEY];
      }
    });
  }

  function saveToStorage() {
    chrome.storage.local.set({ [STORAGE_KEY]: actionBuffer });
  }

  function addAction(action) {
    if (!isCapturing) return;

    const enrichedAction = {
      ...action,
      capturedAt: Date.now(),
      sessionId: captureStartTime,
    };

    actionBuffer.push(enrichedAction);

    if (actionBuffer.length > MAX_BUFFER_SIZE) {
      actionBuffer = actionBuffer.slice(-MAX_BUFFER_SIZE);
    }

    saveToStorage();

    notifyPopup();
  }

  function flushActions(actions) {
    if (!Array.isArray(actions)) return;
    for (const action of actions) {
      addAction(action);
    }
  }

  function clearActions() {
    actionBuffer = [];
    saveToStorage();
    notifyPopup();
  }

  function getActions() {
    return actionBuffer;
  }

  function getStatus() {
    return {
      isCapturing,
      actionCount: actionBuffer.length,
      captureStartTime,
      sessionId: captureStartTime,
    };
  }

  function setCapturing(value) {
    isCapturing = value;
    notifyPopup();
    return { isCapturing };
  }

  function notifyPopup() {
    chrome.runtime.sendMessage({
      action: 'statusUpdate',
      status: getStatus(),
    }).catch(() => {});
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const response = { success: false };

    switch (message.action) {
      case 'capture':
        addAction(message.data);
        response.success = true;
        break;

      case 'flush':
        flushActions(message.data);
        response.success = true;
        break;

      case 'getActions':
        response.actions = getActions();
        response.success = true;
        break;

      case 'getStatus':
        response.status = getStatus();
        response.success = true;
        break;

      case 'setCapturing':
        Object.assign(response, setCapturing(message.value));
        break;

      case 'clearActions':
        clearActions();
        response.success = true;
        break;

      case 'exportActions':
        response.actions = getActions();
        response.success = true;
        clearActions();
        break;

      default:
        response.error = 'Unknown action';
    }

    if (sendResponse) {
      sendResponse(response);
    }

    return true;
  });

  chrome.action?.onClicked?.addListener(async (tab) => {
    isCapturing = !isCapturing;
    notifyPopup();
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      try {
        const url = new URL(tab.url);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          chrome.tabs.sendMessage(tabId, {
            action: 'pageLoaded',
            url: tab.url,
          }).catch(() => {});
        }
      } catch (e) {}
    }
  });

  init();
})();