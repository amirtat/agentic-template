# The feature cycle

Work on a feature branch. `/product` starts it from an updated `main`. Every step ends with a commit. `<spec>` and `<plan>` are the paths `/product` and `/dev` create under `specs/features/`.

| # | Step | Session | Model | Command in Claude Code | What you do |
| --- | --- | --- | --- | --- | --- |
| 1 | Spec | `/clear` | Sonnet | `/product <feature + what is out of scope>` | Answer questions, check the acceptance criteria and the UI contract (including mobile), commit |
| 2 | E2E first | `/clear` | Sonnet | `/qa phase 1: write e2e tests for @<spec>` | Make sure they fail for the right reason, commit |
| 3 | Plan | `/clear` | Opus | `/dev plan @<spec>` | Read it; don't approve yet |
| 4 | Plan review | same session | Opus | `run the plan-reviewer on the plan`, then `apply the issues you agree with; do not re-run the reviewer` | Decide which issues to apply, commit |
| 5 | Implement | `/clear` | Sonnet | `/dev implement @<plan>` | Read the diff |
| 6 | Commit | - | - | commit (the message must not start with `docs:`) | Read the docs commit the hook adds |
| 7 | Code review | `/clear` | Sonnet | `run code-reviewer on last commit`; in sensitive areas also `run security-reviewer on branch` (runs on Opus) | Decide which findings are real |
| 8 | Fix | same session | Sonnet | `fix the Critical and Major items` | Separate commit |
| 9 | Verify | `/clear` | Sonnet | `/qa @<spec> feature is fully implemented` | Commit the test report |
| 10 | Push + deploy | - | - | push after your approval, open a PR, merge when CI is green; CI deploys | Check the live site visually, on mobile too |

At the end of any step you can run `/handoff` and forward the report for an outside review.

## Notes

- **Model:** `/model opus` before step 3, and `/model sonnet` before step 5.
- **No Plan mode:** `/dev plan` writes the plan to a file. Don't use Claude Code's built-in Plan mode (Shift+Tab).
- **A screen whose shape is still being explored:** skip step 2. In step 9, `/qa` writes the E2E tests from the spec in a clean session.
- **Small fix** (a typo, a text change): steps 5, 6 and 7 only.
- **Agent stuck or wrong:** read the file it wrote, fix the spec or the plan, and run the step again. Don't fix a wrong plan inside the code.
- **Going back a step:** `git reset --hard <commit>`, only on the feature branch.
- **The docs hook did nothing:** `tail -f .git/update-docs.log`.
- **After a merge on GitHub:** `git checkout main && git pull`. The next `/product` does this for you if you forget. After a squash merge, delete the old local branch with `git branch -D <branch>`; Git does not see it as merged.
