---
name: pptr-cmd-retry
description: Retry failed actions with optional exponential backoff.
---

# `retry` Command

Retry failed actions with configurable retry count and optional exponential backoff.

## YAML Syntax

```yaml
# Basic retry
actions:
  - retry:
      times: 3
      delay: 1000
    action:
      - click: "#unstable-button"
      - wait: ".success"

# With exponential backoff
actions:
  - retry:
      times: 5
      delay: 1000
      backoff: exponential
    action:
      - api-call: "https://api.example.com/data"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| times | number | Yes | Maximum number of retry attempts |
| delay | number | No | Delay between retries in milliseconds |
| backoff | string | No | "exponential" for exponential backoff |
| action | array | Yes | Actions to retry |

## Implementation

See `src/libs/interpreter.js` for the `retry` action handler.

## Examples

```yaml
# Wait for element to load
actions:
  - retry:
      times: 10
      delay: 2000
    action:
      - click: "#load-data"
      - wait:
          selector: ".data-loaded"
```
