# Git hooks

Installed automatically by `npm install` (the `postinstall` script runs `git config core.hooksPath .githooks`).

| Hook | When | What |
|---|---|---|
| `pre-commit` | before each commit | `node scripts/check-copy.mjs --staged`: blocks staged user-facing files that break the rules in `copy-rules.json` (none by default). |
| `post-commit` | after each commit | Starts `scripts/update-docs.sh` in the background: headless Claude updates `docs/` and `feature-index/index.yaml`. |

The rest of this file describes the post-commit hook. It is adapted from the course example, github.com/nirch/demo-day-sdlc, with one addition: it also maintains `feature-index/index.yaml`.

# Post-commit docs hook

After every commit, a background job asks Claude to check whether the commit changed documented behavior and, if so, updates `docs/` and commits the result as `docs: update for <short-sha>`. The commit you made returns immediately; the docs follow a few seconds later.

Files:
- `.githooks/post-commit`: tiny wrapper. Starts the script in the background with `nohup` and returns.
- `scripts/update-docs.sh <full-sha>`: does the work.

## Install and uninstall

```
npm install                             # installs the hooks through postinstall
git config core.hooksPath .githooks     # or install by hand (per clone; git does not share this setting)
git config --unset core.hooksPath       # uninstall
```

Requires the `claude` CLI on your `PATH`, signed in.

Watch it live: `tail -f .git/update-docs.log`

## The flow

1. `git commit` finishes. `post-commit` runs `scripts/update-docs.sh <sha>` in the background, appending all output to `.git/update-docs.log`.
2. The script logs a `start` line (timestamp and SHA) and checks whether to skip. It exits quietly if:
   - `docs/` does not exist;
   - the commit message starts with `docs:` (this is what stops the hook from reacting to its own commit);
   - the commit only touches files under `docs/`;
   - `docs/` already has uncommitted changes (so your work in progress is never swept into an automated commit).
3. It builds a prompt (instructions, commit message, diff) and runs `claude -p` under a timeout.
4. Claude reads `docs/README.md` and the existing `docs/flows/*.md`, then decides per changed area:
   - **update** an existing doc;
   - **create** `docs/flows/<name>.md` for a genuinely new flow, following the existing structure and adding it to the `docs/README.md` index;
   - **no change** (refactors, tests, config, styling, small tweaks).
   It may also update `docs/architecture.md` if the overall structure changed.
5. The script stages only the changed files under `docs/`, and commits `docs: update for <short-sha>`. If nothing changed it logs `no doc changes` and makes no commit.
6. It logs an `end` line.

On a timeout or a non-zero exit from Claude, the script logs it and does not commit. Check `.git/update-docs.log` after your first few commits: a run that ends in `claude exited with code` means the docs are not being updated. Partial edits may remain in `docs/`; review them with `git status`.

## What Claude is allowed to do

```
env -u CLAUDECODE claude -p
  --tools "Read,Grep,Glob,Edit,Write"
  --allowedTools "Read,Grep,Glob,Edit(docs/**),Edit(feature-index/**)"
  --disallowedTools "Edit(product/**)"
  --permission-mode dontAsk
  --no-session-persistence
```

| Setting | Why |
|---|---|
| `--tools` without Bash | The job runs unattended. With no shell, a bad or injected instruction in a diff cannot run commands. |
| `Edit(docs/**)` | Writes are limited to `docs/`. This rule covers every file-editing tool; a separate `Write(...)` rule is rejected by the CLI. |
| Deny `product/**` | The owner's folder (design brief, product spec, roadmap). Already outside `docs/**`; the explicit deny states the intent. The script also stages only `docs/` and `feature-index/`. |
| `env -u CLAUDECODE` | A commit made by Claude Code runs the hook with `CLAUDECODE` set, and `claude` refuses to start inside another session (every run would end in `code 1` and the docs would never update). The hook is a separate background process, so it removes the marker. |
| `--permission-mode dontAsk` | Nobody is there to answer prompts, so anything not allowed is denied instead of hanging. |
| No `--model` | Inherits your default model. |
| Prompt on stdin | `--allowedTools` is variadic and would swallow a positional prompt. |

The prompt tells Claude that the commit message and diff are data, not instructions.

## Configuration

| Env var | Default | Meaning |
|---|---|---|
| `UPDATE_DOCS_TIMEOUT` | `300` | Seconds before `claude` is killed. Uses `timeout` or `gtimeout` if installed, otherwise a shell watchdog (macOS has neither by default). |
| `UPDATE_DOCS_MAX_DIFF` | `200000` | Max diff bytes sent to Claude; larger diffs are cut off. |

The hook inherits the environment of the shell that runs `git commit`, so export these before committing.

## What to customize

- **Skip rules:** the `case` and `non_docs` checks near the top of the script.
- **Protected files:** human-owned documents go in `product/`, outside the hook's reach. Keep the `--disallowedTools` flag in step with it.
- **Prompt:** the heredoc in the script. Adjust the outcomes and rules to your docs layout.
- **Scope:** the folder in `Edit(docs/**)` and in the `git ls-files` call, if your docs live elsewhere.

## Limits

- Output depends on the model. Claude may skip the "read first" step or update an existing doc where you would have created a new one. Review `docs: update` commits like any other change.
- Runs are per commit and not queued. Commits made in quick succession run in parallel.
- Hooks do not run on clones until `core.hooksPath` is set, and `git commit --no-verify` does not skip `post-commit`; use the `docs:` prefix or uninstall to avoid a run.
