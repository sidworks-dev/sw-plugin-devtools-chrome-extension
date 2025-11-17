# Sidworks DevTools - Chrome Extension

A Chrome and Edge extension that works with the [Sidworks DevTools Shopware](../) plugin to deliver smart template insights right inside your browser inspector.
## Features

- **DevTools Sidebar Panel**: Adds a "Shopware" sidebar in the Chrome Elements panel
- **Instant Template Detection**: Select any element to see which Twig template and block rendered it
- **Smart Line Detection**: Automatically finds the exact line of your element by analyzing classes, IDs, and tags
- **Multi-IDE Support**: Open templates directly in PHPStorm or VSCode at the precise line
- **Parent Context Awareness**: Improves accuracy by considering parent element structure
- **Visual Status Indicator**: Extension popup shows if DevTools is active on the current page
- **Template Metadata**: View block names, template paths, file locations, parent templates, and line numbers
- **Auto Dark Mode**: Automatically adapts to Chrome DevTools theme

## Requirements

- **Browser**: Chrome, Edge, or any Chromium-based browser (Manifest V3 compatible)
- **Shopware Plugin**: [SidworksDevTools plugin](../) must be installed and enabled
- **Debug Mode**: Shopware must be running with `APP_ENV=dev`
- **IDE** (optional): PHPStorm or VSCode for "Open in IDE" functionality

## Installation

### Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Navigate to and select this `chrome-extension/` directory
5. The Sidworks DevTools icon will appear in your toolbar

### Configure Extension

1. Click the extension icon in your Chrome toolbar
2. Click **Options** (or right-click icon → Options)
3. Configure settings:
   - **Project Path**: This has to be configured within the Shopware plugin configuration.
   - **Editor Type**: Choose PHPStorm or VSCode
   - **Enable IDE Integration**: Toggle IDE link functionality

**Tip for Docker/DDEV users**: Add the `PROJECT_PATH` environment variable to your `docker-compose.yml` or `.ddev/config.yaml`:

```yaml
web_environment:
  - PROJECT_PATH=/Users/yourname/Development/your-shopware-project
```

The plugin will automatically inject this path into the page, so you don't need to manually configure it in the extension options.

## Usage

### Basic Workflow

1. Open your Shopware site in Chrome (with debug mode enabled)
2. Open Chrome DevTools (`F12` or right-click → Inspect)
3. Go to the **Elements** panel
4. Select any HTML element
5. Look at the **"Shopware"** sidebar on the right
6. View template information and click to open in your IDE

### Sidebar Information

When you inspect an element, the sidebar displays:

#### Template Information
- **Template Type**: Icon and label (📄 Page, 🧩 Component, 🔧 Utility)
- **Template Name**: Filename (e.g., `index.html.twig`)

#### IDE Integration
- **Open in PHPStorm/VSCode**: Clickable link that opens the file at the exact element line
- **Status Message**: Shows match details or warnings
  - ✓ Green: Found exact element match
  - ⚠️ Orange: Opened at block start (element may be in an included template)

#### Template Details
- **Block Name**: The Twig block that rendered this element (e.g., `page_product_detail`)
- **Full Path**: Shopware namespace path (e.g., `@Storefront/storefront/page/product-detail/index.html.twig`)
- **Extends**: Parent template if this template extends another
- **File Path**: Relative filesystem path (e.g., `vendor/shopware/storefront/Resources/views/...`)

#### Element Details
- **Element**: Tag name, ID, and primary class (e.g., `DIV#product-123.product-detail`)
- **Classes**: All CSS classes on the element

### How Line Detection Works

The extension uses intelligent search to find your exact element:

1. **Exact ID Match**: `id="product-detail-123"` → exact match priority
2. **Partial ID Match**: `id="btn-{{ loop.index }}"` → matches static prefix `btn-`
3. **Multi-Class Match**: `class="btn btn-primary active"` → progressively searches for all class combinations
4. **Parent Context**: Uses parent element classes to disambiguate when multiple matches exist
5. **Dynamic Class Prefix**: `class="card-{{ type }}"` → matches dynamic class patterns with Twig
6. **Tag Fallback**: `<img>`, `<div>` → falls back to tag name for minimal-attribute elements

