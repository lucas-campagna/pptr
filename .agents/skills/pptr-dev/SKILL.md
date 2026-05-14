---
name: pptr-dev
description: Developer guide and workflows for contributing features to the pptr CLI and core library (src/libs). Use this to onboard contributors and automate common tasks when adding new actions, parsers, or CLI features.
---

# pptr-dev Skill

This skill documents the code layout, conventions, and step-by-step patterns to implement new features in the pptr repository (flattened layout).

Use this when you need to:

- Add a new action to the YAML language (e.g., `type: fancy`),
- Add a helper function, utility, or parser inside the core interpreter,
- Modify CLI behavior, flags, or wrapper generation,
- Add tests, fixtures, or update documentation.

The goal: provide precise, reproducible instructions so an agent or developer can implement features consistently.

---

## Repository Overview

- `src/cli.js` — CLI entrypoint. Parse args, compose Runner options, compile/compile-to-wrapper logic, and export helper functions used in tests.
- `src/libs/` — core library previously known as `pptr-core`.
  - `index.js` — public API that exports Runner, Parser, Interpreter, Logger, etc.
  - `parser.js` — normalization of YAML structure into canonical AST used by the interpreter.
  - `importer.js` — handles `import:` blocks and resolves file paths.
  - `compile.js` — compile-time inlining, `inlineImports`, and `compileYamlString` that produce YAML outputs.
  - `interpreter.js` — implements action execution, control flow, and runtime behavior.
  - `runner.js` — high-level orchestration: launching browser, injecting tab/session lifecycle, and calling Interpreter.
  - `variables.js` — variable engine and evaluation helpers.
  - `logger.js` — logging abstraction used across code and tests.
  - `browser-finder.js` — helpers to locate installed browser executables.
  - `vendor/` — small bundled shims (e.g., `js-yaml`) used for tests or minimal environments.

Tests live under `test/` and `apps/pptr/test/`; run them with `npm test`.

---

## Conventions

- JavaScript: CommonJS modules (require/module.exports). Keep the style consistent with existing files.
- Small, well-scoped functions: prefer adding a helper inside the same file unless it will be reused across multiple modules.
- Tests: add unit tests under `test/unit/` for core logic and `apps/pptr/test/` for CLI integration. Use the repository's existing helper functions to spawn CLI or instantiate Interpreter.
- Expose features through `src/libs/index.js` when they are part of the public core API.

---

## How to Add a New Action (example: `fancy`)

1. Design the action shape
   - Define the action object structure (fields, required/optional).
   - Example: `{ type: 'fancy', selector: '#x', message: 'hi' }`.

2. Implement runtime behavior
   - Edit `src/libs/interpreter.js` and find where actions are dispatched (search for `case 'log'` or `executeAction`).
   - Add a new handler for `'fancy'` that accepts the action object, validates fields, and performs browser operations through the `page` abstraction passed to the interpreter.
   - Use `logger.write(level, message)` to record events.

3. Add compile-time helpers (optional)
   - If the action supports short-form YAML (e.g., `fancy: selector`), update `src/libs/compile.js`'s `shortifyAction` or normalization logic in `parser.js` so compiled YAML preserves the short syntax.

4. Add tests
   - Unit: add a test in `test/unit/` that constructs an Interpreter with a fake browser and verifies behavior (look at `test/unit/interpreter.unit.js` for examples).
   - CLI: if action influences wrapper generation or CLI flags, add an integration test under `apps/pptr/test/` that spawns `src/cli.js`.

5. Export docs and update examples
   - Add a brief entry in `docs/` describing the new action and an example script in `scripts/`.

6. Run tests
   - `npm test` — tests should pass. If you add platform-specific behavior (browsers), mock external dependencies or keep tests platform-neutral.

---

## How to Add a New Function (reusable function callable from YAML)

Functions are defined under `functions:` in YAML and can be inlined or imported. To add a built-in helper function:

1. Implement the function behavior in the Interpreter or as a helper file under `src/libs/`.
2. If the function is available at compile-time (inlining/resolution), ensure `compile.inlineImports` and `inlineImports` in `src/libs/compile.js` can map/reference it when merging imports.
3. Add tests verifying the result value is computed and assigned to `$result` or expected variable.

---

## CLI Changes

- To add flags/options, edit `src/cli.js` and update the `program` definition.
- For behavior that depends on the core API, call into `src/libs` (using the `coreModule` variable created near the top of `src/cli.js`).
- When changing wrapper generation, modify the `compile()` function in `src/cli.js` (it writes wrapperContent for bash/powershell).

---

## Testing and CI

- Run test suite locally: `npm test`.
- Tests are deterministic and prefer in-repo modules (src/libs). Use the test helpers in `test/helpers.js` and `apps/pptr/test/helpers.js` to spawn the CLI.
- When adding browser-dependent code, write tests that stub the browser interactions (see tests that create `fakeBrowser = { newPage: async () => ({}) }`).

---

## Example: Implement `sleep` Action

1. Add to interpreter:

  case 'sleep':
    const ms = Number(action.ms || action.milliseconds || 0);
    await new Promise(r => setTimeout(r, ms));
    break;

2. Normalize short form in parser.js if you want `- sleep: 100` to work.
3. Add unit test verifying that the interpreter waits the specified time (use a mocked clock or a small ms value).

---

## Helpful Grep Targets

- Find where actions are executed: `rg "case '\w+'|executeAction|executeActions"`
- Find compile-time inlining: `rg "inlineImports|compileYamlString|shortifyAction"`
- Find CLI behavior: `rg "src/cli.js|compile\(|--list-browsers"`

---

If you want, I can also scaffold a new action implementation and tests as a concrete PR. Tell me the name and behavior and I will implement it following this skill.
