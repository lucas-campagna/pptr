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

Enable or disable browser initialization. When set to `false`, no browser is launched and any action requiring a browser will raise an error.

```yaml
meta:
  browser: false  # disables browser (default: true)
```

### `models`

Configure default model behavior. See [Models](models.md) for full documentation.

```yaml
meta:
  models:
    default: mymodel
    continue: false
    session: auto
```

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