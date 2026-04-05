// Scythe Executor - Real API Integration
class ScytheExecutor {
    constructor() {
        this.api = null;
        this.isConnected = false;
        this.healthCheckInterval = null;
        this.teleportCheckInterval = null;
        this.clientInfoInterval = null;
        this.initializeElements();
        this.bindEvents();
        this.initializeEditor();
        this.initializeAPI();
        this.addPolish();
    }

    async initializeAPI() {
        try {
            // Only use real ScytheAPI - no fallbacks
            if (window.ScytheAPI) {
                this.api = window.ScytheAPI;
                await this.checkAPIConnection();
            } else if (window.external) {
                // Use C# WebBrowser integration
                this.api = window.external;
                await this.checkAPIConnection();
            } else {
                throw new Error('ScytheAPI not available - please inject API first');
            }
        } catch (error) {
            this.log('Failed to initialize API: ' + error.message, 'error');
            this.updateStatus('API unavailable', 'error');
            this.isConnected = false;
            // Don't start monitoring if API is not available
        }
    }

    async checkAPIConnection() {
        try {
            console.log('Attempting to connect to API...');
            
            // Check if already attached by trying to get client info first
            if (this.api.GetClientInfo) {
                try {
                    const clientInfo = await this.api.GetClientInfo();
                    if (clientInfo && clientInfo !== "") {
                        // Already connected, no need to attach
                        this.isConnected = true;
                        this.autoActivate();
                        this.log('ScytheAPI already connected', 'success');
                        this.startMonitoring();
                        return;
                    }
                } catch (error) {
                    // Not connected yet, try to attach
                }
            }

            // Try to attach
            const attached = await this.api.Attach();
            console.log('API Attach result:', attached);
            
            if (attached) {
                this.isConnected = true;
                this.autoActivate();
                this.log('ScytheAPI connected successfully', 'success');
                this.startMonitoring();
            } else {
                this.log('Failed to attach to ScytheAPI - not injected or not running', 'error');
                this.updateStatus('Connection failed', 'error');
            }
        } catch (error) {
            console.error('API connection error:', error);
            this.log('API connection error: ' + error.message, 'error');
            this.updateStatus('Connection failed', 'error');
            this.isConnected = false;
        }
    }

