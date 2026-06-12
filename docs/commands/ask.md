---
name: ask
description: Call an AI agent with a prompt using LangChain. Use when you need text generation, question answering, or interacting with configured LLM agents.
---

# `ask`

Call an AI agent with a prompt. The response is stored in `result` (or a custom variable).

## Syntax

```yaml
# Simple usage (uses default agent)
actions:
  - ask: "What is 2+2?"
  - log: "Answer: ${result}"
```

Or with full options:

```yaml
actions:
  - ask:
      prompt: "What is the weather like?"
      agent: myagent   # override default agent
      context:        # additional context
        - system: "You are a helpful assistant"
      continue: true  # maintain conversation history
      save: response # store in custom variable
  - log: "Response: ${response}"
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `prompt` | string | The prompt to send to the agent |
| `agent` | string | Agent name to use (overrides default) |
| `context` | list | Additional context messages |
| `continue` | boolean | Continue session history (default: meta.agents.continue) |
| `save` | string | Variable name to store result (default: `result`) |

## Details

The `ask` action is sugar syntax for calling the default agent. It's equivalent to:

```yaml
# These are equivalent:
- ask: "Hello"

- myagent: "Hello"  # if myagent is the default
```

To call a specific named agent directly:

```yaml
actions:
  - myagent: "Hello"  # calls the 'myagent' configuration
  - log: "Response: ${result}"
```

## Agents Configuration

Agents are defined in the `agents` section using LangChain's `createAgent`:

```yaml
meta:
  agents:
    default: myagent   # default agent for 'ask'
    continue: false    # stateless by default

agents:
  myagent:
    model: "ollama:llama3.2"           # model identifier
    systemPrompt: "You are helpful"    # system prompt
    responseFormat:                    # optional: Zod schema
      summary: string
      confidence: number
    contextSchema:                     # optional: context schema
      userId: string
    tools:                              # optional: tools
      - websearch
```

## Context Format

Context uses message format as a list of one-keyed objects:

```yaml
context:
  - system: "You are a helpful assistant"
  - user: "The user said hello"
  - assistant: "Hello! How can I help?"
```

## Session and Continuity

For multi-turn conversations, use `continue` to maintain history:

```yaml
meta:
  agents:
    continue: true  # enable stateful mode

actions:
  - ask:
      prompt: "My name is Alice"
  - ask:
      prompt: "What is my name?"  # Remembers "Alice"
```

With `continue: true`, the conversation history is preserved across calls.

## Examples

### Basic Usage

```yaml
agents:
  assistant:
    model: "ollama:smollm2"

actions:
  - ask: "What is 2+2?"
  - log: "Answer: ${result}"
```

### With Custom Agent

```yaml
agents:
  coder:
    model: "ollama:codellama"
    systemPrompt: "You are a coding assistant"

actions:
  - coder: "Write a Python function to fibonacci"
  - log: "Code: ${result}"
```

### Stateful Conversation

```yaml
meta:
  agents:
    continue: true

agents:
  chat:
    model: "ollama:smollm2"
    systemPrompt: "You are a helpful coding assistant"

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

- [`agents`](../features/agents.md) - Full agents configuration guide
- [`log`](log.md) - Log messages for debugging