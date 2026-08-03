# Amni — Product Specification

**Status:** Approved (working) · **Owner:** Product + Engineering

This is the product source of truth. It is read by product, design, engineering, and AI agents. When in doubt, this document wins over implementation.

---

## 1. Product vision

**Amni** is a modern SaaS platform that lets any business create a complete ERP for its company with minimal technical knowledge.

> "I signed up, answered a few simple questions, and my company's ERP was created for me."

The user must never need to understand ERPNext, Frappe, servers, databases, modules, or technical ERP concepts. ERPNext/Frappe operates as the business-management engine *underneath* the product. Amni is the actual user-facing SaaS platform.

### Working name
- Product: **Amni**
- Platform app: `app.<domain>` (Amni web app + API)
- Tenant ERP desk: `<tenant>.<domain>`

---

## 2. Target users & personas

| Persona | Description | Primary needs |
|---|---|---|
| **Owner / Founder** | Non-technical business owner, no ERP background | Get set up in minutes; see the money picture (sales, cash, profit); delegate daily ops; never touch configuration |
| **Office Manager / Operator** | Handles customers, invoices, purchases daily | Fast record creation, reliable lists, no data loss, clear statuses, few clicks |
| **Salesperson** | Creates leads, opportunities, quotations, orders | Quick entry, pipeline visibility, follow-ups, minimal training |
| **Accountant** | Reviews/manages invoicing, payments, expenses, closing | Correct numbers, auditability, export, period workflows |
| **Team Admin** | Invites team, assigns roles, imports existing data | Self-serve team management, guided data import |

### Working assumptions
- MVP tenant size: 1–50 users, 1 company per tenant.
- Multi-user with roles (platform + ERPNext roles aligned by the platform).
- MVP is single-currency per company; multi-currency is future scope.

---

## 3. Core user journey

```
Landing → Sign Up → Verify → Create Company → Setup Wizard → Provision ERP → ERP Ready → Dashboard
  → Create Customer → Create Product → Create Sales Order → Create Invoice → Record Payment → View Dashboard
```

This journey must work end-to-end and is the acceptance proof of the platform (see `TESTING.md`).

### Primary journey principles
- **Value first**: signup is one step (email + password). Verification is deferred enough to not block first value, required before provisioning.
- **Smart defaults everywhere**: country/industry/currency/timezone pre-fill the wizard; the user confirms rather than configures.
- **The wizard is "set up my company", never "choose modules."** All core ERP capability exists by default in every tenant.
- **No dead-ends**: wizard completion lands inside the dashboard with a setup checklist, not a confirmation screen.
- **Progressive exposure**: features surface by context/role/workflow; they are never removed.

---

## 4. Onboarding: the Setup Wizard

A premium, finite, resumable wizard. Every step auto-saves a draft; the user can leave and return. Progress is visible.

| Step | Fields | Smart defaults |
|---|---|---|
| **1. Company** | Company name, legal name (optional), logo, country, industry, address, contact email/phone | Industry → recommended plan of defaults |
| **2. Regional** | Currency, timezone, date format, number format | Country → currency/timezone/format |
| **3. Business** | Business type (product/service/retail/manufacturing), tax ID (optional), fiscal year start, default warehouse name, basic operational settings (inventory vs service-only) | Business type → module emphasis (visibility, not removal) |
| **4. Team** | Invite employees by email, assign roles (Owner, Admin, Sales, Purchasing, Inventory, Accounts, Employee) | Owner becomes first Admin; role pickers are human-labeled |
| **5. Data import (optional)** | Upload CSV/XLSX for Customers, Suppliers, Products, Employees, opening balances | Templates downloadable; see §5 import UX |
| **6. Completion** | Review summary; "Provision my ERP" | — |

While the ERP is provisioning: show live progress (state machine) with a clear checklist and the ability to continue exploring the shell. On READY: guided tour to first record.

---

## 5. Data import UX (setup + in-app)

Uniform 6-stage flow (used for setup data and later in-app imports):

1. **Pre-import** — choose target (Customers/Suppliers/Products/Employees/Opening balances), download template, see required columns explained in business terms.
2. **Upload** — drag-and-drop, file validation (CSV/XLSX, size, delimiter/encoding detection).
3. **Mapping** — auto-match headers by fuzzy match + type inference from samples; manual override; mark required vs optional; preview first 20–50 rows.
4. **Validate** — row/cell-level soft (warning) and hard (blocking) validation; "show only errors" toggle; inline fixes.
5. **Import** — live progress; statuses created/updated/skipped/failed; transactional per batch.
6. **Summary** — results, failed-rows download, audit record (who/when/mapping used); undo/rollback window.

