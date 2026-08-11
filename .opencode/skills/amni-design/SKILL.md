---
name: amni-design
description: High-level design guidance for this repo — brand, UI tokens, slides, banners, and brand-aligned visuals. Use when asked to change or propose UI tokens, color palettes, or produce mockups/slides/banners connected to product pages. Distinct from the global design skill (which has heavier creative-generation scripts).
---

# Design (repo skill)

Purpose: concise guidance for AI agents referencing the repository's design system and external creative skills. This skill points to the canonical design doc and the richer global `design` skill when heavy creative work is needed.

When to use
- When asked to change or propose UI tokens, color palettes, or brand-aligned visuals.
- When producing mockups, slides, or banners connected to product pages.

Highlights
- Follow `docs/design/DESIGN.md` for tokens, motion rules, and page contract.
- For heavy creative generation (logos, CIP, banners), prefer the external `design` skill under `~/.config/opencode/skills/design` (contains generation scripts and references).

Do
- Link to `packages/ui` tokens and prefer semantic token changes via `packages/ui`.
- Keep UI changes additive and cross-check with `packages/shared` types for surface contracts.

Don't
- Replace the design tokens in pages; modify via `packages/ui` only.

References
- Canonical: [docs/design/DESIGN.md](../design/DESIGN.md)
- External authoring tools: global `design` skill (logo, CIP, banners)
