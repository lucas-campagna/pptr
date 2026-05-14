# Writing pptr YAML Scripts

This guide teaches users how to write .yaml/.yml scripts that the pptr CLI runs.
It covers document structure, common actions, variables, functions, imports, subcommands,
examples, and how to run and package scripts with the pptr CLI.

The CLI entrypoint is `src/cli.js` (or the installed binary `pptr`). Run a script with:

```bash
node src/cli.js scripts/example.yaml
# or if installed as a binary:
pptr scripts/example.yaml
```

Quick tips
- Use `-e` to execute YAML inline: `pptr -e "open: https://example.com"`
- Use `-v KEY=VALUE` to override variables at runtime; repeat `-v` for multiple variables.
- Use `-o` to compile a script into a small wrapper that embeds the YAML.

---

## Document Structure

A pptr YAML script is a mapping with optional sections. Minimal example:

```yaml
meta:
  name: my-script

vars:
  BASE_URL: "https://example.com"

open: ${BASE_URL}

actions:
  - log: "Starting"
  - screenshot: ./output/home.png
```

Top-level keys you will commonly use:
- `meta` - free-form metadata, e.g. name and log file path.
- `vars` - declare variables available to the script (see Variables below).
- `open` - an initial URL to open in the first tab.
- `actions` - an ordered list of actions the script executes.
- `functions` - reusable named function definitions (params + actions).
- `subcommands` - named sub-scripts that can be executed by specifying subcommands on the CLI.
- `tabs` - separate tab configurations (each tab has `open` and `actions`).
- `import` - imports other YAML files and exposes their actions/functions under aliases.

---

## Variables and Interpolation

- Declare variables in the `vars:` section. Use `${VAR_NAME}` to interpolate.
- You can reference environment variables using `${env.MY_ENV}`.
- Expressions are supported inside `${...}`; simple arithmetic and boolean expressions work.
- Example:

```yaml
vars:
  BASE_URL: "https://example.com"
  COUNT: 3

actions:
  - open: ${BASE_URL}
  - log: "Running ${COUNT} iterations"
```

Notes
- If a variable used inside `${...}` is not declared, the runner MAY throw an error. Declare all public variables in `vars:`.
- You can override variables when invoking the CLI: `pptr scripts/foo.yaml -v COUNT=10`

---

## Action Types (Common)

Actions are objects or short-form mappings. Short form examples: `- log: "hello"`.

Common actions:

- `open: <url>` — navigate current tab to URL
- `log: <message>` — write a log message
- `screenshot: <path>` or `screenshot: { path: <path>, fullPage: true }`
- `wait: <ms>` or `wait: { timeout: <ms> }`
- `click: { selector: <css|xpath>, wait: <selector|ms> }`
- `type: { selector: <sel>, text: <text> }`
- `fill: { selector: <sel>, text: <text> }` — preferred for modern Playwright-style filling
- `hover: { selector: <sel> }`
- `select: { selector: <sel>, value: <value> }`
- `press: { key: <key> }`
- `screenshot` and `pdf` — save page artifacts
- `extract: { selector: <sel>, save: varName }` — extract text and save to a variable
- `newTab: { url: <url>, actions: [...] }` — open a new tab and run actions
- `if`, `for`, `repeat`, `parallel`, `retry`, `try` — control flow structures
- `func` and `fn` — call and define functions inside scripts

See `scripts/example.yaml` in the repository for sample usage.

---

## Short vs Long Form Actions

Short form is a compact mapping with a single key: `- log: "msg"`.
Long form uses an action object: `- log: { level: INFO, message: "msg" }` or `- { type: 'log', message: 'msg' }`.

Both are supported; the compiler will try to preserve short form where possible.

---

## Functions and Reuse

Define `functions:` at the top-level to create reusable units:

```yaml
functions:
  add:
    params: { x: 0, y: 0 }
    actions:
      - result: "${x + y}"

actions:
  - add: { x: 2, y: 3 }
```

Call functions via `- func: { name: 'add', args: { x: 1, y: 2 } }` or via import aliases (see Imports).

---

## Imports

Use `import:` to include other YAML files and reference their actions/functions with an alias.

Example file `main.yaml`:

```yaml
import:
  common: ./common.yaml

actions:
  - common.actions.doSomething
  - common.functions.sum: { x: 1, y: 2 }
```

The compiler inlines imports, so final compiled YAML has merged actions and functions.

---

## Subcommands

`subcommands:` allows a file to expose named entry points. On the CLI specify subcommands after the script path.

Example:

```yaml
subcommands:
  login:
    open: https://example.com/login
    actions:
      - type: { selector: '#user', text: '${USER}' }
      - type: { selector: '#pass', text: '${PASS}' }
      - click: '#submit'

# invoke:
# pptr script.yaml login
```

The CLI reads the subcommand path and executes the matching block.

---

## Packaging and the `-o` flag

Use `-o <path>` to compile a script into a small wrapper that embeds the YAML and calls the `pptr` binary. This is useful for distributing a standalone script.

```bash
pptr -o dist/run_my_script.sh scripts/my-script.yaml
```

The generated wrapper works on macOS/Linux (bash) or Windows (PowerShell) depending on the output extension, and forwards CLI args.

---

## Examples

1) Simple search and extract

```yaml
vars:
  BASE: 'https://www.example.com'

open: ${BASE}

actions:
  - click: { selector: '#search' }
  - type: { selector: '#q', text: '${QUERY}' }
  - press: { key: 'Enter' }
  - wait: { selector: '.result' }
  - extract:
      selector: '.result'
      multiple: true
      save: results
  - write:
      file: './output/results.json'
      content: '${results}'
```

2) Login subcommand (see above)

3) Importing reusable flows

`common.yaml`:

```yaml
actions:
  - log: 'common step'

functions:
  sum:
    params: { x: 0, y: 0 }
    actions:
      - result: '${x + y}'
```

`main.yaml`:

```yaml
import:
  common: ./common.yaml

actions:
  - common.actions
  - common.functions.sum: { x: 5, y: 6 }
```

---

## Troubleshooting

- If the CLI complains about an undeclared variable, add it to `vars:` or pass `-v` to override.
- Use `--list-browsers` to debug which browser executables are detected.
- If selectors fail, try using XPath (leading `/`) — pptr supports XPath by prefixing with `/`.

---

For more reference on the available actions and advanced control structures, see `docs/actions.md` and the `scripts/` examples in this repository.
