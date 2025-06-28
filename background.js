chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "explainWithGemini",
      title: "Explain with Gemini",
      contexts: ["selection"]
    });
  });
  
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "explainWithGemini") {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: sendToGeminiAndShowPopup,
        args: [info.selectionText]
      });
    }
  });
  
  // This is injected into the tab
  async function sendToGeminiAndShowPopup(selectedText) {
    const API_KEY = 'AIzaSyBKDkT2woZxIz0eXr2_PV5GsVguU8nd15Q';
    const explainPrompt = `Explain this code or text clearly and concisely give bullet points:\n\n"${selectedText}"`;
  
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: explainPrompt }] }]
      })
    });
  
    const data = await response.json();
    const explanation = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Couldn't generate explanation.";
  
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = chrome.runtime.getURL("popup.css");
    document.head.appendChild(style);
  
    const popup = document.createElement("div");
    popup.className = "gemini-popup";
    popup.innerHTML = `
      <div class="popup-inner">
        <button class="close-btn">&times;</button>
        <p>${explanation}</p>
      </div>
    `;
  
    document.body.appendChild(popup);
  
    popup.querySelector(".close-btn").onclick = () => {
      popup.classList.add("fade-out");
      setTimeout(() => popup.remove(), 300);
    };
  }
  