# pptr Agent Context

## Project Overview
YAML-based Puppeteer automation script runner - CLI tool that executes YAML scripts to automate browser tasks.

## Recent Releases

### v1.4.0 (Latest)
- Added `fill` command using `page.locator().fill()` for reliable text input
- Updated google.yaml to use `fill` instead of `type`

### v1.3.0
- Added shorthand variable assignment: `myVar: value` (instead of `set: { myVar: value }`)
- Scope-aware variable deletion:
  - New variables inside functions/closures are deleted on scope exit
  - Existing variables are modified in place and persist
  - Variables inside control flows (if/for/repeat) persist

### v1.2.0
- Array script format support (YAML array = actions, opens browser without URL)
- fn closure feature for local function definitions inside functions

### v1.1.x
- Input action for interactive user prompts
- Functions feature for reusable action blocks

## Key Files

### src/interpreter.js
- Main execution engine
- Contains handlers for all actions: click, type, fill, wait, etc.
- Variable management with scope tracking
- Function and closure handling

### src/parser.js
- Parses YAML scripts
- Normalizes actions to consistent format
- Handles functions and closures

### src/runner.js
- CLI runner
- Manages Puppeteer browser lifecycle
- Downloads dependencies

### scripts/google.yaml
- Example script for testing
- Uses `fill` command for search input

## Available Actions
- click, type, fill, wait, screenshot, log, open, back, forward, reload
- hover, select, scroll, press
- newTab, switchTab, closeTab
- if, for, repeat, parallel, retry, try
- extract, pdf, write
- input (interactive)
- fn (closure definition)
- func (function call)

## Shorthand Features
- Variables: `myVar: value` instead of `set: { myVar: value }`
- Variable interpolation: `${varName}` throughout
- Control flow shorthand in some cases

## Testing
- `npm test` runs scripts/example.yaml
- `node src/cli.js <script.yaml>` to run any script

## Current Working Directory
/home/lucas/projects/pptr
