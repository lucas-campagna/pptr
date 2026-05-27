# Browser Extension for Interaction Capture

## Overview
Create a multi-browser (MV3) extension in `extension/` that captures user interactions and auto-saves the generated YAML script to a timestamped file in the current directory when `pptr --dev` is running.

## User Requirements
- **Primary purpose**: Capture user interactions to produce pptr YAML actions, making script development easier
- **Target browsers**: Multi-browser (Chrome, Firefox, Edge)
- **CLI integration**: When `pptr --dev script.yaml` runs, it shows a no-headless browser with the extension working on it
- **Script access**: Auto-save to file (no popup copy needed)
- **File location**: Current working directory
- **Filename format**: `pptr-capture-YYYY-MM-DD-HHMMSS.yaml` (timestamp suffix)
- **CLI override**: `--capture-file <path>` to specify custom path

## Extension Structure
```
extension/
├── manifest.json      # MV3, multi-browser compatible
├── icons/            # 16, 32, 48, 128px PNG icons
├── background.js     # Service worker: message routing, action buffer
├── content.js        # DOM event listeners (click, type, hover, select, scroll)
├── popup.html        # Simple status display (optional toggle)
├── popup.js
└── styles.css
```

## Interaction Capture YAML Mapping

| User Action | YAML Action | Notes |
|-------------|-------------|-------|
| Click element | `click: selector` | CSS/XPath selector |
| Type in input | `type: {selector, text}` | Includes delay |
| Hover element | `hover: selector` | |
| Select dropdown | `select: {selector, value}` | |
| Scroll | `scroll: {x, y}` or selector | |
| Navigate | `open: url` | On page load |

## Data Flow
```
User Interaction → content.js DOM listener → browser.runtime.sendMessage → background.js
background.js buffers actions ─────────────────────────────┐
                                                         ↓
                              CLI polls via messaging API  ← saves to file
```

## CLI Integration

### New Options
| Option | Description |
|--------|-------------|
| `--dev` | Show browser with 250ms action delay (already exists) |
| `--capture-file <path>` | Path for auto-saved capture (default: timestamped file in CWD) |

### Modified Files

| File | Change |
|------|--------|
| `src/cli.js` | Add `--capture-file <path>` option |
| `src/libs/runner.js` | Add `loadExtension` path; pass to `puppeteer.launch()` via `chrome.launch` with `--load-extension` arg |

## Implementation Steps

### Step 1: Create Extension Directory Structure
- [ ] Create `extension/` directory in project root
- [ ] Create `extension/icons/` subdirectory
- [ ] Create `extension/manifest.json` (MV3 compatible for Chrome, Firefox, Edge)
- [ ] Create placeholder icon files (16x16, 32x32, 48x48, 128x128 PNG)

### Step 2: Create manifest.json
- [ ] Use Manifest V3 format for cross-browser compatibility
- [ ] Include `manifest_version: 3`
- [ ] Set `name` and `version` fields
- [ ] Add `permissions`: `activeTab`, `scripting`, `storage`
- [ ] Add `host_permissions`: `<all_urls>` or specific patterns
- [ ] Define `background` service worker (type: `service_worker`)
- [ ] Define `content_scripts` array with matching patterns
- [ ] Define `action` for browser action popup (optional status display)
- [ ] Include icon references in `icons` field

### Step 3: Create content.js (Interaction Capture Script)
- [ ] Inject as content script on all pages
- [ ] Set up DOM event listeners for:
  - `click` event on document (capture click targets)
  - `input` event on input/textarea (capture type actions)
  - `mouseover`/`mouseenter` for hover detection
  - `change` event for select dropdowns
  - `scroll` event (debounced) for scroll actions
- [ ] Implement `generateSelector(element)` function to create unique CSS selectors from DOM elements
- [ ] Implement fallback to XPath selectors when CSS selectors are ambiguous
- [ ] Buffer captured actions locally before sending
- [ ] Use `browser.runtime.sendMessage()` to send actions to background script
- [ ] Include metadata: timestamp, page URL, element attributes
- [ ] Handle edge cases:
  - Ignore clicks on extension popup itself
  - Ignore clicks on empty areas
  - Handle iframe elements
  - Handle dynamically generated elements

### Step 4: Create background.js (Service Worker / Message Handler)
- [ ] Use Chrome's MV3 service worker pattern (stateless, event-driven)
- [ ] Implement `chrome.runtime.onMessage` listener for messages from content scripts
- [ ] Maintain in-memory buffer for captured actions
- [ ] Implement `browserAction.onClicked` or popup interaction if needed
- [ ] Handle native messaging for CLI communication:
  - Set up WebSocket or HTTP server on localhost for CLI polling
  - Alternative: Use Chrome's `debugging` API to read console messages
  - Alternative: Use file system via native messaging host (requires separate binary)
- [ ] Implement `getCapturedActions()` method to return buffered actions
- [ ] Implement `clearCapturedActions()` method to reset buffer
- [ ] Handle extension lifecycle events (install, update, startup)
- [ ] Use `chrome.storage.local` for persistence across service worker restarts

### Step 5: Create popup.html and popup.js (Optional Status UI)
- [ ] Create simple popup showing capture status
- [ ] Display: "Recording", "Paused", "X actions captured"
- [ ] Include toggle button to pause/resume capture
- [ ] Include "Clear" button to reset buffer
- [ ] Show current page URL being recorded
- [ ] Add basic styling with styles.css

