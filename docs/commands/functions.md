---
name: functions
description: Define reusable action blocks with parameters.
---

# `functions` Command

Define reusable action blocks with parameters that can be called from the `actions` section.

## YAML Syntax

```yaml
functions:
  login:
    params:
      username: null
      password: null
    actions:
      - type:
          selector: "#username"
          text: "${username}"
      - type:
          selector: "#password"
          text: "${password}"
      - click: "#submit"
      - return: "logged_in"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| params | object | Yes | Parameter definitions with default values |
| actions | array | Yes | Actions to execute when function is called |

## Implementation

See `src/libs/interpreter.js` for function definition and invocation handling.

## Examples

```yaml
# Define and call function
functions:
  login:
    params:
      username: null
      password: null
    actions:
      - type:
          selector: "#username"
          text: "${username}"
      - type:
          selector: "#password"
          text: "${password}"
      - click: "#submit"

actions:
  - login:
      username: "user@example.com"
      password: "secret123"

# Function with return value
functions:
  getStatus:
    params:
      item: null
    actions:
      - extract:
          selector: "#${item}-status"
          save: status
      - return: "${status}"

actions:
  - getStatus:
      item: "order"
  - log: "Order status: ${result}"
```

## Function Features

- Parameters with default values
- Scoped variables (params don't leak outside function)
- `result` captures return value
- Functions can call other functions
