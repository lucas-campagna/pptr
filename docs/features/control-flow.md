---
name: control-flow
description: Reference guide for pptr control flow. Use when implementing conditional execution, loops, retry logic, and error handling in YAML scripts.
---

# Control Flow

Conditional execution, loops, retry logic, and error handling.

## `if` / `else`

### Basic If

```yaml
actions:
  - if:
      selector: ".modal"
    then:
      - click: ".modal .close"
```

### If-Then-Else

```yaml
actions:
  - if:
      selector: ".modal"
    then:
      - click: ".modal .close"
    else:
      - log: "No modal found"
```

### Check Visibility

```yaml
actions:
  - if:
      selector: "#submit"
      visible: true
    then:
      - click: "#submit"
```

### Check Condition

```yaml
vars:
  count: 5

actions:
  - if:
      condition: "${count} > 0"
    then:
      - log: "Items found"
    else:
      - log: "No items"
```

## `for`

### Iterate Over Array

```yaml
vars:
  colors: ["red", "green", "blue"]

actions:
  - for:
      items: "${colors}"
      as: color
    actions:
      - log: "Processing ${color}"
```

### Iterate Over DOM Elements

```yaml
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

## `repeat`

```yaml
actions:
  - repeat:
      times: 5
      delay: 1000
    actions:
      - click: "#refresh"
```

## `retry`

### Basic Retry

```yaml
actions:
  - retry:
      times: 3
      delay: 1000
    action:
      - click: "#unstable-button"
      - wait: ".success"
```

### Exponential Backoff

```yaml
actions:
  - retry:
      times: 5
      delay: 1000
      backoff: exponential
    action:
      - api-call: "https://api.example.com/data"
```

## `try` / `catch`

```yaml
actions:
  - try:
      action:
        - click: "#optional-popup"
        - screenshot: "popup.png"
    catch:
      - log: "Popup not found, continuing"
      - screenshot: "no-popup.png"
```

## `break` and `continue`

### Break Loop

```yaml
actions:
  - for:
      selector: ".item"
      as: item
    actions:
      - extract:
          selector: "${item}"
          save: text
      - if:
          condition: "${text} === 'STOP'"
        then:
          - break
```

### Continue Loop

```yaml
actions:
  - for:
      selector: ".row"
      as: row
    actions:
      - if:
          selector: "${row}.skip"
        then:
          - continue
      - log: "Processing row"
```

## `parallel`

Execute multiple branches concurrently:

```yaml
actions:
  - parallel:
      branches:
        - actions:
            - open: "https://site-a.com"
            - screenshot: "site-a.png"
        - actions:
            - open: "https://site-b.com"
            - screenshot: "site-b.png"
```

## Implementation Notes

- All control flow is normalized by `Parser.normalizeActions()` in `src/libs/parser.js`
- Specific handlers: `normalizeIf()`, `normalizeFor()`, `normalizeRepeat()`, `normalizeRetry()`, `normalizeTry()`
- Execution in `Interpreter.executeActions()` via `executeAction()` dispatch
- `break` and `continue` work within `for` and `repeat` loops via loop state tracking