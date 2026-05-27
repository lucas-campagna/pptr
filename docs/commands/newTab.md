---
name: pptr-cmd-newTab
description: Open a new browser tab.
---

# `newTab` Command

Open a new tab with optional URL and actions.

## YAML Syntax

```yaml
# Simple new tab
actions:
  - newTab: "https://another-site.com"

# New tab with actions
actions:
  - newTab:
      url: "https://example.com"
      actions:
        - click: "#button"
        - screenshot: "tab-screenshot.png"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | No | URL to open in new tab |
| actions | array | No | Actions to execute in the new tab |

## Implementation

See `src/libs/interpreter.js` for the `newTab` action handler that uses Puppeteer's `browser.newPage()`.

## Examples

```yaml
# Open multiple sites
actions:
  - newTab: "https://site-a.com"
  - newTab: "https://site-b.com"
  - switchTab: 0

# With actions
actions:
  - newTab:
      url: "https://example.com"
      actions:
        - screenshot: "output.png"
        - closeTab
```
