---
name: pptr-features
description: Conceptual guides for pptr major features - Server, Functions, Variables, Meta, Models, Imports, Tabs, Subcommands, Control Flow.
---

# pptr-features

Guide to pptr's major features for building automation scripts.

---

## Server

Run pptr as an HTTP server with REST endpoints.

```bash
pptr script.yaml --server [port]
```

### Routes

```yaml
routes:
  /hello:
    GET:
      - return: "Hello World!"

  /scrape:
    POST:
      - open: "${body.url}"
      - screenshot: "/tmp/result.png"
      - return: { path: "/tmp/result.png" }
```

### Route Variables

| Variable | Description |
|----------|-------------|
| `${params}` | URL path parameters |
| `${query}` | Query string parameters |
| `${body}` | Parsed request body |
| `${headers}` | Request headers |

### Example

```yaml
routes:
  /screenshot:
    GET:
      - open: "${query.url}"
      - wait: { timeout: 5000 }
      - screenshot: "/tmp/screenshot.png"
      - return: { path: "/tmp/screenshot.png" }
```

---

## Functions

Define reusable action blocks with parameters.

```yaml
functions:
  login:
    params:
      username: null
      password: null
    actions:
      - type: { selector: "#username", text: "${username}" }
      - type: { selector: "#password", text: "${password}" }
      - click: "#submit"
      - return: "success"
```

### Call Functions

```yaml
actions:
  - login:
      username: "admin"
      password: "secret"
  - log: "Result: ${result}"
```

### Nested Functions

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
```

---

## Variables

Store and interpolate values throughout scripts.

### Declaration

```yaml
vars:
  BASE_URL: "https://example.com"
  TIMEOUT: 30000
  COUNT: 5
```

### Interpolation

```yaml
actions:
  - open: "${BASE_URL}/login"
  - log: "Count: ${count}"
```

### Environment Variables

```yaml
actions:
  - log: "Home: ${env.HOME}"
```

### Runtime Override

```bash
pptr script.yaml -v BASE_URL=https://google.com
```

### Expressions

```yaml
actions:
  - log: "Sum: ${a + b}"
  - log: "Greater: ${count > 0}"
```

### Complex Data

```yaml
vars:
  CONFIG:
    timeout: 5000
    items:
      - name: "first"

actions:
  - log: "Timeout: ${CONFIG.timeout}"
  - log: "First: ${CONFIG.items[0].name}"
```

### Reserved Variables

| Variable | Description |
|----------|-------------|
| `${result}` | Last function return value |
| `${params}` | URL path parameters (routes) |
| `${query}` | Query parameters (routes) |
| `${body}` | Request body (routes) |
| `${env.VAR}` | Environment variable |

---

## Meta

Script-level configuration options.

```yaml
meta:
  name: my-script
  timeout: 30000
  slowMo: 100
  log: ./logs/script.log
  headless: true
  browser: chrome
  models:
    default: mymodel
    continue: false
    session: auto
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | - | Script name |
| `timeout` | number | - | Global timeout (ms) |
| `slowMo` | number | - | Delay between actions (ms) |
| `log` | string | - | Log file path |
| `headless` | boolean | true | Run headless |
| `browser` | string | - | Browser: chrome, edge, firefox... |

---

## Models

Configure AI models for `ask` action or direct calls.

```yaml
meta:
  models:
    default: mymodel
    continue: false
    session: auto

models:
  mymodel:
    model: llama3.2
    temperature: 0.7
    max_tokens: 1000
    top_p: 0.9
    seed: 42
    response_format: text
    tools:
      - websearch
    context:
      - system: "You are helpful"
      - user: "Default prompt"
```

### Model Options

| Option | Type | Description |
|--------|------|-------------|
| `model` | string | Model identifier (required) |
| `temperature` | number | Sampling temperature (0-2) |
| `max_tokens` | integer | Max response tokens |
| `top_p` | number | Nucleus sampling (0-1) |
| `seed` | integer | Deterministic sampling |
| `response_format` | string | "text" or "json" |
| `tools` | list | Enabled tools |
| `context` | list | Default context messages |

### Context Format (OpenAI)

```yaml
context:
  - system: "You are helpful"
  - user: "The user said"
  - assistant: "Assistant response"
```

### Stateless vs Stateful

```yaml
# Stateless (default) - each call independent
meta:
  models:
    continue: false

# Stateful - accumulate conversation history
meta:
  models:
    continue: true
```

### Usage

```yaml
actions:
  - ask: "What is 2+2?"
  - log: "Answer: ${$result}"

# Direct model call
actions:
  - coder: "Write Python"
```

---

## Imports

Import and reuse other YAML scripts.

```yaml
import:
  common: ./common.yaml
  auth: ./auth.yaml

actions:
  - common.actions
  - auth.functions.login:
      username: "admin"
```

### Script A (script-a.yml)

```yaml
functions:
  sum:
    params:
      x: 0
      y: 0
    actions:
      - return: "${x + y}"
```

### Script B

```yaml
import:
  a: ./script-a.yml

actions:
  - a.functions.sum:
      x: 2
      y: 3
  - log: "Result: ${result}"
```

---

## Tabs

Run multiple browser tabs in parallel.

```yaml
open: "https://site-a.com"

tabs:
  - open: "https://site-b.com"
    actions:
      - extract: { selector: "h1", save: "titleB" }
  - open: "https://site-c.com"
    actions:
      - screenshot: "tab3.png"

actions:
  - extract: { selector: "h1", save: "titleA" }
```

### Tab Actions

```yaml
actions:
  - newTab: "https://example.com"
  - switchTab: 1
  - closeTab
```

### Variable Sharing

Variables set in any tab are accessible globally.

---

## Subcommands

Define multiple entry points in one script.

```yaml
subcommands:
  login:
    open: "https://example.com/login"
    actions:
      - type: { selector: "#user", text: "${USER}" }
      - click: "#submit"

  logout:
    actions:
      - click: ".user-menu"
      - click: "#logout"
```

### Invocation

```bash
pptr script.yaml login
pptr script.yaml logout
```

### Nested Subcommands

```yaml
subcommands:
  admin:
    subcommands:
      login:
        open: "https://admin.example.com"
```

```bash
pptr script.yaml admin login
```

---

## Control Flow

Conditionals, loops, retry, and error handling.

### if / else

```yaml
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

### for

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
      selector: ".product-item"
      as: item
    actions:
      - extract: { selector: "${item}", save: name }
```

### repeat

```yaml
actions:
  - repeat:
      times: 5
      delay: 1000
    actions:
      - click: "#refresh"
```

### retry

```yaml
actions:
  - retry:
      times: 3
      delay: 1000
      backoff: exponential
    action:
      - click: "#unstable"
```

### try / catch

```yaml
actions:
  - try:
      action:
        - click: "#optional-popup"
    catch:
      - log: "Popup not found"
```

### break / continue

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

### parallel

```yaml
actions:
  - parallel:
      branches:
        - actions:
            - open: "https://site-a.com"
        - actions:
            - open: "https://site-b.com"
```

---

## Quick Examples

### Server

```yaml
routes:
  /hello:
    GET:
      - return: "Hello World!"
```

### Functions

```yaml
functions:
  greet:
    params:
      name: "World"
    actions:
      - return: "Hello, ${name}!"

actions:
  - greet:
      name: "Alice"
```

### Variables

```yaml
vars:
  BASE_URL: "https://example.com"

actions:
  - open: "${BASE_URL}/login"
```

### Meta

```yaml
meta:
  name: my-script
  timeout: 30000
  slowMo: 100

open: https://example.com
actions:
  - log: "Done"
```
