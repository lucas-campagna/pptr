# Features

Conceptual guides for pptr's major features.

## Core Features

| Feature | Description |
|---------|-------------|
| [Server](server.md) | Run pptr as an HTTP server with REST endpoints |
| [Functions](functions.md) | Define reusable action blocks with parameters |
| [Variables](variables.md) | Store and interpolate values throughout scripts |
| [Meta](meta.md) | Script metadata and configuration options |
| [Models](models.md) | Configure AI models for automation |
| [Imports](imports.md) | Import and reuse other YAML scripts |
| [Tabs](tabs.md) | Run multiple browser tabs in parallel |
| [Subcommands](subcommands.md) | Define named entry points in a script |
| [Control Flow](control-flow.md) | Conditionals, loops, retry, error handling |

---

## Quick Examples

### Server

```yaml
routes:
  /hello:
    GET:
      - return: "Hello World!"
```

### Functions

```yaml
functions:
  greet:
    params:
      name: "World"
    actions:
      - return: "Hello, ${name}!"

actions:
  - greet:
      name: "Alice"
```

### Variables

```yaml
vars:
  BASE_URL: "https://example.com"

actions:
  - open: "${BASE_URL}"
  - log: "Count: ${count}"
```

### Meta

```yaml
meta:
  name: my-script
  timeout: 30000
  slowMo: 100

open: https://example.com
actions:
  - log: "Done"
```