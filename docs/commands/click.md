---
name: pptr-cmd-click
description: Click an element on the page.
---

# `click` Command

Click an element. Optionally wait for another element after clicking.

## YAML Syntax

```yaml
# Basic click
actions:
  - click: "#submit-button"

# Click with wait after
actions:
  - click:
      selector: "#button"
      wait: ".result"  # wait for this element
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| selector | string | Yes | CSS or XPath selector |
| wait | string | No | Element to wait for after clicking |

## Implementation

See `src/libs/interpreter.js` for the `click` action handler that uses Puppeteer's `page.click()`.

## Examples

```yaml
# Click a button
actions:
  - click: "#submit"

# Click and wait for result
actions:
  - click:
      selector: "#load-data"
      wait: ".data-loaded"
```
