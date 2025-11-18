function onItemInspected() {
    function getElementData(el) {
        if (!el) {
            return null;
        }

        // Get element data store from script tag
        let elementDataStore = null;
        try {
            const scriptTag = document.getElementById('sidworks-shopware-devtools-data');
            if (scriptTag) {
                if (!window.__swdtCache || Date.now() - window.__swdtCacheTime > 1000) {
                    const data = JSON.parse(scriptTag.textContent);
                    window.__swdtCache = data.elementData || {};
                    window.__swdtCacheTime = Date.now();
                }
                elementDataStore = window.__swdtCache;
            }
        } catch (e) {
            return null;
        }

        // Get element ID
        let elementId = el.getAttribute('data-swdt');

        // If no ID on element, search parent (max 20 levels)
        if (!elementId) {
            let parent = el.parentElement;
            let depth = 0;
            while (parent && depth < 20 && !parent.hasAttribute('data-swdt')) {
                parent = parent.parentElement;
                depth++;
            }
            if (parent) {
                elementId = parent.getAttribute('data-swdt');
            }
        }

        if (!elementId || !elementDataStore || !elementDataStore[elementId]) {
            return null;
        }

        // Get element data from store
        const data = elementDataStore[elementId];
        let blockName = data.blockName || '';
        let templateName = data.templateName;
        let filesystemPath = data.templatePath || '';
        let lineNumber = data.lineNumber || 0;
        let parentTemplate = data.parentTemplate || '';

        // Collect parent element classes (up to 5 levels)
        const parentClasses = [];
        let currentParent = el.parentElement;
        let parentDepth = 0;
        while (currentParent && parentDepth < 5) {
            if (currentParent.className && typeof currentParent.className === 'string') {
                const classes = currentParent.className.trim().split(/\s+/).filter(c => c);
                if (classes.length > 0) {
                    parentClasses.push(classes);
                }
            }
            currentParent = currentParent.parentElement;
            parentDepth++;
        }

        return {
            blockName: blockName,
            templateName: templateName,
            filesystemPath: filesystemPath,
            lineNumber: lineNumber,
            parentTemplate: parentTemplate,
            tagName: el.tagName.toLowerCase(),
            className: el.className || '',
            id: el.id || '',
            parentClasses: parentClasses
        };
    }

    chrome.devtools.inspectedWindow.eval('(' + getElementData.toString() + ')($0)', {}, function (elementData) {
        const noData = document.getElementById('no-data');
        const content = document.getElementById('content');

        if (!elementData) {
            noData.style.display = 'block';
            content.style.display = 'none';
            noData.textContent = 'No template data for this element';
            return;
        }

        noData.style.display = 'none';
        content.style.display = 'block';

        // Get project path from page
        chrome.devtools.inspectedWindow.eval(
            `(function() {
                const dataScript = document.getElementById('sidworks-shopware-devtools-data');
                if (dataScript) {
                    try {
                        const data = JSON.parse(dataScript.textContent);
                        return data.projectPath || null;
                    } catch (e) {
                        return null;
                    }
                }
                return null;
            })()`,
            {},
            function(projectPath) {
                // Build HTML
                const fileName = elementData.templateName.split('/').pop();
                const isPage = elementData.templateName.includes('/page/');
                const isComponent = elementData.templateName.includes('/component/');
                const isUtility = elementData.templateName.includes('/utilities/');

                let templateType = '📄 Template';
                if (isPage) templateType = '📄 Page Template';
                else if (isComponent) templateType = '🧩 Component';
                else if (isUtility) templateType = '🔧 Utility';

                // Convert filesystem path
                let filesystemPath = elementData.filesystemPath;

                if (filesystemPath && filesystemPath.startsWith('/')) {
                    const dockerPaths = ['/var/www/html', '/app', '/var/www'];

                    for (const dockerPath of dockerPaths) {
                        if (filesystemPath.startsWith(dockerPath + '/')) {
                            filesystemPath = filesystemPath.substring(dockerPath.length + 1);
                            break;
                        }
                    }

                    if (filesystemPath.startsWith('/')) {
                        const pathParts = filesystemPath.split('/').filter(part => part !== '');

                        let relativeStartIndex = -1;
                        for (let i = 0; i < pathParts.length; i++) {
                            if (pathParts[i] === 'vendor' || pathParts[i] === 'custom' || pathParts[i] === 'src') {
                                relativeStartIndex = i;
                                break;
                            }
                        }

                        if (relativeStartIndex !== -1) {
                            filesystemPath = pathParts.slice(relativeStartIndex).join('/');
                        }
                    }
                }

                if (!filesystemPath || filesystemPath.trim() === '') {
                    filesystemPath = 'Path extraction failed';
                }

                // Get editor type and IDE enabled setting
                chrome.storage.sync.get({
                    editorType: 'phpstorm',
                    enableIde: true,
                    enablePhpstorm: true // backward compatibility
                }, function(items) {
                    const editorType = items.editorType || 'phpstorm';
                    const editorName = editorType === 'vscode' ? 'VSCode' : 'PHPStorm';
                    const ideEnabled = items.enableIde !== undefined ? items.enableIde : items.enablePhpstorm;

                    let html = '';
                    html += '<h3>' + escapeHtml(templateType) + ': ' + escapeHtml(fileName) + '</h3>';

                    // 1. IDE link with line number (always show, but grey out if disabled)
                    if (filesystemPath && filesystemPath !== 'Path extraction failed') {
                        const isDisabled = !ideEnabled || !projectPath;
                        const disabledClass = isDisabled ? ' disabled' : '';

                        html += '<div class="phpstorm-box' + disabledClass + '">';
                        html += '<strong>🚀 Open in ' + editorName + '</strong>';

                        if (isDisabled) {
                            html += '<div class="phpstorm-warning">';
                            if (!ideEnabled) {
                                html += '⚠️ IDE integration is disabled. Enable it in the <span id="openOptions" class="options-link">extension options</span>.';
                            } else if (!projectPath) {
                                html += '⚠️ Project path not configured. Set it in the <span id="openOptions" class="options-link">extension options</span>.';
                            }
                            html += '</div>';
                        } else {
                            html += '<a href="#" class="phpstorm-link" ';
                            html += 'data-project-path="' + escapeHtml(projectPath) + '" ';
                            html += 'data-file-path="' + escapeHtml(filesystemPath) + '" ';
                            html += 'data-block-line="' + elementData.lineNumber + '" ';
                            html += 'data-class-name="' + escapeHtml(elementData.className) + '" ';
                            html += 'data-element-id="' + escapeHtml(elementData.id) + '" ';
                            html += 'data-tag-name="' + escapeHtml(elementData.tagName) + '" ';
                            html += 'data-parent-classes="' + escapeHtml(JSON.stringify(elementData.parentClasses || [])) + '">Open file at line ' + elementData.lineNumber + '</a>';
                            html += '<div class="phpstorm-status"></div>';
                        }

                        html += '</div>';
                    }

                    // 2. Block Name
                    if (elementData.blockName) {
                        html += '<div class="section">';
                        html += '<strong>📦 Block Name</strong>';
                        html += '<code>' + escapeHtml(elementData.blockName) + '</code>';
                        html += '</div>';
                    }

                    // 3. Full Path
                    html += '<div class="section">';
                    html += '<strong>📂 Full Path</strong>';
                    html += '<code>' + escapeHtml(elementData.templateName) + '</code>';
                    html += '</div>';

                    // 4. Extends (parent template)
                    if (elementData.parentTemplate) {
                        html += '<div class="section">';
                        html += '<strong>⬆️ Extends</strong>';
                        html += '<code>' + escapeHtml(elementData.parentTemplate) + '</code>';
                        html += '</div>';
                    }

                    // 5. File Path
                    html += '<div class="section">';
                    html += '<strong>💻 File Path</strong>';
                    html += '<code>' + escapeHtml(filesystemPath || 'Not available') + '</code>';
                    html += '</div>';

                    // 6. Element
                    html += '<div class="info"><strong>🏷️ Element:</strong><span class="info-value">' + escapeHtml(elementData.tagName.toUpperCase() + (elementData.id ? '#' + elementData.id : '') + (elementData.className ? '.' + elementData.className.split(' ')[0] : '')) + '</span></div>';

                    // 7. Classes
                    html += '<div class="info"><strong>🎨 Classes:</strong><span class="info-value">' + escapeHtml(elementData.className || '(none)') + '</span></div>';

                    // Get extension version
                    const version = chrome.runtime.getManifest().version;
                    html += '<div class="timestamp">Sidworks DevTools v' + escapeHtml(version) + '</div>';

                    content.innerHTML = html;
                });
            }
        );
    });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Generate IDE URL based on editor type
 */
function generateIdeUrl(editorType, projectPath, filePath, lineNumber) {
    const fullPath = projectPath + '/' + filePath;

    switch (editorType) {
        case 'vscode':
            // vscode://file/{full_path}:{line}:{column}
            return 'vscode://file/' + fullPath + ':' + lineNumber + ':1';
        case 'phpstorm':
        default:
            // phpstorm://open?file={full_path}&line={line}
            return 'phpstorm://open?file=' + fullPath + '&line=' + lineNumber;
    }
}

// Listen for selection changes
chrome.devtools.panels.elements.onSelectionChanged.addListener(function () {
    onItemInspected();
});

// Handle options link clicks
document.addEventListener('click', function(e) {
    if (e.target.id === 'openOptions') {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
        return;
    }
});

// Handle PHPStorm link clicks - search for exact line
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('phpstorm-link')) {
        e.preventDefault();

        const projectPath = e.target.getAttribute('data-project-path');
        const filePath = e.target.getAttribute('data-file-path');
        const blockLine = parseInt(e.target.getAttribute('data-block-line')) || 0;
        const className = e.target.getAttribute('data-class-name');
        const elementId = e.target.getAttribute('data-element-id');
        const tagName = e.target.getAttribute('data-tag-name');
        const parentClassesStr = e.target.getAttribute('data-parent-classes');

        // Build search patterns - send up to 5 classes for progressive search
        let searchClasses = [];
        if (className && className.trim()) {
            const classes = className.trim().split(/\s+/).slice(0, 5); // Max 5 classes
            searchClasses = classes;
        }

        // Parse parent classes
        let parentClasses = [];
        try {
            if (parentClassesStr) {
                parentClasses = JSON.parse(parentClassesStr);
            }
        } catch (e) {
            parentClasses = [];
        }

        let searchId = '';
        if (elementId && elementId.trim()) {
            searchId = elementId;
        }

        if (searchClasses.length === 0 && !searchId) {
            // No search pattern, just open at block line
            // Get editor type from storage
            chrome.storage.sync.get({ editorType: 'phpstorm' }, function(items) {
                const ideUrl = generateIdeUrl(items.editorType, projectPath, filePath, blockLine);
                window.location.href = ideUrl;
            });
            return;
        }

        // Get status div
        const statusDiv = e.target.nextElementSibling;

        // Update status
        if (statusDiv) {
            statusDiv.textContent = 'Searching for exact element line...';
        }

        // Call API to find exact line
        const fullPath = projectPath + '/' + filePath;

        // Step 1: Start the fetch in page context and store result in window
        const requestId = 'swdt_' + Date.now();
        const startFetchCode = `
            (function() {
                window.${requestId} = { pending: true };
                fetch('/_action/sidworks-devtools/find-line', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filePath: '${fullPath.replace(/'/g, "\\'")}',
                        searchClasses: ${JSON.stringify(searchClasses)},
                        searchId: '${searchId.replace(/'/g, "\\'")}',
                        searchTag: '${tagName.replace(/'/g, "\\'")}',
                        blockStartLine: ${blockLine},
                        parentClasses: ${JSON.stringify(parentClasses)}
                    })
                })
                .then(r => r.json())
                .then(data => {
                    window.${requestId} = { pending: false, line: data.line || ${blockLine}, matchedPattern: data.matchedPattern || '' };
                })
                .catch(err => {
                    window.${requestId} = { pending: false, line: ${blockLine}, error: err.message };
                });
                return true;
            })()
        `;

        chrome.devtools.inspectedWindow.eval(startFetchCode, function() {
            // Step 2: Poll for the result
            const checkResult = () => {
                chrome.devtools.inspectedWindow.eval(`window.${requestId}`, function(result) {
                    if (!result || result.pending) {
                        // Still pending, check again
                        setTimeout(checkResult, 100);
                    } else {
                        // Got result!
                        const lineNumber = result.line || blockLine;
                        const matchedPattern = result.matchedPattern || '';

                        // Get editor type from storage and open IDE
                        chrome.storage.sync.get({ editorType: 'phpstorm' }, function(items) {
                            const ideUrl = generateIdeUrl(items.editorType, projectPath, filePath, lineNumber);
                            window.location.href = ideUrl;
                        });

                        // Update button text to show line number
                        e.target.textContent = 'Open file at line ' + lineNumber;

                        // Update status div with match details
                        if (statusDiv) {
                            if (matchedPattern) {
                                statusDiv.textContent = '✓ Found element at line ' + lineNumber + ' (matched: ' + matchedPattern + ')';
                                statusDiv.style.color = '#10b981'; // Green
                            } else {
                                statusDiv.textContent = '⚠ Opened at block start (line ' + lineNumber + ') - element may be in included template';
                                statusDiv.style.color = '#f59e0b'; // Orange
                            }
                        }

                        // Cleanup
                        chrome.devtools.inspectedWindow.eval(`delete window.${requestId}`);
                    }
                });
            };
            checkResult();
        });
    }
});

// Listen for settings updates
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'settingsUpdated') {
        // Reload the current inspection to reflect new settings
        onItemInspected();
    }
});

// Initial inspection
onItemInspected();
