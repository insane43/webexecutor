# Scythe Web Executor

A modern, web-based interface for the Scythe Executor with real-time API integration.

## 🚀 Quick Start

### Option 1: Direct Access (Recommended)
Simply open `index.html` in your browser while the Scythe API is injected into Roblox.

### Option 2: Via Launcher
Open `WebExecutorLauncher.html` for a simple launcher interface.

### Option 3: Integrated with C# UI
The Web Executor can run alongside the main Scythe UI - just open the HTML file separately.

## 📋 Requirements

- **Scythe API must be injected** into Roblox
- Modern web browser (Chrome, Edge, Firefox)
- Active Roblox game session

## ✨ Features

- **Real-time script execution** - Execute Lua scripts directly in Roblox
- **Live client info** - See player name, PID, and game info
- **Teleport monitoring** - Auto-detects and monitors game teleports
- **Script management** - Save, load, and format scripts
- **Modern UI** - Sleek black & silver interface
- **No installation** - Just open the HTML file

## 🎯 How to Use

1. **Inject Scythe API** into your Roblox game
2. **Open `index.html`** in your browser
3. **Wait for connection** - The interface will auto-detect the API
4. **Write your script** in the editor
5. **Click Execute** to run your script

## 🔧 Integration

The Web Executor automatically connects to the Scythe API through:
- C# WebBrowser control integration
- Direct JavaScript API calls
- Real-time status monitoring

## 📁 Files

- `index.html` - Main web executor interface
- `styles.css` - Black & silver theme styling
- `script.js` - Real API integration logic
- `integration.js` - API bridge for C# integration
- `WebExecutorLauncher.html` - Simple launcher page
- `README.md` - This file

## 🎨 Interface

- **Left Panel**: Connection info, teleport status, actions
- **Center Panel**: Script editor with line numbers
- **Right Panel**: Console output with timestamps
- **Footer**: Execution status and timing

## ⚡ Keyboard Shortcuts

- `Ctrl+S` - Save script
- `Ctrl+O` - Load script
- `Ctrl+Enter` - Execute script

## 🔒 Security

- Only works when Scythe API is properly injected
- No external dependencies or tracking
- All processing happens locally

## 💡 Tips

- The Web Executor can run **alongside** the main Scythe UI
- You can have **multiple browser tabs** open with the executor
- Scripts are **not saved automatically** - use the Save button
- The interface **auto-updates** client info every 5 seconds

## 🐛 Troubleshooting

**"API not available" error:**
- Make sure Scythe API is injected into Roblox
- Ensure you're in an active game session
- Try refreshing the page

**Scripts not executing:**
- Check if you're connected (green status indicator)
- Verify the script has no syntax errors
- Check the console for error messages

**No client info showing:**
- Wait a few seconds for the API to connect
- Make sure you're in a Roblox game (not menu)
- Check if the API is properly injected

## 📝 Notes

- This is a **standalone** web interface
- Works with the **real Scythe API** - no mock data
- Designed for **ease of use** and **modern aesthetics**
- Can be used **anytime** the API is injected

---

**Scythe Web Executor v1.0** - Modern web interface for Roblox script execution
