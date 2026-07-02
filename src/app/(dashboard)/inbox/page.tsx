import { Inbox } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
        <Inbox className="w-8 h-8 text-blue-700" />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Unified Inbox</h1>
      <p className="text-sm text-gray-500 max-w-md">
        Manage all student communications in one place. Chat threads, escalations, and AI-drafted replies will appear here.
      </p>
    </div>
  );
}
