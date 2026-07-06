"use client";

import { KanbanBoard } from "@/components/kanban/kanban-board";

export default function KanbanPage() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <KanbanBoard />
    </div>
  );
}
