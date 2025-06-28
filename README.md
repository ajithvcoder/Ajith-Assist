# Ask Ajith - Chrome Extension

A powerful Chrome extension that uses Google's Gemini 2.0 Flash AI model to provide intelligent text summarization and email reply generation through right-click context menus.

![](./assets/version-1-usage.gif)

## 🚀 Features

- **Smart Text Summarization**: Summarize any selected text with AI-powered insights
- **Email Reply Generation**: Generate professional, polite email replies from selected text
- **Context Menu Integration**: Easy access through right-click menus on any webpage
- **Clean Popup Interface**: Beautiful, animated popup displays for AI responses
- **Copy to Clipboard**: One-click copying of generated replies
- **Cross-Platform**: Works on any website with text content

## 🎯 Use Cases

- **Content Summarization**: Quickly summarize articles, documents, or long text passages
- **Email Management**: Generate professional replies to emails and messages
- **Code Explanation**: Get AI-powered explanations of code snippets
- **Document Analysis**: Summarize reports, papers, or any written content
- **Communication Assistance**: Create polite, professional responses for various contexts

## 📦 Installation

### Method 1: Load as Unpacked Extension (Development)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `Office-Assist` folder
5. The extension should now appear in your extensions list

### Method 2: Install from Chrome Web Store (When Available)

*Note: This extension is not currently published on the Chrome Web Store*

## 🎮 Usage

### Text Summarization

1. **Select Text**: Highlight any text on any webpage
2. **Right-Click**: Right-click on the selected text
3. **Choose Option**: Select "Summarize with Gemini" from the context menu
4. **View Result**: A popup will appear with the AI-generated summary

### Email Reply Generation

1. **Select Email Text**: Highlight the email content you want to reply to
2. **Right-Click**: Right-click on the selected text
3. **Choose Option**: Select "Reply with Gemini" from the context menu
4. **View Result**: A popup will appear with a professional reply
5. **Copy Reply**: Click the "📋 Copy Reply" button to copy the response to clipboard

## 🛠️ Technical Details

### File Structure

```
Office-Assist/
├── manifest.json      # Extension configuration
├── background.js      # Service worker and context menu logic
├── content.js         # Content script (currently empty)
├── popup.css          # Styling for popup interface
├── assets/            # Asset directory (empty)
└── README.md          # This file
```

### Permissions

- **contextMenus**: Required to create right-click context menu options
- **scripting**: Required to inject scripts into web pages
- **activeTab**: Required to access the currently active tab
- **host_permissions**: Access to all URLs for cross-site functionality

### Technologies Used

- **Manifest V3**: Latest Chrome extension manifest format
- **Google Gemini 2.0 Flash API**: AI model for text processing
- **Context Menus API**: Chrome extension context menu integration
- **Scripting API**: Dynamic script injection
- **CSS Animations**: Smooth popup transitions

### API Integration

The extension uses Google's Gemini 2.0 Flash model through the Generative Language API:

```javascript
const API_KEY = 'YOUR_API_KEY';
const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + API_KEY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
    })
});
```

## 🎨 User Interface

### Popup Design

- **Centered Position**: Appears in the center of the screen
- **Clean Styling**: White background with subtle shadows and rounded corners
- **Smooth Animations**: Fade-in and fade-out transitions
- **Responsive Layout**: Adapts to content length
- **Close Button**: Easy dismissal with the × button

### Context Menu Options

- **Summarize with Gemini**: Generates concise summaries
- **Reply with Gemini**: Creates professional email replies

## 🔧 Development

### Prerequisites

- Google Chrome browser
- Basic knowledge of JavaScript and Chrome Extensions
- Google Gemini API key (for testing)

### Local Development

1. Clone the repository
2. Update the API key in `background.js` if needed
3. Go to `chrome://extensions/` and click "Load unpacked"
4. Select the `Office-Assist` folder
5. Test the extension on any webpage

### Adding New Features

To add new context menu options:

1. Update `background.js` to create new menu items
2. Add corresponding click handlers
3. Modify the prompt generation logic
4. Update the popup display as needed

Example:
```javascript
chrome.contextMenus.create({
  id: "explainWithGemini",
  title: "Explain with Gemini",
  contexts: ["selection"]
});
```

## 🔒 Security & Privacy

- **API Key**: Currently uses a hardcoded API key (should be moved to environment variables for production)
- **Data Processing**: Text is sent to Google's Gemini API for processing
- **No Data Storage**: The extension doesn't store any user data locally
- **Minimal Permissions**: Only requests necessary permissions for functionality

## 🐛 Troubleshooting

### Extension Not Working

- Ensure the extension is properly loaded in Chrome
- Check the browser console for any error messages
- Verify that the API key is valid and has proper permissions

### Context Menu Not Appearing

- Make sure text is selected before right-clicking
- Check that the extension is enabled
- Try refreshing the webpage

### API Errors

- Verify your Gemini API key is valid
- Check your API quota and billing status
- Ensure you have proper access to the Gemini 2.0 Flash model

## 📝 API Key Setup

To use your own API key:

1. Get a Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Replace the API key in `background.js`:
   ```javascript
   const API_KEY = 'YOUR_API_KEY_HERE';
   ```
3. Reload the extension

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source. Feel free to modify and distribute as needed.

## 🆘 Support

For issues, questions, or feature requests, please open an issue in the repository.

## 📈 Version History

- **v1.0**: Initial release with summarization and reply generation features

---

**Note**: This extension requires an active internet connection and a valid Google Gemini API key to function properly.
