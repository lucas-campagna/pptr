---
name: pptr-subcommands
description: Reference guide for pptr subcommands. Use when defining named entry points within a single YAML script.
---

# Subcommands

Define named entry points in a single script.

## Overview

`subcommands:` allows multiple automation workflows in one file. Invoke specific subcommands via CLI.

## Basic Subcommands

```yaml
subcommands:
  login:
    open: "https://example.com/login"
    actions:
      - type: { selector: "#user", text: "${USER}" }
      - type: { selector: "#pass", text: "${PASS}" }
      - click: "#submit"

  logout:
    open: "https://example.com"
    actions:
      - click: ".user-menu"
      - click: "#logout"
```

## Invocation

```bash
pptr script.yaml login
pptr script.yaml logout
```

## Nested Subcommands

Hierarchical subcommands:

```yaml
subcommands:
  admin:
    subcommands:
      login:
        open: "https://admin.example.com/login"
        actions:
          - type: { selector: "#user", text: "${USER}" }
          - click: "#submit"
```

Invocation:

```bash
pptr script.yaml admin login
```

## Subcommand Structure

Each subcommand can have:

```yaml
subcommands:
  name:
    meta: {}        # optional meta block
    vars: {}        # optional variables
    open: url       # optional initial URL
    actions: []     # actions to execute
    functions: {}   # optional functions
    tabs: []        # optional tab configurations
```

## Combining with Other Features

Subcommands can use all normal script features:

```yaml
subcommands:
  scrape:
    vars:
      baseUrl: "https://example.com"
    open: "${baseUrl}"
    actions:
      - wait: ".content"
      - extract: { selector: ".data", multiple: true, save: "items" }
    tabs:
      - open: "${baseUrl}/page2"
        actions:
          - extract: { selector: ".more", save: "moreItems" }
```

## Notes

- Subcommands are defined at top level under `subcommands:`
- CLI args after script path select which subcommand to run
- If no subcommand specified, top-level `actions:` run as before
- Subcommands can be nested for organization

## Implementation Notes

- `Parser.normalizeSubcommands()` in `src/libs/parser.js` handles normalization
- `Runner.run()` in `src/libs/runner.js` resolves subcommand path
- Subcommand resolution is handled before execution begins