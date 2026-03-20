# Puppeteer Script Runner Documentation

A YAML-based scripting language for browser automation using Puppeteer.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
- [Script Structure](#script-structure)
- [Variables](#variables)
- [Selectors](#selectors)
- [Actions Reference](#actions-reference)
  - [Navigation](#navigation)
  - [Interaction](#interaction)
  - [Waiting](#waiting)
  - [Tabs](#tabs)
  - [Control Flow](#control-flow)
  - [Data Extraction](#data-extraction)
  - [Output](#output)
  - [Logging](#logging)
- [Examples](#examples)

## Installation

### Docker (Recommended)

```bash
docker build -t puppeteer-runner .
```

### Local Development

```bash
npm install
```

## Quick Start

Create a script file `scripts/example.yaml`:

```yaml
open: https://example.com

actions:
  - log: "Starting automation"
  - screenshot: output.png
```

Run with Docker:

```bash
./run-puppeteer.sh scripts/example.yaml
```

Run locally:

```bash
node src/cli.js scripts/example.yaml
```

## CLI Usage

### Bash Script (Docker)

```bash
./run-puppeteer.sh <script.yaml> [options]
```

### Node CLI (Local)

```bash
node src/cli.js <script.yaml> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-e, --execute <yaml>` | Execute YAML directly from command line |
| `--headless` | Run in headless mode (default) |
| `--no-headless` | Run with visible browser |
| `-d, --debug` | Enable debug level logging |
| `--log <path>` | Write logs to file inside output directory |
| `--output <dir>` | Output directory (default: `./output`) |
| `-v, --var <VAR=VALUE>` | Override variable (can use multiple times) |
| `-o, --output <path>` | Compile script to standalone shell script |

### Examples

```bash
# Basic usage
./run-puppeteer.sh scripts/example.yaml

# Execute YAML from command line
./run-puppeteer.sh -e "open: https://example.com"
./run-puppeteer.sh -e "open: https://example.com\nactions:\n  - log: hello"

# Override variables
./run-puppeteer.sh scripts/example.yaml --var BASE_URL=https://google.com

# Multiple variable overrides
./run-puppeteer.sh scripts/example.yaml \
  --var BASE_URL=https://google.com \
  --var SEARCH_TERM=automation

# Run with visible browser
./run-puppeteer.sh scripts/example.yaml --no-headless

# Enable debug logging
./run-puppeteer.sh scripts/example.yaml -d

# Custom output directory
./run-puppeteer.sh scripts/example.yaml --output ./results --log automation.log

# Compile to standalone shell script
./run-puppeteer.sh scripts/example.yaml -o myapp

# Run compiled script (pptr must be in PATH)
./myapp

# Compile with default variables
./run-puppeteer.sh scripts/example.yaml -o myapp -v BASE_URL=https://google.com

# Override variables at runtime
./myapp -v BASE_URL=https://github.com
```

## Script Structure

```yaml
meta:
  name: "script-name"
  logs: "./output/script.log"
  timeout: 30000
  headless: true
  slowMo: 0

vars:
  VAR1: "static-value"
  VAR2: ${env.ENV_VAR}
  VAR3: "${VAR1}-suffix"

open: https://example.com

actions:
  - # action 1
  - # action 2

tabs:
  - open: https://other-site.com
    actions:
      - # tab actions
```

### Meta Configuration

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Script name (for logging) |
| `logs` | string | Path to log file |
| `timeout` | number | Global timeout in milliseconds |
| `headless` | boolean | Run in headless mode |
| `slowMo` | number | Slow down actions (ms) |

## Variables

### Variable Syntax

Use `${VAR_NAME}` to interpolate variables:

```yaml
vars:
  BASE_URL: "https://example.com"
  USERNAME: ${env.USER}

actions:
  - open: ${BASE_URL}/login
  - type:
      selector: "#username"
      text: "${USERNAME}"
```

### Environment Variables

Access environment variables with `${env.VAR_NAME}`:

```yaml
vars:
  API_KEY: ${env.API_KEY}
  USER: ${env.USER}
```

### Variable Override

Override variables from command line:

```bash
# Override BASE_URL
./run-puppeteer.sh script.yaml --var BASE_URL=https://other.com

# Shorthand
./run-puppeteer.sh script.yaml -v BASE_URL=https://other.com
```

Command-line variables take precedence over YAML-defined variables.

## Selectors

### CSS Selectors

By default, all selectors are treated as CSS selectors:

```yaml
- click: "#button"
- type:
    selector: "input[name='email']"
    text: "test@example.com"
- extract:
    selector: ".product-title"
    save: title
```

### XPath Selectors

Selectors starting with `/` are automatically interpreted as XPath expressions:

```yaml
# XPath for clicking
- click: "//button[@id='submit']"

# XPath for typing
- type:
    selector: "//input[@name='username']"
    text: "johndoe"

# XPath for waiting
- wait: "//div[contains(@class, 'result')]"

# XPath for extraction
- extract:
    selector: "//table//tr"
    multiple: true
    save: rows

# XPath for iteration
- for:
    selector: "//ul[@id='menu']/li"
    as: item
    actions:
      - log: "${item}"
```

### When to Use XPath

Use XPath when you need to:
- Select elements by text content: `//a[contains(text(), 'Click me')]`
- Select elements by partial attribute: `//div[contains(@class, 'partial')]`
- Navigate parent/ancestor elements: `//span[@class='child']/..`
- Select elements by position: `//li[3]`
- Complex hierarchical queries: `//table//td[../th='Price']`

### Selector Comparison

| Feature | CSS | XPath |
|---------|-----|-------|
| ID selector | `#id` | `//*[@id='id']` |
| Class selector | `.class` | `//*[contains(@class, 'class')]` |
| Attribute | `[attr='value']` | `//*[@attr='value']` |
| Text content | N/A | `//*[text()='exact']` |
| Partial text | N/A | `//*[contains(text(), 'partial')]` |
| Parent | N/A | `//child/..` |
| Position | `:nth-child(3)` | `//li[3]` |

## Actions Reference

### Navigation

#### `open`

Navigate to a URL.

```yaml
- open: https://example.com
- open: ${BASE_URL}/path
```

#### `back`

Navigate back in browser history.

```yaml
- back:
```

#### `forward`

Navigate forward in browser history.

```yaml
- forward:
```

#### `reload`

Reload the current page.

```yaml
- reload:
```

---

### Interaction

#### `click`

Click an element.

```yaml
# Simple click
- click: "#button"

# Click with wait
- click:
    selector: "#button"
    wait: 1000

# Click and wait for element
- click:
    selector: "#submit"
    wait: ".success-message"
```

| Property | Type | Description |
|----------|------|-------------|
| `selector` | string | CSS selector |
| `wait` | number/string | Wait after click (ms or selector) |

#### `type`

Type text into an input field.

```yaml
# Simple type
- type:
    selector: "#username"
    text: "johndoe"

# Type with delay
- type:
    selector: "#password"
    text: "secret123"
    delay: 50
```

| Property | Type | Description |
|----------|------|-------------|
| `selector` | string | CSS selector |
| `text` | string | Text to type |
| `delay` | number | Delay between keystrokes (ms) |

#### `hover`

Hover over an element.

```yaml
- hover: "#menu-item"
```

#### `select`

Select an option from a dropdown.

```yaml
- select:
    selector: "#country"
    value: "us"
```

#### `scroll`

Scroll the page or to an element.

```yaml
# Scroll to element
- scroll: "#footer"

# Scroll to Y position
- scroll:
    y: 500
```

#### `press`

Press a keyboard key.

```yaml
- press: Enter
- press: Escape
- press: Tab
```

---

### Waiting

#### `wait`

Wait for various conditions.

```yaml
# Wait for element
- wait: ".result"

# Wait for time (ms)
- wait: 3000

# Wait for navigation
- wait: navigation

# Wait for condition
- wait:
    condition: "${VAR} == 'done'"
    timeout: 5000
```

| Property | Type | Description |
|----------|------|-------------|
| `selector` | string | CSS selector to wait for |
| `timeout` | number | Wait duration (ms) |
| `navigation` | boolean | Wait for page navigation |
| `condition` | string | JavaScript condition to evaluate |

---

### Tabs

#### `newTab`

Open a new browser tab.

```yaml
- newTab:
    url: https://example.com
    actions:
      - log: "In new tab"
      - screenshot: new-tab.png
```

#### `switchTab`

Switch to a specific tab (0-indexed).

```yaml
- switchTab: 0
- switchTab: 1
```

#### `closeTab`

Close the current tab.

```yaml
- closeTab:
```

---

### Control Flow

#### `if` / `else`

Conditional execution.

```yaml
# Check if element exists
- if:
    selector: ".popup"
  then:
    - click: ".close-button"

# With else clause
- if:
    selector: ".cookie-banner"
  then:
    - click: ".accept"
  else:
    - log: "No cookie banner"

# Condition-based
- if:
    condition: "${VAR} == 'value'"
  then:
    - log: "Condition is true"
```

| Property | Type | Description |
|----------|------|-------------|
| `selector` | string | Check if element exists |
| `visible` | boolean | Check element visibility |
| `condition` | string | JavaScript condition |
| `then` | array | Actions if true |
| `else` | array | Actions if false |

#### `for`

Iterate over items.

```yaml
# Iterate over array
- for:
    items:
      - "news"
      - "sports"
      - "tech"
    as: category
    actions:
      - log: "Processing ${category}"
      - click: "a[href='/${category}']"

# Iterate over elements
- for:
    selector: ".item"
    as: item
    actions:
      - click: "${item} .button"

# With break condition
- for:
    items: [1, 2, 3, 4, 5]
    as: num
    break:
      condition: "${num} == 3"
    actions:
      - log: "Number: ${num}"
```

| Property | Type | Description |
|----------|------|-------------|
| `items` | array | Array of items to iterate |
| `selector` | string | CSS selector to find elements |
| `as` | string | Variable name for current item |
| `break` | object | Break condition |
| `continue` | object | Continue condition |
| `actions` | array | Actions for each iteration |

Loop index is available as `${var_name}_index`.

#### `repeat`

Repeat actions multiple times.

```yaml
- repeat:
    times: 3
    delay: 1000
    actions:
      - click: ".load-more"
      - wait: ".item"
```

| Property | Type | Description |
|----------|------|-------------|
| `times` | number | Number of repetitions |
| `delay` | number | Delay between iterations (ms) |
| `actions` | array | Actions to repeat |

#### `break` / `continue`

Control loop execution.

```yaml
# Break unconditionally
- break:

# Break with condition
- break:
    condition: "${found} == true"

# Continue unconditionally
- continue:

# Continue with condition
- continue:
    condition: "${item} == 'skip-me'"
```

#### `parallel`

Execute actions in parallel.

```yaml
- parallel:
    - actions:
        - type:
            selector: "#field1"
            text: "data1"
    - actions:
        - type:
            selector: "#field2"
            text: "data2"
```

#### `retry`

Retry failed actions.

```yaml
- retry:
    times: 3
    delay: 1000
    action:
      - click: "#unstable-button"
      - wait: ".result"
```

| Property | Type | Description |
|----------|------|-------------|
| `times` | number | Number of retry attempts |
| `delay` | number | Delay between retries (ms) |
| `backoff` | string | `"exponential"` for exponential backoff |
| `action` | array | Actions to retry |

#### `try` / `catch`

Handle errors gracefully.

```yaml
- try:
    timeout: 5000
    action:
      - click: "#maybe-exists"
  catch:
    - log: "Element not found"
```

| Property | Type | Description |
|----------|------|-------------|
| `timeout` | number | Timeout in milliseconds |
| `action` | array | Actions to try |
| `catch` | array | Actions on error |

---

### Data Extraction

#### `extract`

Extract data from the page.

```yaml
# Extract single value
- extract:
    selector: ".title"
    save: page_title

# Extract multiple values
- extract:
    selector: ".item"
    multiple: true
    save: items

# Extract structured data
- extract:
    selector: ".product"
    fields:
      - { name: title, selector: ".title" }
      - { name: price, selector: ".price" }
    save: products
```

| Property | Type | Description |
|----------|------|-------------|
| `selector` | string | CSS selector |
| `multiple` | boolean | Extract all matches |
| `fields` | array | Structured fields to extract |
| `save` | string | Variable name to save |

---

### Output

#### `screenshot`

Take a screenshot.

```yaml
# Full page screenshot
- screenshot: output.png

# Viewport screenshot
- screenshot:
    path: screenshot.png
    fullPage: true

# Element screenshot
- screenshot:
    selector: "#element"
    path: element.png
```

| Property | Type | Description |
|----------|------|-------------|
| `path` | string | File path |
| `selector` | string | CSS selector for element |
| `fullPage` | boolean | Capture full page |

#### `pdf`

Generate PDF.

```yaml
- pdf: document.pdf
```

#### `write`

Write content to a file.

```yaml
# Write (overwrite)
- write:
    file: output.txt
    content: "${data}"

# Append to file
- write:
    file: log.txt
    content: "New line\n"
    append: true
```

| Property | Type | Description |
|----------|------|-------------|
| `file` | string | File path |
| `content` | string | Content to write |
| `append` | boolean | Append to file |

---

### Logging

#### `log`

Log a message.

```yaml
# Simple log
- log: "Processing item ${item}"

# With level
- log:
    message: "Error occurred"
    level: error
```

| Property | Type | Description |
|----------|------|-------------|
| `message` | string | Message to log |
| `level` | string | Log level: `info`, `warn`, `error`, `debug` |

## Examples

### Form Filling

```yaml
meta:
  name: "form-example"
  logs: "./output/form.log"

vars:
  BASE_URL: "https://example.com"
  USERNAME: ${env.USER}
  EMAIL: "test@example.com"

open: ${BASE_URL}/register

actions:
  - log: "Starting registration"

  - type:
      selector: "#username"
      text: "${USERNAME}"

  - type:
      selector: "#email"
      text: "${EMAIL}"

  - type:
      selector: "#password"
      text: "SecurePass123!"

  - click: "#submit"

  - wait: ".success"

  - screenshot: registration-complete.png

  - log: "Registration complete"
```

### Web Scraping

```yaml
meta:
  name: "scrape-example"

open: https://example.com/products

actions:
  - for:
      selector: ".product"
      as: product
      actions:
        - extract:
            selector: "${product}"
            fields:
              - { name: title, selector: ".title" }
              - { name: price, selector: ".price" }
              - { name: link, selector: "a", attr: href }
            save: item

        - write:
            file: ./output/products.json
            content: "${item}\n"
            append: true
```

### Multi-Tab Workflow

```yaml
open: https://example.com

actions:
  - screenshot: homepage.png

  - newTab:
      url: https://google.com
      actions:
        - type:
            selector: "input[name='q']"
            text: "puppeteer"
        - press: Enter
        - wait: navigation
        - screenshot: search-results.png

  - switchTab: 0
  - log: "Back to main tab"

  - closeTab:
```

### Conditional Actions

```yaml
vars:
  ENVIRONMENT: ${env.ENV}

open: https://example.com

actions:
  - if:
      condition: "${ENVIRONMENT} == 'production'"
    then:
      - log: "Running in production"
      - screenshot: prod-home.png
    else:
      - log: "Running in development"
      - screenshot: dev-home.png

  - if:
      selector: ".cookie-banner"
    then:
      - click: ".accept-cookies"
```

### Error Handling

```yaml
open: https://example.com

actions:
  - retry:
      times: 3
      delay: 1000
      action:
        - click: "#unstable-element"
        - wait: ".success"

  - try:
      timeout: 5000
      action:
        - click: "#optional-element"
    catch:
      - log: "Optional element not found"
```

## Compiling Scripts

Compile a YAML script into a standalone shell script that can be distributed and run without the pptr source.

### Basic Compilation

```bash
pptr scripts/example.yaml -o myapp
```

This creates `myapp` - a shell script that calls pptr with the embedded YAML.

### Compilation with Default Variables

```bash
pptr scripts/example.yaml -o myapp -v BASE_URL=https://google.com -v API_KEY=abc123
```

### Running Compiled Scripts

The compiled script requires `pptr` to be in your PATH:

```bash
# Run with defaults from compilation
./myapp

# Override variables at runtime
./myapp -v BASE_URL=https://github.com

# Enable debug logging
./myapp -d

# Use visible browser
./myapp --no-headless
```

### Shell Script Structure

The compiled script looks like this:

```bash
#!/usr/bin/env bash
set -e

if ! command -v pptr &> /dev/null; then
    echo "Error: 'pptr' not found in PATH"
    echo "Make sure pptr is installed and available in your PATH"
    exit 1
fi

exec pptr -e '...yaml content...' -v VAR1=val1 "$@"
```

The `"$@"` passes through all runtime arguments, allowing variable overrides.

## Project Structure

```
/puppeteer-script-runner/
├── src/
│   ├── cli.js          # Command-line interface
│   ├── index.js        # Module entry point
│   ├── interpreter.js  # Converts AST to Puppeteer calls
│   ├── logger.js       # Plain text logging
│   ├── parser.js       # YAML -> AST parser
│   ├── runner.js       # Main execution engine
│   └── variables.js    # ${VAR} interpolation
├── scripts/
│   └── example.yaml    # Example scripts
├── docs/
│   └── README.md       # This documentation
├── Dockerfile
├── package.json
└── run-puppeteer.sh    # Docker runner script
```

## License

ISC