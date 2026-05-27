---
name: pptr-functions
description: Reference guide for pptr functions. Use when defining reusable action blocks with parameters in YAML scripts.
---

# Functions

Define reusable action blocks with parameters to avoid repetition and keep scripts DRY.

## Defining Functions

Add a `functions:` block at the top level of your YAML:

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
      - wait: ".dashboard"
      - return: "logged_in"
```

## Calling Functions

Use the function name as an action. Pass arguments by name:

```yaml
actions:
  - login:
      username: "admin"
      password: "secret123"
  - log: "Result: ${result}"
```

## Parameters

### Declaring Parameters

```yaml
functions:
  sum:
    params:
      a: 0
      b: 0
    actions:
      - return: "${a + b}"
```

### Default Values

Parameters can have defaults:

```yaml
functions:
  greet:
    params:
      name: "World"
      greeting: "Hello"
    actions:
      - return: "${greeting}, ${name}!"
```

### Calling with Defaults

```yaml
actions:
  - greet                    # Uses defaults: "World", "Hello"
  - greet:
      name: "Alice"          # Uses: "Alice", "Hello"
  - greet:
      name: "Bob"
      greeting: "Hi"         # Uses: "Bob", "Hi"
```

## Return Values

Use the `return` action to set a result value:

```yaml
functions:
  getTitle:
    params:
      selector: "h1"
    actions:
      - extract:
          selector: "${selector}"
          save: title
      - return: "${title}"
```

Access the result via `${result}`:

```yaml
actions:
  - getTitle:
      selector: ".article-title"
  - log: "Title is: ${result}"
```

## Scoped Variables

Function parameters are scoped — they don't leak outside the function:

```yaml
functions:
  increment:
    params:
      counter: 0
    actions:
      - log: "Inside function: ${counter}"
      - return: "${counter + 1}"

actions:
  - increment:
      counter: 5
  - log: "Outside function: ${counter}"  # ${counter} is unchanged (undefined/empty)
```

## Nested Function Calls

Functions can call other functions:

```yaml
functions:
  step1:
    params:
      value: null
    actions:
      - return: "${value * 2}"

  step2:
    params:
      value: null
    actions:
      - step1:
          value: "${value}"
      - return: "${result + 1}"

actions:
  - step2:
      value: 10
  - log: "Final: ${result}"  # 21
```

## Real-World Example

### Login Function

```yaml
functions:
  login:
    params:
      username: null
      password: null
      baseUrl: "https://example.com"
    actions:
      - open: "${baseUrl}/login"
      - type:
          selector: "#username"
          text: "${username}"
      - type:
          selector: "#password"
          text: "${password}"
      - click: "#submit"
      - wait:
          selector: ".user-menu"
          timeout: 10000
      - return: "success"

  logout:
    actions:
      - click: ".user-menu"
      - click: "#logout"
      - wait: "#login-form"
      - return: "logged_out"
```

### Usage

```yaml
actions:
  - login:
      username: "admin@example.com"
      password: "${env.PASSWORD}"
  - log: "Logged in successfully"
  - click: "#dashboard"
  - screenshot: "dashboard.png"
  - logout
```

## Function Best Practices

- **Name functions descriptively** — `login`, `extractProductData`, `fillForm`
- **Document params** — use comments if needed (YAML supports `#`)
- **Handle missing params** — use default values like `null` or empty strings
- **Return meaningful values** — set `${result}` so callers can use the output
- **Keep functions focused** — one function = one responsibility

## Calling Functions Dynamically

You can call functions inside loops or conditional blocks:

```yaml
functions:
  processItem:
    params:
      url: null
    actions:
      - newTab: "${url}"
      - extract:
          selector: "h1"
          save: title
      - closeTab
      - return: "${title}"

actions:
  - for:
      items: "${urls}"
      as: url
    actions:
      - processItem:
          url: "${url}"
      - log: "Processed: ${result}"
```