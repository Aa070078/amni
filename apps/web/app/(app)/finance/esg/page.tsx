import type { Metadata } from "next";
import { EsgView } from "@/src/components/esg/esg-view";

export const metadata: Metadata = { title: "ESG" };

export default function EsgPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <EsgView />
    </div>
  );
}
