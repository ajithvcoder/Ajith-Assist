// Content script for DOM manipulation and UI interactions
const LOG_PREFIX = '[Agentic AI Content Script]';

// Enhanced logging function for content script
function contentLog(level, message, data = null) {
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

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processWithAgenticAI') {
    processWithAgenticAI(message.selectedText, message.taskType);
    sendResponse({ success: true });
  }
});

function showLoadingPopup() {
  contentLog('info', 'Showing loading dialog');

  const existing = document.querySelector('.agentic-float');
  if (existing) existing.remove();

  const dialog = document.createElement('div');
  dialog.className = 'agentic-float';
  dialog.innerHTML = `
    <div class="agentic-float-inner">
      <div class="agentic-float-header">
        <strong>🤖 Processing...</strong>
        <button class="close-btn">&times;</button>
      </div>
      <div class="agentic-float-body">
        <div class="loading-spinner"></div>
        <p>Analyzing • Planning • Executing • Refining</p>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  dialog.querySelector('.close-btn').onclick = () => {
    dialog.classList.add('fade-out');
    setTimeout(() => dialog.remove(), 300);
  };

  // Optional: auto-remove after 15s in case the backend hangs
  setTimeout(() => {
    if (document.body.contains(dialog)) {
      dialog.classList.add('fade-out');
      setTimeout(() => dialog.remove(), 300);
    }
  }, 20000);
}

function showAgenticResult(data, taskType) {
  contentLog('info', 'Showing result dialog', {
    taskType,
    hasResult: !!data.result
  });

  const existingPopup = document.querySelector('.agentic-float');
  if (existingPopup) existingPopup.remove();

  const dialog = document.createElement('div');
  dialog.className = 'agentic-float';
  dialog.innerHTML = `
    <div class="agentic-float-inner">
      <div class="agentic-float-header">
        <strong>🤖 ${taskType.charAt(0).toUpperCase() + taskType.slice(1)} Result</strong>
        <button class="close-btn">&times;</button>
      </div>
      <div class="agentic-float-body">
        ${data.result ? data.result.replace(/\n/g, '<br>') : 'No result.'}
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  // Auto-dismiss after 7 seconds
  setTimeout(() => {
    dialog.classList.add('fade-out');
    setTimeout(() => dialog.remove(), 300);
  }, 20000);

  // Manual close
  dialog.querySelector('.close-btn').onclick = () => {
    dialog.classList.add('fade-out');
    setTimeout(() => dialog.remove(), 300);
  };
}

function showErrorPopup(message) {
  contentLog('error', 'Showing error dialog', { message });

  const existing = document.querySelector('.agentic-float');
  if (existing) existing.remove();

  const dialog = document.createElement('div');
  dialog.className = 'agentic-float';
  dialog.innerHTML = `
    <div class="agentic-float-inner">
      <div class="agentic-float-header">
        <strong>❌ Error</strong>
        <button class="close-btn">&times;</button>
      </div>
      <div class="agentic-float-body">
        ${message}
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  dialog.querySelector('.close-btn').onclick = () => {
    dialog.classList.add('fade-out');
    setTimeout(() => dialog.remove(), 300);
  };

  // Auto-dismiss after 7 seconds
  setTimeout(() => {
    if (document.body.contains(dialog)) {
      dialog.classList.add('fade-out');
      setTimeout(() => dialog.remove(), 300);
    }
  }, 20000);
}

// Helper function to calculate quality score
function calculateQuality(steps) {
  if (!steps || steps.length === 0) return 0;
  const totalConfidence = steps.reduce((acc, step) => acc + (step.confidence || 0.5), 0);
  return (totalConfidence / steps.length * 100).toFixed(0);
}

async function processWithAgenticAI(selectedText, taskType) {
  const API_BASE_URL = 'http://localhost:8000';
  
  contentLog('info', 'Starting agentic AI process', {
    taskType,
    textLength: selectedText.length,
    url: window.location.href
  });

  // Show loading popup
  showLoadingPopup();
  
  const startTime = Date.now();
  
  try {
    const requestPayload = {
      text: selectedText,
      task_type: taskType,
      context: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        page_title: document.title
      },
      user_preferences: {
        format: 'detailed',
        tone: 'professional'
      }
    };
    
    contentLog('info', 'Sending request to FastAPI server', {
      endpoint: `${API_BASE_URL}/agent/execute`,
      payload: requestPayload
    });
    
    const response = await fetch(`${API_BASE_URL}/agent/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Agentic-AI-Extension/1.0'
      },
      body: JSON.stringify(requestPayload)
    });
    
    const responseTime = Date.now() - startTime;
    contentLog('info', 'Received response from FastAPI server', {
      status: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      ok: response.ok
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    contentLog('info', 'Response parsed successfully', {
      success: data.success,
      hasResult: !!data.result,
      stepsCount: data.steps?.length || 0,
      executionTime: data.execution_time
    });
    
    if (data.success) {
      contentLog('info', 'Task completed successfully', {
        taskType,
        resultLength: data.result?.length || 0,
        totalTime: `${responseTime}ms`
      });
      showAgenticResult(data, taskType);
    } else {
      contentLog('error', 'Task execution failed', {
        error: data.result || 'Unknown error',
        taskType
      });
      showErrorPopup(data.result || 'Task execution failed');
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    contentLog('error', 'Request failed', {
      error: error.message,
      responseTime: `${responseTime}ms`,
      taskType,
      url: API_BASE_URL
    });
    
    let errorMessage = 'Failed to connect to Agentic AI server.';
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage += ' Make sure the FastAPI server is running on localhost:8000';
    } else if (error.message.includes('HTTP')) {
      errorMessage += ` Server responded with: ${error.message}`;
    } else {
      errorMessage += ` Error: ${error.message}`;
    }
    
    showErrorPopup(errorMessage);
  }
}

// Initialize content script
contentLog('info', 'Content script loaded', {
  url: window.location.href,
  title: document.title
});