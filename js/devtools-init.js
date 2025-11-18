if (typeof chrome !== 'undefined' && chrome.devtools) {
    // Check if Shopware DevTools data exists on the page
    chrome.devtools.inspectedWindow.eval(
        'document.getElementById("sidworks-shopware-devtools-data") !== null',
        function(hasDevToolsData, isException) {
            if (isException || !hasDevToolsData) {
                return;
            }

            // Create sidebar pane in Elements panel
            try {
                chrome.devtools.panels.elements.createSidebarPane(
                    'Shopware',
                    function(sidebar) {
                        sidebar.setPage('inspector.html');
                    }
                );
            } catch (error) {
                console.error('Sidworks DevTools: Error creating sidebar:', error);
            }
        }
    );
}
