---
name: break
description: Exit a loop early.
---

# `break` Command

Exit a loop (`for` or `repeat`) early.

## YAML Syntax

```yaml
actions:
  - for:
      selector: ".item"
      as: item
    actions:
      - extract:
          selector: "${item}"
          save: text
      - if:
          condition: "${text} === 'STOP'"
        then:
          - break
```

## Implementation

See `src/libs/interpreter.js` for the `break` action handler.

## Examples

```yaml
# Stop on found item
actions:
  - for:
      selector: ".result"
      as: result
    actions:
      - extract:
          selector: "${result}"
          save: text
      - if:
          condition: "${text.includes('target')}"
        then:
          - log: "Found target!"
          - break
```
