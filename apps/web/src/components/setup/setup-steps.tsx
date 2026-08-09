"use client";

import * as React from "react";
import { Trash2, UserPlus } from "lucide-react";
import type { WizardDraft } from "@amni/shared";
import { Button, Input, Label, Switch } from "@amni/ui";

const INDUSTRIES = [
  "Furniture & interiors",
  "Construction",
  "Wholesale & distribution",
  "Retail",
  "Manufacturing",
  "Software & technology",
  "Professional services",
  "Food & beverage",
  "Healthcare",
  "Other",
];

const COUNTRIES = [
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "IE", name: "Ireland" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SG", name: "Singapore" },
  { code: "AU", name: "Australia" },
];

const CURRENCIES = [
  { code: "GBP", name: "GBP — Pound sterling" },
  { code: "USD", name: "USD — US dollar" },
  { code: "EUR", name: "EUR — Euro" },
  { code: "AED", name: "AED — UAE dirham" },
  { code: "SGD", name: "SGD — Singapore dollar" },
  { code: "AUD", name: "AUD — Australian dollar" },
];

const TIMEZONES = [
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <select
      id={id}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}

export function CompanyStep({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: (draft: WizardDraft) => void;
}) {
  const set = (key: keyof WizardDraft["company"], value: string) =>
    onChange({ ...draft, company: { ...draft.company, [key]: value } });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Company name">
        <Input value={draft.company.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Legal name">
        <Input value={draft.company.legalName ?? ""} onChange={(e) => set("legalName", e.target.value)} />
      </Field>
      <Field label="Industry">
        <Select value={draft.company.industry} onChange={(value) => set("industry", value)}>
          {INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Country">
        <Select value={draft.company.country} onChange={(value) => set("country", value)}>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Tax ID / VAT" hint="Optional.">
        <Input value={draft.company.taxId ?? ""} onChange={(e) => set("taxId", e.target.value)} />
      </Field>
      <Field label="Registered address" hint="Street, city, region, postcode.">
        <Input value={draft.company.address ?? ""} onChange={(e) => set("address", e.target.value)} />
      </Field>
    </div>
  );
}

export function RegionalStep({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: (draft: WizardDraft) => void;
}) {
  const set = (key: keyof WizardDraft["regional"], value: string) =>
    onChange({ ...draft, regional: { ...draft.regional, [key]: value } });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Base currency">
        <Select value={draft.regional.currency} onChange={(value) => set("currency", value)}>
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Timezone">
        <Select value={draft.regional.timezone} onChange={(value) => set("timezone", value)}>
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Date format">
        <Select value={draft.regional.dateFormat} onChange={(value) => set("dateFormat", value)}>
          <option value="DD-MM-YYYY">DD-MM-YYYY</option>
          <option value="MM-DD-YYYY">MM-DD-YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </Select>
      </Field>
      <Field label="Number format">
        <Select value={draft.regional.numberFormat} onChange={(value) => set("numberFormat", value)}>
          <option value="1,000.00">1,000.00</option>
          <option value="1.000,00">1.000,00</option>
          <option value="1 000,00">1 000,00</option>
          <option value="1 000.00">1 000.00</option>
        </Select>
      </Field>
      <Field label="Country">
        <Select value={draft.regional.country} onChange={(value) => set("country", value)}>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Language">
        <Select value={draft.regional.language} onChange={(value) => set("language", value)}>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
          <option value="nl">Nederlands</option>
        </Select>
      </Field>
    </div>
  );
}

export function BusinessStep({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: (draft: WizardDraft) => void;
}) {
  const business = draft.business;
  const setBusiness = (patch: Partial<WizardDraft["business"]>) =>
    onChange({ ...draft, business: { ...business, ...patch } });

  return (
    <div className="space-y-6">
      <Field label="Default payment terms">
        <Select
          value={business.defaultTermOfPayment ?? "Net 30"}
          onChange={(value) => setBusiness({ defaultTermOfPayment: value })}
        >
          <option value="On receipt">On receipt</option>
          <option value="Net 15">Net 15</option>
          <option value="Net 30">Net 30</option>
          <option value="Net 60">Net 60</option>
          <option value="Net 90">Net 90</option>
        </Select>
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-md border p-4">
          <div>
            <p className="font-medium">Track inventory</p>
            <p className="text-sm text-muted-foreground">
              Manage products, warehouses and stock levels.
            </p>
          </div>
          <Switch
            checked={business.enableInventory}
            onCheckedChange={(checked) => setBusiness({ enableInventory: checked })}
            aria-label="Track inventory"
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border p-4">
          <div>
            <p className="font-medium">Run payroll</p>
            <p className="text-sm text-muted-foreground">
              Process salaries and payroll reports. Turned off until you&apos;re ready.
            </p>
          </div>
          <Switch
            checked={business.enablePayroll}
            onCheckedChange={(checked) => setBusiness({ enablePayroll: checked })}
            aria-label="Run payroll"
          />
        </div>
      </div>
    </div>
  );
}

