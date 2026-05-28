# pptr-models Skill

Copy this file to your `.claud/skills` or `.agents/skills` folder to use the pptr-models skill.

## Installation

```bash
# For Claude Code
mkdir -p ~/.claud/skills/pptr-models
cp docs/README.md ~/.claud/skills/pptr-models/SKILL.md

# For OpenCode/Agents
mkdir -p ~/.agents/skills/pptr-models
cp docs/README.md ~/.agents/skills/pptr-models/SKILL.md
```

---

# SKILL.md

```markdown
---
name: pptr-models
description: Docker model integration for pptr - use AI models (LLMs) in pptr YAML scripts via 'docker model run'. Configure models, maintain sessions, and call models from automation workflows.
---

# pptr-models Skill

Guide for using AI models with pptr's docker model integration.

## Overview

pptr can call AI models via `docker model run` command. The response is stored in `$result` variable for use in subsequent actions.

## Quick Start

```yaml
models:
  assistant:
    model: smollm2

actions:
  - ask: "What is 2+2?"
  - log: "Answer: ${$result}"
```

---

## Configuration

### `models` Block

```yaml
models:
  <label>:
    model: llama3.2           # model identifier (required)
    temperature: 0.7          # 0-2 scale
    max_tokens: 1000          # max response tokens
    top_p: 0.9                # nucleus sampling
    seed: 42                  # deterministic sampling
    response_format: text      # "text" or "json"
    tools:                    # enabled tools
      - websearch
    context:                  # default context
      - system: "You are helpful"
      - user: "Default prompt"
```

### `meta.models` Block

```yaml
meta:
  models:
    default: mymodel   # default model for 'ask'
    continue: false    # stateless by default
    session: auto      # "auto" or "manual"
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `default` | string | first model | Default model for `ask` |
| `continue` | boolean | `false` | Stateful conversations |
| `session` | string | `"auto"` | Session cleanup mode |

---

## Context Format

Context uses OpenAI message format:

```yaml
context:
  - system: "You are a helpful assistant"
  - user: "The user said hello"
  - assistant: "Assistant response"
```

---

## Usage

### `ask` Action

Call the default model:

```yaml
# Simple
- ask: "Hello"

# Full options
- ask:
    prompt: "Summarize this page"
    model: mymodel          # override default
    temperature: 0.9        # override temperature
    max_tokens: 500        # override max_tokens
    context:                # additional context
      - system: "Be concise"
    continue: true          # maintain history
    session: chat1          # session label
    save: response          # custom variable
```

### Direct Model Call

Call a specific named model directly:

```yaml
models:
  coder:
    model: codellama
  chat:
    model: llama3.2

actions:
  - coder: "Write a Python function"
  - chat: "Explain it"
```

---

## Session and Continuity

### Stateless (Default)

Each call is independent:

```yaml
meta:
  models:
    continue: false  # default

models:
  assistant:
    model: smollm2
    context:
      - system: "You are a helpful assistant"

actions:
  - ask: "My name is Alice"
  - ask: "What is my name?"  # Returns without memory
```

### Stateful (Continue)

Accumulate conversation history:

```yaml
meta:
  models:
    continue: true

actions:
  - ask:
      prompt: "My name is Alice"
      session: user1
  - ask:
      prompt: "What is my name?"  # Remembers Alice
      session: user1
```

---

## Variable Syntax

Use `${$result}` for the special `$result` variable:

```yaml
actions:
  - ask: "What is 2+2?"
  - log: "Result: ${$result}"

  # Or custom variable
  - ask:
      prompt: "Hello"
      save: greeting
  - log: "Said: ${greeting}"
```

---

## Actions Reference

| Property | Type | Description |
|----------|------|-------------|
| `prompt` | string | The prompt to send (required) |
| `model` | string | Model name to use (overrides default) |
| `temperature` | number | Sampling temperature (0-2) |
| `max_tokens` | integer | Max tokens in response |
| `context` | list | Additional context messages |
| `continue` | boolean | Use accumulated history |
| `session` | string | Session label for continuity |
| `save` | string | Variable name (default: `$result`) |

---

## Examples

### Web Scraping Summary

```yaml
models:
  assistant:
    model: smollm2

actions:
  - open: "https://news.ycombinator.com"
  - extract:
      selector: ".titleline > a"
      multiple: true
      save: headlines
  - ask:
      prompt: "Summarize these headlines: ${headlines}"
      save: summary
  - log: "Summary: ${summary}"
```

### Stateful Conversational Scraping

```yaml
meta:
  models:
    continue: true

models:
  researcher:
    model: smollm2
    context:
      - system: "You are researching topics on the web"

actions:
  - open: "https://example.com"
  - ask:
      prompt: "What is this page about?"
      session: research
      save: page_info
  - click: ".next"
  - ask:
      prompt: "Compare to the previous page about ${page_info}"
      session: research
  - log: "Comparison: ${$result}"
```

### Code Generation

```yaml
models:
  coder:
    model: codellama
    temperature: 0.3

actions:
  - ask:
      prompt: "Write a Python function to fibonacci"
      save: fib_code
  - write:
      file: "fib.py"
      content: "${fib_code}"
  - log: "Code written!"
```

---

## Integration with Other Actions

Model output flows through pptr's variable system:

```yaml
actions:
  - ask:
      prompt: "Extract the email from this text: john@example.com"
      save: email
  - type:
      selector: "#email-input"
      text: "${email}"
  - ask:
      prompt: "Is ${email} a valid email?"
      save: validation
  - if:
      condition: "${validation}"
    then:
      - click: "#submit"
```

---

## File Reference

- **Parser**: `src/libs/parser.js` - `normalizeModelsConfig()`, `normalizeAskAction()`, `normalizeModelAction()`, `normalizeContext()`
- **Runner**: `src/libs/runner.js` - `loadModels()`, `cleanupModels()`
- **Interpreter**: `src/libs/interpreter.js` - `handleAsk()`, `handleModel()`, `callModel()`, `buildContextString()`, session histories

---

## Dependencies

- Docker must be running with model support (`docker model list`)
- Models must be available locally or can be pulled

Check available models:
```bash
docker model list
```

Load a model:
```bash
docker model run -d <model-name>
```
```