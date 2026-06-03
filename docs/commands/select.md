---
name: select
description: Select an option from a dropdown.
---

# `select` Command

Select an option from a dropdown (`<select>` element).

## YAML Syntax

```yaml
actions:
  - select:
      selector: "#country"
      value: "US"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| selector | string | Yes | CSS or XPath selector |
| value | string | Yes | The option value to select |

## Implementation

See `src/libs/interpreter.js` for the `select` action handler that uses Puppeteer's `page.select()`.

## Examples

```yaml
# Select country
actions:
  - select:
      selector: "#country"
      value: "US"

# Select by text
actions:
  - select:
      selector: "#state"
      text: "California"
```
