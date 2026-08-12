import type { Metadata } from "next";
import { TasksView } from "@/src/components/crm/tasks-view";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <TasksView />
    </div>
  );
}
