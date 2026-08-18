import type { Metadata } from "next";
import { OrganizationDetailView } from "@/src/components/crm/organizations/organization-detail-view";

export const metadata: Metadata = { title: "Company detail" };

export default async function OrganizationDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <OrganizationDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
