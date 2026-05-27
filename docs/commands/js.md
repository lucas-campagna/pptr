# `js`

Execute JavaScript code in the browser context. Similar to `run`, but explicitly scoped for browser-side execution.

## Syntax

```yaml
actions:
  - js: "document.title"
```

Or with full options:

```yaml
actions:
  - js:
      code: "document.querySelectorAll('.item').length"
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `code` | string | JavaScript code to execute in browser |

## Details

The `js` action runs JavaScript in the browser's context using `page.evaluate()`. All script variables from the pptr vars context are available as JavaScript variables.

The result of the last expression is stored in `result` and `$result`.

## Examples

```yaml
# Get page title
actions:
  - js: "document.title"
  - log: "Title: ${result}"

# Get element count
actions:
  - js:
      code: "document.querySelectorAll('.product').length"
  - log: "Found ${result} products"

# Access page content
actions:
  - js: "window.location.href"
```

## See Also

- [`run`](run.md) - Execute JavaScript (alias)
- [`node`](node.md) - Execute Node.js code server-side