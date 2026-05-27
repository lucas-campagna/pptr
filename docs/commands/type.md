---
name: pptr-cmd-type
description: Type text into an input field.
---

# `type` Command

Type text into an input field.

## YAML Syntax

```yaml
# Basic usage
actions:
  - type:
      selector: "#username"
      text: "johndoe"

# With typing delay
actions:
  - type:
      selector: "#message"
      text: "Hello world"
      delay: 50
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| selector | string | Yes | CSS or XPath selector |
| text | string | Yes | Text to type |
| delay | number | No | Delay in ms between each character |

## Implementation

See `src/libs/interpreter.js` for the `type` action handler that uses Puppeteer's `page.type()`.

## Examples

```yaml
# Login form
actions:
  - type:
      selector: "#username"
      text: "admin"
  - type:
      selector: "#password"
      text: "secret"
      delay: 100
```
