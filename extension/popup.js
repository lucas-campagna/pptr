(function() {
  'use strict';

  const statusBadge = document.getElementById('status-badge');
  const actionCount = document.getElementById('action-count');
  const currentUrl = document.getElementById('current-url');
  const toggleBtn = document.getElementById('toggle-btn');
  const clearBtn = document.getElementById('clear-btn');
  const actionList = document.getElementById('action-list');

  let isCapturing = true;

  function updateUI(status) {
    if (status) {
      isCapturing = status.isCapturing;
      actionCount.textContent = status.actionCount || 0;
      currentUrl.textContent = status.url || '-';
    }

    if (isCapturing) {
      statusBadge.textContent = 'Recording';
      statusBadge.className = 'badge capturing';
      toggleBtn.textContent = 'Pause Capture';
    } else {
      statusBadge.textContent = 'Paused';
      statusBadge.className = 'badge paused';
      toggleBtn.textContent = 'Resume Capture';
    }
  }

  function addRecentAction(action) {
    const li = document.createElement('li');
    li.className = 'action-item';

    const typeLabel = document.createElement('span');
    typeLabel.className = 'action-type';
    typeLabel.textContent = action.type;

    const selectorText = document.createElement('span');
    selectorText.className = 'action-selector';
    selectorText.textContent = action.selector || (action.type === 'scroll' ? `(${action.x}, ${action.y})` : '');

    li.appendChild(typeLabel);
    li.appendChild(selectorText);

    actionList.insertBefore(li, actionList.firstChild);

    while (actionList.children.length > 5) {
      actionList.removeChild(actionList.lastChild);
    }
  }

  function refreshStatus() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (response && response.success) {
        updateUI(response.status);
      }
    });
  }

  function handleToggle() {
    const newValue = !isCapturing;
    chrome.runtime.sendMessage(
      { action: 'setCapturing', value: newValue },
      (response) => {
        if (response && response.success) {
          isCapturing = response.isCapturing;
          updateUI();
        }
      }
    );
  }

  function handleClear() {
    chrome.runtime.sendMessage({ action: 'clearActions' }, (response) => {
      if (response && response.success) {
        actionCount.textContent = '0';
        actionList.innerHTML = '';
      }
    });
  }

  toggleBtn.addEventListener('click', handleToggle);
  clearBtn.addEventListener('click', handleClear);

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'statusUpdate') {
      updateUI(message.status);
      if (message.status && message.status.lastAction) {
        addRecentAction(message.status.lastAction);
      }
    }
  });

  refreshStatus();
  setInterval(refreshStatus, 1000);
})();