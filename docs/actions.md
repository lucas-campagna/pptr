# Actions Reference

Complete reference for all actions available in pptr YAML scripts.

## Table of Contents

- [Navigation](#navigation)
- [Interaction](#interaction)
- [Waiting](#waiting)
- [Tabs](#tabs)
- [Control Flow](#control-flow)
- [Data](#data)
- [Logging](#logging)
- [Functions](#functions)

---

## Navigation

### `open`

Navigate to a URL.

```yaml
actions:
  - open: "https://example.com"
```

### `back`

Go back in browser history.

```yaml
actions:
  - back
```

### `forward`

Go forward in browser history.

```yaml
actions:
  - forward
```

### `reload`

Reload the current page.

```yaml
actions:
  - reload
```

---

## Interaction

### `click`

Click an element. Optionally wait for another element after clicking.

```yaml
# Basic click
actions:
  - click: "#submit-button"

# Click with wait after
actions:
  - click:
      selector: "#button"
      wait: ".result"  # wait for this element
```

### `type`

Type text into an input field.

```yaml
# Basic usage
actions:
  - type:
      selector: "#username"
      text: "johndoe"

# With typing delay (ms per character)
actions:
  - type:
      selector: "#message"
      text: "Hello world"
      delay: 50
```

### `hover`

Hover over an element.

```yaml
actions:
  - hover: "#menu-item"
```

### `select`

Select an option from a dropdown.

```yaml
actions:
  - select:
      selector: "#country"
      value: "US"
```

### `scroll`

Scroll the page or an element.

```yaml
# Scroll to position (pixels)
actions:
  - scroll:
      y: 500

# Scroll element into view
actions:
  - scroll:
      selector: "#footer"
```

### `press`

Press a keyboard key.

```yaml
actions:
  - press: "Enter"
  - press: "Escape"
  - press: "Tab"
```

---

## Waiting

### `wait`

Wait for element, timeout, navigation, or condition.

```yaml
# Wait for element to appear
actions:
  - wait:
      selector: "#content"
      timeout: 5000

# Wait for timeout (milliseconds)
actions:
  - wait:
      timeout: 2000

# Wait for navigation
actions:
  - wait:
      navigation: true

# Wait for JavaScript condition
actions:
  - wait:
      condition: "document.querySelector('.loaded') !== null"
      timeout: 10000
```

---

## Tabs

### `newTab`

Open a new tab with optional actions.

```yaml
# Simple new tab
actions:
  - newTab: "https://another-site.com"

# New tab with actions
actions:
  - newTab:
      url: "https://example.com"
      actions:
        - click: "#button"
        - screenshot: "tab-screenshot.png"
```

### `switchTab`

Switch to a tab by index.

```yaml
actions:
  - switchTab: 0  # First tab
  - switchTab: 2  # Third tab
```

### `closeTab`

Close the current tab.

```yaml
actions:
  - closeTab
```

---

## Control Flow

### `if` / `else`

Conditional execution based on selector or condition.

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

### `for`

Iterate over items or DOM elements.

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

### `repeat`

Repeat actions N times.

```yaml
# Repeat 5 times
actions:
  - repeat:
      times: 5
      delay: 1000  # Optional delay between iterations (ms)
    actions:
      - click: "#refresh"
```

### `break`

Exit a loop early.

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

### `continue`

Skip to next iteration.

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

### `parallel`

Execute multiple action branches concurrently.

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

### `retry`

Retry failed actions with optional exponential backoff.

```yaml
# Basic retry
actions:
  - retry:
      times: 3
      delay: 1000
    action:
      - click: "#unstable-button"
      - wait: ".success"

# With exponential backoff
actions:
  - retry:
      times: 5
      delay: 1000
      backoff: exponential
    action:
      - api-call: "https://api.example.com/data"
```

### `try` / `catch`

Error handling with catch block.

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

---

## Data

### `extract`

Extract text or structured data from the page.

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

### `screenshot`

Take a screenshot of the page or element.

```yaml
# Full page screenshot
actions:
  - screenshot: "output/full.png"

# Element screenshot
actions:
  - screenshot:
      selector: "#chart"
      path: "output/chart.png"

# Viewport only
actions:
  - screenshot:
      path: "output/viewport.png"
      fullPage: false
```

### `pdf`

Generate PDF of the page.

```yaml
actions:
  - pdf: "output/document.pdf"
```

### `write`

Write content to a file.

```yaml
# Write to file (overwrites)
actions:
  - write:
      file: "output/data.json"
      content: '{"key": "value"}'

# Append to file
actions:
  - write:
      file: "output/log.txt"
      content: "Entry added\n"
      append: true

# With variable interpolation
vars:
  title: "Report"
  date: "2024-01-15"

actions:
  - write:
      file: "output/report.txt"
      content: "${title} - ${date}"
```

### `input`

Prompt user for interactive input.

```yaml
# Simple form - result stored in $result
actions:
  - input: "Enter your name: "
  - log: "Hello ${result}!"

# Full form with options
actions:
  - input:
      prompt: "Password: "
      var: "user_password"
      default: null
      hide: true
```

**Input Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prompt` | string | `"Enter value: "` | Prompt text shown to user |
| `var` | string | `$result` | Variable name to store input |
| `default` | any | `null` | Default value if empty input |
| `hide` | boolean | `false` | Hide input (for passwords) |

---

## Logging

### `log`

Log a message with optional level.

```yaml
# Simple log
actions:
  - log: "Processing started"

# With level
actions:
  - log:
      message: "Warning: element not found"
      level: WARN

# With variable interpolation
actions:
  - log: "User ${username} logged in at ${timestamp}"
```

**Log Levels:** `INFO` (default), `WARN`, `ERROR`, `DEBUG`

---

## Functions

### `functions`

Define reusable action blocks with parameters.

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

### `return`

Return a value from a function. Sets `$result` variable.

```yaml
functions:
  getStatus:
    params:
      item: null
    actions:
      - extract:
          selector: "#${item}-status"
          save: status
      - return: "${status}"
```

### Calling Functions

```yaml
actions:
  - login:
      username: "user@example.com"
      password: "secret123"
  - log: "Result: ${result}"

  # With return value
  - getStatus:
      item: "order"
  - log: "Order status: ${result}"
```

**Function Features:**

- Parameters with default values
- Scoped variables (params don't leak outside function)
- `$result` captures return value
- Functions can call other functions

---

## Selectors

All actions accepting selectors support both CSS and XPath:

```yaml
# CSS selector (default)
actions:
  - click: "#button"
  - type:
      selector: "input[name='email']"
      text: "test@example.com"

# XPath selector (starts with /)
actions:
  - click: "//button[@id='submit']"
  - wait: "//div[contains(@class, 'result')]"
```

## Variables

Use `${VAR}` syntax for variable interpolation:

```yaml
vars:
  base_url: "https://example.com"
  username: "admin"

actions:
  - open: "${base_url}/login"
  - type:
      selector: "#user"
      text: "${username}"
```

Environment variables: `${env.VAR_NAME}`

```yaml
actions:
  - log: "Home directory: ${env.HOME}"
```
