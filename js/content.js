/**
 * Sidworks DevTools for Shopware 6
 * Content Script - ULTRA SIMPLE VERSION
 */

let port = null;
let hasProcessed = false; // Flag to prevent reprocessing

// Connect to background script
function connectToBackground() {
    try {
        port = chrome.runtime.connect({ name: 'content' });
        port.onDisconnect.addListener(() => {
            // Check for BFCache-related disconnection and suppress the error
            if (chrome.runtime.lastError) {
                // This suppresses the "page moved into back/forward cache" error
                // by accessing chrome.runtime.lastError
            }
            port = null;
        });
    } catch (error) {
        port = null;
    }
}

try {
    if (chrome.runtime && chrome.runtime.id) {
        connectToBackground();
    }
} catch (error) {}

/**
 * Process elements - ULTRA SIMPLE
 * Just find the BLOCK_START comment immediately before each element
 */
function addDocumentInformation() {
    // Only process once per page load
    if (hasProcessed) {
        return;
    }

    // Load existing element data instead of starting fresh
    let elementDataStore = {};
    let elementCounter = 0;

    try {
        const scriptTag = document.getElementById('shopware-devtools-data');
        if (scriptTag) {
            const existingData = JSON.parse(scriptTag.textContent);
            if (existingData.elementData) {
                elementDataStore = existingData.elementData;
                // Find highest element counter to continue numbering
                const existingIds = Object.keys(elementDataStore);
                existingIds.forEach(id => {
                    const num = parseInt(id.substring(1)); // Remove 'e' prefix
                    if (num >= elementCounter) {
                        elementCounter = num + 1;
                    }
                });
            }
        }
    } catch (e) {
        // Start fresh if we can't load existing data
    }

    try {
        hasProcessed = true;

        // Walk through ALL nodes (comments and elements)
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_ELEMENT,
            null
        );

        let currentBlock = null; // Track current block we're inside
        let node;
        let blockCount = 0;
        let elementNodeCount = 0;
        let assignedCount = 0;

        while (node = walker.nextNode()) {
            // Is it a comment?
            if (node.nodeType === Node.COMMENT_NODE) {
                const text = node.textContent.trim();

                // Check for SWDT_START[id]|blockName|templateName|templatePath|lineNumber|parentTemplate
                if (text.startsWith('SWDT_START[')) {
                    const match = text.match(/SWDT_START\[([^\]]+)\]\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|([^|]*)/);
                    if (match) {
                        currentBlock = {
                            id: match[1],
                            blockName: match[2].trim(),
                            templateName: match[3].trim(),
                            templatePath: match[4].trim(),
                            lineNumber: parseInt(match[5], 10),
                            parentTemplate: match[6].trim()
                        };
                        blockCount++;
                    }
                }
                // Check for SWDT_END[id]
                else if (text.startsWith('SWDT_END[')) {
                    const match = text.match(/SWDT_END\[([^\]]+)\]/);
                    if (match && currentBlock && match[1] === currentBlock.id) {
                        currentBlock = null; // Clear when matching block ends
                    }
                }
            }
            // Is it an element?
            else if (node.nodeType === Node.ELEMENT_NODE) {
                elementNodeCount++;
                // If we're inside a block and this element doesn't have data-swdt yet
                if (currentBlock && !node.hasAttribute('data-swdt')) {
                    const elementId = `e${elementCounter++}`;
                    node.setAttribute('data-swdt', elementId);

                    elementDataStore[elementId] = {
                        blockName: currentBlock.blockName,
                        templateName: currentBlock.templateName,
                        templatePath: currentBlock.templatePath,
                        lineNumber: currentBlock.lineNumber,
                        parentTemplate: currentBlock.parentTemplate
                    };
                    assignedCount++;
                }
            }
        }

        // Store data
        storeElementData(elementDataStore);

    } catch (error) {
        // Silently fail
    }
}

/**
 * Store element data in JSON script tag
 */
function storeElementData(elementDataStore) {
    try {
        const scriptTag = document.getElementById('shopware-devtools-data');
        if (scriptTag) {
            const existingData = JSON.parse(scriptTag.textContent);
            existingData.elementData = elementDataStore;
            scriptTag.textContent = JSON.stringify(existingData);
        }
    } catch (error) {
        // Silently fail
    }
}

/**
 * Clean up all debug comments from DOM
 */
function cleanupDebugComments() {
    try {
        const walker = document.createTreeWalker(
            document,
            NodeFilter.SHOW_COMMENT,
            null
        );

        const commentsToRemove = [];
        let comment;
        while (comment = walker.nextNode()) {
            const text = comment.textContent.trim();
            if (text.startsWith('SWDT_START[') || text.startsWith('SWDT_END[')) {
                commentsToRemove.push(comment);
            }
        }

        commentsToRemove.forEach(comment => comment.remove());
    } catch (error) {
        // Silently fail
    }
}

/**
 * Update DevTools information
 */
function updateDevToolsInformation() {
    try {
        if (!document.body) return;

        addDocumentInformation();

        const scriptTag = document.getElementById('shopware-devtools-data');
        const hasDevTools = scriptTag && JSON.parse(scriptTag.textContent).elementData;

        if (port) {
            try {
                port.postMessage({
                    action: hasDevTools ? 'enable' : 'disable',
                    payload: { data: hasDevTools ? JSON.parse(scriptTag.textContent) : null }
                });

                // Update toolbar icon
                port.postMessage({
                    to: 'background',
                    type: 'icon',
                    payload: hasDevTools ? 'online' : 'offline'
                });
            } catch (error) {
                if (!error.message.includes('Extension context invalidated')) {
                    connectToBackground();
                }
            }
        } else {
            connectToBackground();
        }
    } catch (error) {
        // Silently fail
    }
}

// Initialize
function initializeDevTools() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            updateDevToolsInformation();
            setTimeout(() => cleanupDebugComments(), 1000);
        });
    } else {
        setTimeout(() => {
            updateDevToolsInformation();
            setTimeout(() => cleanupDebugComments(), 1000);
        }, 100);
    }
}

// Watch for dynamic content (XHR/AJAX loaded elements)
let mutationTimeout = null;
const observer = new MutationObserver((mutations) => {
    const hasNewNodes = mutations.some(mutation =>
        mutation.addedNodes.length > 0 &&
        Array.from(mutation.addedNodes).some(node => node.nodeType === Node.ELEMENT_NODE)
    );

    if (hasNewNodes) {
        if (mutationTimeout) clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(() => {
            // Allow reprocessing for new content
            hasProcessed = false;
            updateDevToolsInformation();
            setTimeout(() => cleanupDebugComments(), 100);
        }, 200);
    }
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: false
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'checkStatus') {
        try {
            const scriptTag = document.getElementById('shopware-devtools-data');
            if (scriptTag) {
                const data = JSON.parse(scriptTag.textContent);
                const elementCount = data.elementData ? Object.keys(data.elementData).length : 0;
                sendResponse({
                    active: elementCount > 0,
                    templateCount: elementCount
                });
            } else {
                sendResponse({
                    active: false,
                    templateCount: 0
                });
            }
        } catch (e) {
            sendResponse({
                active: false,
                templateCount: 0
            });
        }
        return true; // Keep the message channel open for async response
    }
});

// Handle back/forward cache (bfcache) restoration
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        // Page was restored from bfcache, set up a new connection
        connectToBackground();
        // Update icon status after reconnection
        setTimeout(() => {
            updateDevToolsInformation();
        }, 100);
    }
});

// Initialize
initializeDevTools();
