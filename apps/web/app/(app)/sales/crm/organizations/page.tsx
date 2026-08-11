import type { Metadata } from "next";
import { OrganizationsView } from "@/src/components/crm/organizations-view";

export const metadata: Metadata = { title: "Companies" };

export default function OrganizationsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <OrganizationsView />
    </div>
  );
}
