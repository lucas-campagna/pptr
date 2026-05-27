# Variables

Variables store values that can be reused throughout your script. They support interpolation, expressions, and environment variables.

## Declaring Variables

Add a `vars:` block at the top level:

```yaml
vars:
  BASE_URL: "https://example.com"
  USERNAME: "admin"
  COUNT: 5
  ENABLED: true
```

## Interpolation

Use `${VAR_NAME}` to insert variable values:

```yaml
vars:
  BASE_URL: "https://example.com"
  PAGE: "/dashboard"

actions:
  - open: "${BASE_URL}${PAGE}"
  - log: "Opened ${BASE_URL}"
```

## Environment Variables

Access system environment variables with `${env.VAR_NAME}`:

```yaml
actions:
  - log: "Home directory: ${env.HOME}"
  - log: "Current user: ${env.USER}"
```

## Runtime Override

Pass variables at the command line with `-v`:

```bash
pptr script.yaml -v BASE_URL=https://google.com -v COUNT=10
```

This overrides values declared in `vars:`.

## Expressions

Inside `${...}` you can use expressions:

```yaml
vars:
  A: 5
  B: 3

actions:
  - log: "Sum: ${A + B}"           # 8
  - log: "Product: ${A * B}"       # 15
  - log: "Greater: ${A > B}"       # true
  - log: "Equal: ${A == B}"        # false
```

Supported operators:
- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `&&`, `||`, `!`
- String concatenation with `+`

## Complex Data

```yaml
vars:
  CONFIG:
    timeout: 5000
    retries: 3
    items:
      - name: "first"
      - name: "second"

actions:
  - log: "Timeout: ${CONFIG.timeout}"
  - log: "First item: ${CONFIG.items[0].name}"
```

## Variable Scope

- **Top-level `vars:`** — available throughout the script
- **Function params** — scoped to the function body
- **Loop variables** — scoped to the loop body (via `as`)

## Reserved Variables

| Variable | Description |
|----------|-------------|
| `${result}` | Return value from the last function call |
| `${params}` | URL path parameters (in server routes) |
| `${query}` | Query string parameters (in server routes) |
| `${body}` | Request body (in server routes) |
| `${headers}` | Request headers (in server routes) |
| `${env.VAR}` | System environment variable |

## Common Patterns

### Configuration

```yaml
vars:
  BASE_URL: "https://example.com"
  TIMEOUT: 30000
  RETRY_COUNT: 3

actions:
  - open: "${BASE_URL}"
  - wait:
      timeout: "${TIMEOUT}"
  - retry:
      times: "${RETRY_COUNT}"
    action:
      - click: "#submit"
```

### Conditional Values

```yaml
vars:
  ENV: "production"
  API_URL:
    production: "https://api.example.com"
    staging: "https://staging.example.com"
    development: "http://localhost:3000"

actions:
  - open: "${API_URL[ENV]}"
```

### Iteration

```yaml
vars:
  ITEMS: ["one", "two", "three"]

actions:
  - for:
      items: "${ITEMS}"
      as: item
    actions:
      - log: "Processing: ${item}"
```

## Tips

- Declare all public variables in `vars:` at the top of your script
- Use `${env.VAR}` for secrets instead of hardcoding
- Override variables at runtime with `-v` for flexibility across environments