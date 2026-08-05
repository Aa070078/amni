# packages/ui — Amni design system

shadcn/ui components + design tokens (colors, typography, spacing, radius, shadows, dark mode), shared TanStack data-table core, command palette, drawer/sheet forms, and empty/loading/error states. Source-first: consumed by apps via `transpilePackages`, never built to dist.

**Rules:** all product UI uses this package; no duplicate implementations in pages; tokens extend only here. See `AGENTS.md §5`.

## Tokens

`tokens.css` defines oklch tokens for `:root` (light) and `.dark`. Apps map them into Tailwind via `@theme inline` (see `apps/web/app/globals.css`): color surfaces, semantic roles (primary/secondary/muted/accent/destructive/success/warning), radius scale, and sidebar roles.

## Components

Primitives: `Button`, `Badge`, `Card`, `Input`, `Label`, `Separator`, `Skeleton`, `Avatar`, `Dialog`, `Sheet` (drawer), `Popover`, `Select`, `DropdownMenu`, `Tabs`, `Tooltip`, `Switch`, `Checkbox`, `ScrollArea`, `Progress`, `Command` (+ `CommandDialog` palette).

Data table core (`DataTable` + helpers): TanStack-backed sorting (visible indicator), global search + faceted column filters, user-controlled column visibility, density toggle (compact/comfortable/spacious) persisted to `localStorage`, row selection + floating bulk-action bar, sticky header, row-mirroring skeleton while loading, and **distinct empty ("no data yet, how to add") vs no-results ("clear your filter")** states. Helper exports: `DataTableColumnHeader`, `DataTableFacetedFilter`, `DataTablePagination`, `DataTableViewOptions`.

## Consuming

Import from `@amni/ui`. Data-heavy pages must use `DataTable` (see `AGENTS.md §5`); drawer-based create/edit forms use `Sheet` + `Dialog` with wired validation and `aria-describedby` errors.

## Storybook

Not configured yet — `pnpm storybook` is a stub pending the Storybook milestone.
