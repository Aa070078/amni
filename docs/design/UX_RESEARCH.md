# UX Research Digest — Amni

Research conducted during Phase 0 (2026-08). Sources are cited inline. Design direction synthesized at the end. Related: `PRODUCT_SPEC.md`, `ARCHITECTURE.md`, and the design-system plan in `packages/ui`.

---

## 1. Onboarding / setup-wizard UX

- Every additional step raises cognitive load and reduces activation — keep forms minimal, use progressive disclosure, one primary CTA per screen. (codetheorem.co/blogs/saas-onboarding-ux/)
- Activation velocity, not polish, is the metric. Value-first onboarding wins (Canva: signup in one step, drop inside product; Duolingo: real lesson within minutes). Long mandatory setup = early drop-off. (wearetenet.com/blog/saas-onboarding-ux-best-practices/)
- Role-based onboarding: collect 2–3 questions (role, company size, industry) and tailor checklists/templates. (wearetenet.com)
- **Smart defaults are the single biggest friction-killer**: pre-filling settings from the industry picked at signup turns a ten-field form into two. (mvp-development.io/blog/saas-user-onboarding-best-practices/)
- Show progress so the flow is visibly finite; order checklist steps **by value to the user, not convenience to the product** (Airtable); end inside a useful screen, never a dead-end confirmation; externalize progress so users can leave and return. (saasui.design/blog/saas-onboarding-ux-examples/)
- Validate in real time; explain errors inline, never generic. Small errors with no recovery are the top drop-off cause in setup flows. (wearetenet.com)
- Tie steps to activation checkpoints (completed setup, first record, first report). (wearetenet.com; codetheorem.co)
- Progress indicator anatomy: task label, track, current value, detail, completion state; announce changes; never rely on color alone; test at 200% zoom + reduced motion. (uxpatterns.dev/patterns/user-feedback/progress-indicator)

## 2. Data-heavy / ERP table UX

- NN/g: tables support four tasks — find records matching criteria, compare data, view/edit/add a single row, take actions. Design for all four explicitly. (nngroup.com/articles/data-tables/)
- Left-align text; **right-align numbers with consistent formatting (`tabular-nums`)** so figures line up; default sort = most recent / most-needs-action first. (pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables/)
- Actions on hover; multi-select appears on hover; bulk actions only when rows selected. (pencilandpaper.io)
- Bulk-action patterns: actions dropdown on selection; top toolbar (Gmail/YouTube Studio); floating bottom toolbar (Jira/ClickUp); key icons + overflow (Gmail/Notion). Always confirm destructive bulk actions and show affected count. (uxdworld.com/best-practices-for-providing-actions-in-data-tables/)
- A table users work in all day = table + filter/sort layer + bulk-action bar designed together. Add: sticky header + sticky identifying column, visible sort indicator, select-all wired to bulk bar, inline row actions (destructive separated), "showing X of Y", skeleton mirroring row layout, **distinct empty ("no data yet, how to add") vs no-results ("clear your filter")** states, user-controlled columns + density toggle remembered between sessions. (saasui.design/blog/saas-data-table-ux-patterns/)
- Mistakes to avoid: every field a column; no sticky header; sorting without active-column indication; spinner over blank table instead of skeleton; treating no-results as empty; row actions behind opening each record; silent deletion without confirm/undo. (saasui.design)
- Command palettes are the power-user pattern (Linear, VS Code, Raycast): Cmd/Ctrl-K fuzzy search over pages + actions; show shortcuts inside the palette so it teaches them; complements visible nav, never replaces it. (mobbin.com/glossary/command-palette; dennypratama.com/blog/navigation-patterns-sidebar-tabs-command-palette)

## 3. Dashboard design (business/finance)