    initializeElements() {
        // Navigation
        this.statusBadge = document.getElementById('statusBadge');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingText = document.getElementById('loadingText');

        // Info
        this.pidInfo = document.getElementById('pidInfo');
        this.gameInfo = document.getElementById('gameInfo');
        this.playerInfo = document.getElementById('playerInfo');

        // Editor
        this.scriptEditor = document.getElementById('scriptEditor');
        this.lineNumbers = document.getElementById('lineNumbers');
        this.outputConsole = document.getElementById('outputConsole');

        // Buttons
        this.executeBtn = document.getElementById('executeBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.loadBtn = document.getElementById('loadBtn');
        this.clearConsoleBtn = document.getElementById('clearConsoleBtn');

        // Status
        this.executionStatus = document.getElementById('executionStatus');
    }

    bindEvents() {
        // Actions
        this.executeBtn.addEventListener('click', () => this.executeScript());
        this.clearBtn.addEventListener('click', () => this.clearEditor());
        this.saveBtn.addEventListener('click', () => this.saveScript());
        this.loadBtn.addEventListener('click', () => this.loadScript());

        // Editor
        this.scriptEditor.addEventListener('input', () => this.updateLineNumbers());
        this.scriptEditor.addEventListener('scroll', () => this.syncLineNumbers());

        // Console
        this.clearConsoleBtn.addEventListener('click', () => this.clearConsole());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch(e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.executeScript();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveScript();
                        break;
                    case 'o':
                        e.preventDefault();
                        this.loadScript();
                        break;
                }
            }
        });

        // Add ripple effects to buttons
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.createRipple(e, btn));
        });
    }

    initializeEditor() {
        this.updateLineNumbers();
        this.loadDefaultScript();
    }

    async autoActivate() {
        try {
            this.updateConnectionStatus(true);
            this.executeBtn.disabled = false;
            
            // Get real client info from API
            if (this.api && this.api.GetClientInfo) {
                try {
                    const clientInfo = await this.api.GetClientInfo();
                    if (clientInfo) {
                        const [playerName, userId, jobId, placeId] = clientInfo.split('|');
                        this.playerInfo.textContent = playerName || 'Unknown';
                        this.pidInfo.textContent = userId || 'Unknown';
                        this.gameInfo.textContent = placeId || 'Unknown';
                        
                        // Load user avatar if we have a userId
                        if (userId && userId !== 'Unknown') {
                            this.loadUserAvatar(userId);
                        }
                    } else {
                        this.updateClientInfoDisplay('Unknown', 'Unknown', 'Unknown');
                    }
                } catch (error) {
                    this.log('Failed to get client info: ' + error.message, 'warning');
                    this.updateClientInfoDisplay('Unknown', 'Unknown', 'Unknown');
                }
            } else {
                this.updateClientInfoDisplay('Unknown', 'Unknown', 'Unknown');
            }
            
            this.log('Scythe API detected - Executor ready', 'success');
            this.updateStatus('Ready', 'success');
            
            // Start real client info updates
            this.startClientInfoUpdates();
            
        } catch (error) {
            this.log('Failed to activate: ' + error.message, 'error');
            this.updateStatus('Activation failed', 'error');
            this.isConnected = false;
        }
    }

    async loadUserAvatar(userId) {
        try {
            const avatarImage = document.getElementById('avatarImage');
            const avatarPlaceholder = document.getElementById('avatarPlaceholder');
            
            console.log('Loading avatar for userId:', userId);
            
            // Use local API endpoint to bypass CORS
            const apiUrl = `http://localhost:8765/api/avatar?userId=${userId}`;
            
            console.log('Fetching from:', apiUrl);
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            console.log('API Response:', data);
            
            if (data && data.success && data.imageUrl) {
                const imageUrl = data.imageUrl;
                
                console.log('Image URL:', imageUrl);
                
                avatarImage.src = imageUrl;
                avatarImage.onload = () => {
                    console.log('Avatar loaded successfully');
                    avatarImage.style.display = 'block';
                    avatarPlaceholder.style.display = 'none';
                };
                avatarImage.onerror = (e) => {
                    console.error('Failed to load avatar image:', e);
                    avatarImage.style.display = 'none';
                    avatarPlaceholder.style.display = 'flex';
                };
            } else {
                console.warn('No image URL in API response');
                avatarImage.style.display = 'none';
                avatarPlaceholder.style.display = 'flex';
            }
        } catch (error) {
            console.error('Failed to load avatar:', error);
            const avatarImage = document.getElementById('avatarImage');
            const avatarPlaceholder = document.getElementById('avatarPlaceholder');
            avatarImage.style.display = 'none';
            avatarPlaceholder.style.display = 'flex';
        }
    }

    updateClientInfoDisplay(playerName, userId, placeId) {
        this.playerInfo.textContent = playerName;
        this.pidInfo.textContent = userId;
        this.gameInfo.textContent = placeId;
    }

    async startClientInfoUpdates() {
        // Clear any existing interval
        if (this.clientInfoInterval) {
            clearInterval(this.clientInfoInterval);
        }
        
        // Update client info every 5 seconds
        this.clientInfoInterval = setInterval(async () => {
            if (this.isConnected && this.api && this.api.GetClientInfo) {
                try {
                    const clientInfo = await this.api.GetClientInfo();
                    if (clientInfo) {
                        const [playerName, userId, jobId, placeId] = clientInfo.split('|');
                        this.playerInfo.textContent = playerName || 'Unknown';
                        this.pidInfo.textContent = userId || 'Unknown';
                        this.gameInfo.textContent = placeId || 'Unknown';
                    } else {
                        this.updateClientInfoDisplay('Unknown', 'Unknown', 'Unknown');
                    }
                } catch (error) {
                    // Silently fail updates but log warning
                    console.warn('Client info update failed:', error.message);
                }
            }
        }, 5000);
    }

    updateLineNumbers() {
        const lines = this.scriptEditor.value.split('\n').length;
        let numbers = '';
        for (let i = 1; i <= lines; i++) {
            numbers += i + '\n';
        }
        this.lineNumbers.innerHTML = numbers.replace(/\n/g, '<br>');
    }

    syncLineNumbers() {
        this.lineNumbers.scrollTop = this.scriptEditor.scrollTop;
    }

    updateConnectionStatus(connected) {
        if (connected) {
            this.statusBadge.classList.add('connected');
            this.statusBadge.querySelector('span').textContent = 'API Active';
        } else {
            this.statusBadge.classList.remove('connected');
            this.statusBadge.querySelector('span').textContent = 'API Inactive';
        }
    }

    async executeScript() {
        if (!this.isConnected || !this.api) {
            this.log('API not available', 'error');
            this.updateStatus('API unavailable', 'error');
            return;
        }

        const script = this.scriptEditor.value.trim();
        if (!script) {
            this.log('No script to execute', 'warning');
            this.updateStatus('No script', 'warning');
            return;
        }

        this.log('Executing script...', 'info');
        this.updateStatus('Executing...', 'info');
        this.executeBtn.disabled = true;

        try {
            const startTime = performance.now();
            
            // Real API call to execute script
            const result = await this.api.Execute(script);
            
            const endTime = performance.now();
            const executionTime = (endTime - startTime).toFixed(2);
            
            if (result === 0) {
                this.log(`Script executed successfully (${executionTime}ms)`, 'success');
                this.updateStatus(`Executed (${executionTime}ms)`, 'success');
            } else {
                const error = this.api.GetLastError ? this.api.GetLastError() : `Execution failed with code ${result}`;
                this.log(`Script execution failed: ${error}`, 'error');
                this.updateStatus('Execution failed', 'error');
            }
            
        } catch (error) {
            this.log('Script execution error: ' + error.message, 'error');
            this.updateStatus('Execution error', 'error');
        } finally {
            this.executeBtn.disabled = false;
        }
    }

    clearEditor() {
        this.scriptEditor.value = '';
        this.updateLineNumbers();
        this.log('Editor cleared', 'info');
        this.updateStatus('Ready', 'info');
    }

    clearConsole() {
        this.outputConsole.innerHTML = '';
        this.log('Console cleared', 'info');
    }

    async saveScript() {
        const script = this.scriptEditor.value;
        if (!script.trim()) {
            this.log('Nothing to save', 'warning');
            return;
        }

        try {
            const blob = new Blob([script], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scythe_script_${Date.now()}.lua`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.log('Script saved successfully', 'success');
            this.updateStatus('Script saved', 'success');
            
        } catch (error) {
            this.log('Failed to save script: ' + error.message, 'error');
            this.updateStatus('Save failed', 'error');
        }
    }

    async loadScript() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.lua,.txt';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const text = await file.text();
                    this.scriptEditor.value = text;
                    this.updateLineNumbers();
                    this.log(`Loaded script: ${file.name}`, 'success');
                    this.updateStatus('Script loaded', 'success');
                }
            };
            input.click();
        } catch (error) {
            this.log('Failed to load script: ' + error.message, 'error');
            this.updateStatus('Load failed', 'error');
        }
    }

    formatScript() {
        let script = this.scriptEditor.value;
        const lines = script.split('\n');
        let indentLevel = 0;
        const formattedLines = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.includes('end') || trimmed.includes('}') || trimmed.includes(')')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            const formatted = '    '.repeat(indentLevel) + trimmed;
            
            if (trimmed.includes('function') || trimmed.includes('if') || 
                trimmed.includes('for') || trimmed.includes('while') || 
                trimmed.includes('do') || trimmed.includes('{') || trimmed.includes('(')) {
                indentLevel++;
            }
            
            return formatted;
        });
        
        this.scriptEditor.value = formattedLines.join('\n');
        this.updateLineNumbers();
        this.log('Script formatted', 'info');
        this.updateStatus('Formatted', 'info');
    }

    toggleFullscreen() {
        const editorSection = document.querySelector('.editor-section');
        if (!document.fullscreenElement) {
            editorSection.requestFullscreen();
            this.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            this.log('Entered fullscreen mode', 'info');
        } else {
            document.exitFullscreen();
            this.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            this.log('Exited fullscreen mode', 'info');
        }
    }

    loadDefaultScript() {
        const defaultScript = `-- Scythe Executor - Premium Script
-- Professional Roblox Script Execution

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local StarterGui = game:GetService("StarterGui")

-- Create sophisticated notification
local success = pcall(function()
    StarterGui:SetCore("ChatMakeSystemMessage", {
        Color = Color3.fromRGB(192, 192, 192);
        Font = Enum.Font.SourceSansBold;
        Text = "[Scythe] Premium Executor loaded successfully!";
    })
end)

if success then
    print("[Scythe] Script executed successfully!")
else
    warn("[Scythe] Notification system unavailable")
end

-- Additional functionality can be added here
print("[Scythe] Ready for execution")`;

        this.scriptEditor.value = defaultScript;
        this.updateLineNumbers();
    }

    startMonitoring() {
        // Clear any existing intervals
        this.clearMonitoring();
        
        // Monitor API connection status every 5 seconds
        this.healthCheckInterval = setInterval(() => {
            if (this.api && this.isConnected) {
                this.checkAPIHealth();
            }
        }, 5000);
    }

    clearMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        if (this.clientInfoInterval) {
            clearInterval(this.clientInfoInterval);
            this.clientInfoInterval = null;
        }
    }

    async checkAPIHealth() {
        try {
            // Simple health check - try to get client info
            if (this.api && this.api.GetClientInfo) {
                await this.api.GetClientInfo();
            }
        } catch (error) {
            this.log('API connection lost', 'warning');
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.executeBtn.disabled = true;
            // Stop monitoring when connection is lost
            this.clearMonitoring();
        }
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `console-entry ${type}`;
        entry.innerHTML = `
            <span class="console-time">[${timestamp}]</span>
            <span class="console-message">${message}</span>
        `;
        
        this.outputConsole.appendChild(entry);
        this.outputConsole.scrollTop = this.outputConsole.scrollHeight;
    }

    updateStatus(text, type = 'info') {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        
        this.executionStatus.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            ${text}
        `;
    }

    showLoading(text = 'Loading...') {
        this.loadingText.textContent = text;
        this.loadingOverlay.classList.add('active');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('active');
    }

    createRipple(event, button) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }

    addPolish() {
        // Add smooth transitions for all interactive elements
        document.querySelectorAll('.btn, .action-btn').forEach(el => {
            el.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        });

        // Add hover effects to info cards
        document.querySelectorAll('.info-card, .teleport-monitor').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            });
            
            card.style.transition = 'all 0.3s ease';
        });

        // Add focus states to editor
        this.scriptEditor.addEventListener('focus', () => {
            this.scriptEditor.parentElement.style.boxShadow = '0 0 0 2px rgba(192, 192, 192, 0.2)';
        });
        
        this.scriptEditor.addEventListener('blur', () => {
            this.scriptEditor.parentElement.style.boxShadow = 'none';
        });
    }
}

// Initialize with smooth fade-in
document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
        window.scytheExecutor = new ScytheExecutor();
    }, 100);
});

// Add ripple effect styles
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
