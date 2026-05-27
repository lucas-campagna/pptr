---
name: pptr-cmd-switchTab
description: Switch to a different browser tab.
---

# `switchTab` Command

Switch to a tab by index.

## YAML Syntax

```yaml
actions:
  - switchTab: 0  # First tab
  - switchTab: 2  # Third tab
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| index | number | Yes | Tab index to switch to (0-based) |

## Implementation

See `src/libs/interpreter.js` for the `switchTab` action handler that uses Puppeteer's `browser.pages()`.

## Examples

```yaml
# Open and switch
actions:
  - open: "https://site-a.com"
  - newTab: "https://site-b.com"
  - switchTab: 0  # Switch back to first tab
```