### Step 6: Create styles.css
- [ ] Basic popup styling (if popup is implemented)
- [ ] Keep minimal - extension UI is secondary to auto-save functionality

### Step 7: Generate Icon Files
- [ ] Create simple icons representing "capture" or "pptr" brand
- [ ] Sizes needed: 16, 32, 48, 128 pixels (PNG format)
- [ ] Can use ImageMagick, canvas-based generation, or hand-crafted
- [ ] Icons should be visible at small sizes (clear silhouettes)
- [ ] Store in `extension/icons/` with names: `icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`

### Step 8: Update src/libs/runner.js (Extension Loading)
- [ ] Add `loadExtension` option to Runner constructor
- [ ] When `loadExtension` is set and `headless === false`:
  - Construct `--load-extension=` argument with absolute path to extension directory
  - Add this to `chrome.launch()` arguments in puppeteer
  - Note: This only works when launching a custom Chrome/Chromium instance, not the bundled puppeteer browser
- [ ] Handle extension loading errors gracefully
- [ ] Implement CLI-to-extension communication channel:
  - Option A: Start local HTTP server in background.js, poll from Runner
  - Option B: Use Chrome DevTools Protocol via puppeteer's `createCDPSession()`
  - Option C: Use `browser.runtime.sendNativeMessage` with a native host app
- [ ] For the MVP, consider: Extension writes to `window.localStorage` or injects data accessible via `page.evaluate()`

### Step 9: Update src/cli.js (CLI Options)
- [ ] Add `--capture-file <path>` option to Commander program
- [ ] Parse `options.captureFile` from CLI args
- [ ] Pass `captureFile` option through to Runner options
- [ ] Modify `--dev` behavior:
  - When `--dev` is set, automatically set a default capture file if not provided
  - Generate timestamped filename: `pptr-capture-YYYY-MM-DD-HHMMSS.yaml`
  - The capture file path becomes part of `runOptions` passed to Runner

### Step 10: Implement CLI-to-Extension Communication
- [ ] In Runner, after browser launches with extension:
  - Navigate to `chrome://extensions/内部的内部页面` or use DevTools protocol
  - Or: Have extension expose a localhost server that Runner polls
- [ ] Create a `CaptureReader` class/module in `src/libs/capture-reader.js`:
  - Poll extension's background page or storage
  - Parse captured actions into pptr YAML format
  - Write actions to the capture file in real-time
- [ ] Handle file writing:
  - Open file in append mode
  - Write each action as valid YAML
  - Flush after each write for immediate persistence
- [ ] Clean up on browser close:
  - Ensure all captured actions are written
  - Close file handles properly

### Step 11: YAML Generation Logic
- [ ] Create helper function `actionToYaml(action)` in capture-reader.js
- [ ] Map captured action types to pptr YAML format:
  ```
  click { selector: "#btn" }  →  click: "#btn"
  type { selector: "#inp", text: "hello" }  →  type: { selector: "#inp", text: "hello" }
  hover { selector: ".item" }  →  hover: ".item"
  ```
- [ ] Handle proper YAML formatting (indentation, quotes for special chars)
- [ ] Generate complete YAML document structure:
  ```yaml
  # Captured by pptr extension on YYYY-MM-DD HH:MM:SS
  # From: https://example.com
  
  actions:
    - click: "#submit"
    - type: { selector: "#username", text: "user123" }
  ```

### Step 12: Test End-to-End
- [ ] Test: `pptr --dev --capture-file test.yaml` opens browser with extension loaded
- [ ] Test: User interactions in browser are captured
- [ ] Test: Captured actions appear in test.yaml file
- [ ] Test: YAML is valid and parseable by pptr
- [ ] Test: Multiple interactions produce correct YAML output
- [ ] Test: Extension works across Chrome, Firefox, Edge (if available)
- [ ] Test: Error handling when capture file cannot be written
- [ ] Test: Cleanup when browser is closed unexpectedly

### Step 13: Documentation
- [ ] Update main README.md with extension usage instructions
- [ ] Add section: "Using the Interaction Capture Extension"
- [ ] Document `--dev` and `--capture-file` options
- [ ] Document supported interactions (click, type, hover, etc.)
- [ ] Document limitations and known issues
- [ ] Add troubleshooting section

## Auto-Save Behavior
- **Default filename**: `./pptr-capture-YYYY-MM-DD-HHMMSS.yaml`
- **CLI override**: `pptr --dev --capture-file myscript.yaml script.yaml`
- **Timing**: Written on each action (append mode) or at browser close
- **Format**: Valid pptr YAML with `actions:` array

## Edge Cases and Error Handling

### Extension Loading
- If extension fails to load, warn user but continue without capture
- If wrong Chrome version (extension requires Chrome 88+), provide clear error

### File System
- If capture file cannot be created, use fallback location (`/tmp/pptr-capture-*.yaml`)
- If file write fails mid-session, buffer in memory and retry
- Handle permission errors gracefully

### Interaction Capture
- If same action repeated rapidly, debounce/throttle captures
- If element has no stable selector, fall back to XPath
- Ignore extension's own popup interactions
- Handle iframe interactions separately

### Browser Close
- On SIGINT/SIGTERM, ensure final actions are flushed to file
- On browser crash, rely on last flushed state

## Future Enhancements (Out of Scope for MVP)
- Selective capture (click specific button to start/stop)
- Action editing in popup before save
- Selector improvement suggestions
- Import existing YAML scripts and append captures
- Multi-tab capture support
- Screenshot capture on each action
- Export to different formats (JSON, Markdown)