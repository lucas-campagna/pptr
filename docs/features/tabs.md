---
name: tabs
description: Reference guide for pptr tabs. Use when running multiple browser tabs in parallel or sequentially within a single script.
---

# Tabs

Run multiple browser tabs within a single script.

## Overview

The `tabs:` block defines multiple tab configurations. Each tab has its own `open` URL and `actions`. Tabs are opened sequentially by default but can be controlled via the `newTab` action.

## Basic Tabs

```yaml
tabs:
  - open: "https://site-a.com"
    actions:
      - extract: { selector: "h1", save: "titleA" }
  - open: "https://site-b.com"
    actions:
      - extract: { selector: "h1", save: "titleB" }
```

## Initial Tab

The `open:` at the top level opens the initial tab:

```yaml
open: "https://example.com"

tabs:
  - open: "https://another-site.com"
    actions:
      - screenshot: "tab2.png"

actions:
  - screenshot: "tab1.png"
```

## Multi-Tab in Routes

Routes can use tabs for parallel operations:

```yaml
routes:
  /scrape:
    POST:
      tabs:
        - open: "https://site-a.com"
          actions:
            - extract: { selector: "h1", save: "titleA" }
        - open: "https://site-b.com"
          actions:
            - extract: { selector: "h1", save: "titleB" }
      actions:
        - return: { titleA: "${titleA}", titleB: "${titleB}" }
```

## Managing Tabs

### `newTab`

Open a new tab:

```yaml
actions:
  - newTab: "https://example.com"
  - switchTab: 1
```

### `switchTab`

Switch to a tab by index:

```yaml
actions:
  - switchTab: 0  # First tab
  - switchTab: 1  # Second tab
```

### `closeTab`

Close the current tab:

```yaml
actions:
  - closeTab
```

## Variable Sharing

Variables are shared across tabs — actions in one tab can reference variables set in another:

```yaml
open: "https://site-a.com"
actions:
  - extract: { selector: "h1", save: "title" }

tabs:
  - open: "https://site-b.com"
    actions:
      - log: "Title from tab 1: ${title}"
```

## Notes

- The initial tab is created from top-level `open:`
- Additional tabs are opened as defined in `tabs:` block
- Variables set in any tab are accessible globally
- Tab index starts at 0 for the first tab

## Implementation Notes

- `Parser.normalizeTabs()` in `src/libs/parser.js` handles tab normalization
- `Interpreter.executeTab()` in `src/libs/interpreter.js` executes tab actions
- `switchTab`, `newTab`, `closeTab` actions are handled in `executeAction()`