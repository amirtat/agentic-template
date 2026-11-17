---
name: handoff
description: Writes a short structured status report of the current SDLC step for the owner to forward to an outside reviewer (Claude chat). Covers the step, files and commits, check results, decisions needed and open risks. Use at the end of any step when the user asks for a handoff or summary for review.
---

# Handoff report

The owner forwards this report to a reviewer who does not see this session but can read the repo files. Give them exactly what they need to review fast, and nothing they can read for themselves.

## Steps

1. Work out the current feature and step from this session and from `specs/features/` (the newest set of files with one prefix).
2. Run `git status --short`, `git log --oneline -n 8`, and the current branch name. Use the real output.
3. Reply in this exact format, in Hebrew, as one code block so it copies cleanly:

```
## Handoff: <feature name> | שלב <n>: <step name>
Branch: <branch>   Last commit: <sha> <subject>

### מה נעשה
- <one line per meaningful change>

### קבצים לבדיקה
- specs/features/<prefix>.md           (spec)
- specs/features/<prefix>.plan.md      (plan, if exists)
- <changed source files, one per line>

### תוצאות בדיקות
- lint: <pass/fail + counts>
- check-copy: <pass/fail>
- unit / integration: <passed X, failed Y | not run: reason>
- E2E desktop / mobile: <passed X, failed Y | not run: reason>

### החלטות שצריך ממך
1. <question, with the option you recommend>

### סיכונים ופתוחים
- <risk or open item, or "אין">

### הצעד הבא
<the exact next command, e.g. /dev implement @specs/features/<prefix>.plan.md>
```

## Rules

- Quote real command output; never report a result you did not see. Write "not run" with the reason.
- Paths, not file contents. The reviewer reads the files.
- No personal data, secrets or `.env` values.
- No em dash anywhere in the report.
