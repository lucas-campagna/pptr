# `auto`

Generate and execute pptr commands from natural language using an AI model.

## Syntax

```yaml
# Sugar syntax - any bare string is treated as auto
actions:
  - "print abc"

# Explicit syntax
actions:
  - auto: "click the submit button"

# Explicit syntax with model override
actions:
  - auto:
      prompt: "click the submit button"
      model: mymodel
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `prompt` | string | Natural language description of desired actions |
| `model` | string | Model name to use (overrides `meta.models.default`) |

## Details

The `auto` command uses the `meta.models.default` model to generate pptr YAML commands from natural language prompts. It:

1. Checks `.auto.generated.yaml` in the current directory for cached commands
2. If prompt not cached, uses the LLM to generate commands (with RAG from `docs/commands/`)
3. Executes the generated commands immediately
4. Caches the prompt→commands mapping for future reuse

### Cache File

Generated commands are stored in `.auto.generated.yaml`:

```yaml
prompts:
  - prompt: "print abc"
    commands:
      - log: abc
```

The cache persists across runs. You can manually edit this file to adjust generated commands.

### RAG Context

Relevant command documentation from `docs/commands/` is loaded based on prompt keywords and provided to the LLM as context. This helps small language models generate accurate pptr commands.

## Requirements

- A model must be configured as `meta.models.default`
- The model must be compatible with the prompt format

## Examples

```yaml
meta:
  models:
    default: mymodel

models:
  mymodel:
    model: llama3.2
    provider: docker

actions:
  - "print hello world"           # generates: log: hello world
  - auto: "click the login button" # generates: click: "#login"
```

```yaml
meta:
  models:
    default: coder

models:
  coder:
    model: codellama
    temperature: 0.3

actions:
  - auto:
      prompt: "navigate to github and take a screenshot"
```

## Error Handling

If the LLM returns invalid YAML, an error is thrown with the raw response:

```
Error: Failed to parse generated commands.

Raw LLM response:
---
<invalid content>
---

Edit .auto.generated.yaml manually, then re-run.
```

After fixing the generated file, re-run the script - the corrected commands will be used from cache.

## See Also

- [`ask`](ask.md) - Call a model for text generation
- [`models`](../features/models.md) - Model configuration