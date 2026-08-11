import type { Metadata } from "next";
import { CallLogsView } from "@/src/components/crm/call-logs-view";

export const metadata: Metadata = { title: "Call logs" };

export default function CallLogsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <CallLogsView />
    </div>
  );
}
