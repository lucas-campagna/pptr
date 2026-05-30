# `node`

Execute Node.js code server-side with access to pptr variables.

## Syntax

```yaml
actions:
  - node: "Math.random() * 100"
```

Or with full options:

```yaml
actions:
  - node:
      code: |
        const fs = require('fs');
        const data = fs.readFileSync('config.json', 'utf8');
        JSON.parse(data).version;
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `code` | string | Node.js code to execute |

## Details

The `node` action executes JavaScript in the Node.js environment (server-side). It has access to Node.js APIs like `fs`, `path`, `crypto`, etc., as well as all pptr variables.

The result of the last expression is stored in `result`.

## Examples

```yaml
# Generate random number
actions:
  - node: "Math.random() * 100"
  - log: "Random: ${result}"

# Read file
actions:
  - node: "require('fs').readFileSync('package.json', 'utf8')"
  - log: "Content: ${result}"

# Use variables
vars:
  basePath: "/home/user/data"

actions:
  - node: |
      const path = require('path');
      path.join('${basePath}', 'output.txt')
  - log: "Full path: ${result}"
```

## See Also

- [`js`](js.md) - Execute JavaScript in browser
- [`shell`](shell.md) - Execute shell commands