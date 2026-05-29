const ports = new Map();
const iconImageDataCache = new Map();
const ALLOWED_IDE_PROTOCOLS = new Set(['phpstorm:', 'vscode:']);

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.to !== 'background' || message.type !== 'openIdeUrl') {
        return false;
    }

    openIdeUrl(message.payload)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => {
            console.error('Failed to open IDE URL:', error);
            sendResponse({ ok: false, error: error.message });
        });

    return true;
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
    try {
        // Verify tab exists before trying to set icon
        if (tabId && tabId !== 0) {
            await chrome.tabs.get(tabId);
            await setActionIcon(status, tabId);
        }
    } catch (error) {
        // Silently fail - icon updates are not critical
        console.warn('Icon update skipped:', error.message);
    }
}

async function setActionIcon(status, tabId) {
    const details = {
        imageData: getIconImageData(status === 'online' ? 'active' : 'inactive')
    };

    if (tabId) {
        details.tabId = tabId;
    }

    await chrome.action.setIcon(details);
}

function getIconImageData(state) {
    if (!iconImageDataCache.has(state)) {
        iconImageDataCache.set(state, {
            16: createIconImageData(16, state),
            32: createIconImageData(32, state),
            48: createIconImageData(48, state),
            128: createIconImageData(128, state)
        });
    }

    return iconImageDataCache.get(state);
}

function createIconImageData(size, state) {
    const data = new Uint8ClampedArray(size * size * 4);
    const center = (size - 1) / 2;
    const radius = size * 0.42;
    const innerRadius = size * 0.27;
    const color = state === 'active'
        ? [235, 99, 37]
        : [105, 118, 132];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const distance = Math.hypot(x - center, y - center);

            if (distance > radius) {
                continue;
            }

            const offset = (y * size + x) * 4;
            const isInner = distance <= innerRadius;

            data[offset] = isInner ? 255 : color[0];
            data[offset + 1] = isInner ? 255 : color[1];
            data[offset + 2] = isInner ? 255 : color[2];
            data[offset + 3] = 255;
        }
    }

    return new ImageData(data, size, size);
}

/**
 * Open IDE URL outside the DevTools iframe.
 */
async function openIdeUrl(payload) {
    const ideUrl = payload?.url;
    const tabId = payload?.tabId;

    if (!ideUrl) {
        throw new Error('Missing IDE URL');
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(ideUrl);
    } catch (error) {
        throw new Error('Invalid IDE URL');
    }

    if (!ALLOWED_IDE_PROTOCOLS.has(parsedUrl.protocol)) {
        throw new Error(`Unsupported IDE protocol: ${parsedUrl.protocol}`);
    }

    if (Number.isInteger(tabId) && tabId > 0) {
        await chrome.tabs.update(tabId, { url: ideUrl });
        return;
    }

    await chrome.tabs.create({ url: ideUrl, active: false });
}

// Set default inactive icon when extension loads
chrome.runtime.onInstalled.addListener(() => {
    setActionIcon('offline').catch((error) => {
        console.warn('Default icon update skipped:', error.message);
    });
});
