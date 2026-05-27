---
name: pptr-cmd-input
description: Prompt user for interactive input.
---

# `input` Command

Prompt user for interactive input during script execution.

## YAML Syntax

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

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prompt | string | No | Prompt text shown to user |
| var | string | No | Variable name to store input (default: $result) |
| default | any | No | Default value if empty input |
| hide | boolean | No | Hide input (for passwords) |

## Implementation

See `src/libs/interpreter.js` for the `input` action handler using Node's `readline` module.

## Examples

```yaml
# Simple input
actions:
  - input: "Enter URL: "
  - open: "${result}"

# Named variable
actions:
  - input:
      prompt: "Enter API key: "
      var: "api_key"
      hide: true
  - log: "Using API key: ${api_key}"
```
