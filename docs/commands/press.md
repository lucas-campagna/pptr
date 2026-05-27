---
name: pptr-cmd-press
description: Press a keyboard key.
---

# `press` Command

Press a keyboard key (Enter, Escape, Tab, etc.).

## YAML Syntax

```yaml
actions:
  - press: "Enter"
  - press: "Escape"
  - press: "Tab"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| key | string | Yes | Key name to press |

## Implementation

See `src/libs/interpreter.js` for the `press` action handler that uses Puppeteer's `page.keyboard.press()`.

## Examples

```yaml
# Submit form
actions:
  - type:
      selector: "#search"
      text: "query"
  - press: "Enter"

# Close modal
actions:
  - press: "Escape"
```
