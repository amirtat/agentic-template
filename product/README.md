# Product

The owner's folder: what the product should be. Agents read it on every feature and never edit it.
`docs/` is the opposite: how the code works today, kept current by the post-commit hook.

- [design-brief.md](design-brief.md): UI direction. Written with `/design-brief`, then edited by hand.
- `spec.md` (optional): the approved product spec, when there is one. Mark paid add-ons or out-of-scope items clearly (for example `[add-on, out of scope]`) so agents do not build them.
- `roadmap.md` (optional): the feature list in build order, one row per SDLC cycle, with dependencies.

Rules:
- Only the owner changes these files, or a skill the owner runs for that purpose (`/design-brief`).
- Feature specs in `specs/features/` are authoritative for implementation. When one disagrees with a file here, stop and ask.
- No personal data, no secrets.
