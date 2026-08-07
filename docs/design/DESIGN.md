# Amni — Design System Reference

**Status:** Living (updated with every UI milestone) · **Owner:** Design (reviewed via `packages/ui` + PR)

This is the source of truth for how Amni looks, feels, and moves. Agents building UI read this **before** touching any page. It complements `docs/design/UX_RESEARCH.md` (the research digest this direction was synthesized from) and `PRODUCT_SPEC.md` §6 (page inventory + page contract).

---

## 1. Design direction

**"Trust through clarity"** (Stripe-school): near-white surfaces, hairline borders, one deep-indigo accent, numbers lead, color reserved for status. Premium = whitespace + typography hierarchy + restrained motion, not decoration.

- Light default, true dark mode (token-driven, `.dark` class).
- Linear-inspired where it pays off: keyboard-first, information density on demand (hover reveal), sub-100ms perceived interactions, optimistic UI.
- Motion is purposeful and never gratuitous: stagger entrances, count-ups, subtle hover lift, chart path drawing. All reduced-motion aware.

## 2. Design tokens (canonical)

Defined once in `packages/ui/src/tokens.css` as CSS variables (oklch). Consumed in `apps/web/app/globals.css` via `@theme inline` mapping → Tailwind utilities (`bg-background`, `text-foreground`, `text-primary`, …). **Never invent values in a page. Extend tokens only through `packages/ui`.**

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `oklch(0.99 0.002 255)` | `oklch(0.15 0.012 265)` | app bg |
| `--foreground` | `oklch(0.21 0.02 260)` | `oklch(0.95 0.004 265)` | primary text |
| `--card` | `oklch(1 0 0)` | `oklch(0.18 0.012 265)` | card/surface |
| `--primary` | `oklch(0.45 0.16 277)` | `oklch(0.62 0.14 277)` | accent / CTA / active |
| `--secondary` | `oklch(0.96 0.004 265)` | `oklch(0.24 0.015 265)` | soft fills |
| `--muted` / `--muted-foreground` | `0.96` / `0.52` | `0.24` / `0.66` | secondary text, hints |
| `--accent` | `oklch(0.95 0.01 265)` | `oklch(0.26 0.015 265)` | hover states |
| `--destructive` | `oklch(0.55 0.19 22)` | `oklch(0.62 0.19 22)` | errors, dangerous |
| `--success` | `oklch(0.55 0.14 158)` | `oklch(0.6 0.14 158)` | positive / live |
| `--warning` | `oklch(0.72 0.15 70)` | `oklch(0.72 0.15 70)` | caution |
| `--border` | `oklch(0.91 0.005 260)` | `oklch(0.28 0.015 265)` | hairlines |
| `--ring` | `oklch(0.55 0.16 277)` | `oklch(0.62 0.14 277)` | focus rings |
| `--radius` | `0.5rem` | — | base radius (`rounded-lg`) |

Semantic Tailwind colors resolve through the `@theme inline` block in `globals.css`; `--radius-sm/md/lg/xl` derive from `--radius`.

## 3. Typography

- Font: **Inter** via `next/font` (`--font-inter` → `--font-sans`), with `font-feature-settings: "cv11", "ss01"` and antialiasing applied on `body`.
- Scale: use Tailwind's `text-xs … text-6xl` utilities; keep **headings tight** (`tracking-tight`, bold) and **numbers tabular** where they must align (`tabular-nums`).
- Hierarchy by weight/size, not color: primary number largest+heaviest, supporting figures medium, labels muted.

## 4. Components

All UI lives in **`packages/ui`** (shadcn/ui base, `cva` variants, `cn()` from `packages/ui/src/lib/cn.ts`). Exported from `packages/ui/src/index.ts`. **Do not hand-roll equivalents in pages.** Available today:

Button · Badge · Card (Header/Title/Description/Content/Footer) · Input · Label · Separator · Skeleton · Dialog · Sheet · Select · Popover · DropdownMenu (full) · Tabs · Tooltip · Table (primitive) · Switch · Checkbox · ScrollArea · Progress · Command (command palette primitives) · Avatar · **DataTable** (full-featured core: column header sort, faceted filter, pagination, view options, density, selection, empty states).

### Dashboard/domain components (built for the M1 dashboard — reuse patterns, move to `packages/ui` when a second consumer appears)

These live in `apps/web/src/components/dashboard/` and encode the design language:

