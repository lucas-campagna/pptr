---
name: log
description: Log a message with optional level.
---

# `log` Command

Log a message with optional log level.

## YAML Syntax

```yaml
# Simple log
actions:
  - log: "Processing started"

# With level
actions:
  - log:
      message: "Warning: element not found"
      level: WARN

# With variable interpolation
actions:
  - log: "User ${username} logged in at ${timestamp}"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | Yes | Log message (supports variable interpolation) |
| level | string | No | Log level: INFO (default), WARN, ERROR, DEBUG |

## Implementation

See `src/libs/interpreter.js` and `src/libs/logger.js` for the `log` action handler.

## Examples

```yaml
# Debug output
actions:
  - log: "Starting scrape..."
  - open: "https://example.com"
  - extract:
      selector: "h1"
      save: title
  - log: "Extracted: ${title}"

# Warning level
actions:
  - log:
      message: "Element not found, using fallback"
      level: WARN
```
