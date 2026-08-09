import type { Metadata } from "next";
import { SetupWizard } from "@/src/components/setup/setup-wizard";

export const metadata: Metadata = {
  title: "Set up your workspace — Amni",
};

export default function SetupPage() {
  return <SetupWizard />;
}
