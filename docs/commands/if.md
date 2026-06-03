---
name: if
description: Conditional execution based on selector or condition.
---

# `if` / `else` Command

Conditional execution based on selector existence, visibility, or JavaScript condition.

## YAML Syntax

```yaml
# Check if element exists
actions:
  - if:
      selector: ".modal"
    then:
      - click: ".modal .close"
    else:
      - log: "No modal found"

# Check element visibility
actions:
  - if:
      selector: "#submit"
      visible: true
    then:
      - click: "#submit"

# Check JavaScript condition
actions:
  - if:
      condition: "${count} > 0"
    then:
      - log: "Items found"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| selector | string | No | Element selector to check |
| visible | boolean | No | Check if element is visible |
| condition | string | No | JavaScript expression to evaluate |
| then | array | Yes | Actions to execute if condition is true |
| else | array | No | Actions to execute if condition is false |

## Implementation

See `src/libs/interpreter.js` for the `if` action handler.

## Examples

```yaml
# Modal handling
actions:
  - if:
      selector: ".cookie-banner"
    then:
      - click: ".cookie-banner .accept"

# Visibility check
actions:
  - if:
      selector: "#newsletter"
      visible: true
    then:
      - type:
          selector: "#newsletter-email"
          text: "user@example.com"
      - click: "#newsletter-submit"
```
