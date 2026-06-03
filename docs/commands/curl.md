---
name: curl
description: Make HTTP requests using curl. Use when you need to fetch data from APIs, download files, or interact with HTTP endpoints.
---

# `curl`

Make HTTP requests using curl.

## Syntax

```yaml
actions:
  - curl: "https://api.example.com/data"
```

Or with full options:

```yaml
actions:
  - curl:
      url: "https://api.example.com/users"
      method: "POST"
      headers:
        Content-Type: "application/json"
        Authorization: "Bearer ${token}"
      body: '{"name": "test"}'
      save: "stdout"
      var: "response"
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | | URL to request |
| `method` | string | `GET` | HTTP method (GET, POST, PUT, DELETE, etc.) |
| `headers` | object | `{}` | Request headers |
| `body` | string | | Request body |
| `output` | string | | Save response to file |
| `save` | string | result only | What to save: `stdout`, `stderr`, `all` |
| `var` | string | `result` | Variable name for response |
| `cookie` | boolean | `false` | Enable cookie jar for session persistence |
| `cookieJar` | string | auto | Path to cookie jar file (implies cookie: true) |

## Details

The `curl` action executes HTTP requests using the system curl command. Supports all standard curl options including custom headers, request body, and different HTTP methods.

By default, the response body is stored in `result`.

## Examples

```yaml
# Simple GET request
actions:
  - curl: "https://api.example.com/status"
  - log: "Status: ${result}"

# POST with JSON body
actions:
  - curl:
      url: "https://api.example.com/users"
      method: "POST"
      headers:
        Content-Type: "application/json"
      body: '{"username": "john", "email": "john@example.com"}'

# With authentication
actions:
  - curl:
      url: "https://api.example.com/protected"
      headers:
        Authorization: "Bearer ${access_token}"

# Save to file
actions:
  - curl:
      url: "https://example.com/large-file.zip"
      output: "/tmp/download.zip"

# PUT update
actions:
  - curl:
      url: "https://api.example.com/items/123"
      method: "PUT"
      headers:
        Content-Type: "application/json"
      body: '{"status": "completed"}'
```

# Persist cookies across requests
actions:
  - curl:
      url: "https://api.example.com/login"
      method: "POST"
      body: '{"username": "user", "password": "pass"}'
      cookie: true

  - curl:
      url: "https://api.example.com/dashboard"
      cookie: true
  - log: "Dashboard content: ${result}"

## See Also

- [`shell`](shell.md) - Execute shell commands
- [`js`](js.md) - Execute JavaScript in browser