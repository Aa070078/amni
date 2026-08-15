import type { Metadata } from "next";

import { ImportsView } from "@/src/components/imports/imports-view";

export const metadata: Metadata = { title: "Import data" };

export default function ImportsPage() {
  return <ImportsView />;
}