const TEAM_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "accountant", label: "Accountant" },
  { value: "sales", label: "Sales" },
  { value: "inventory", label: "Inventory" },
  { value: "member", label: "Member" },
];

export function TeamStep({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: (draft: WizardDraft) => void;
}) {
  const team = draft.team;

  const update = (index: number, patch: Partial<WizardDraft["team"][number]>) => {
    const next = team.map((member, i) => (i === index ? { ...member, ...patch } : member));
    onChange({ ...draft, team: next });
  };

  const remove = (index: number) => {
    onChange({ ...draft, team: team.filter((_, i) => i !== index) });
  };

  const add = () => {
    onChange({
      ...draft,
      team: [...team, { email: "", firstName: "", lastName: "", role: "member" }],
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add the people who&apos;ll use Amni. You&apos;re already on the team as the owner.
      </p>
      {team.map((member, index) => (
        <div key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>First name</Label>
            <Input value={member.firstName} onChange={(e) => update(index, { firstName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Last name</Label>
            <Input value={member.lastName ?? ""} onChange={(e) => update(index, { lastName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={member.email}
              onChange={(e) => update(index, { email: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>Role</Label>
              <Select value={member.role} onChange={(value) => update(index, { role: value as typeof member.role })}>
                {TEAM_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove member"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={add} className="w-full">
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Add another member
      </Button>
    </div>
  );
}

const IMPORT_SOURCES = [
  { value: "none", title: "Start fresh", description: "I'll enter everything manually in Amni." },
  { value: "sample", title: "Use sample data", description: "Load realistic demo records so I can explore." },
  { value: "csv", title: "Import from CSV", description: "Bring customers, products and opening balances." },
  { value: "erp", title: "Migrate from another system", description: "Export from your current ERP and map it in." },
];

export function ImportStep({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: (draft: WizardDraft) => void;
}) {
  const source = draft.import.source;
  const set = (patch: Partial<WizardDraft["import"]>) =>
    onChange({ ...draft, import: { ...draft.import, ...patch } });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {IMPORT_SOURCES.map((option) => {
          const active = source === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => set({ source: option.value as WizardDraft["import"]["source"] })}
              className={[
                "rounded-md border p-4 text-left transition-colors",
                active ? "border-primary ring-1 ring-primary" : "hover:border-border",
              ].join(" ")}
            >
              <p className="font-medium">{option.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
            </button>
          );
        })}
      </div>

      {source === "csv" || source === "erp" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="File or export name" hint="We'll guide the import after setup.">
            <Input
              value={draft.import.file ?? ""}
              onChange={(e) => set({ file: e.target.value })}
              placeholder="e.g. customers.csv"
            />
          </Field>
          <Field label="Mapping" hint="How the file maps to Amni.">
            <Input
              value={draft.import.mapping ?? ""}
              onChange={(e) => set({ mapping: e.target.value })}
              placeholder="e.g. Standard chart of accounts"
            />
          </Field>
        </div>
      ) : null}

      {source === "sample" ? (
        <p className="text-sm text-muted-foreground">
          We&apos;ll provision a realistic set of customers, suppliers, products, orders and invoices so
          the workspace feels alive from day one.
        </p>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  );
}

export function ReviewStep({ draft }: { draft: WizardDraft }) {
  const countryName = COUNTRIES.find((c) => c.code === draft.company.country)?.name ?? draft.company.country;
  const currencyName = CURRENCIES.find((c) => c.code === draft.regional.currency)?.code ?? draft.regional.currency;
  const sourceLabel =
    IMPORT_SOURCES.find((s) => s.value === draft.import.source)?.title ?? draft.import.source;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground">Company</h3>
        <div className="mt-1">
          <SummaryRow label="Name" value={draft.company.name} />
          <SummaryRow label="Legal name" value={draft.company.legalName ?? "—"} />
          <SummaryRow label="Industry" value={draft.company.industry} />
          <SummaryRow label="Country" value={countryName} />
          <SummaryRow label="Tax ID" value={draft.company.taxId ?? "—"} />
          <SummaryRow label="Address" value={draft.company.address ?? "—"} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground">Regional</h3>
        <div className="mt-1">
          <SummaryRow label="Currency" value={currencyName} />
          <SummaryRow label="Timezone" value={draft.regional.timezone} />
          <SummaryRow label="Date format" value={draft.regional.dateFormat} />
          <SummaryRow label="Language" value={draft.regional.language} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground">Business</h3>
        <div className="mt-1">
          <SummaryRow label="Payment terms" value={draft.business.defaultTermOfPayment ?? "—"} />
          <SummaryRow label="Inventory" value={draft.business.enableInventory ? "Enabled" : "Disabled"} />
          <SummaryRow label="Payroll" value={draft.business.enablePayroll ? "Enabled" : "Disabled"} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground">Team</h3>
        <div className="mt-1">
          <SummaryRow
            label="Members"
            value={draft.team.map((member) => member.firstName || member.email).join(", ") || "—"}
          />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground">Data</h3>
        <div className="mt-1">
          <SummaryRow label="Source" value={sourceLabel} />
        </div>
      </div>
    </div>
  );
}
