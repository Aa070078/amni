"use client";

import * as React from "react";

export interface Tenant {
  id: string;
  name: string;
  plan: "free" | "starter" | "growth" | "scale";
}

const SEEDED_TENANTS: Tenant[] = [
  { id: "demo", name: "Demo Co", plan: "free" },
  { id: "working", name: "Working Co", plan: "growth" },
];

export function useTenants() {
  const [tenants] = React.useState<Tenant[]>(SEEDED_TENANTS);
  const [activeId, setActiveId] = React.useState<string>(SEEDED_TENANTS[0]!.id);

  const active = tenants.find((tenant) => tenant.id === activeId) ?? tenants[0]!;

  return { tenants, active, setActiveId };
}
