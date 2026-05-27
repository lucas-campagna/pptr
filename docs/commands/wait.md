---
name: pptr-cmd-wait
description: Wait for element, timeout, navigation, or condition.
---

# `wait` Command

Wait for various conditions: element appearance, timeout, navigation, or JavaScript condition.

## YAML Syntax

```yaml
# Wait for element to appear
actions:
  - wait:
      selector: "#content"
      timeout: 5000

# Wait for timeout (milliseconds)
actions:
  - wait:
      timeout: 2000

# Wait for navigation
actions:
  - wait:
      navigation: true

# Wait for JavaScript condition
actions:
  - wait:
      condition: "document.querySelector('.loaded') !== null"
      timeout: 10000
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| selector | string | No | Element to wait for |
| timeout | number | No | Timeout in milliseconds (default: 30000) |
| navigation | boolean | No | Wait for page navigation to complete |
| condition | string | No | JavaScript expression that evaluates to true |

## Implementation

See `src/libs/interpreter.js` for the `wait` action handler.

## Examples

```yaml
# Wait for element
actions:
  - open: "https://example.com"
  - wait:
      selector: ".data-loaded"
      timeout: 10000

# Wait for navigation
actions:
  - click: "#submit"
  - wait:
      navigation: true
```
