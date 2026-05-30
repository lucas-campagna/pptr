# `ask`

Call an AI model with a prompt. The response is stored in `$result` (or a custom variable).

## Syntax

```yaml
# Simple usage (uses default model)
actions:
  - ask: "What is 2+2?"
  - log: "Answer: ${$result}"
```

Or with full options:

```yaml
actions:
  - ask:
      prompt: "What is the weather like?"
      model: mymodel   # override default model
      temperature: 0.7 # override model temperature
      max_tokens: 500 # limit response length
      context:        # additional context
        - system: "You are a helpful assistant"
      continue: true  # maintain conversation history
      save: response # store in custom variable
  - log: "Response: ${response}"
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `prompt` | string | The prompt to send to the model |
| `model` | string | Model name to use (overrides default) |
| `temperature` | number | Sampling temperature (0-2) |
| `max_tokens` | integer | Maximum tokens in response |
| `context` | list | Additional context messages in OpenAI format |
| `continue` | boolean | Continue session history (default: meta.models.continue) |
| `save` | string | Variable name to store result (default: `$result`) |

## Details

The `ask` action is sugar syntax for calling the default model. It's equivalent to:

```yaml
# These are equivalent:
- ask: "Hello"

- mymodel: "Hello"  # if mymodel is the default
```

To call a specific named model directly:

```yaml
actions:
  - mymodel: "Hello"  # calls the 'mymodel' configuration
  - log: "Response: ${$result}"
```

## Models Configuration

Models are defined in the `models` section:

```yaml
meta:
  models:
    default: mymodel   # default model for 'ask'
    continue: false    # stateless by default

models:
  mymodel:
    model: llama3.2           # actual model identifier
    temperature: 0.7          # default temperature
    max_tokens: 1000          # default max tokens
    top_p: 0.9                # nucleus sampling
    seed: 42                  # deterministic sampling
    response_format: text      # "text" or "json"
    tools:                    # enabled tools
      - websearch
    context:                  # default context (OpenAI format)
      - system: "You are helpful"
      - user: "You help with web tasks"
```

## Context Format

Context uses OpenAI message format as a list of one-keyed objects:

```yaml
context:
  - system: "You are a helpful assistant"
  - user: "The user said hello"
  - assistant: "Hello! How can I help?"
```

## Session and Continuity

For multi-turn conversations, use `session` to maintain history:

```yaml
meta:
  models:
    continue: true  # enable stateful mode

actions:
  - ask:
      prompt: "My name is Alice"
      session: user1
  - ask:
      prompt: "What is my name?"
      session: user1
  - ask:
      prompt: "Thank you"
      session: user1
```

With `continue: true`, the conversation history is preserved across calls sharing the same session label.

## Examples

### Basic Usage

```yaml
models:
  assistant:
    model: smollm2

actions:
  - ask: "What is 2+2?"
  - log: "Answer: ${$result}"
```

### With Custom Model

```yaml
models:
  coder:
    model: codellama
    temperature: 0.3

actions:
  - coder: "Write a Python function to fibonacci"
  - log: "Code: ${$result}"
```

### Stateful Conversation

```yaml
meta:
  models:
    continue: true

models:
  chat:
    model: smollm2
    context:
      - system: "You are a helpful coding assistant"

actions:
  - chat:
      prompt: "I need a function add(a, b)"
      save: step1
  - chat:
      prompt: "Now divide it by 2"
      save: step2
  - log: "Final result: ${step2}"
```

## See Also

- [`models`](models.md) - Full models configuration guide
- [`log`](log.md) - Log messages for debugging
