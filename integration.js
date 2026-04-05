// ScytheAPI Integration Script
// This script communicates with the Scythe application via HTTP API

const API_URL = 'http://localhost:8765/api';

window.ScytheAPI = {
    // Check if API is attached and ready
    Attach: async function() {
        try {
            const response = await fetch(`${API_URL}/status`);
            const data = await response.json();
            return data.success && data.attached;
        } catch (error) {
            console.error('Failed to connect to Scythe API:', error);
            return false;
        }
    },
    
    // Execute a Lua script
    Execute: async function(script) {
        try {
            const response = await fetch(`${API_URL}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ script })
            });
            const data = await response.json();
            return data.success ? 0 : -1;
        } catch (error) {
            console.error('Script execution failed:', error);
            return -1;
        }
    },
    
    // Get client information
    GetClientInfo: async function() {
        try {
            const response = await fetch(`${API_URL}/clientinfo`);
            const data = await response.json();
            return data.success ? data.info : "";
        } catch (error) {
            console.error('Failed to get client info:', error);
            return "";
        }
    },
    
    // Get teleport state
    GetTeleportState: async function() {
        try {
            const response = await fetch(`${API_URL}/teleportstate`);
            const data = await response.json();
            return data.success ? data.state : 0;
        } catch (error) {
            console.error('Failed to get teleport state:', error);
            return 0;
        }
    },
    
    // Get last error message
    GetLastError: function() {
        // Errors are returned directly from Execute
        return '';
    }
};

console.log('ScytheAPI integration: HTTP API mode - connecting to localhost:8765');

// Method 2: Using C# WebBrowser control integration
// Add this to your C# WebBrowser control:
/*
webBrowser.ObjectForScripting = new ScytheAPIWrapper();

public class ScytheAPIWrapper
{
    public bool Attach()
    {
        return Scythe.ScytheAPI.Attach();
    }
    
    public int Execute(string script)
    {
        return Scythe.ScytheAPI.Execute(script);
    }
    
    public string GetClientInfo()
    {
        StringBuilder buffer = new StringBuilder(256);
        if (Scythe.ScytheAPI.GetClientInfo(buffer, buffer.Capacity))
        {
            return buffer.ToString();
        }
        return "";
    }
    
    public int GetTeleportState()
    {
        return Scythe.ScytheAPI.GetTeleportState();
    }
    
    public string GetLastError()
    {
        StringBuilder buffer = new StringBuilder(256);
        if (Scythe.ScytheAPI.GetLastExecError(buffer, buffer.Capacity))
        {
            return buffer.ToString();
        }
        return "";
    }
}
*/

// Method 3: Using HTTP bridge (if you want to communicate via HTTP)
/*
window.ScytheAPI = {
    async callAPI(method, ...args) {
        const response = await fetch('/api/scythe/' + method, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ args })
        });
        return response.json();
    },
    
    async Attach() {
        return (await this.callAPI('attach')).success;
    },
    
    async Execute(script) {
        return (await this.callAPI('execute', { script })).result;
    },
    
    async GetClientInfo() {
        return (await this.callAPI('getClientInfo')).info;
    },
    
    GetTeleportState() {
        return this.callAPI('getTeleportState').then(r => r.state);
    },
    
    GetLastError() {
        return this.callAPI('getLastError').then(r => r.error);
    }
};
*/

console.log('ScytheAPI integration script loaded');
