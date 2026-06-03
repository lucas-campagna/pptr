---
name: screenshot
description: Take a screenshot of the page or element.
---

# `screenshot` Command

Take a screenshot of the page or a specific element.

## YAML Syntax

```yaml
# Full page screenshot
actions:
  - screenshot: "output/full.png"

# Element screenshot
actions:
  - screenshot:
      selector: "#chart"
      path: "output/chart.png"

# Viewport only
actions:
  - screenshot:
      path: "output/viewport.png"
      fullPage: false
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | Yes | Output file path |
| selector | string | No | Element to screenshot |
| fullPage | boolean | No | Capture full page (default: true) |

## Implementation

See `src/libs/interpreter.js` for the `screenshot` action handler that uses Puppeteer's `page.screenshot()`.

## Examples

```yaml
# Basic screenshot
actions:
  - open: "https://example.com"
  - screenshot: "page.png"

# Element screenshot
actions:
  - screenshot:
      selector: ".chart"
      path: "chart.png"
```