| Component | Purpose |
|---|---|
| `hero-3d.tsx` | Lazy R3F canvas: floating wireframe/solid shapes (indigo `#6b63f1`/`#a5a3f8`), gentle rotation, `frameloop={reducedMotion ? "never" : "always"}`, `dpr [1,1.5]`. |
| `dashboard-hero.tsx` | Greeting + company + subtitle card over radial indigo gradient, "Live" pulse pill (success). Supersedes `dashboard-header`. |
| `kpi-card.tsx` | Count-up (framer-motion `animate()`, 1.1s easeOut, `useInView` once), delta badge, per-KPI sparkline, hover lift + shadow. |
| `sparkline.tsx` | 100×32 SVG, motion pathLength draw, up→primary / down→destructive. |
| `area-chart.tsx` | Responsive SVG area chart: gridlines, y ticks, x labels (skipped), hover crosshair + dot + tooltip (flips at edges), sr-only table. |
| `ar-aging.tsx` | Horizontal bar list; oldest buckets warning/destructive. |
| `chart-cards.tsx` | Composites revenue area (2-col), cash headline+chart, AR aging. |
| `alerts-panel.tsx` / `activity-panel.tsx` | Stagger-in list cards. |

Chart math lives in `apps/web/src/lib/chart.ts` (`niceDomain`, `buildPoints`, `gridTicks`, `linePath`, `smoothPath`, `areaPath`, `formatCompact`).

### Charts: SVG-first, no heavy chart lib

Current dashboard charts are **hand-rolled SVG** (sparklines, area chart, aging bars). Rationale: full control over hover/tooltip + reduced-motion + zero bundle weight. `Recharts` was evaluated in research (21st default); revisit only when a page needs dense interactive charting that SVG primitives can't cheaply cover — and propose it before adding the dependency (AGENTS.md §4).

## 5. Motion rules

- Library: **framer-motion** (already a dep). React Three Fiber + three for 3D (dep).
- **Entrances**: stagger on view (variants with `viewport={{ once: true }}`); KPI count-ups on first in-view.
- **Hover**: cards lift `-translate-y-1` + shadow; buttons use component variants.
- **Draw**: chart paths animate `pathLength` 0→1 on mount/in-view.
- **Reduced motion**: every animation must respect `useReducedMotion()`; the R3F canvas runs `frameloop="never"` when set. Never animate anything structurally important.
- **Perceived perf**: keep transforms/layout-animations on GPU-friendly props; avoid animating `height`/`width`/`top`/`left`.

## 6. Layout

- Page shell: `app/(app)/layout.tsx` (sidebar/topbar live there). Pages compose sections in responsive columns (`grid` + `lg:col-span-*`).
- Cards = `rounded-lg border bg-card shadow-sm` (from `packages/ui` `Card`).
- Dashboards follow Role→Metric→Density→Action: KPIs top, trends middle, detail tables bottom.

## 7. Page contract (DoD — non-negotiable)

Every page must implement: **loading** (skeleton mirroring layout) · **empty** (explain + CTA, distinct from no-results) · **error** (inline, actionable) · **validation** · **success** feedback · **permissions** (server-enforced; UI reflects role) · **responsive** · **accessibility** (labels, focus-visible, keyboard, reduced motion, sr-only equivalents for visual-only charts) · **API wiring** (typed client, shared contract) · **edge cases**. A visual-only page is NOT done.

## 8. Accessibility baseline

- Labels on all inputs; `aria-describedby` error wiring; no placeholder-only labels.
- `:focus-visible` rings using `--ring` (never global `outline: none`).
- Charts ship an accessible alternative: sr-only data table/list (see `area-chart.tsx`/`ar-aging.tsx`).
- Status never by color alone (delta badges carry text/icon).
- Keyboard operability for all interactive components.
- Dark mode is baseline; test both. Contrast ratios: 4.5:1 text, 3:1 large/focus (WCAG 2.2 AA — see UX_RESEARCH.md §5).

## 9. Dark mode

- `.dark` class on `<html>`; all colors via tokens. No hard-coded colors in pages (exception: the 3D shapes' aesthetic indigo in `hero-3d.tsx`, which is identical in both modes by design).
- Test every page in both modes before done.

## 10. Current state & what to build next

See `docs/coordination/WORKBOARD.md` for the milestone/task board and `README.md` for milestone status. M1 ships: auth + app shell + **dashboard** (this design language, fully implemented). M2 = the rest of the premium ERP reference UI (customers, products, orders, invoices, finance, settings, wizard) following this document.
