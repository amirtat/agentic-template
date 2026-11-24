---
name: bootstrap-docs
description: One-time generation of docs/architecture.md, docs/flows/*.md, docs/README.md and feature-index/index.yaml for a project that already has code but no docs. Uses parallel explore subagents, one per flow. Use when adopting this kit on an existing project, before the post-commit hook can maintain the docs. Does not edit code or commit.
disable-model-invocation: true
---

# Bootstrap docs

The post-commit hook maintains docs; it does not create them from nothing. Run this once per existing project.

## Steps

1. **Read** `CLAUDE.md` and the repo layout. If `docs/architecture.md` already has real content, stop and ask whether to overwrite.
2. **List the major user flows** (6 to 10) from the routes, pages and server entry points. Show the list to the user and wait for confirmation or edits.
   <!-- Why: the flow list shapes every later doc. A wrong list here means wrong docs everywhere. -->
3. **Explore in parallel.** Start one explore subagent per confirmed flow. Each returns: the user-visible steps, the files involved (with paths), the server calls, the collections or tables touched, the roles allowed, and anything it could not verify.
4. **Write** from their findings:
   - `docs/flows/<flow>.md`, one per flow (kebab-case names), with sections: summary line, Roles, User-visible steps, Files, Server calls, Data, Limitations.
   - `docs/architecture.md`: repo layout, stack, data model, auth and roles, layering, client structure, project rules, known limitations. Link to flow docs instead of repeating them.
   - `feature-index/index.yaml`: one entry per feature (`id`, `name`, `what`, `files`, `data`, `docs`).
   - `docs/README.md` last: an index only, one line per doc.
5. **Report** the files written and every item marked "(unverified)".

## Rules

- Base everything on the code, not on assumptions. Cite file paths.
- If you cannot verify a behavior by reading the code, mark it "(unverified)".
- Keep each doc lean: aim for under 150 lines, bullets over paragraphs, link to code instead of pasting it.
- Document known limitations as limitations, not as bugs to fix.
- Never put real personal data in docs.
- Do not touch `product/` (the owner's folder; the brief comes from `/design-brief`).
- Do not modify any file outside `docs/` and `feature-index/`. Do not commit.
