// Load saved settings
function loadSettings() {
    chrome.storage.sync.get({
        enablePhpstorm: true,
        enableIde: true,
        editorType: 'phpstorm'
    }, function(items) {
        // Use enableIde if it exists, otherwise fall back to enablePhpstorm for backward compatibility
        const ideEnabled = items.enableIde !== undefined ? items.enableIde : items.enablePhpstorm;
        document.getElementById('enableIde').checked = ideEnabled;
        document.getElementById('editorType').value = items.editorType || 'phpstorm';
    });
}

// Save settings
function saveSettings() {
    const enableIde = document.getElementById('enableIde').checked;
    const editorType = document.getElementById('editorType').value;

    chrome.storage.sync.set({
        enablePhpstorm: enableIde, // Keep for backward compatibility
        enableIde: enableIde,
        editorType: editorType
    }, function() {
        showStatus('✅ Settings saved successfully!', 'success');

        // Also save to local storage as fallback
        try {
            localStorage.setItem('shopware-devtools-phpstorm-enabled', enableIde);
            localStorage.setItem('shopware-devtools-editor-type', editorType);
        } catch (e) {
            console.log('Could not save to localStorage:', e);
        }

        // Notify all inspector panels to reload
        chrome.runtime.sendMessage({
            type: 'settingsUpdated'
        });
    });
}

// Reset to defaults
function resetSettings() {
    if (confirm('Reset all settings to default?')) {
        document.getElementById('enableIde').checked = true;
        document.getElementById('editorType').value = 'phpstorm';
        saveSettings();
    }
}

// Show status message
function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status ' + type;
    status.style.display = 'block';

    setTimeout(function() {
        status.style.display = 'none';
    }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('resetBtn').addEventListener('click', resetSettings);
