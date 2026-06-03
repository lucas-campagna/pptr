---
name: hover
description: Hover over an element.
---

# `hover` Command

Hover over an element.

## YAML Syntax

```yaml
actions:
  - hover: "#menu-item"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| selector | string | Yes | CSS or XPath selector |

## Implementation

See `src/libs/interpreter.js` for the `hover` action handler that uses Puppeteer's `page.hover()`.

## Examples

```yaml
# Hover to reveal dropdown
actions:
  - hover: "#menu-trigger"
  - click: "#menu-item"
```
