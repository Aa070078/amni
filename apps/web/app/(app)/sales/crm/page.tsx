import type { Metadata } from "next";
import { CrmOverview } from "@/src/components/crm/crm-overview";

export const metadata: Metadata = { title: "CRM" };

export default function CrmOverviewPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <CrmOverview />
    </div>
  );
}