- **Stripe = reference for premium financial UX** ("trust through clarity"): (1) information density control — show what's needed to act; (2) hierarchy via typography + whitespace, not color — primary number largest/heaviest, supporting figures medium, labels light; (3) color reserved for status signals; (4) microcopy answers "what happened / what do I do next"; (5) navigation maps to jobs-to-be-done, not the data model; (6) empty/loading states designed with the same care as populated states. (925studios.co/blog/stripe-dashboard-design-breakdown)
- Role–Metric–Density–Action framework: define who's looking, lead with the one number answering their first question, calibrate density to role (high for finance — Ramp/Brex; minimal for founders — Mercury), attach a clear next action. (themasterly.com/blog/fintech-dashboard-design-guide)
- Structure: most important numbers top (revenue, profit, cash flow), trends middle (line charts), detail tables bottom. Too many equally-weighted metrics = noise. Bar = comparison, line = trend, table = exact numbers. (reportingwise.com; eleken.co)
- Finance/ERP customers expect reporting inside the product, not export-to-BI. (usedatabrain.com/blog/financial-dashboards)

## 4. Modern SaaS visual design (2024–2026)

- Clean, whitespace-rich; bold typography (48–72px headlines, 1.6–1.8 line-height); dark mode + subtle two-color gradients as sophistication signals; trust signals near conversion points; performance LCP < 2.5s, CLS < 0.1. (shift8web.ca/saas-web-design-trends-in-2026; redesignr.ai)
- Dark mode is baseline expectation for enterprise/productivity SaaS; micro-interactions; design systems with light/dark tokens, reduced-motion options, variable fonts. (archcowebdesign.com/blog/web-design-trends-help-saas-companies)
- **Linear as the modern standard**: keyboard-first but mouse-friendly; optimistic UI (update locally, rollback on failure); information density beats whitespace (reveal detail on hover); sub-100ms perceived interactions; dark-first premium aesthetic. (blakecrosley.com/guides/design/linear)
- Typography: Inter/Poppins/Satoshi/Geist dominate; legibility + contrast before style. (evietek.com; orbix.studio)

## 5. Accessibility (WCAG 2.2) for complex B2B

- WCAG 2.2 (Oct 2023) adds: 3.3.7 Redundant Entry (A), 3.2.6 Consistent Help (A), 2.4.11 Focus Not Obscured (AA), 3.3.8 Accessible Authentication (AA — no cognitive CAPTCHAs, allow paste/password managers/magic links), 2.5.8 Target Size 24px min (AA). (w3.org/TR/WCAG22; ratedwithai.com/blog/wcag-2-2-new-requirements-2026)
- Legal reality: EU Accessibility Act in force 28 Jun 2025 (EN 301 549 / WCAG 2.2 AA for EU-market apps); US DOJ rule codified WCAG 2.1 AA; ~4,000 ADA lawsuits/yr; automated scans catch only 30–40% — manual keyboard + screen-reader passes required. (yusmpgroup.com/blog/web-app-accessibility-wcag-2026; almcorp.com/blog/wcag-2-2-enterprise-web-applications-requirements-2026)
- Checklist: label every input; specific errors + `aria-describedby`/`aria-invalid`; `:focus-visible` ≥2px, 3:1 contrast (never global `outline:none`); modals trap + return focus (ARIA APG dialog); sticky elements must not obscure focus; status via `aria-live`/`role=status`; `role=alert` for errors; no placeholder-only labels. Build a11y into the design system or reproduce failures everywhere. (yusmpgroup.com; almcorp.com)

## 6. Navigation & IA (many sections)

- Sidebar for 5–15 top-level destinations; top bar for <5 or global context (search, account, notifications, tenant switcher, primary create). Mature apps layer both. (saasui.design/blog/saas-navigation-ux-patterns)
- <5 → top nav; 5–15 → sidebar; >15 → reconsider IA. Command palette only for power users, paired with visible nav; avoid "layering by accident". (dennypratama.com/blog/navigation-patterns-sidebar-tabs-command-palette)
- Secondary/contextual nav per module (tabs: Overview/Items/Settings/Activity) keeps primary nav stable — the Stripe pattern. Breadcrumbs for deep records; active sidebar state answers "where am I"; mobile = bottom tab bar (≤5) or slide-over drawer. (saasui.design; onething.design)
- **Label by user intent** (Sales, Inventory, Purchasing, Finance, People, Settings), not internal/system names. (saasui.design)

## 7. Empty states / skeletons / error states

