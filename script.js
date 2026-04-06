// Scythe Executor - Real API Integration
class ScytheExecutor {
    constructor() {
        this.api = null;
        this.isConnected = false;
        this.healthCheckInterval = null;
        this.teleportCheckInterval = null;
        this.clientInfoInterval = null;
        this.tabs = [];
        this.activeTabId = 1;
        this.nextTabId = 2;
        this.contextMenuTabId = null;
        this.settings = this.loadSettings();
        this.initializeElements();
        this.bindEvents();
        this.initializeTabs();
        this.initializeSettings();
        this.applySettings();
        this.initializeEditor();
        this.initializeAPI();
        this.addPolish();
    }

    getDefaultSettings() {
        return {
            theme: 'dark',
            uiScale: 100,
            animationsEnabled: true,
            blurEffects: true,
            fontSize: 14,
            tabSize: 4,
            wordWrap: true,
            lineNumbers: true,
            minimap: false,
            autoSave: true,
            autoExecute: false,
            clearConsoleOnExecute: false,
            showExecutionTime: true,
            soundEffects: true,
            maxConsoleLines: 200,
            apiEndpoint: 'ws://localhost:8080',
            connectionTimeout: 5000,
            autoReconnect: true,
            healthCheck: true,
            healthCheckInterval: 3000,
            developerMode: false,
            verboseLogging: false,
            experimentalFeatures: false
        };
    }

    loadSettings() {
        const saved = localStorage.getItem('scytheSettings');
        if (saved) {
            try {
                return { ...this.getDefaultSettings(), ...JSON.parse(saved) };
            } catch (e) {
                return this.getDefaultSettings();
            }
        }
        return this.getDefaultSettings();
    }

    saveSettings() {
        localStorage.setItem('scytheSettings', JSON.stringify(this.settings));
        this.applySettings();
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
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());
        
        // Tabs
        document.getElementById('newTabBtn').addEventListener('click', () => this.createNewTab());
        
