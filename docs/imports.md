Importing other scripts
=======================

You can add a top-level `import:` mapping in a YAML script to reference other scripts by alias. Imported scripts are parsed at load time but their `actions`/`functions` are only executed when referenced — this lets you reference imported actions inside control structures (if, for, repeat, parallel, etc.).

Example:

Script A (script-a.yml)

```yaml
actions:
  - log: "hello from A"
functions:
  sum:
    params:
      x: 0
      y: 0
    actions:
      - return: ${x + y}
```

Script B

```yaml
import:
  a: ./script-a.yml

actions:
  - a.actions
  - a.functions.sum:
      x: 2
      y: 3
```

Notes
- Import paths are resolved relative to the importing script file.
- Circular imports are detected and will raise an error.
- Alias conflicts (same alias mapped to different files) will raise an error.
- Imported functions should `return:` to set `$result`, or set variables directly inside their body.
- Expressions inside ${...} will be evaluated against the current runtime variables.
