---
name: pptr-commands
description: Complete reference for all pptr YAML actions (click, type, wait, ask, extract, log, etc.)
---

# pptr-commands

Reference for all pptr actions available in YAML scripts.

## Navigation

### `open` - Navigate to URL

```yaml
actions:
  - open: "https://example.com"
```

### `back` - Go back

```yaml
actions:
  - back
```

### `forward` - Go forward

```yaml
actions:
  - forward
```

### `reload` - Reload page

```yaml
actions:
  - reload
```

---

## Interaction

### `click` - Click element

```yaml
# Basic
actions:
  - click: "#submit-button"

# With wait
actions:
  - click:
      selector: "#button"
      wait: ".result"
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| selector | string | Yes | CSS or XPath selector |
| wait | string | No | Element to wait for after clicking |

### `type` - Type into input

```yaml
actions:
  - type:
      selector: "#username"
      text: "johndoe"

# With delay
actions:
  - type:
      selector: "#message"
      text: "Hello"
      delay: 50
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| selector | string | Yes | Target input |
| text | string | Yes | Text to type |
| delay | number | No | Ms delay between keystrokes |

### `fill` - Fill input (alias)

```yaml
actions:
  - fill: "#username"
```

### `hover` - Hover over element

```yaml
actions:
  - hover: "#menu-item"
```

### `select` - Select dropdown option

```yaml
actions:
  - select:
      selector: "#country"
      value: "US"
```

### `press` - Press keyboard key

```yaml
actions:
  - press: "Enter"
  - press: "Escape"
  - press: "Tab"
```

### `scroll` - Scroll page/element

```yaml
# Scroll to position
actions:
  - scroll:
      y: 500

# Scroll element into view
actions:
  - scroll:
      selector: "#footer"
```

---

## Waiting

### `wait` - Wait for element/timeout/navigation

```yaml
# Wait for element
actions:
  - wait:
      selector: "#content"
      timeout: 5000

# Wait for timeout (ms)
actions:
  - wait:
      timeout: 2000

# Wait for navigation
actions:
  - wait:
      navigation: true

# Wait for condition
actions:
  - wait:
      condition: "document.querySelector('.loaded') !== null"
```

---

## Tabs

### `newTab` - Open new tab

```yaml
# Simple
actions:
  - newTab: "https://example.com"

# With actions
actions:
  - newTab:
      url: "https://example.com"
      actions:
        - click: "#button"
```

### `switchTab` - Switch to tab

```yaml
actions:
  - switchTab: 0  # First tab
  - switchTab: 2  # Third tab
```

### `closeTab` - Close current tab

```yaml
actions:
  - closeTab
```

---

## AI/Models

### `ask` - Call AI model

```yaml
# Simple (uses default model)
actions:
  - ask: "What is 2+2?"

# Full options
actions:
  - ask:
      prompt: "Summarize this"
      model: mymodel
      continue: true
      session: chat1
      save: response
```

| Property | Type | Description |
|----------|------|-------------|
| prompt | string | The prompt (required) |
| model | string | Model to use |
| temperature | number | Sampling temp (0-2) |
| max_tokens | integer | Max response tokens |
| context | list | Additional context |
| continue | boolean | Maintain history |
| session | string | Session label |
| save | string | Variable (default: $result) |

### Direct model call

```yaml
models:
  coder:
    model: codellama

actions:
  - coder: "Write a Python function"
```

---

## Control Flow

### `if` / `else` - Conditional

```yaml
# Check element exists
actions:
  - if:
      selector: ".modal"
    then:
      - click: ".modal .close"
    else:
      - log: "No modal"

# Check condition
actions:
  - if:
      condition: "${count} > 0"
    then:
      - log: "Items found"
```

### `for` - Iterate

```yaml
# Iterate array
actions:
  - for:
      items: "${colors}"
      as: color
    actions:
      - log: "Processing ${color}"

# Iterate DOM elements
actions:
  - for:
      selector: ".product"
      as: item
    actions:
      - extract:
          selector: "${item}"
          save: name
```

