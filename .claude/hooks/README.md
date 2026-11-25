# Claude Code hooks

Registered in `.claude/settings.json`. Each one is a small Node script that reads the hook JSON on stdin.

| Hook | Event | What it does | Blocks? |
|---|---|---|---|
| `protect-files.mjs` | PreToolUse (Read, Edit, Write, MultiEdit, Grep, Glob, Bash) | Stops any access to `.env`, `.secret.local`, keys and service-account files. Allowed: `.env.example`, and the exact paths in `.claude/public-env-files` (committed env files with no secrets, such as `functions/.env.<project-id>`). | Yes (exit 2) |
| `scripts/check-copy.mjs --hook` | PostToolUse (Edit, Write, MultiEdit) | Checks an edited user-facing file against `copy-rules.json` and tells Claude to fix any match. No rules by default. | Feedback (exit 2) |
| `format-on-edit.mjs` | PostToolUse (Edit, Write, MultiEdit) | Runs the project's Prettier on the edited file, if installed. | No |

Notes:
- `protect-files` also blocks `cp .env.example .env`. Create `.env` yourself.
- `protect-files` ignores the message of a `git commit` (`-m`, `--message`, heredoc), so a message may mention `.env`. The rest of the command is still checked. A listed public env file is also allowed by its file name alone (after `cd` into its folder) and through a symlinked project path.
- After changing `protect-files.mjs`, run `npm run test:hooks`.
- Hooks are loaded when a session starts. After changing them, restart Claude Code and check with `/hooks`.

## Optional: long-file guard

`track-edits.mjs` (PostToolUse) records edited files; `check-file-size.mjs` (Stop) checks them once at the end of the turn and asks Claude to propose a split for files over 400 lines. Enable it once the basics work, by adding to `.claude/settings.json`:

```json
"PostToolUse": [ ...existing entries...,
  { "matcher": "Edit|Write|MultiEdit", "hooks": [ { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/track-edits.mjs\"" } ] }
],
"Stop": [
  { "hooks": [ { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/check-file-size.mjs\"" } ] }
]
```
