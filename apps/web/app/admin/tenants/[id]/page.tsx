import { AdminTenantDetail } from "@/src/components/admin/admin-tenant-detail";

export default async function AdminTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminTenantDetail tenantId={id} />;
}
