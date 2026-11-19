# Claude Code hooks

Registered in `.claude/settings.json`. Each one is a small Node script that reads the hook JSON on stdin.

| Hook | Event | What it does | Blocks? |
|---|---|---|---|
| `protect-files.mjs` | PreToolUse (Read, Edit, Write, MultiEdit, Grep, Glob, Bash) | Stops any access to `.env`, keys and service-account files. `.env.example` is allowed. | Yes (exit 2) |
| `scripts/check-copy.mjs --hook` | PostToolUse (Edit, Write, MultiEdit) | Checks an edited user-facing file against `copy-rules.json` and tells Claude to fix any match. No rules by default. | Feedback (exit 2) |
| `format-on-edit.mjs` | PostToolUse (Edit, Write, MultiEdit) | Runs the project's Prettier on the edited file, if installed. | No |

Notes:
- `protect-files` also blocks `cp .env.example .env`. Create `.env` yourself.
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
