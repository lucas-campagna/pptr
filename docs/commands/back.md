---
name: pptr-cmd-back
description: Navigate back in browser history.
---

# `back` Command

Go back in browser history.

## YAML Syntax

```yaml
actions:
  - back
```

## Implementation

See `src/libs/interpreter.js` for the `back` action handler that uses Puppeteer's `page.goBack()`.

## Examples

```yaml
actions:
  - open: "https://example.com/page1"
  - open: "https://example.com/page2"
  - back  # Returns to page1
```
