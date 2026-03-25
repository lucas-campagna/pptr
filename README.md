# pptr

A YAML-based browser automation scripting language built on top of Puppeteer.

pptr is a small monorepo that provides a CLI and a reusable core library to run
browser automation scripts written in YAML. It supports CSS & XPath selectors,
variables, control flow, parallel execution, tab management, data extraction,
and more. The project can be run from source, built into standalone binaries,
or executed inside a Docker container.

Key features

- Write automation as human-readable YAML files
- CSS and XPath selector support
- Variable interpolation with `${VAR}` and `${env.VAR}`
- Control flow: `if`, `for`, `repeat`, `try/catch`, `parallel`, `retry`
- Tab management and multi-tab workflows
- Data extraction, screenshots and PDF export
- Compile YAML into a small wrapper script (`-o`) for distribution

Installation

Download prebuilt executables from the latest release:

https://github.com/lucas-campagna/pptr/releases/latest

From source (development)

1. Clone the repository:

   git clone https://github.com/lucas-campagna/pptr.git
   cd pptr

2. Install dependencies and run the CLI directly:

   # Install workspace dependencies
   npm ci

   # Run the CLI from the repository root
   node src/cli.js scripts/example.yaml

Build a standalone executable (apps/pptr)

The CLI app lives in `apps/pptr` and can be packaged with `pkg` to create
platform binaries.

   cd apps/pptr
   npm ci
   npm run build

Binaries are written to `apps/pptr/dist`.

Docker

Build the image and run a script using the bundled CLI inside the container:

   docker build -t pptr .
   docker run --rm -v "$(pwd)/scripts:/app/scripts" -v "$(pwd)/output:/app/output" pptr ./scripts/example.yaml

Usage

Run a YAML script:

   node src/cli.js <script.yaml> [options]

If you installed a packaged binary it will be available as `pptr`:

   pptr <script.yaml> [options]

Execute YAML directly from command line:

   node src/cli.js -e "open: https://example.com"

Options

  -e, --execute <yaml>        Execute YAML content directly
      --headless              Run in headless mode (default)
      --no-headless           Run with visible browser
  -d, --debug                 Enable debug logging
      --log <path>            Write logs to file
  -v, --var <VAR=VALUE>       Override variable (repeatable)
  -o, --output <path>         Compile script to standalone wrapper (bash/PowerShell)
      --wrapper <type>        Force wrapper (bash|powershell|auto)
      --list-browsers         List detected browser executables and exit

Environment variables

- `BROWSER_PATH` - when set it must point to the exact browser executable to use
- `AUTO_BROWSER` - if `1` or `true`, automatically pick the first browser when multiple are found

Examples

# Run a script
node src/cli.js scripts/example.yaml

# Execute inline YAML
node src/cli.js -e "open: https://example.com" -d

# Override variables
node src/cli.js scripts/example.yaml -v BASE_URL=https://google.com -v SEARCH_TERM=automation

# Run with visible browser
node src/cli.js scripts/example.yaml --no-headless

# Compile to standalone wrapper
node src/cli.js scripts/example.yaml -o myapp

# Run compiled wrapper (pptr must be in PATH)
./myapp

Script structure, selectors and actions

See the documentation in `docs/` for full details:

- `docs/actions.md` - complete actions reference
- `docs/examples.md` - working examples

Project layout

`/pptr` (repository root)

- `apps/pptr/` - CLI app and packaging config (`apps/pptr/src/cli.js`)
- `libs/pptr-core/` - core interpreter, parser, runner, utilities
- `docs/` - user documentation
- `scripts/` - example scripts
- `Dockerfile` and root `package.json`

License

ISC
