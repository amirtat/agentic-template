---
name: design-brief
description: Interviews the owner about audience, brand, feel and reference sites, then writes product/design-brief.md and a design tokens file. Mobile-first, works in left-to-right and right-to-left, follows the project's copy rules. Use once when a project starts, or when the owner wants to change the visual direction. Does not change application code beyond the tokens file.
disable-model-invocation: true
---

# Design brief

`product/design-brief.md` is the project's visual direction. `/product`, `/architect` and `/dev` read it on every feature so the UI stays consistent. The owner owns it; the post-commit hook never edits it.

## Steps

1. **Read** `CLAUDE.md`, the existing `product/design-brief.md`, and any existing tokens or styles file. If the brief already has real content, ask whether this is a revision or a fresh start.
2. **Interview.** Ask these in one message, with a suggested answer for each so the owner can reply "ok":
   1. Who uses the product, on which devices, and in what situation (at a desk, on the phone between meetings, in the field)?
   2. Brand: logo, colors and fonts that already exist, or none yet.
   3. Three words for the feel (for example: calm, official, warm).
   4. Two or three sites or apps the owner likes the look of, and what they like in each.
   5. Anything to avoid.
   6. Density: data-heavy screens, or spacious and simple?
3. **Write `product/design-brief.md`** with the sections already in the template: Audience and feel, Principles (3 to 5 that settle arguments), Layout, Components, Copy tone, States, Tokens. Keep it under 120 lines.
   - Layout always includes: designed at 375px first, then widened; the language direction from `CLAUDE.md`, with logical CSS properties; touch targets of at least 44px; a clearly visible focus style; nothing that relies on color alone.
   - Copy tone always includes: the primary language, one consistent form of address, and the copy rules from `CLAUDE.md` (if any).
   - States: what loading, empty, error and success look like and say.
4. **Write the tokens file** at the path `CLAUDE.md` names for styling tokens (create it there if missing): colors with names by role (`--color-surface`, `--color-text`, `--color-primary`, `--color-danger` ...), font families, a type scale, spacing scale, radii, shadows. Include `--color-focus` for the focus ring. Check that text colors meet WCAG AA contrast (4.5:1, or 3:1 for large text) on their surfaces, and that the focus ring and input borders reach 3:1 against their background. Say which pairs you checked.
5. **Report** both paths and the principles in one short list, and ask the owner to review and edit the brief by hand.

## Taste

Aim for a distinctive, intentional look, not a generic template. As inspiration, follow the approach of Anthropic's open `frontend-design` skill (https://github.com/anthropics/skills/tree/main/skills/frontend-design): commit to a clear aesthetic direction, choose type deliberately, use a restrained palette with one strong accent, and avoid default-looking layouts. Choose fonts that fully support the primary language's script; check the weights you need exist in it. For example, for Hebrew: Heebo, Assistant, Rubik, Noto Sans Hebrew, Frank Ruhl Libre (editorial); for Arabic: Noto Sans Arabic, IBM Plex Sans Arabic, Cairo.

## Do not

- Copy color or size values into the brief. Point to the tokens file.
- Change components or pages. This skill writes the brief and the tokens file only.
- Commit.
