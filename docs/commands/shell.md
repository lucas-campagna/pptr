# `shell`

Execute shell commands in the system shell (bash, sh, or PowerShell on Windows).

## Syntax

```yaml
actions:
  - shell: "echo hello"
```

Or with full options:

```yaml
actions:
  - shell:
      command: "ls -la"
      shell: "bash"
      save: "stdout"
      var: "files"
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `command` | string | | Shell command to execute |
| `shell` | string | auto-detect | Shell to use (bash, sh, powershell) |
| `save` | string | result only | What to save: `stdout`, `stderr`, `all` |
| `var` | string | `$result` | Variable name for output |

## Details

The `shell` action executes commands in the system shell. The shell is auto-detected based on the platform:
- Linux/macOS: `bash` or `sh`
- Windows: `powershell`

The command output (stdout) is stored in `$result` by default. Use `save` to capture both stdout and stderr separately.

## Examples

```yaml
# Simple command
actions:
  - shell: "pwd"
  - log: "Current directory: ${result}"

# Capture stderr
actions:
  - shell:
      command: "ls /nonexistent 2>&1"
      save: "all"
      var: "output"
  - log: "stdout: ${output.stdout}"
  - log: "stderr: ${output.stderr}"

# Run git command
actions:
  - shell: "git status --short"
  - if:
      condition: "${result} !== ''"
    then:
      - shell: "git add -A"
      - shell: "git commit -m 'Auto-commit'"
```

## See Also

- [`node`](node.md) - Execute Node.js code server-side
- [`curl`](curl.md) - Make HTTP requests