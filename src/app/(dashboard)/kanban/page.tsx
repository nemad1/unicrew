import { KanbanSquare } from "lucide-react";

export default function KanbanPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
        <KanbanSquare className="w-8 h-8 text-blue-700" />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Kanban Pipeline</h1>
      <p className="text-sm text-gray-500 max-w-md">
        Visualize and manage your student recruitment pipeline with drag-and-drop cards across stages.
      </p>
    </div>
  );
}
