---
name: amni-design-system
description: Repo-specific design system guidance for packages/ui — tokens, motion, and the page contract. Use when adding new UI components or pages in apps/web, or reviewing/extending the design system in packages/ui. Distinct from the generic global design-system skill.
---

# Design System (repo skill)

Purpose: quick rules for agents building UI that must follow the repository's design system and page contract.

When to use
- When adding new UI components or pages in `apps/web`.
- When reviewing or extending the design system in `packages/ui`.

Do
- Use `packages/ui` components first.
- Follow the token set and page contract in `docs/design/DESIGN.md`.
- Respect dark mode, accessibility, and reduced-motion rules.
- Keep interactions consistent with the dashboard layout and data table patterns.

Don't
- Introduce new visual styles without a design-system PR and review.
- Bypass the shared UI primitives for standard behaviors.

Quick pointers
- Design doc: `docs/design/DESIGN.md`
- UI package path: `packages/ui/src`
- Page shell examples: `apps/web/app/(app)/dashboard`
