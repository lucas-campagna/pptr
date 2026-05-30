# Models

Configure AI models for use with the `ask` action or direct model calls.

## Configuration

```yaml
meta:
  models:
    default: mymodel   # default model for 'ask'
    continue: false    # stateless by default

models:
  mymodel:
    model: llama3.2           # model identifier
    temperature: 0.7          # 0-2 scale
    max_tokens: 1000          # max response tokens
    top_p: 0.9                # nucleus sampling (0-1)
    seed: 42                  # deterministic sampling
    response_format: text      # "text" or "json"
    tools:                    # enabled tools
      - websearch
    context:                  # default context
      - system: "You are a helpful assistant"
      - user: "You help with web tasks"
```

## Meta Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `default` | string | first model | Default model for `ask` action |
| `continue` | boolean | `false` | Stateless mode (reset each call) |

## Model Options

| Option | Type | Description |
|--------|------|-------------|
| `model` | string | Model identifier (required) |
| `temperature` | number | Sampling temperature (0-2) |
| `max_tokens` | integer | Maximum tokens in response |
| `top_p` | number | Nucleus sampling threshold (0-1) |
| `seed` | integer | Seed for deterministic sampling |
| `response_format` | string | `"text"` or `"json"` |
| `tools` | list | Enabled tools (e.g., `websearch`) |
| `context` | list | Default context messages |

## Context Format

Context uses OpenAI message format:

```yaml
context:
  - system: "You are a helpful assistant"
  - user: "Default user message"
  - assistant: "Previous assistant message"
```

Each message is a one-keyed object where:
- key = role (`system`, `user`, `assistant`)
- value = message content

## Default Model Resolution

1. If only one model defined → automatically used as default
2. If multiple models → requires `meta.models.default` or explicit model name

## Examples

### Single Model (Auto-Default)

```yaml
models:
  assistant:
    model: smollm2

actions:
  - ask: "Hello"
  # No need to specify model - single model is default
```

### Multiple Models (Explicit Default)

```yaml
meta:
  models:
    default: coder

models:
  coder:
    model: codellama
    temperature: 0.3
  chat:
    model: llama3.2
    temperature: 0.9

actions:
  - ask: "Hello"          # uses 'coder' (default)
  - chat: "Hello"         # explicitly uses 'chat'
```

### Stateless Mode (Default)

```yaml
meta:
  models:
    continue: false

models:
  assistant:
    model: smollm2
    context:
      - system: "You are a helpful assistant"

actions:
  - ask: "What is my name?"  # Context reset each call
  - ask: "What is my name?"  # Same response - no memory
```

### Stateful Mode (Continue)

```yaml
meta:
  models:
    continue: true

models:
  assistant:
    model: smollm2
    context:
      - system: "You are a helpful assistant"

actions:
  - ask:
      prompt: "My name is Alice"
  - ask:
      prompt: "What is my name?"  # Remembers "Alice" from before
```

## See Also

- [`ask`](../commands/ask.md) - Call a model from actions
