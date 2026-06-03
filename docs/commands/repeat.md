---
name: repeat
description: Repeat actions N times.
---

# `repeat` Command

Repeat actions a specified number of times.

## YAML Syntax

```yaml
# Repeat 5 times
actions:
  - repeat:
      times: 5
      delay: 1000  # Optional delay between iterations (ms)
    actions:
      - click: "#refresh"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| times | number | Yes | Number of iterations |
| delay | number | No | Delay between iterations in milliseconds |
| actions | array | Yes | Actions to repeat |

## Implementation

See `src/libs/interpreter.js` for the `repeat` action handler.

## Examples

```yaml
# Poll for data
actions:
  - repeat:
      times: 10
      delay: 2000
    actions:
      - reload
      - wait:
          selector: ".data-ready"
      - log: "Data ready!"

# Retry button click
actions:
  - repeat:
      times: 3
      delay: 500
    actions:
      - click: "#load-more"
```
