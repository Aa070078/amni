import type { Metadata } from "next";
import { CompanyView } from "@/src/components/settings/company-view";

export const metadata: Metadata = { title: "Company" };

export default function CompanySettingsPage() {
  return <CompanyView />;
}
