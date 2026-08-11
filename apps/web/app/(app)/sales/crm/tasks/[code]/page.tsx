import type { Metadata } from "next";
import { TaskDetailView } from "@/src/components/crm/tasks/task-detail-view";

export const metadata: Metadata = { title: "Task detail" };

export default async function TaskDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <TaskDetailView code={code} />
    </div>
  );
}
