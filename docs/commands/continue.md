---
name: pptr-cmd-continue
description: Skip to next loop iteration.
---

# `continue` Command

Skip to the next iteration of a loop.

## YAML Syntax

```yaml
actions:
  - for:
      selector: ".row"
      as: row
    actions:
      - if:
          selector: "${row}.skip"
        then:
          - continue
      - log: "Processing row"
```

## Implementation

See `src/libs/interpreter.js` for the `continue` action handler.

## Examples

```yaml
# Skip empty rows
actions:
  - for:
      selector: ".data-row"
      as: row
    actions:
      - extract:
          selector: "${row}"
          save: content
      - if:
          condition: "${content} === ''"
        then:
          - continue
      - log: "Processing: ${content}"
```
