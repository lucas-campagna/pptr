---
name: pptr-cmd-write
description: Write content to a file.
---

# `write` Command

Write content to a file on the filesystem.

## YAML Syntax

```yaml
# Write to file (overwrites)
actions:
  - write:
      file: "output/data.json"
      content: '{"key": "value"}'

# Append to file
actions:
  - write:
      file: "output/log.txt"
      content: "Entry added\n"
      append: true

# With variable interpolation
vars:
  title: "Report"
  date: "2024-01-15"

actions:
  - write:
      file: "output/report.txt"
      content: "${title} - ${date}"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | string | Yes | Output file path |
| content | string | Yes | Content to write |
| append | boolean | No | Append to file instead of overwriting |

## Implementation

See `src/libs/interpreter.js` for the `write` action handler using Node's `fs.writeFileSync()`.

## Examples

```yaml
# Save extracted data
actions:
  - extract:
      selector: ".product"
      multiple: true
      save: products
  - write:
      file: "products.json"
      content: "${products}"

# Append to log
actions:
  - write:
      file: "activity.log"
      content: "Visited at ${env.TIMESTAMP}\n"
      append: true
```
