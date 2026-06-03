---
name: server
description: Reference guide for pptr server mode. Use when building HTTP APIs, webhook handlers, or lightweight scraping services with pptr YAML scripts.
---

# Server Mode

Run pptr as an HTTP server to expose automation scripts as REST endpoints.

## Starting the Server

```bash
pptr script.yaml --server [port]
```

Default port is `3000`. The server starts immediately and listens for incoming requests.

## Defining Routes

Add a `routes:` block to your YAML script:

```yaml
routes:
  /hello:
    GET:
      - log: "Hello from pptr!"
      - return: "Hello World!"

  /submit:
    POST:
      - open: "https://example.com/form"
      - type:
          selector: "#name"
          text: "${body.name}"
      - click: "#submit"
      - return: "Form submitted"
```

## HTTP Methods

### `GET`

```yaml
routes:
  /users:
    GET:
      - open: "https://api.example.com/users"
      - extract:
          selector: ".user"
          multiple: true
          save: users
      - return: "${users}"
```

### `POST`

```yaml
routes:
  /scrape:
    POST:
      - open: "${body.url}"
      - wait: ".content"
      - screenshot: "result.png"
      - return: { success: true, path: "result.png" }
```

## Multiple Methods on Same Path

You can define multiple HTTP methods for the same path:

```yaml
routes:
  /data:
    GET:
      - extract:
          selector: ".data"
          save: data
      - return: "${data}"
    POST:
      - log: "Creating new data"
      - return: { created: true }
    DELETE:
      - log: "Deleting data"
      - return: { deleted: true }
```

## Route Variables

Inside route actions, these variables are available:

| Variable | Description |
|----------|-------------|
| `${params}` | Object with URL path parameters |
| `${query}` | Object with query string parameters |
| `${body}` | Parsed request body (JSON or form data) |
| `${headers}` | Request headers object |

### URL Parameters

Define dynamic segments with `:paramName`:

```yaml
routes:
  /user/:id:
    GET:
      - log: "Fetching user ${params.id}"
      - open: "https://api.example.com/users/${params.id}"
      - extract:
          selector: ".user-name"
          save: name
      - return: "${name}"
```

### Query Parameters

Access query string values via `${query}`:

```yaml
routes:
  /search:
    GET:
      - log: "Search term: ${query.q}"
      - open: "https://example.com/search?q=${query.q}"
```

## Request Body Parsing

The server automatically parses JSON and form-encoded bodies:

```yaml
routes:
  /login:
    POST:
      - log: "Username: ${body.username}"
      - open: "https://example.com/login"
      - type:
          selector: "#username"
          text: "${body.username}"
      - type:
          selector: "#password"
          text: "${body.password}"
      - click: "#submit"
```

## Response Format

Route actions can return data which is serialized as JSON in the response:

```yaml
routes:
  /status:
    GET:
      - open: "https://example.com"
      - extract:
          selector: ".status"
          save: status
      - return: { status: "${status}", timestamp: "${env.TIMESTAMP}" }
```

Returns:

```json
{
  "status": "ok",
  "result": {
    "status": "active",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Multi-Tab in Routes

Routes can open multiple tabs:

```yaml
routes:
  /scrape:
    POST:
      tabs:
        - open: "https://site-a.com"
          actions:
            - extract: { selector: "h1", save: "titleA" }
        - open: "https://site-b.com"
          actions:
            - extract: { selector: "h1", save: "titleB" }
      actions:
        - return: { titleA: "${titleA}", titleB: "${titleB}" }
```

## Use Cases

- **Webhook automation** — trigger browser actions from external systems
- **Lightweight scraping API** — expose scraping endpoints without separate server
- **Form submission** — handle form posts that require JavaScript rendering
- **Screenshot service** — generate screenshots on demand via HTTP

## Example: Screenshot Service

```yaml
meta:
  name: screenshot-service

routes:
  /screenshot:
    GET:
      - open: "${query.url}"
      - wait: { timeout: 5000 }
      - screenshot: "/tmp/screenshot.png"
      - return: { path: "/tmp/screenshot.png" }

  /batch-screenshot:
    POST:
      - for:
          items: "${body.urls}"
          as: url
        actions:
          - newTab: "${url}"
          - screenshot: "/tmp/${as}.png"
      - return: { processed: "${body.urls.length}" }
```