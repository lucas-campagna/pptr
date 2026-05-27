---
name: pptr-imports
description: Reference guide for pptr imports. Use when importing and reusing other YAML scripts, actions, and functions with aliases.
---

# Imports

Import other YAML files to reuse their actions and functions.

## Basic Import

Top-level `import:` block:

```yaml
import:
  common: ./common.yaml

actions:
  - common.actions
  - common.functions.sum:
      x: 2
      y: 3
```

## Import Syntax

```yaml
import:
  alias: ./path/to/file.yaml
```

Multiple imports:

```yaml
import:
  common: ./common.yaml
  auth: ./auth.yaml
  utils: ./utils.yaml
```

## Accessing Imported Content

### Actions

```yaml
actions:
  - alias.actions
```

### Functions

```yaml
actions:
  - alias.functions.functionName:
      param1: value1
      param2: value2
```

## Example

Script A (`script-a.yml`):

```yaml
actions:
  - log: "hello from A"

functions:
  sum:
    params:
      x: 0
      y: 0
    actions:
      - return: "${x + y}"
```

Script B:

```yaml
import:
  a: ./script-a.yml

actions:
  - a.actions
  - a.functions.sum:
      x: 2
      y: 3
  - log: "Result: ${result}"
```

## Notes

- Import paths are resolved relative to the importing script file
- Circular imports are detected and raise an error
- Alias conflicts (same alias mapped to different files) raise an error
- Imported functions should use `return:` to set `${result}`
- Expressions inside `${...}` are evaluated against current runtime variables

## Implementation Notes

- Imports are resolved by `Importer.loadImports()` in `src/libs/importer.js`
- `Compile.inlineImports()` inlines imported content at compile time
- `Parser.normalize()` handles import normalization during parsing
- Circular imports detected via `CircularImportError` in `Importer`