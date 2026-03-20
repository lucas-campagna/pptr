# pptr

A YAML-based browser automation scripting language built on top of Puppeteer.

## Features

- **YAML Scripts**: Write browser automation scripts in simple YAML format
- **CSS & XPath**: Support for both CSS and XPath selectors
- **Variables**: Use `${VAR}` syntax with environment variable support
- **Variable Override**: Override variables from command line
- **Control Flow**: Conditionals (`if`/`else`), loops (`for`, `repeat`), error handling (`try`/`catch`)
- **Parallel Execution**: Run actions concurrently
- **Tab Management**: Open, switch, and close browser tabs
- **Data Extraction**: Extract text, attributes, and structured data
- **Functions**: Define reusable action blocks with parameters
- **Interactive Input**: Prompt users for input during script execution
- **Plain Text Logging**: Human-readable logs with timestamps
- **Standalone Executable**: No Node.js or Docker required

## Installation

### Download Executable

Download the appropriate executable from the [latest release](https://github.com/lucas-campagna/pptr/releases/latest):

| Platform | File |
|----------|------|
| Linux | `pptr` |
| macOS | `pptr` |
| Windows | `pptr.exe` |

```bash
# Linux/macOS
chmod +x pptr
./pptr scripts/example.yaml

# Windows
pptr.exe scripts\example.yaml
```

### From Source

```bash
git clone https://github.com/lucas-campagna/pptr.git
cd pptr
npm install
npm run build
```

## Usage

```bash
pptr <script.yaml> [options]
pptr -e "<yaml>" [options]
pptr <script.yaml> -o <output> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-e, --execute <yaml>` | Execute YAML directly from command line |
| `--headless` | Run in headless mode (default) |
| `--no-headless` | Run with visible browser |
| `-d, --debug` | Enable debug level logging |
| `--log <path>` | Write logs to file |
| `--output <dir>` | Output directory (default: `./output`) |
| `-v, --var <VAR=VALUE>` | Override variable (can use multiple times) |
| `-o, --output <path>` | Compile script to standalone shell script |

### Examples

```bash
# Basic usage
./pptr scripts/example.yaml

# Execute YAML from command line
./pptr -e "open: https://example.com"
./pptr -e "open: https://example.com\nactions:\n  - log: hello"

# Override variables
./pptr scripts/example.yaml --var BASE_URL=https://google.com

# Multiple variable overrides
./pptr scripts/example.yaml \
  --var BASE_URL=https://google.com \
  --var SEARCH_TERM=automation

# Run with visible browser
./pptr scripts/example.yaml --no-headless

# Enable debug logging
./pptr scripts/example.yaml -d

# Custom output directory
./pptr scripts/example.yaml --output ./results --log automation.log

# Compile to standalone shell script
./pptr scripts/example.yaml -o myapp

# Run compiled script (pptr must be in PATH)
./myapp

# Compile with default variables
./pptr scripts/example.yaml -o myapp -v BASE_URL=https://google.com

# Override variables at runtime
./myapp -v BASE_URL=https://github.com
```

## Script Structure

```yaml
meta:
  name: "script-name"
  logs: "./output/script.log"
  timeout: 30000

vars:
  BASE_URL: "https://example.com"
  USERNAME: ${env.USER}

open: ${BASE_URL}

actions:
  - log: "Starting automation"
  - click: "#button"
  - type:
      selector: "#username"
      text: "${USERNAME}"
  - screenshot: output.png

functions:
  myfunc:
    params:
      arg1: "default value"
      arg2: null
    actions:
      - log: "Hello ${arg1}"

tabs:
  - open: https://other-site.com
    actions:
      - log: "In new tab"
```

## Selectors

### CSS Selectors

By default, selectors are treated as CSS:

```yaml
- click: "#button"
- type:
    selector: "input[name='email']"
    text: "test@example.com"
```

### XPath Selectors

Selectors starting with `/` are treated as XPath:

```yaml
- click: "//button[@id='submit']"
- type:
    selector: "//input[@name='username']"
    text: "johndoe"
- wait: "//div[contains(@class, 'result')]"
```

## Actions Reference

### Navigation

- `open` - Navigate to URL
- `back` - Go back in history
- `forward` - Go forward in history
- `reload` - Reload page

### Interaction

- `click` - Click element
- `type` - Type text into input
- `hover` - Hover over element
- `select` - Select dropdown option
- `scroll` - Scroll page or element
- `press` - Press keyboard key

### Waiting

- `wait` - Wait for element, timeout, navigation, or condition

### Tabs

- `newTab` - Open new tab
- `switchTab` - Switch to tab by index
- `closeTab` - Close current tab

### Control Flow

- `if` / `else` - Conditional execution
- `for` - Iterate over items or elements
- `repeat` - Repeat actions N times
- `break` / `continue` - Loop control
- `parallel` - Execute actions in parallel
- `retry` - Retry failed actions
- `try` / `catch` - Error handling

### Data

- `extract` - Extract text or structured data
- `screenshot` - Take screenshot
- `pdf` - Generate PDF
- `write` - Write to file
- `input` - Prompt user for input

### Functions

- `functions` - Define reusable action blocks
- `return` - Return value from function

### Logging

- `log` - Log message with optional level

## Examples

### Form Filling

```yaml
vars:
  BASE_URL: "https://example.com"
  EMAIL: "user@example.com"

open: ${BASE_URL}/login

actions:
  - type:
      selector: "#email"
      text: "${EMAIL}"
  - type:
      selector: "#password"
      text: "secret123"
  - click: "#submit"
  - wait: ".dashboard"
  - screenshot: logged-in.png
```

### Web Scraping

```yaml
open: https://news.ycombinator.com

actions:
  - for:
      selector: ".titleline > a"
      as: link
    actions:
      - extract:
          selector: "${link}"
          save: title
      - log: "Found: ${title}"
```

### Error Handling

```yaml
actions:
  - retry:
      times: 3
      delay: 1000
    action:
      - click: "#unstable-button"
      - wait: ".result"

  - try:
      action:
        - click: "#optional-popup"
    catch:
      - log: "Popup not found, continuing"
```

### Functions

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

open: https://example.com/login

actions:
  - login:
      username: "user@example.com"
      password: "secret123"
  - log: "Login result: ${result}"
```

### Interactive Input

```yaml
actions:
  # Simple form - result stored in $result
  - input: "Enter your name: "

  # Full form with custom variable
  - input:
      prompt: "Password: "
      var: "user_password"
      default: null
      hide: true

  - log: "Welcome, ${result}!"
  - log: "Password set: ${user_password}"
```

## Documentation

- [Actions Reference](docs/actions.md) - Complete reference for all actions
- [Examples](docs/examples.md) - Working examples for common use cases

## License

ISC
