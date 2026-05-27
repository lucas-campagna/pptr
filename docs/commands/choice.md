# `choice`

Present a list of options to the user and store the selected option in a variable.

## Syntax

```yaml
actions:
  - choice:
      prompt: "Select environment:"
      options: ["dev", "staging", "prod"]
      var: "environment"
```

Or simple form:

```yaml
actions:
  - choice: "Select an option"
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prompt` | string | `"Select an option:"` | Prompt text shown to user |
| `options` | array | `[]` | List of options to choose from |
| `var` | string | `$result` | Variable name to store selection |

## Details

The `choice` action displays a prompt and list of numbered options to the user. The user enters a number (1, 2, 3, etc.) to select an option. The selected option value is stored in the specified variable.

If the user enters an invalid number, `null` is stored.

## Examples

```yaml
# Basic usage
actions:
  - choice:
      prompt: "Select deployment environment:"
      options: ["development", "staging", "production"]
      var: "env"
  - log: "Deploying to ${env}"

# Simple prompt
actions:
  - choice: "Continue with setup?"
  - if:
      condition: "${result} === 'y'"
    then:
      - log: "Starting setup..."

# Use in workflow
actions:
  - choice:
      prompt: "What do you want to do?"
      options:
        - "Run tests"
        - "Build project"
        - "Deploy to server"
        - "Exit"
      var: "action"
  - if:
      condition: "${action} === 'Run tests'"
    then:
      - shell: "npm test"
  - if:
      condition: "${action} === 'Build project'"
    then:
      - shell: "npm run build"
```

## User Input Format

```
Select deployment environment:
  1. development
  2. staging
  3. production
```

User types `2` and presses Enter to select "staging".

## See Also

- [`input`](input.md) - Free-form text input