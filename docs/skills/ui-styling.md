---
name: ui-styling
summary: Practical UI styling guidance for `packages/ui`, shadcn/ui, Tailwind, and accessibility patterns used in this repo.
---

# UI Styling (repo skill)

Purpose: give agents concrete rules for implementing UI using the repo's design system and `packages/ui` primitives.

When to use
- When adding components, pages, or adapting `packages/ui` primitives in `apps/web`.

Do
- Use `packages/ui` components (Card, Button, DataTable, Sheet, Command) rather than duplicate implementations.
- Follow tokens in `packages/ui` (`globals.css`) and `docs/design/DESIGN.md` for colors/spacing.
- Implement page contract: loading/empty/error/validation/success, permissions, responsive, accessibility.
- Keep classnames deterministic for Tailwind purge; prefer extracted components for repeated patterns.

Don't
- Add new top-level tokens in pages; instead propose them in `packages/ui` and open a PR.

Quick pointers
- Component path: `packages/ui/src`.
- Page examples: `apps/web/app/(app)/`.
