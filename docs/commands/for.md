---
name: for
description: Iterate over items or DOM elements.
---

# `for` Command

Iterate over an array or DOM elements.

## YAML Syntax

```yaml
# Iterate over array
vars:
  colors: ["red", "green", "blue"]

actions:
  - for:
      items: "${colors}"
      as: color
    actions:
      - log: "Processing ${color}"

# Iterate over DOM elements
actions:
  - for:
      selector: ".product-item"
      as: item
    actions:
      - extract:
          selector: "${item}"
          save: name
      - log: "Found: ${name}"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| items | array | No | Array to iterate over |
| selector | string | No | DOM elements to iterate over |
| as | string | Yes | Variable name for current item |
| actions | array | Yes | Actions to execute for each item |

## Implementation

See `src/libs/interpreter.js` for the `for` action handler.

## Examples

```yaml
# Process array items
vars:
  urls:
    - "https://site-a.com"
    - "https://site-b.com"
    - "https://site-c.com"

actions:
  - for:
      items: "${urls}"
      as: url
    actions:
      - open: "${url}"
      - screenshot: "${url.hostname}.png"

# Scrape product list
actions:
  - open: "https://shop.example.com"
  - for:
      selector: ".product"
      as: product
    actions:
      - extract:
          selector: "${product} .title"
          save: title
      - extract:
          selector: "${product} .price"
          save: price
```
