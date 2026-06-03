---
name: open
description: Navigate to a URL in the browser.
---

# `open` Command

Navigate to a URL.

## YAML Syntax

```yaml
actions:
  - open: "https://example.com"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| URL | string | Yes | The URL to navigate to |

## Implementation

See `src/libs/interpreter.js` for the `open` action handler that uses Puppeteer's `page.goto()`.

## Examples

```yaml
# Basic navigation
actions:
  - open: "https://example.com"

# With variables
vars:
  base_url: "https://example.com"
actions:
  - open: "${base_url}/login"
```
