---
name: meta
description: Reference guide for pptr meta configuration. Use when setting script-level options like name, timeout, slowMo, browser, and logging.
---

# Meta

Script metadata and configuration options.

## Overview

The `meta:` block at the top of a YAML script configures script-level settings.

```yaml
meta:
  name: my-script
  timeout: 30000
  slowMo: 100
  log: ./logs/script.log
```

## Options

### `name`

Human-readable script name (for logging and reference).

```yaml
meta:
  name: login-flow
```

### `timeout`

Global timeout in milliseconds for wait operations and navigation.

```yaml
meta:
  timeout: 30000  # 30 seconds
```

### `slowMo`

Delay in milliseconds between actions (for debugging/demo).

```yaml
meta:
  slowMo: 250  # 250ms between each action
```

### `log`

Path to a log file for this script.

```yaml
meta:
  log: ./logs/automation.log
```

### `headless`

Force headless or visible mode for this script.

```yaml
meta:
  headless: true  # or false for visible browser
```

### `browser`

Control browser initialization. Three modes are supported:

| Value | Behavior |
|-------|----------|
| `auto` (default) | Browser is not launched until first browser action is used |
| `true` | Browser is launched immediately at script start |
| `false` | Browser is never used; any browser action will raise an error |

```yaml
meta:
  browser: auto    # default - lazy initialization
  browser: true    # launch immediately
  browser: false   # disable browser entirely
```

In `auto` mode, the browser is launched on-demand when the first browser action (like `open`, `click`, `type`, etc.) is executed. This improves startup time for scripts that don't need a browser.

### `models`

Configure default model behavior. See [Agents](agents.md) for full documentation.

```yaml
meta:
  agents:
    default: myagent
    continue: false
```

### `env`

Set environment variables for the script. These are applied before the script runs and can be used to configure API keys, endpoints, etc.

```yaml
meta:
  env:
    OLLAMA_BASE_URL: "http://localhost:12434"
    GOOGLE_API_KEY: "your-api-key-here"
```

Environment variables set in `meta.env` take precedence over existing system environment variables but only for the duration of the script execution.

## Example

```yaml
meta:
  name: product-scraper
  timeout: 45000
  slowMo: 100
  log: ./logs/scraper.log

vars:
  BASE_URL: "https://shop.example.com"

open: "${BASE_URL}"

actions:
  - wait: ".product-list"
  - extract:
      selector: ".product-item"
      multiple: true
      save: products
  - write:
      file: ./output/products.json
      content: '${products}'
```