### `repeat` - Repeat N times

```yaml
actions:
  - repeat:
      times: 5
      delay: 1000
    actions:
      - click: "#refresh"
```

### `break` - Exit loop

```yaml
actions:
  - for:
      selector: ".item"
      as: item
    actions:
      - if:
          condition: "${item} === 'STOP'"
        then:
          - break
```

### `continue` - Next iteration

```yaml
actions:
  - if:
      selector: "${row}.skip"
    then:
      - continue
```

### `parallel` - Concurrent branches

```yaml
actions:
  - parallel:
      branches:
        - actions:
            - open: "https://site-a.com"
        - actions:
            - open: "https://site-b.com"
```

### `retry` - Retry on failure

```yaml
actions:
  - retry:
      times: 3
      delay: 1000
      backoff: exponential
    action:
      - click: "#unstable"
```

### `try` / `catch` - Error handling

```yaml
actions:
  - try:
      action:
        - click: "#optional-popup"
    catch:
      - log: "Popup not found"
```

---

## Data

### `extract` - Extract from page

```yaml
# Single value
actions:
  - extract:
      selector: "h1.title"
      save: page_title

# Multiple values
actions:
  - extract:
      selector: ".product-item"
      multiple: true
      save: products

# Structured fields
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

### `screenshot` - Take screenshot

```yaml
actions:
  - screenshot: "output/full.png"

actions:
  - screenshot:
      selector: "#chart"
      path: "output/chart.png"
```

### `pdf` - Generate PDF

```yaml
actions:
  - pdf: "output/document.pdf"
```

### `input` - Interactive input

```yaml
actions:
  - input: "Enter your name: "
  - log: "Hello ${result}"

actions:
  - input:
      prompt: "Password: "
      var: password
      hide: true
```

### `choice` - Interactive selection

```yaml
actions:
  - choice:
      prompt: "Select an option:"
      options:
        - Option A
        - Option B
      var: selection
```

---

## Logging

### `log` - Log message

```yaml
actions:
  - log: "Processing"

actions:
  - log:
      message: "Warning: element not found"
      level: WARN
```

Levels: INFO (default), WARN, ERROR, DEBUG

---

## File Operations

### `write` - Write file

```yaml
actions:
  - write:
      file: "output/data.json"
      content: '{"key": "value"}'

# Append
actions:
  - write:
      file: "output/log.txt"
      content: "Entry\n"
      append: true
```

### `curl` - HTTP request

```yaml
actions:
  - curl: "https://api.example.com/data"

actions:
  - curl:
      url: "https://api.example.com/data"
      method: POST
      headers:
        Content-Type: "application/json"
      body: '{"key": "value"}'
```

---

## Code Execution

### `js` - JavaScript in browser

```yaml
actions:
  - js: "document.title"

actions:
  - js:
      code: "document.querySelectorAll('.item').length"
```

### `node` - Node.js server-side

```yaml
actions:
  - node: "const sum = 1 + 2; return sum;"
```

### `shell` - Shell command

```yaml
actions:
  - shell: "ls -la"

actions:
  - shell:
      command: "echo ${message}"
      save: output
```

---

## Functions

### `fn` - Define closure

```yaml
actions:
  - fn:
      name: greet
      params:
        name: "World"
      actions:
        - return: "Hello, ${name}!"
```

### `return` - Return from function

```yaml
functions:
  getStatus:
    params:
      item: null
    actions:
      - return: "${item} loaded"
```

---

## Selectors

CSS selectors (default):
```yaml
- click: "#button"
- type: "input[name='email']"
```

XPath selectors (start with `/`):
```yaml
- click: "//button[@id='submit']"
- wait: "//div[contains(@class, 'result')]"
```

---

## Variables

Use `${VAR}` syntax:

```yaml
vars:
  base_url: "https://example.com"

actions:
  - open: "${base_url}/login"
  - log: "User ${username}"
```

Special variables:
- `$result` - last action result
- `${env.VAR}` - environment variables
