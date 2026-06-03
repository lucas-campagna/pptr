---
name: extract
description: Extract text or structured data from the page.
---

# `extract` Command

Extract text or structured data from the page.

## YAML Syntax

```yaml
# Extract single value
actions:
  - extract:
      selector: "h1.title"
      save: page_title

# Extract multiple values
actions:
  - extract:
      selector: ".product-item"
      multiple: true
      save: products

# Extract structured data
actions:
  - extract:
      selector: ".card"
      save: cards
      fields:
        - selector: ".title"
          name: title
        - selector: ".price"
          name: price
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| selector | string | Yes | Element selector |
| save | string | Yes | Variable name to store result |
| multiple | boolean | No | Extract all matching elements |
| fields | array | No | Structured extraction with sub-selectors |

## Implementation

See `src/libs/interpreter.js` for the `extract` action handler.

## Examples

```yaml
# Get page title
actions:
  - open: "https://example.com"
  - extract:
      selector: "h1"
      save: title
  - log: "Page title: ${title}"

# Scrape product list
actions:
  - extract:
      selector: ".product"
      multiple: true
      save: products
```
