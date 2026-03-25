# Puppeteer Script Runner Documentation

A concise reference for the pptr YAML-based browser automation runner.

This repository contains a small CLI application (apps/pptr) and a reusable
core library (libs/pptr-core) that execute automation scripts written in YAML.
The docs below explain how to run the CLI locally, in Docker, or as a
packaged binary, and where to find the detailed actions reference and
examples.

Installation

Docker (recommended)

```bash
docker build -t pptr .
```

Local development

```bash
# From repository root
npm ci

# Run the CLI directly
node src/cli.js scripts/example.yaml
```

Quick start

Create `scripts/example.yaml`:

```yaml
open: https://example.com
actions:
  - log: "Starting automation"
  - screenshot: output.png
```

Run with Docker (the image runs `node src/cli.js`):

```bash
docker run --rm \
  -v "$(pwd)/scripts:/app/scripts" \
  -v "$(pwd)/output:/app/output" \
  pptr ./scripts/example.yaml
```

Run locally (from repository root):

```bash
node src/cli.js scripts/example.yaml
```

If you install or build the packaged CLI it will be available as `pptr`:

```bash
pptr scripts/example.yaml
```

CLI usage (common flags)

node src/cli.js <script.yaml> [options]

- `-e, --execute <yaml>`: execute YAML directly from the command line
- `--headless` / `--no-headless`: run headless (default) or with a visible browser
- `-d, --debug`: enable debug logging
- `--log <path>`: write logs to a file
- `-v, --var <VAR=VALUE>`: override variables (repeatable)
- `-o, --output <path>`: compile the YAML into a small wrapper (bash / PowerShell)
- `--wrapper <type>`: force wrapper type (`bash|powershell|auto`)
- `--list-browsers`: list detected browser executables and exit

Examples

```bash
# Execute inline YAML (local)
node src/cli.js -e "open: https://example.com"

# Run a script (local)
node src/cli.js scripts/example.yaml

# Override variables
node src/cli.js scripts/example.yaml --var BASE_URL=https://google.com

# Run with visible browser
node src/cli.js scripts/example.yaml --no-headless

# Enable debug logging
node src/cli.js scripts/example.yaml -d

# Compile a script to a wrapper that calls the 'pptr' binary
node src/cli.js scripts/example.yaml -o myapp

# After compilation run the wrapper (requires 'pptr' in PATH)
./myapp -v BASE_URL=https://github.com
```

Compiling scripts

Use the `-o` flag to create a small wrapper script that embeds the YAML and
invokes the `pptr` executable with the embedded content. The wrapper forwards
runtime arguments so variables and flags can still be overridden when invoked.

Example:

```bash
node src/cli.js scripts/example.yaml -o myapp
# or, after installing the packaged binary:
pptr scripts/example.yaml -o myapp
```

Project layout

```
/pptr/
├── apps/pptr/           # CLI app and packaging config (apps/pptr/src/cli.js)
├── libs/pptr-core/      # Core interpreter, parser, runner, utilities
├── docs/                # Documentation (this file + actions/examples)
├── scripts/             # Example YAML scripts
├── Dockerfile
└── package.json
```

Where to read more

- `docs/actions.md` — complete actions reference (click, type, wait, extract, etc.)
- `docs/examples.md` — practical examples and workflows

License

ISC
