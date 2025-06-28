chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "summarizeWithGemini",
      title: "Summarize with Gemini",
      contexts: ["selection"]
    });
  
    chrome.contextMenus.create({
      id: "replyWithGemini",
      title: "Reply with Gemini",
      contexts: ["selection"]
    });
  });
  
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const selectedText = info.selectionText;
    const isReply = info.menuItemId === "replyWithGemini";
    const prompt = isReply
      ? `You're a helpful assistant. Write a concise, polite, professional reply to the email below:\n\n"${selectedText}"`
      : `Summarize the following text clearly and briefly:\n\n"${selectedText}"`;
  
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: generateGeminiPopup,
      args: [prompt, isReply]
    });
  });
  
  async function generateGeminiPopup(prompt, isReply) {
    const API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + API_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });
  
  
    const data = await response.json();
    const output = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
  
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = chrome.runtime.getURL("popup.css");
    document.head.appendChild(style);
  
    const popup = document.createElement("div");
    popup.className = "gemini-popup";
    popup.innerHTML = `
      <div class="popup-inner">
        <button class="close-btn">&times;</button>
        <p>${output.replace(/\n/g, "<br>")}</p>
        ${isReply ? `<button class="copy-btn">📋 Copy Reply</button>` : ""}
      </div>
    `;
  
    document.body.appendChild(popup);
  
    popup.querySelector(".close-btn").onclick = () => {
      popup.classList.add("fade-out");
      setTimeout(() => popup.remove(), 300);
    };
  
    if (isReply) {
      popup.querySelector(".copy-btn").onclick = () => {
        navigator.clipboard.writeText(output);
        const btn = popup.querySelector(".copy-btn");
        btn.textContent = "✅ Copied!";
        setTimeout(() => (btn.textContent = "📋 Copy Reply"), 1500);
      };
    }
  }
  