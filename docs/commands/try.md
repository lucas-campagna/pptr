---
name: pptr-cmd-try
description: Error handling with catch block.
---

# `try` / `catch` Command

Error handling with catch block for gracefully handling failures.

## YAML Syntax

```yaml
actions:
  - try:
      action:
        - click: "#optional-popup"
        - screenshot: "popup.png"
    catch:
      - log: "Popup not found, continuing"
      - screenshot: "no-popup.png"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| action | array | Yes | Actions to try |
| catch | array | Yes | Actions to execute if an error occurs |

## Implementation

See `src/libs/interpreter.js` for the `try` action handler.

## Examples

```yaml
# Optional element handling
actions:
  - try:
      action:
        - click: ".modal .close"
        - wait: ".modal.hidden"
    catch:
      - log: "Modal not present, continuing..."

# Graceful screenshot
actions:
  - try:
      action:
        - open: "https://example.com"
        - screenshot: "page.png"
    catch:
      - log: "Screenshot failed, skipping"
      - screenshot: "fallback.png"
```
