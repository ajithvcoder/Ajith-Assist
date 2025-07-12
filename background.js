// Background script with comprehensive logging
const LOG_PREFIX = '[Agentic AI Extension]';

// Utility function for consistent logging
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `${LOG_PREFIX} [${level.toUpperCase()}] ${timestamp}: ${message}`;
  
  if (level === 'error') {
    console.error(logMessage, data || '');
  } else if (level === 'warn') {
    console.warn(logMessage, data || '');
  } else {
    console.log(logMessage, data || '');
  }
}

chrome.runtime.onInstalled.addListener(() => {
  log('info', 'Extension installed/updated, creating context menus');
  
  const menuItems = [
    { id: "agenticAnalyze", title: "🤖 Agentic Analysis", icon: "🤖" },
    { id: "agenticResearch", title: "🔍 Research Assistant", icon: "🔍" },
    { id: "agenticWrite", title: "✍️ Writing Assistant", icon: "✍️" },
    { id: "agenticCode", title: "💻 Code Assistant", icon: "💻" }
  ];

  menuItems.forEach(item => {
    try {
      chrome.contextMenus.create({
        id: item.id,
        title: item.title,
        contexts: ["selection"]
      });
      log('info', `Created context menu: ${item.title}`);
    } catch (error) {
      log('error', `Failed to create context menu ${item.title}`, error);
    }
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const selectedText = info.selectionText;
  const taskType = info.menuItemId.replace('agentic', '').toLowerCase();
  
  log('info', `Context menu clicked: ${info.menuItemId}`, {
    taskType,
    textLength: selectedText?.length || 0,
    tabId: tab.id,
    url: tab.url
  });
  
  if (!selectedText || selectedText.trim().length === 0) {
    log('warn', 'No text selected');
    return;
  }

  try {
    // Send message to content script instead of executing inline
    chrome.tabs.sendMessage(tab.id, {
      action: 'processWithAgenticAI',
      selectedText: selectedText,
      taskType: taskType
    });
    log('info', 'Message sent to content script');
  } catch (error) {
    log('error', 'Failed to send message to content script', error);
    
    // Fallback: inject content script if not already present
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      // Retry sending message after injection
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'processWithAgenticAI',
          selectedText: selectedText,
          taskType: taskType
        });
      }, 100);
      
      log('info', 'Content script injected and message sent');
    } catch (injectError) {
      log('error', 'Failed to inject content script', injectError);
    }
  }
});