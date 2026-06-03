---
name: pdf
description: Generate PDF of the page.
---

# `pdf` Command

Generate a PDF of the current page.

## YAML Syntax

```yaml
actions:
  - pdf: "output/document.pdf"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | Yes | Output PDF file path |

## Implementation

See `src/libs/interpreter.js` for the `pdf` action handler that uses Puppeteer's `page.pdf()`.

## Examples

```yaml
# Generate PDF
actions:
  - open: "https://example.com/article"
  - pdf: "output/article.pdf"
```