        // Prevent default context menu on tabs container
        const tabsBar = document.getElementById('tabsBar');
        if (tabsBar) {
            tabsBar.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });
        }
        
        // Context menu
        this.setupContextMenu();
        
        // Actions
        this.executeBtn.addEventListener('click', () => this.executeScript());
        this.clearBtn.addEventListener('click', () => this.clearEditor());
        this.saveBtn.addEventListener('click', () => this.saveScript());
        this.loadBtn.addEventListener('click', () => this.loadScript());

        // Editor events handled by Monaco

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

    initializeTabs() {
        // Initialize first tab
        this.tabs.push({
            id: 1,
            name: 'Script 1',
            content: ''
        });
    }

    createNewTab() {
        const newTab = {
            id: this.nextTabId,
            name: `Script ${this.nextTabId}`,
            content: '',
            isNew: true
        };
        
        this.tabs.push(newTab);
        this.renderTabs();
        this.switchTab(this.nextTabId);
        this.nextTabId++;
        
        // Remove isNew flag after animation
        setTimeout(() => {
            newTab.isNew = false;
        }, 300);
    }

    renderTabs() {
        const tabsBar = document.getElementById('tabsBar');
        tabsBar.innerHTML = this.tabs.map(tab => `
            <div class="tab ${tab.id === this.activeTabId ? 'active' : ''} ${tab.isNew ? 'tab-new' : ''}" data-tab-id="${tab.id}">
                <span class="tab-name">${tab.name}</span>
                ${this.tabs.length > 1 ? `
                    <button class="tab-close" data-tab-id="${tab.id}" title="Close tab">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
        `).join('');
        
        // Bind tab events
        document.querySelectorAll('.tab').forEach(tabEl => {
            const tabId = parseInt(tabEl.getAttribute('data-tab-id'));
            
            // Prevent default context menu
            tabEl.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showContextMenu(e, tabId);
                return false;
            };
            
            tabEl.addEventListener('click', (e) => {
                if (!e.target.closest('.tab-close')) {
                    this.switchTab(tabId);
                }
            });
        });
        
        document.querySelectorAll('.tab-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tabId = parseInt(closeBtn.getAttribute('data-tab-id'));
                this.closeTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        // Save current tab content
        const currentTab = this.tabs.find(t => t.id === this.activeTabId);
        if (currentTab && window.monacoEditorAPI) {
            currentTab.content = window.monacoEditorAPI.getValue();
        }
        
        // Switch to new tab
        this.activeTabId = tabId;
        const newTab = this.tabs.find(t => t.id === tabId);
        
        if (newTab && window.monacoEditorAPI) {
            window.monacoEditorAPI.setValue(newTab.content);
        }
        
        this.renderTabs();
    }

    closeTab(tabId) {
        if (this.tabs.length === 1) {
            this.log('Cannot close the last tab', 'warning');
            return;
        }
        
        const tabIndex = this.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        this.tabs.splice(tabIndex, 1);
        
        // If closing active tab, switch to another
        if (this.activeTabId === tabId) {
            const newActiveTab = this.tabs[Math.max(0, tabIndex - 1)];
            this.activeTabId = newActiveTab.id;
            if (window.monacoEditorAPI) {
                window.monacoEditorAPI.setValue(newActiveTab.content);
            }
        }
        
        this.renderTabs();
    }

    setupContextMenu() {
        const contextMenu = document.getElementById('tabContextMenu');
        
        // Hide context menu on click outside
        document.addEventListener('click', () => {
            contextMenu.classList.remove('show');
        });
        
        // Context menu actions
        document.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.getAttribute('data-action');
                this.handleContextMenuAction(action);
                contextMenu.classList.remove('show');
            });
        });
    }

    showContextMenu(e, tabId) {
        e.preventDefault();
        e.stopPropagation();
        
        this.contextMenuTabId = tabId;
        const contextMenu = document.getElementById('tabContextMenu');
        
        // Position the menu
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
        
        // Show the menu
        contextMenu.classList.add('show');
    }

    handleContextMenuAction(action) {
        switch(action) {
            case 'rename':
                this.renameTab(this.contextMenuTabId);
                break;
            case 'duplicate':
                this.duplicateTab(this.contextMenuTabId);
                break;
            case 'close':
                this.closeTab(this.contextMenuTabId);
                break;
            case 'closeOthers':
                this.closeOtherTabs(this.contextMenuTabId);
                break;
            case 'closeAll':
                this.closeAllTabs();
                break;
        }
    }

    async renameTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        const newName = await this.showPrompt('Enter new tab name:', tab.name, 'Rename Tab');
        if (newName && newName.trim()) {
            tab.name = newName.trim();
            this.renderTabs();
        }
    }

    duplicateTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        const newTab = {
            id: this.nextTabId,
            name: `${tab.name} (Copy)`,
            content: tab.content,
            isNew: true
        };
        
        this.tabs.push(newTab);
        this.renderTabs();
        this.switchTab(this.nextTabId);
        this.nextTabId++;
        
        setTimeout(() => {
            newTab.isNew = false;
        }, 300);
    }

    closeOtherTabs(keepTabId) {
        if (this.tabs.length === 1) return;
        
        this.tabs = this.tabs.filter(t => t.id === keepTabId);
        this.activeTabId = keepTabId;
        
        const keepTab = this.tabs[0];
        if (window.monacoEditorAPI) {
            window.monacoEditorAPI.setValue(keepTab.content);
        }
        
        this.renderTabs();
    }

    closeAllTabs() {
        this.tabs = [{
            id: this.nextTabId,
            name: `Script ${this.nextTabId}`,
            content: ''
        }];
        
        this.activeTabId = this.nextTabId;
        this.nextTabId++;
        
        if (window.monacoEditorAPI) {
            window.monacoEditorAPI.setValue('');
        }
        
        this.renderTabs();
    }

    // Custom Modal Methods
    showPrompt(message, defaultValue = '', title = 'Input Required') {
        return new Promise((resolve) => {
            const modal = document.getElementById('customPromptModal');
            const input = document.getElementById('promptModalInput');
            const messageEl = document.getElementById('promptModalMessage');
            const titleEl = document.getElementById('promptModalTitle');
            const confirmBtn = document.getElementById('promptModalConfirm');
            const cancelBtn = document.getElementById('promptModalCancel');
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            input.value = defaultValue;
            
            modal.classList.add('show');
            setTimeout(() => input.focus(), 100);
            
            const handleConfirm = () => {
                const value = input.value;
                cleanup();
                resolve(value);
            };
            
            const handleCancel = () => {
                cleanup();
                resolve(null);
            };
            
            const handleKeyPress = (e) => {
                if (e.key === 'Enter') {
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            
            const cleanup = () => {
                modal.classList.remove('show');
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                input.removeEventListener('keypress', handleKeyPress);
            };
            
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            input.addEventListener('keypress', handleKeyPress);
        });
    }

    showConfirm(message, title = 'Confirm Action') {
        return new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            const messageEl = document.getElementById('confirmModalMessage');
            const titleEl = document.getElementById('confirmModalTitle');
            const confirmBtn = document.getElementById('confirmModalConfirm');
            const cancelBtn = document.getElementById('confirmModalCancel');
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            modal.classList.add('show');
            
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };
            
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            
            const handleKeyPress = (e) => {
                if (e.key === 'Enter') {
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            
            const cleanup = () => {
                modal.classList.remove('show');
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                document.removeEventListener('keypress', handleKeyPress);
            };
            
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            document.addEventListener('keypress', handleKeyPress);
        });
    }

    // Settings Methods
    initializeSettings() {
        // Theme selector
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.getAttribute('data-theme');
                this.settings.theme = theme;
                this.saveSettings();
                this.updateThemeUI();
            });
        });

        // Load current theme
        this.updateThemeUI();
    }

    updateThemeUI() {
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.classList.remove('active');
            if (opt.getAttribute('data-theme') === this.settings.theme) {
                opt.classList.add('active');
            }
        });
    }

    applySettings() {
        // Apply theme
        document.documentElement.setAttribute('data-theme', this.settings.theme);
    }

    openSettings() {
        document.getElementById('settingsModal').classList.add('show');
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('show');
    }

    initializeEditor() {
        // Wait for Monaco Editor to be ready
        if (window.monacoEditorReady) {
            this.setupMonacoEditor();
            this.checkPendingScript();
        } else {
            window.addEventListener('monacoReady', () => {
                this.setupMonacoEditor();
                this.checkPendingScript();
            });
        }
        this.loadDefaultScript();
    }

    setupMonacoEditor() {
        // Monaco Editor is now ready
        this.log('Monaco Editor initialized with Lua syntax highlighting', 'success');
    }

    checkPendingScript() {
        const pendingScript = localStorage.getItem('pendingScript');
        if (pendingScript) {
            // Wait a bit for Monaco to fully initialize
            setTimeout(() => {
                if (window.monacoEditorAPI) {
                    window.monacoEditorAPI.setValue(pendingScript);
                    this.log('Script loaded from Script Hub', 'success');
                } else {
                    this.scriptEditor.value = pendingScript;
                    this.updateLineNumbers();
                    this.log('Script loaded from Script Hub', 'success');
                }
                localStorage.removeItem('pendingScript');
            }, 100);
        }
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
        // Line numbers handled by Monaco Editor
    }

    syncLineNumbers() {
        // Scroll sync handled by Monaco Editor
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

        const script = window.monacoEditorAPI ? window.monacoEditorAPI.getValue().trim() : this.scriptEditor.value.trim();
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
        if (window.monacoEditorAPI) {
            window.monacoEditorAPI.setValue('');
        } else {
            this.scriptEditor.value = '';
            this.updateLineNumbers();
        }
        this.log('Editor cleared', 'info');
        this.updateStatus('Ready', 'info');
    }

    clearConsole() {
        this.outputConsole.innerHTML = '';
        this.log('Console cleared', 'info');
    }

    async saveScript() {
        const script = window.monacoEditorAPI ? window.monacoEditorAPI.getValue() : this.scriptEditor.value;
        if (!script.trim()) {
            this.log('No script to save', 'warning');
            return;
        }

        try {
            const blob = new Blob([script], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `script_${Date.now()}.lua`;
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
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (window.monacoEditorAPI) {
                            window.monacoEditorAPI.setValue(event.target.result);
                        } else {
                            this.scriptEditor.value = event.target.result;
                            this.updateLineNumbers();
                        }
                        this.log(`Script loaded: ${file.name}`, 'success');
                    };
                    reader.readAsText(file);
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
        if (window.monacoEditorAPI) {
            window.monacoEditorAPI.setValue('');
        } else {
            this.scriptEditor.value = '';
            this.updateLineNumbers();
        }
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