- NN/g empty states: explain why it's empty, make it actionable (primary CTA), keep it contextual. Never conflate empty vs no-results vs error. (nngroup.com/articles/empty-state-interface-design/; subux.pro/guides/article/empty-states)
- NN/g skeletons: skeletons for waits <10s (mirror structure, cut perceived wait); progress bars >10s; spinners only for small/discrete actions. Skeleton must mirror layout + include motion. (nngroup.com/articles/skeleton-screens/; logrocket.com/ux-design/skeleton-loading-screen-design)
- Carbon: an empty state replaces the element (drop table header/footer so SR doesn't read an empty table); consider starter/sample content. (v10.carbondesignsystem.com/patterns/empty-states-pattern/)
- Dashboard panels: each handles its own error (one failed API shouldn't break the page); 10–15s timeout before showing timeout error; blank = broken, generic Error = untrustworthy. (khalilahmed.dev/blog/handle-loading-empty-error-states-dashboards)

## 8. Data import UX (5–6 stage flow)

- Canonical 5-stage flow: Pre-import (requirements + downloadable template) → Upload (drag-drop + progress) → Mapping (auto-match + manual override) → Validation (real-time, inline fixes) → Confirmation (summary before commit). Most products fail by skimping on mapping/validation and dumping errors at the end. (importcsv.com/blog/data-import-ux/)
- Mapping: auto-detect via fuzzy header matching + type inference from samples; header preview right after upload; group required vs optional; save mappings as named templates; preview first 20–50 rows + full-file count; defaults as inline pills. (tapix.dev/blog/csv-column-mapping-ux-patterns; appmaster.io/blog/csv-import-column-mapping-ui)
- Mode + identifier: create / update-by-key / upsert; require a key column with warnings on blanks/duplicates. (appmaster.io)
- Validation: soft (warnings, proceedable) vs hard (blocking); row- and cell-level; original → transformed → status per cell; "show only errors" toggle (ClickUp); fix-in-place / ignore / download-error-rows; never all-or-nothing rejection of a 10k-row file over one bad email. (c-sharpcorner.com; importcsv.com)
- Completion: summary of created/updated/skipped/failed + which mapping + key used + who/when; downloadable failed-rows CSV; transactional import + audit log + undo/rollback window. (appmaster.io; c-sharpcorner.com)

---

## Synthesized design direction (for the design system)

**Visual language — "modern financial platform", not admin template.**
- Light default + true dark mode; near-white `#fcfcfc` surfaces, hairline borders, **one restrained accent** (deep indigo/blue), oklch-based shadcn tokens, radius ~0.5rem, `tabular-nums` on all figures, editorial sans (Inter/Satoshi/Geist), tight 13–14px UI scale, soft shadows only on floating elements. Color reserved for status semantics (paid/overdue/out-of-stock) + one accent. Micro-interactions with full `prefers-reduced-motion` support.

**Component priorities (build order):**
1. App shell — sidebar (5–15 module nav, tenant switcher) + top bar (global Cmd/Ctrl-K, notifications, user menu, primary create).
2. Data-table core (TanStack): sorting/filtering/column-visibility/density/selection + bulk bar/sticky header/skeleton + distinct empty & no-results — powers every ERP list.
3. Drawer-based create/edit forms with wired validation + `aria-describedby` errors.
4. Per-module dashboards using Role–Metric–Density–Action.
5. Onboarding wizard (finite stepper, smart defaults, auto-save draft, resumable).
6. CSV import wizard (6-stage, fuzzy auto-mapping, preview grid, soft/hard validation, error filter, summary + audit).

**Onboarding pattern:** single-step signup (no CC) → 2–3 personalization questions → smart-defaults provisioning wizard (company/regional/business/team/import) → completion drops inside the dashboard with a setup checklist. First record in under 3 minutes. Steps tied to activation checkpoints.

**21st.dev seeds evaluated (stack: shadcn/ui + Tailwind + React + Framer Motion + TanStack + Recharts):**
- Data table: `felipemenezes098/table-20` (verified production-grade TanStack source)
- Finance dashboard: `sshahaider/efferd-dashboard-2`
- Onboarding: `ddoemonn/wizard-steps`
- App shell: `arunjdass/dashboard-sidebar`
- Command palette: `lovesickfromthe6ix/omni-command-palette`
- Loading: `ddoemonn/skeleton-swap`
- Themes: adopt the **token architecture** (e.g., MoonCalendar oklch) but hand-tune the palette — do not use stock themes as-is.
