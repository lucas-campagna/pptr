---
name: pptr-cmd-forward
description: Navigate forward in browser history.
---

# `forward` Command

Go forward in browser history.

## YAML Syntax

```yaml
actions:
  - forward
```

## Implementation

See `src/libs/interpreter.js` for the `forward` action handler that uses Puppeteer's `page.goForward()`.

## Examples

```yaml
actions:
  - open: "https://example.com"
  - back
  - forward  # Returns to the original page
```
