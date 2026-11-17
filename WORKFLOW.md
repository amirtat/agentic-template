# מחזור פיתוח של פיצ'ר

עובדים על branch של הפיצ'ר. כל שלב נגמר ב-commit. `<spec>` ו-`<plan>` הם הנתיבים ש-`/product` ו-`/dev` יוצרים תחת `specs/features/`.

| מה אתה עושה | הפקודה ב-Claude Code | מודל | סשן | שלב | # |
| --- | --- | --- | --- | --- | --- |
| עונה על שאלות, בודק AC ו-UI contract (כולל מובייל), commit | `/product <פיצ'ר + מה מחוץ ל-scope>` | Sonnet | `/clear` | Spec | 1 |
| מוודא שנכשלות מהסיבה הנכונה, commit | `/qa phase 1: write e2e tests for @<spec>` | Sonnet | `/clear` | E2E קודם | 2 |
| קורא, עדיין לא מאשר | `/dev plan @<spec>` | Opus | `/clear` | Plan | 3 |
| מחליט מה להחיל, commit | `run the plan-reviewer on the plan` ואז `apply the issues you agree with; do not re-run the reviewer` | Opus | אותו סשן | Plan review | 4 |
| קורא את ה-diff | `/dev implement @<plan>` | Sonnet | `/clear` | Implement | 5 |
| קורא את commit ה-docs שה-hook מוסיף | commit (הודעה שלא מתחילה ב-`docs:`) | - | - | Commit | 6 |
| מחליט מה אמיתי | `@code-reviewer last commit`; באזורים רגישים גם `@security-reviewer last commit` (רץ על Opus) | Sonnet | `/clear` | Code review | 7 |
| commit נפרד | `fix the Critical and Major items` | Sonnet | אותו סשן | Fix | 8 |
| commit ל-test report | `/qa @<spec> feature is fully implemented` | Sonnet | `/clear` | Verify | 9 |
| בדיקה ויזואלית באתר החי, גם במובייל | push אחרי אישור; CI עושה deploy | - | - | Push + Deploy | 10 |

בסוף כל שלב אפשר להריץ `/handoff` ולהעביר את הדו"ח לבדיקה חיצונית.

## הערות

- **מודל:** `/model opus` לפני שלב 3, ו-`/model sonnet` לפני שלב 5.
- **לא Plan mode:** `/dev plan` כותב את התוכנית לקובץ. אל תשתמש במצב Plan המובנה (Shift+Tab).
- **מסך שעוד מחפשים לו צורה:** מדלגים על שלב 2. בשלב 9, `/qa` כותב את ה-E2E מה-spec בסשן נקי.
- **תיקון קטן** (טעות הקלדה, טקסט): שלבים 5, 6, 7 בלבד.
- **Agent תקוע או טועה:** קוראים את הקובץ שהוא כתב, מתקנים את ה-spec או ה-plan, ומריצים את השלב שוב. לא מתקנים תוכנית שגויה בתוך הקוד.
- **חזרה לשלב קודם:** `git reset --hard <commit>`, רק על ה-branch של הפיצ'ר.
- **ה-hook של ה-docs לא עשה כלום:** `tail -f .git/update-docs.log`.
