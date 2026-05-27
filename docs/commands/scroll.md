---
name: pptr-cmd-scroll
description: Scroll the page or an element.
---

# `scroll` Command

Scroll the page or an element into view.

## YAML Syntax

```yaml
# Scroll to position (pixels)
actions:
  - scroll:
      y: 500

# Scroll element into view
actions:
  - scroll:
      selector: "#footer"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| y | number | No | Vertical scroll position in pixels |
| x | number | No | Horizontal scroll position in pixels |
| selector | string | No | Element to scroll into view |

## Implementation

See `src/libs/interpreter.js` for the `scroll` action handler.

## Examples

```yaml
# Scroll down 500px
actions:
  - scroll:
      y: 500

# Scroll to bottom
actions:
  - scroll:
      y: document.body.scrollHeight

# Scroll element into view
actions:
  - scroll:
      selector: "#contact-form"
```
