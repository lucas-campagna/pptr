---
name: parallel
description: Execute multiple action branches concurrently.
---

# `parallel` Command

Execute multiple branches of actions concurrently.

## YAML Syntax

```yaml
actions:
  - parallel:
      branches:
        - actions:
            - open: "https://site-a.com"
            - screenshot: "site-a.png"
        - actions:
            - open: "https://site-b.com"
            - screenshot: "site-b.png"
```

## Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| branches | array | Yes | Array of action branches to execute concurrently |

## Implementation

See `src/libs/interpreter.js` for the `parallel` action handler.

## Examples

```yaml
# Capture multiple sites
actions:
  - parallel:
      branches:
        - actions:
            - open: "https://example.com"
            - screenshot: "example.png"
        - actions:
            - open: "https://news.ycombinator.com"
            - screenshot: "hn.png"
        - actions:
            - open: "https://reddit.com"
            - screenshot: "reddit.png"
```
