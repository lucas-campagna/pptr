---
name: pptr-cmd-closeTab
description: Close the current browser tab.
---

# `closeTab` Command

Close the current tab.

## YAML Syntax

```yaml
actions:
  - closeTab
```

## Implementation

See `src/libs/interpreter.js` for the `closeTab` action handler that uses Puppeteer's `page.close()`.

## Examples

```yaml
# Close current tab
actions:
  - newTab: "https://example.com"
  - click: "#popup-close"
  - closeTab  # Close the popup tab
```
