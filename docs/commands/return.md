---
name: return
description: Return a value from a function.
---

# `return` Command

Return a value from a function. Sets the `result` variable.

## YAML Syntax

```yaml
functions:
  getStatus:
    params:
      item: null
    actions:
      - extract:
          selector: "#${item}-status"
          save: status
      - return: "${status}"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| value | string | Yes | Value or variable to return |

## Implementation

See `src/libs/interpreter.js` for the `return` action handler.

## Examples

```yaml
# Return extracted data
functions:
  getTitle:
    params: []
    actions:
      - extract:
          selector: "h1"
          save: title
      - return: "${title}"

actions:
  - getTitle
  - log: "Title: ${result}"

# Return computed value
functions:
  multiply:
    params:
      a: 0
      b: 0
    actions:
      - return: "${a * b}"
```
