/**
 * Sidworks DevTools for Shopware 6
 * Background Service Worker - Manages communication between content and devtools
 */

const ports = new Map();

// Handle connections from content scripts and devtools
chrome.runtime.onConnect.addListener((port) => {
    let portName = port.name;
    let tabId = 0;
    
    // Get tab ID from sender
    if (port.sender?.tab?.id) {
        tabId = port.sender.tab.id;
    }
    
    // Create unique port identifier
    const portKey = `${portName}:${tabId}`;
    console.log('Connected:', portKey);
    
    ports.set(portKey, port);
    
    // Handle messages
    port.onMessage.addListener((msg) => {
        // Add tab ID if not present
        if (!msg.tabId && port.sender?.tab?.id) {
            msg.tabId = port.sender.tab.id;
        }
        
        if (!msg.tabId) {
            msg.tabId = 0;
        }
        
        console.log(`Message for ${msg.to}(${msg.tabId}): ${msg.type}`);
        
        // Handle background-specific messages
        if (msg.to === 'background') {
            if (msg.type === 'icon') {
                // Use the tab ID from the port sender
                const actualTabId = port.sender?.tab?.id || msg.tabId;
                updateIcon(actualTabId, msg.payload);
            }
        } else {
            // Forward message to destination
            forwardMessage(msg);
        }
    });
    
    // Cleanup on disconnect
    port.onDisconnect.addListener(() => {
        // Check and suppress BFCache-related errors
        if (chrome.runtime.lastError) {
            // This suppresses the "page moved into back/forward cache" error
        }
        console.log('Disconnected:', portKey);
        ports.delete(portKey);
    });
});

/**
 * Forward message to appropriate port
 */
function forwardMessage(msg) {
    const targetPort = `${msg.to}:${msg.tabId}`;
    const port = ports.get(targetPort);
    
    if (port) {
        try {
            port.postMessage(msg);
        } catch (e) {
            console.error('Failed to forward message:', e);
        }
    } else {
        console.warn(`Port ${targetPort} not found`);
    }
}

/**
 * Update extension icon based on DevTools status
 */
async function updateIcon(tabId, status) {
    const iconPath = status === 'online'
        ? { 128: '../images/icon128-active.png' }
        : { 128: '../images/icon128-inactive.png' };

    try {
        // Verify tab exists before trying to set icon
        if (tabId && tabId !== 0) {
            try {
                await chrome.tabs.get(tabId);
                await chrome.action.setIcon({
                    path: iconPath,
                    tabId: tabId
                });
            } catch (tabError) {
                // Tab might have been closed, just ignore
                console.log('Tab not found for icon update:', tabId);
            }
        }
    } catch (error) {
        // Silently fail - icon updates are not critical
        console.error('Icon update error:', error);
    }
}

// Set default inactive icon when extension loads
chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setIcon({
        path: { 128: '../images/icon128-inactive.png' }
    });
});
