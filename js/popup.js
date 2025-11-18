// Get extension version
const manifest = chrome.runtime.getManifest();
document.getElementById('versionInfo').textContent = `Version ${manifest.version}`;

// Handle options link click
document.getElementById('openOptions').addEventListener('click', function(e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
});

// Check if DevTools is active on the current tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'checkStatus' }, (response) => {
            const statusBox = document.getElementById('statusBox');
            const statusIndicator = document.getElementById('statusIndicator');
            const statusTitle = document.getElementById('statusTitle');
            const statusMessage = document.getElementById('statusMessage');

            if (chrome.runtime.lastError || !response) {
                // Not active
                statusBox.classList.add('offline');
                statusIndicator.classList.add('offline');
                statusTitle.textContent = 'DevTools Not Active';
                statusMessage.textContent = 'This page is not running Shopware with DevTools enabled';
                return;
            }

            if (response.active) {
                // Active
                statusBox.classList.add('online');
                statusIndicator.classList.add('online');
                statusTitle.textContent = 'DevTools Active';
                statusMessage.textContent = `Found ${response.templateCount} template elements on this page`;
            } else {
                // Not active
                statusBox.classList.add('offline');
                statusIndicator.classList.add('offline');
                statusTitle.textContent = 'DevTools Not Active';
                statusMessage.textContent = 'This page is not running Shopware with DevTools enabled';
            }
        });
    }
});
