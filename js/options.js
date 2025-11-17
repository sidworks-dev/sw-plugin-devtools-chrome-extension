/**
 * Sidworks DevTools - Options Page
 */

// Load saved settings
function loadSettings() {
    chrome.storage.sync.get({
        projectPath: '',
        enablePhpstorm: true,
        enableIde: true,
        editorType: 'phpstorm'
    }, function(items) {
        document.getElementById('projectPath').value = items.projectPath;
        // Use enableIde if it exists, otherwise fall back to enablePhpstorm for backward compatibility
        const ideEnabled = items.enableIde !== undefined ? items.enableIde : items.enablePhpstorm;
        document.getElementById('enableIde').checked = ideEnabled;
        document.getElementById('editorType').value = items.editorType || 'phpstorm';
    });
}

// Save settings
function saveSettings() {
    const projectPath = document.getElementById('projectPath').value.trim();
    const enableIde = document.getElementById('enableIde').checked;
    const editorType = document.getElementById('editorType').value;

    // Validate path
    if (projectPath && !projectPath.startsWith('/') && !projectPath.match(/^[A-Z]:\\/)) {
        showStatus('Please enter an absolute path (starting with / or C:\\)', 'error');
        return;
    }

    chrome.storage.sync.set({
        projectPath: projectPath,
        enablePhpstorm: enableIde, // Keep for backward compatibility
        enableIde: enableIde,
        editorType: editorType
    }, function() {
        showStatus('✅ Settings saved successfully!', 'success');

        // Also save to local storage as fallback
        try {
            localStorage.setItem('shopware-devtools-project-path', projectPath);
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
        document.getElementById('projectPath').value = '';
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

// Save on Enter key
document.getElementById('projectPath').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        saveSettings();
    }
});