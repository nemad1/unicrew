"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { BookOpen, FileText, Loader2, UploadCloud, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadStatus = "idle" | "uploading" | "success" | "error";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function KnowledgeBasePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setUploadStatus("idle");
    setResultMessage(null);
  }

  async function handleUpload() {
    if (!file) {
      toast.error("Please select a PDF or Word document first.");
      return;
    }

    setUploadStatus("uploading");
    setResultMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge-base/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document");
      }

      setUploadStatus("success");
      setResultMessage(
        `Ingested ${data.insertedChunks}/${data.totalChunks} chunks from "${data.fileName}".`
      );
      toast.success("Document added to the knowledge base");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      setUploadStatus("error");
      setResultMessage(err.message || "Something went wrong while processing the document.");
      toast.error(err.message || "Failed to upload document");
    }
  }

  const isUploading = uploadStatus === "uploading";

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0 overflow-y-auto h-full">
      <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-xs text-gray-500">Upload documents the AI Assistant can use to answer student questions.</p>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-2xl bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <BookOpen className="w-[18px] h-[18px] text-blue-700" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Add a source document</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                PDF or Word files are split into chunks, embedded, and stored for retrieval-augmented replies.
              </p>
            </div>
          </div>

          <label
            htmlFor="kb-file-input"
            className={cn(
              "border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-colors",
              isUploading && "pointer-events-none opacity-60",
            )}
          >
            <UploadCloud className="w-6 h-6 text-gray-400" />
            {file ? (
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <FileText className="w-4 h-4 text-blue-700" />
                {file.name}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Click to choose a <span className="font-medium text-gray-700">.pdf</span>,{" "}
                <span className="font-medium text-gray-700">.doc</span>, or{" "}
                <span className="font-medium text-gray-700">.docx</span> file
              </p>
            )}
            <input
              id="kb-file-input"
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>

          {uploadStatus === "success" && resultMessage && (
            <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{resultMessage}</span>
            </div>
          )}
          {uploadStatus === "error" && resultMessage && (
            <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{resultMessage}</span>
            </div>
          )}

          <Button
            className="bg-blue-700 hover:bg-blue-800 text-white self-start"
            size="sm"
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing document...
              </>
            ) : (
              "Upload to knowledge base"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