### Extension Popup

Click the extension icon to see:
- **Status**: Whether DevTools is active on the current page
- **Template Count**: Number of tracked templates on the page
- **Options Link**: Quick access to settings

## Technical Details

### How It Works

1. **Plugin Injects Data**: Shopware plugin adds `<script id="sidworks-shopware-devtools-data">` with template metadata
2. **Content Script Detects**: `content.js` detects the data and notifies the extension
3. **DevTools Panel Created**: `devtools-init.js` creates the "Shopware" sidebar panel
4. **Element Selection**: User selects element in Chrome Elements panel
5. **Data Extraction**: `inspector.js` reads element's `data-swdt` attribute and looks up metadata
6. **Line Search**: Extension calls `/_action/sidworks-devtools/find-line` API to find exact element line
7. **IDE Integration**: Generates `phpstorm://` or `vscode://` URL to open file at line

### API Communication

When you click an IDE link, the extension:
1. Extracts element classes, ID, tag name, and parent classes
2. Sends POST request to `/_action/sidworks-devtools/find-line` with search criteria
3. Backend searches template file for best match
4. Returns exact line number and matched pattern
5. Extension opens IDE at that line

### Storage

Settings are stored in Chrome's `chrome.storage.sync`:
- `editorType`: `'phpstorm'` or `'vscode'`
- `enableIde`: Boolean to enable/disable IDE integration

## Troubleshooting

### "DevTools Not Active" in Popup
- Ensure the Shopware plugin is installed and enabled
- Check that Shopware is running in debug mode (`APP_ENV=dev`)
- Refresh the page
- Clear Shopware cache: `bin/console cache:clear`

### No "Shopware" Sidebar Appears
- DevTools data not found on page
- Ensure plugin is active (check popup)
- Verify `<script id="sidworks-shopware-devtools-data">` exists in page source

### IDE Link Opens Wrong Path
- Check that **Project Path** in plugin configuration options matches your local filesystem
- For Docker setups, the path should be your host machine path, not container path
- Example: `/Users/you/shopware` not `/var/www/html`

### IDE Link Does Nothing
- **PHPStorm**: Ensure PHPStorm is running and deep linking is enabled
  - PHPStorm → Tools → Create Command-line Launcher
  - Enable "Open file" protocol handler
- **VSCode**: Ensure VSCode is set as default handler for `vscode://` URLs
- Check that IDE integration is enabled in extension options
- Verify project path is configured

### Element Line Not Found
- Extension falls back to block start line
- Element may be in an `{% include %}` or `{% sw_include %}` template
- Try inspecting the parent element
- Check status message for details

## Development

### No Build Required

This extension uses vanilla JavaScript with no build process. Just edit and reload.

### Testing Changes

1. Make code changes
2. Go to `chrome://extensions/`
3. Click the reload icon for Sidworks DevTools
4. Refresh your Shopware page
5. Reopen DevTools

### Debugging

- **Extension popup**: Right-click extension icon → Inspect popup
- **Options page**: Right-click on options page → Inspect
- **DevTools panel**: Open DevTools → Console shows logs from inspector
- **Content script**: Open page console → filter for "Sidworks DevTools"

### Important Note for Contributors

This extension works in tandem with the Shopware plugin. When making changes:
- **Updating the extension**: Verify compatibility with the plugin's data format and API endpoints
- **If the plugin changes**: Update the extension accordingly to handle new data structures or API changes
- Both components should be kept in sync to ensure proper functionality

## Browser Compatibility

Tested and working on:
- ✅ Google Chrome 88+
- ✅ Microsoft Edge 88+
- ✅ Brave
- ✅ Any Chromium-based browser with Manifest V3 support

## Privacy & Security

- **No data collection**: Extension does not collect or transmit any user data
- **Local only**: All data stays on your machine
- **Debug mode only**: Only works on development sites with debug mode enabled
- **No external requests**: Only communicates with your local Shopware installation

## License

MIT License - See [LICENSE](LICENSE.md) file for details

## Support

- **Issues**: Report bugs on GitHub
- **Plugin Documentation**: See main [README](../README.md)
