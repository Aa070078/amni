---
name: amni-dashboard-design
description: Dashboard design guidance for this repo — KPI layout, grids, widgets, real-time updates, and accessibility. Use when adding or modifying dashboard pages or KPI widgets in apps/web or converting data models into visual summaries. Distinct from the generic global dashboard-design skill.
---

# Dashboard Design (repo skill)

Purpose: quick guidance for AI agents and engineers building dashboard surfaces in this repo. Links to the canonical design reference in `docs/design/DESIGN.md`.

When to use
- When adding or modifying dashboard pages or KPI widgets in `apps/web`.
- When converting data models into visual summaries for the UI.

Do
- Prioritize top KPIs and surface status at a glance.
- Follow the `packages/ui` card and data-table primitives.
- Implement skeleton loading, empty states, and accessible alternatives for charts (sr-only table).
- Respect reduced-motion and dark-mode tokens from `packages/ui`.

Don't
- Hand-roll new chart libraries without justification — prefer existing SVG-first patterns in the repo.
- Encode business logic in the frontend; always use typed API clients from `packages/shared`.

Quick code pointers
- Pages: `apps/web/app/(app)/dashboard`.
- Components: `packages/ui` exports (Card, DataTable) and `apps/web/src/components/dashboard` for domain widgets.
- Charts: prefer small SVG components with tooltip + sr-only table.

See also: [docs/design/DESIGN.md](../design/DESIGN.md) and `AGENTS.md` for multi-agent coordination.
