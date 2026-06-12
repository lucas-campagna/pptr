---
name: agents
description: Reference guide for pptr AI agents using LangChain. Use when configuring AI agents, setting default agents, managing tools, and using the ask action for agent-based automation.
---

# Agents

Configure AI agents for use with the `ask` action or direct agent calls. Agents are built on top of LangChain's `createAgent` API.

## Configuration

```yaml
meta:
  agents:
    default: myagent   # default agent for 'ask'
    continue: false    # stateless by default

agents:
  myagent:
    model: "openai:gpt-5.4"           # model identifier (provider:model or object)
    systemPrompt: "You are helpful"    # system prompt
    responseFormat:                    # optional: Zod schema for structured output
      summary: string
      confidence: number
    contextSchema:                    # optional: schema for runtime context
      userId: string
      sessionId: string
    middleware:                       # optional: LangChain middleware
      - modelRetry:
          maxRetries: 3
      - toolRetry:
          maxRetries: 2
    tools:                            # optional: tools for the agent
      - "websearch"                    # builtin tool (string)
      - myFunction:                    # function reference
          description: "Does something"
          schema:
            input: string
```

## Meta Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `default` | string | first agent | Default agent for `ask` action |
| `continue` | boolean | `false` | Stateless mode (reset each call) |

## Agent Options

| Option | Type | Description |
|--------|------|-------------|
| `model` | string \| object | Model identifier (`"provider:model"`) or object for `initChatModel` config |
| `systemPrompt` | string | System prompt (replaces `context`) |
| `responseFormat` | object | Simplified Zod schema for structured output |
| `contextSchema` | object | Simplified Zod schema for runtime context |
| `middleware` | list | LangChain middleware configurations |
| `tools` | list | Tools available to the agent |

## Model Property

The `model` property accepts either a string or an object:

### String Format

```yaml
model: "openai:gpt-5.4"
model: "anthropic:claude-sonnet-4-6"
model: "ollama:llama3.2"
```

### Object Format (initChatModel config)

```yaml
model:
  provider: openai
  model: "gpt-5.4"
  temperature: 0.7
  maxTokens: 1000
```

## Simplified Schema Format

Since the schema type is always `object`, only specify the properties:

```yaml
responseFormat:
  summary: string
  confidence: number
  items:
    name: string
    value: number
```

Each property value can be:
- A type string: `string`, `number`, `integer`, `boolean`, `array`, `object`
- An object with `type` and `description`: `{ type: string, description: "The input text" }`

## Tools

Tools can be specified as strings (builtin) or objects (custom):

### Builtin Tools (String)

```yaml
tools:
  - "websearch"
  - "code_interpreter"
```

### Function References (Object without actions)

```yaml
tools:
  - myFunction:
      description: "Custom function"
      schema:
        input: string
        limit:
          type: integer
          description: "Max results"
```

### Builtin with Actions

```yaml
tools:
  - websearch:
      description: "Search the web"
      schema:
        query: string
      actions:
        - log: "Searching for ${query}"
        - extract:
            selector: ".result"
            save: search_result
```

When `actions` is omitted, the tool name is treated as a function reference from the `functions` section.

## Middleware

Middleware can be specified as named configs:

```yaml
middleware:
  - modelRetry:
      maxRetries: 3
  - toolRetry:
      maxRetries: 2
  - piiMiddleware: "email"
```

## Context Schema

The `contextSchema` defines the shape of runtime context data accessible to tools:

```yaml
contextSchema:
  userId: string
  sessionId: string
  userRole:
    type: string
    description: "User role (admin, editor, viewer)"
```

Access via `config.context` in tool implementations.

## Default Agent Resolution

1. If only one agent defined → automatically used as default
2. If multiple agents → requires `meta.agents.default` or explicit agent name

## Examples

### Single Agent (Auto-Default)

```yaml
agents:
  assistant:
    model: "ollama:llama3.2"

actions:
  - ask: "Hello"
  # No need to specify agent - single agent is default
```

### Multiple Agents (Explicit Default)

```yaml
meta:
  agents:
    default: coder

agents:
  coder:
    model: "ollama:codellama"
    systemPrompt: "You are a coding assistant"
  chat:
    model: "ollama:llama3.2"
    systemPrompt: "You are a helpful chat assistant"

actions:
  - ask: "Hello"          # uses 'coder' (default)
  - chat: "Hello"         # explicitly uses 'chat'
```

### Stateful Mode (Continue)

```yaml
meta:
  agents:
    continue: true

agents:
  assistant:
    model: "openai:gpt-5.4"
    systemPrompt: "You are helpful"

actions:
  - ask:
      prompt: "My name is Alice"
  - ask:
      prompt: "What is my name?"  # Remembers "Alice" from before
```

### Agent with Tools

```yaml
agents:
  researcher:
    model: "openai:gpt-5.4"
    systemPrompt: "You are a research assistant"
    tools:
      - websearch:
          description: "Search the web"
          schema:
            query: string
      - myFunction:
          description: "Process results"
          schema:
            data: string
```

### Agent with Structured Output

```yaml
agents:
  analyzer:
    model: "openai:gpt-5.4"
    responseFormat:
      sentiment: string
      confidence: number
      keywords: array

actions:
  - ask:
      prompt: "Analyze this text: The product is amazing!"
      save: analysis
  - log: "Sentiment: ${analysis.sentiment}"
```

## See Also

- [`ask`](../commands/ask.md) - Call an agent from actions
- [`functions`](../commands/functions.md) - Define reusable functions