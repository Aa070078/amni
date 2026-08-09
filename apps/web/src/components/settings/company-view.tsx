"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import type { UpdateCompanySettingsInput } from "@amni/shared";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Skeleton } from "@amni/ui";
import { settingsClient } from "@/src/lib/settings";

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

export function CompanyView() {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState<Partial<UpdateCompanySettingsInput>>({});
  const [saved, setSaved] = React.useState(false);

  const companyQuery = useQuery({
    queryKey: ["settings", "company"],
    queryFn: () => settingsClient.company(),
  });

  const company = companyQuery.data;

  React.useEffect(() => {
    if (company) setForm((prev) => ({ ...prev, ...company }));
  }, [company]);

  const saveMutation = useMutation({
    mutationFn: (input: UpdateCompanySettingsInput) => settingsClient.updateCompany(input),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings", "company"], data);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    },
  });

  const set = <K extends keyof UpdateCompanySettingsInput>(key: K, value: UpdateCompanySettingsInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (companyQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (companyQuery.isError || !company) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Company settings are unavailable right now.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company profile</CardTitle>
          <CardDescription>Details shown across your invoices, quotes and reports.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name">
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Legal name">
            <Input value={form.legalName ?? ""} onChange={(e) => set("legalName", e.target.value)} />
          </Field>
          <Field label="Industry">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.industry ?? ""}
              onChange={(e) => set("industry", e.target.value)}
            >
              {INDUSTRIES.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Country">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.country ?? ""}
              onChange={(e) => set("country", e.target.value)}
            >
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tax ID / VAT">
            <Input value={form.taxId ?? ""} onChange={(e) => set("taxId", e.target.value)} />
          </Field>
          <Field label="Currency">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.currency ?? "USD"}
              onChange={(e) => set("currency", e.target.value as UpdateCompanySettingsInput["currency"])}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Address" hint="Street, city, region, postcode.">
            <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label="Fiscal year starts">
            <Input
              type="date"
              value={form.fiscalYearStart ?? ""}
              onChange={(e) => set("fiscalYearStart", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Website">
            <Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />
          </Field>
          <Field label="Timezone">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.timezone ?? ""}
              onChange={(e) => set("timezone", e.target.value)}
            >
              {["Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore", "Australia/Sydney"].map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          Save changes
        </Button>
        {saved ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Saved
          </span>
        ) : null}
      </div>
    </div>
  );
}