Users never see database schemas; they see business column names.

---

## 6. Main application areas (MVP)

### 6.1 App shell
- Sidebar navigation (Sales, Inventory, Purchasing, Finance, People, Reports, Settings) + tenant switcher.
- Top bar: global search (Cmd/Ctrl-K command palette), notifications, user menu, primary create.
- Responsive: desktop/laptop full layout; tablet collapses sidebar; mobile uses slide-over drawer + bottom nav for core sections.
- Every module follows the page contract (below).

### 6.2 Modules & page inventory

| Area | Pages | Key responsibilities |
|---|---|---|
| **Dashboard** | Dashboard | Role-metric-density-action KPIs; recent activity; alerts (overdue invoices, low stock); quick actions; per-panel error handling |
| **Sales / CRM** | Customers, Customer detail, Leads, Opportunities, Quotations, Sales Orders, Sales Invoices, Payments | Create/view records; pipeline; status workflows; credit notes (future); record payments against invoices |
| **Inventory** | Products, Product detail, Warehouses, Inventory, Stock Movements | Product master + variants (future); stock levels per warehouse; movement history; low-stock alerts |
| **Purchasing** | Suppliers, Purchase Orders, Purchase Invoices | Supplier master; purchase cycles; receiving + billing |
| **Finance** | Financial Overview, Expenses, Payments, Basic Accounting, Reports | Overview KPIs (revenue, AR, AP, cash); expense entry; payment recording; simple reports (sales register, aging) |
| **People (future)** | Employees, HR settings | M0 future module |
| **Settings** | Company, Team & roles, Plan & billing, Integrations, Profile | Self-serve administration |
| **Onboarding** | Landing, Sign Up, Login, Verify email, Forgot/Reset password, Setup Wizard | Auth + onboarding |

### 6.3 Page contract (Definition of Done per page)
Every page must handle: **loading** (skeleton mirroring layout) · **empty** (explain + primary CTA; distinct from no-results) · **error** (inline, actionable, per-panel) · **validation** · **success** feedback · **permissions** (server-enforced; UI reflects role) · **responsive** · **accessibility** (labels, focus, keyboard, reduced motion) · **API integration** (typed client) · **edge cases** (long names, empty strings, deleted records).

A page with only a visual layout is NOT done.

---

## 7. Terminology (product language)

| Product term | Meaning (never show ERPNext jargon) |
|---|---|
| Company | The tenant's business entity in the platform |
| Team / Users | People who sign in to the tenant |
| Customer / Supplier | Business parties in sales/purchasing |
| Product | What the business sells (ERPNext Item) |
| Stock | Inventory available per warehouse |
| Sales Order | Customer commitment; feeds invoicing/stock |
| Invoice | Billing document (ERPNext Sales Invoice) |
| Payment | Money received/paid (ERPNext Payment Entry) |
| Warehouse | Stock location |
| Finance | Money picture (AR, AP, cash, expenses) |

---

## 8. Permissions (product level)

Platform roles (owner of company → platform Admin per tenant; Team Admin; and role bundles mapped to ERPNext business roles):

| Platform role | Capabilities |
|---|---|
| **Owner / Admin** | Full tenant management; provisioning status; billing; team; settings; everything |
| **Sales** | Customers, leads, opportunities, quotations, orders, invoices (create), payments (create) |
| **Purchasing** | Suppliers, purchase orders, purchase invoices |
| **Inventory** | Products, warehouses, stock, movements |
| **Accounts** | Invoices, payments, expenses, reports, finance |
| **Employee** | Read-only access to assigned areas (configurable) |

Role enforcement is **server-side** (platform API + ERPNext roles). The frontend only reflects it.

---

## 9. MVP scope vs future

**In MVP:** authentication (signup/login/verify/recovery), onboarding wizard, provisioning, app shell, dashboard, sales/CRM (customers→payments), inventory (products, warehouses, stock, movements), purchasing (suppliers, POs, PI), finance (overview, expenses, payments, basic accounting, reports), notifications, global search, profile, settings, data import.

**Architected for future:** HR/payroll, manufacturing, projects, POS, assets, advanced CRM, advanced reporting, automation, AI features, mobile apps, external integrations, multi-currency, custom domains, SSO, dedicated/premium deployments.

---

## 10. Success metrics (activation checkpoints)

1. Completed setup wizard → 2. First record created → 3. First sales order → 4. First invoice posted → 5. First payment recorded → 6. Dashboard reflects the business. Each checkpoint is instrumented (analytics event + audit log).
