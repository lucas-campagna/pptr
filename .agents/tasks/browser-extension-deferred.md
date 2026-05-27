# Browser Extension Capture - Deferred

## Status: Deferred (Issues to Resolve)

## Goal
Allow `pptr --dev` to open a visible browser with an extension that captures user interactions and auto-saves them to a YAML file.

## Current Implementation
- `extension/` directory with MV3 extension files (manifest.json, content.js, background.js, popup.html, popup.js, styles.css, icons/)
- `src/libs/capture-reader.js` - polls extension and writes YAML
- `src/libs/runner.js` - added `runDev()` method
- `src/cli.js` - added `--capture-file` option, branching logic for `--dev` without script
- `test/dev-mode.test.js` - basic CLI tests

## Known Issues

### 1. "Protocol error (Target.createTarget): Target closed"
**Symptom**: Running `pptr --dev -d` causes browser to crash immediately after launch with this error.

**Likely Causes**:
- Chrome startup flags conflict (e.g., `--no-zygote`, `--headless=new` with extension loading)
- Extension loading fails and crashes the browser process
- GPU/rendering process issues in headless-visible mode

**Affected Environment**: WSL/Windows Linux subsystem

### 2. Extension Not Loading Properly
**Symptom**: Extension doesn't appear in the browser toolbar or doesn't capture actions.

**Likely Causes**:
- `--load-extension` path may not resolve correctly in all environments
- Chrome version compatibility issues with MV3 service workers
- Manifest V3 requires specific browser version (Chrome 88+)

### 3. Capture Polling Ineffective
**Symptom**: Actions are captured in extension but not written to file.

**Likely Cause**: `page.evaluate()` in `capture-reader.js` runs in the wrong page context. The content script communicates with background script via `browser.runtime.sendMessage`, but the polling uses `browser.runtime.sendMessage` from the page context where `browser` may not be defined.

## What Works
- CLI correctly branches to `runDev()` when `--dev` is used without a script
- `runDev()` launches browser with correct extension path
- Help text is updated to mention `--dev`
- Tests pass

## What Needs Fixing

### High Priority
1. **Fix browser crash on launch with `--dev -d`**
   - Investigate Chrome flag conflicts
   - Try removing `--headless=new` when in dev mode
   - Consider using `headless: 'new'` in puppeteer launch options instead of `--headless=new` arg

2. **Fix extension loading verification**
   - Add code to verify extension actually loaded
   - Log warning if extension fails to load but continue anyway
   - Provide better error messages

### Medium Priority  
3. **Fix capture polling communication**
   - Content script uses `browser.runtime.sendMessage` (WebExtension API)
   - Page context may not have `browser` global
   - Consider having extension write to `window.localStorage` and poll that instead
   - Or use `browser.runtime.sendNativeMessage` approach

4. **Add graceful degradation**
   - If extension doesn't load, warn but continue in dev mode
   - Allow user to still browse and interact manually

### Low Priority
5. **Add timeout for "waiting for disconnect"**
   - User should be able to exit with Ctrl+C if browser gets stuck
   - Add SIGINT handler to forcibly close

6. **Improve capture file output**
   - Currently writes one action per line as captured
   - Should format as proper YAML with `actions:` array structure

## Testing Approach
When fixing, test in these scenarios:
1. `pptr --dev` - Should open browser, extension loaded
2. `pptr --dev -d` - Should open browser with debug logging, no crash
3. `pptr --dev --capture-file out.yaml` - Should capture to specified file
4. `pptr --dev script.yaml` - Should run script AND capture any manual interactions

## Files to Modify When Resumed

| File | Changes Needed |
|------|---------------|
| `src/libs/runner.js` | Debug `--dev -d` crash, improve error handling |
| `src/libs/capture-reader.js` | Fix extension communication, improve YAML formatting |
| `extension/background.js` | Consider localhost server for more reliable CLI communication |
| `extension/content.js` | Add debug logging, improve selector generation |
| `.agents/tasks/browser-extension-capture.md` | Update based on learnings |

## Environment Notes
- Testing done on WSL (Windows Subsystem for Linux)
- Chrome path used: `/mnt/c/Users/CaLu150/AppData/Local/Google/Chrome/Application/chrome.exe`
- System browser launch fails in WSL, falls back to bundled deps
- Bundled deps (puppeteer bundled Chrome) should work but may have different behavior with extensions