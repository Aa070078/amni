---
name: design
summary: High-level design skill for brand, tokens, CIP, slides, banner and social images. Links to `docs/design/DESIGN.md` and external asset skills.
---

# Design (repo skill)

Purpose: concise guidance for AI agents referencing the repository's design system and external creative skills. This skill points to the canonical design doc and the richer `F:\.opencode\skills\design` skill when heavy creative work is needed.

When to use
- When asked to change or propose UI tokens, color palettes, or brand-aligned visuals.
- When producing mockups, slides, or banners connected to product pages.

Highlights
- Follow `docs/design/DESIGN.md` for tokens, motion rules, and page contract.
- For heavy creative generation (logos, CIP, banners), prefer the external `design` skill under `F:\.opencode\skills` (contains generation scripts and references).

Do
- Link to `packages/ui` tokens and prefer semantic token changes via `packages/ui`.
- Keep UI changes additive and cross-check with `packages/shared` types for surface contracts.

Don't
- Replace the design tokens in pages; modify via `packages/ui` only.

References
- Canonical: [docs/design/DESIGN.md](../design/DESIGN.md)
- External authoring tools: `F:\.opencode\skills\design` (logo, CIP, banners)
