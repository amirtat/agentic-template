# Agentic Template

תבנית לכל פרויקט חדש: Agentic SDLC עם Claude Code. מבוססת על הקורס "AI for Developers with Claude Code" ועל ה-kit של [nirch/demo-day-sdlc](https://github.com/nirch/demo-day-sdlc), עם התאמות לשיטת העבודה שלי.

## מה יש כאן

```
CLAUDE.md                      חוקת הפרויקט. מתמלאת ע"י /agentic-init
WORKFLOW.md                    דף עזר: מחזור פיתוח של פיצ'ר, 10 שלבים
docs/                          architecture, design-brief, flows/
feature-index/index.yaml       פיצ'ר -> קבצים, נתונים, docs
specs/features/                spec, plan, test-report לכל פיצ'ר
.claude/settings.json          hooks + חסימות (סודות, deploy, force push)
.claude/hooks/                 protect-files, format-on-edit, long-file guard (אופציונלי)
.claude/skills/                agentic-init, product, dev, qa, design-brief, bootstrap-docs, handoff
.claude/agents/                plan-reviewer (Opus), code-reviewer, security-reviewer (Opus)
.githooks/                     pre-commit (em dash), post-commit (עדכון docs + feature-index)
scripts/                       check-copy.mjs, update-docs.sh
.github/workflows/ci.yml       check-copy, lint, tests, E2E
global/install-global.mjs      שכבה גלובלית ל-~/.claude (פעם אחת למחשב)
```

## פעם אחת למחשב

```bash
node global/install-global.mjs
```

מוסיף ל-`~/.claude/settings.json` את ה-hook שחוסם גישה ל-`.env` ולמפתחות בכל הפרויקטים, ואת הצליל כש-Claude צריך אותך (אם עוד לא קיים). מגבה את הקובץ לפני שינוי, ואפשר להריץ שוב בלי כפילויות.

## פרויקט חדש

1. ב-GitHub: **Use this template** -> ריפו חדש -> clone.
2. `npm install` (מחבר את ה-git hooks אוטומטית).
3. ב-Claude Code: `/agentic-init`. עונים על השאלות (פרופיל: `static`, `firebase`, `supabase` או `firebase-postgres`).
4. בודקים את השינויים ועושים commit על branch.
5. `/design-brief`.
6. הפיצ'ר הראשון: לפי `WORKFLOW.md`.

## פרויקט במאגר של לקוח

כשהקוד צריך להיות בבעלות הלקוח, הלקוח פותח מאגר **ריק** בארגון שלו ב-GitHub (Private, בלי README, `.gitignore` או רישיון) ונותן לך הרשאת Admin עליו. "Use this template" לא עובד שם, כי אין לך הרשאה ליצור מאגרים בארגון של הלקוח. לכן מעתיקים את התבנית עם היסטוריה חדשה:

```bash
git clone --depth 1 https://github.com/amirtat/agentic-template.git <project>
cd <project>
rm -rf .git
git init -b main
git add .
git commit -m "Initial commit from agentic template"
git remote add origin https://github.com/<client-org>/<repo>.git
git push -u origin main
```

- התוצאה זהה ל-"Use this template": commit אחד, בלי ההיסטוריה של התבנית ובלי קישור אליה. התבנית נשארת פרטית.
- ה-push הזה הוא היחיד שהולך ישר ל-`main`, כי המאגר ריק. משם עובדים על branches כרגיל.
- ממשיכים מצעד 2 של "פרויקט חדש".
- בהסכם עם הלקוח כדאי לכתוב שכלי הפיתוח והתבניות (`.claude/`, `.githooks/`, `scripts/`) נשארים בבעלותך, וללקוח ניתן רישיון שימוש בהם במסגרת הפרויקט.

## פרויקט קיים

מעתיקים את התיקיות `.claude/`, `.githooks/`, `scripts/`, `feature-index/`, `specs/` ואת `CLAUDE.md` (רק אם אין), על branch נפרד. אחר כך `/agentic-init`, ואז `/bootstrap-docs`.

## כללים קבועים בכל פרויקט

- מובייל מלא: כל מסך עובד ב-375px, ו-E2E רץ גם על מובייל.
- עברית ו-RTL כברירת מחדל, CSS לוגי בלבד, כל הטקסטים בקובץ אחד.
- בלי em dash בטקסטים של האפליקציה. נאכף ב-hook, ב-pre-commit וב-CI.
- אין deploy ואין push בלי אישור מפורש. CI ירוק קודם.
- אין סודות בקוד. `.env` חסום לקריאה ע"י Claude.

## שיפור התבנית

כל שיפור ל-skill, agent או hook שהוכח בפרויקט חוזר לכאן ב-PR.
