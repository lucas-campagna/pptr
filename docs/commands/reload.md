---
name: reload
description: Reload the current page.
---

# `reload` Command

Reload the current page.

## YAML Syntax

```yaml
actions:
  - reload
```

## Implementation

See `src/libs/interpreter.js` for the `reload` action handler that uses Puppeteer's `page.reload()`.

## Examples

```yaml
actions:
  - open: "https://example.com"
  - reload
```
