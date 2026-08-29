"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  File,
  FileSearch,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";

import { getAccessToken } from "@/src/lib/auth-client";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppPageHeader } from "@/src/components/shared/AppPageHeader";
import { AppButton } from "@/src/components/ui/app-button";

type UploadCollection = { id: string; name: string };

const MAX_UPLOAD_MB = Number.parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || "20", 10) || 20;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const SUPPORTED_EXTENSIONS = [".pdf", ".txt", ".docx", ".csv", ".xlsx", ".pptx"];
const SUPPORTED_UPLOAD_COPY = `PDF, TXT, DOCX, CSV, XLSX, PPTX up to ${MAX_UPLOAD_MB}MB`;
const UPLOAD_CONCURRENCY = 3;
const PROCESSING_POLL_INTERVAL_MS = 3000;
const PROCESSING_POLL_TIMEOUT_MS = 10 * 60 * 1000;

type QueueStatus = "queued" | "uploading" | "processing" | "completed" | "failed";

type UploadQueueItem = {
  id: string;
  file: File;
  status: QueueStatus;
  message?: string;
  documentId?: string;
};

type DocumentStatusResponse = {
  status: "ready" | "processing" | "failed";
  error_message?: string | null;
};

const statusConfig: Record<
  QueueStatus,
  {
    label: string;
    className: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }
> = {
  queued: {
    label: "Waiting",
    className: "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-soft)]",
    icon: Clock,
  },
  uploading: {
    label: "Uploading",
    className: "border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)] text-[var(--accent-jade)]",
    icon: Loader2,
  },
  processing: {
    label: "Processing",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    icon: Loader2,
  },
  completed: {
    label: "Completed",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "border-red-500/30 bg-red-500/10 text-red-300",
    icon: AlertCircle,
  },
};

function getFileExtension(filename: string) {
  const normalized = filename.toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex >= 0 ? normalized.slice(dotIndex) : "";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateFile(file: File) {
  const extension = getFileExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    return "Unsupported file type. Supported formats are PDF, TXT, DOCX, CSV, XLSX, and PPTX.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `This file is too large. Please upload a supported document up to ${MAX_UPLOAD_MB}MB.`;
  }

  return null;
}

function getDuplicateNames(files: File[]) {
  const counts = new Map<string, number>();

  files.forEach((file) => {
    const name = file.name.trim().toLowerCase();
    counts.set(name, (counts.get(name) || 0) + 1);
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
}

export default function UploadPage() {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [isUploadingQueue, setIsUploadingQueue] = useState(false);
  const [collections, setCollections] = useState<UploadCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("none");
  const selectedCollectionRef = useRef<string>("none");

  useEffect(() => {
    selectedCollectionRef.current = selectedCollectionId;
  }, [selectedCollectionId]);

  useEffect(() => {
    (async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) return;
        const res = await fetch("/api/collections", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setCollections(
          (data.collections || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
        );
      } catch {
        // Collections are optional at upload time.
      }
    })();
  }, []);

  const queuedCount = queue.filter((item) => item.status === "queued").length;
  const activeCount = queue.filter((item) => item.status === "uploading" || item.status === "processing").length;
  const completedCount = queue.filter((item) => item.status === "completed").length;
  const failedCount = queue.filter((item) => item.status === "failed").length;

  const updateQueueItem = useCallback((id: string, update: Partial<UploadQueueItem>) => {
    setQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item)),
    );
  }, []);

  const addFilesToQueue = useCallback((files: File[]) => {
    if (files.length === 0) return;

    const duplicateNames = getDuplicateNames(files);
    setDuplicateWarning(
      duplicateNames.length > 0
        ? "Some selected files have the same filename. They can still upload, but you may want to rename them for easier tracking."
        : null,
    );

    const items = files.map((file) => {
      const validationError = validateFile(file);

      return {
        id: crypto.randomUUID(),
        file,
        status: validationError ? "failed" : "queued",
        message: validationError || "Ready to upload.",
      } satisfies UploadQueueItem;
    });

    setQueue((current) => [...items, ...current]);
    setQueueMessage(null);
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      addFilesToQueue(acceptedFiles);
    },
    [addFilesToQueue],
  );

  const onDropRejected = useCallback(() => {
    setQueueMessage(`Some files could not be added. Please choose ${SUPPORTED_UPLOAD_COPY}.`);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected,
    multiple: true,
    noClick: true,
  });

  const pollDocumentUntilFinished = useCallback(
    async (queueItemId: string, documentId: string) => {
      const startedAt = Date.now();

      while (Date.now() - startedAt < PROCESSING_POLL_TIMEOUT_MS) {
        const { data, error } = await supabase
          .from("documents")
          .select("status,error_message")
          .eq("id", documentId)
          .single<DocumentStatusResponse>();

        if (error) {
          throw new Error("Upload succeeded, but the processing status could not be checked.");
        }

        if (data.status === "ready") {
          updateQueueItem(queueItemId, {
            status: "completed",
            message: "Ready for questions.",
          });
          return;
        }

        if (data.status === "failed") {
          updateQueueItem(queueItemId, {
            status: "failed",
            message: data.error_message || "Processing failed. Please try another copy of this document.",
          });
          return;
        }

        await sleep(PROCESSING_POLL_INTERVAL_MS);
      }

      updateQueueItem(queueItemId, {
        status: "processing",
        message: "Still processing. You can check the documents page for the latest status.",
      });
    },
    [updateQueueItem],
  );

  const uploadQueueItem = useCallback(
    async (item: UploadQueueItem) => {
      const validationError = validateFile(item.file);

      if (validationError) {
        updateQueueItem(item.id, { status: "failed", message: validationError });
        return;
      }

      updateQueueItem(item.id, { status: "uploading", message: "Uploading file..." });

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error("Authentication session expired. Please sign in again.");

        const formData = new FormData();
        formData.append("file", item.file);
        if (selectedCollectionRef.current && selectedCollectionRef.current !== "none") {
          formData.append("collectionId", selectedCollectionRef.current);
        }

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || "Upload failed. Please try again.");
        }

        const documentId = payload?.documentId as string | undefined;
        if (!documentId) throw new Error("Upload succeeded, but processing could not be tracked.");

        updateQueueItem(item.id, {
          documentId,
          status: "processing",
          message: "Uploaded. Preparing document for questions...",
        });

        await pollDocumentUntilFinished(item.id, documentId);
      } catch (error) {
        updateQueueItem(item.id, {
          status: "failed",
          message: error instanceof Error ? error.message : "Upload failed. Please try again.",
        });
      }
    },
    [pollDocumentUntilFinished, updateQueueItem],
  );

  const runQueue = useCallback(
    async (items: UploadQueueItem[]) => {
      if (items.length === 0) return;

      setIsUploadingQueue(true);
      setQueueMessage(null);

      try {
        let nextIndex = 0;
        const workerCount = Math.min(UPLOAD_CONCURRENCY, items.length);

        await Promise.all(
          Array.from({ length: workerCount }, async () => {
            while (nextIndex < items.length) {
              const item = items[nextIndex];
              nextIndex += 1;
              await uploadQueueItem(item);
            }
          }),
        );
      } finally {
        setIsUploadingQueue(false);
      }
    },
    [uploadQueueItem],
  );

  const startUpload = useCallback(async () => {
    const items = queue.filter((item) => item.status === "queued");
    await runQueue(items);
  }, [queue, runQueue]);

  const retryUpload = useCallback(
    async (item: UploadQueueItem) => {
      updateQueueItem(item.id, { status: "queued", message: "Waiting to retry..." });
      await runQueue([{ ...item, status: "queued", message: "Waiting to retry..." }]);
    },
    [runQueue, updateQueueItem],
  );

  const removeItem = useCallback((id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue((current) => current.filter((item) => item.status !== "completed"));
  }, []);

  return (
    <div className="admin-page">
      <AppPageHeader
        eyebrow="Upload Documents"
        title="Upload approved documents"
        subtitle={`Add one or many approved documents your team can ask questions from. ${SUPPORTED_UPLOAD_COPY}.`}
      />

      {queue.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[var(--brand-shadow)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            This batch
          </p>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
            <span className="h-2 w-2 rounded-full bg-[var(--ink-muted)]" />
            {queuedCount} waiting
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            {activeCount} active
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {completedCount} ready
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            {failedCount} failed
          </span>
          <span className="flex-1" />
          {completedCount > 0 && (
            <button
              type="button"
              onClick={clearCompleted}
              className="text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
            >
              Clear completed
            </button>
          )}
        </div>
      ) : null}

      {collections.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--brand-shadow)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Upload to collection</p>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              New files in this batch are added to the chosen department collection.
            </p>
          </div>
          <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
            <SelectTrigger className="h-11 w-full rounded-lg border-[var(--line)] bg-[var(--surface)] px-4 text-sm shadow-sm focus-visible:border-[var(--accent-jade)] focus-visible:ring-[var(--accent-jade-100)] sm:w-60">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[var(--line)]">
              <SelectItem value="none">Unassigned</SelectItem>
              {collections.map((collection) => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:gap-8">
        <div className="space-y-5">
          <div
            {...getRootProps()}
            className={cn(
              "group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-[var(--surface)] p-5 text-center transition sm:min-h-[250px] sm:p-8",
              isDragActive ? "border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)]" : "border-[var(--line)] hover:border-[var(--line)] hover:bg-[var(--surface-2)]",
            )}
          >
            <input {...getInputProps()} aria-label="Select documents to upload" />
            <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)] sm:inset-x-6 sm:top-6 sm:text-[10px] sm:tracking-[0.18em]">
              <span>PDF · TXT · DOCX · CSV · XLSX · PPTX</span>
              <span>MAX {MAX_UPLOAD_MB}MB each</span>
            </div>

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-muted)] transition group-hover:text-[var(--ink-soft)]">
              <Upload size={28} strokeWidth={1.5} />
            </div>

            <div className="space-y-2">
              <p className="text-base font-semibold text-[var(--ink)]">
                {isDragActive ? "Release to add documents" : "Drag documents here"}
              </p>
              <p className="mx-auto max-w-sm text-xs leading-relaxed text-[var(--ink-muted)]">
                Select multiple files at once. Uploads run in small batches, and each document continues processing in the background.
              </p>
            </div>

            <AppButton type="button" tone="secondary" onClick={open} className="mt-1">
              <Upload size={16} />
              Choose files
            </AppButton>
          </div>

          {duplicateWarning ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <p>{duplicateWarning}</p>
            </div>
          ) : null}

          {queueMessage ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <p>{queueMessage}</p>
            </div>
          ) : null}

          <div className="admin-shell-card overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
            <div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--ink)]">Upload queue</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">Each file uploads and processes independently.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                {completedCount > 0 ? (
                  <AppButton type="button" tone="secondary" onClick={clearCompleted} className="h-10 px-3 text-xs">
                    Clear completed
                  </AppButton>
                ) : null}
                <AppButton
                  type="button"
                  onClick={startUpload}
                  disabled={queuedCount === 0 || isUploadingQueue}
                  className="h-10 px-3 text-xs"
                >
                  {isUploadingQueue ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                  Upload queue
                </AppButton>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]">
                  <File size={20} className="text-[var(--ink-muted)]" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--ink)]">No files selected</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">Choose or drag files to build an upload queue.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {queue.map((item) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    onRemove={() => removeItem(item.id)}
                    onRetry={() => retryUpload(item)}
                    disableActions={item.status === "uploading" || item.status === "processing"}
                  />
                ))}
              </div>
            )}
          </div>

          {completedCount > 0 ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 text-emerald-300" size={18} />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-900">
                    {completedCount} {completedCount === 1 ? "document is" : "documents are"} ready.
                  </p>
                  <p className="text-xs leading-relaxed text-emerald-300/80">
                    Your team can ask questions from completed documents.
                  </p>
                  <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:gap-5">
                    <Link href="/dashboard/chat" className="text-xs font-bold text-emerald-900 underline decoration-emerald-300 underline-offset-4">
                      Open chat
                    </Link>
                    <Link href="/dashboard/documents" className="text-xs font-bold text-emerald-900 underline decoration-emerald-300 underline-offset-4">
                      View documents
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="admin-shell-card border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ink-muted)]">Bulk upload flow</p>
            <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">What happens after upload</h2>
            <p className="text-xs leading-6 text-[var(--ink-muted)]">
              Each file is handled separately, so one failed document will not stop the rest of the queue.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {[
              { icon: Upload, title: "Upload files", copy: "Files are uploaded in small batches to keep the workspace responsive." },
              { icon: FileSearch, title: "Prepare documents", copy: "Each document is read and prepared for secure company search." },
              { icon: Clock, title: "Track status", copy: "The queue shows waiting, uploading, processing, completed, and failed states." },
              { icon: RotateCcw, title: "Retry failures", copy: "If one file fails, retry that file without restarting the whole queue." },
            ].map((step, index) => (
              <div key={step.title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)]">
                    <step.icon size={14} className="text-[var(--ink-muted)]" />
                  </div>
                  {index < 3 && <div className="mt-2 h-6 w-px bg-[var(--surface-2)]" />}
                </div>
                <div className="pt-0.5">
                  <p className="text-xs font-bold text-[var(--ink)]">{step.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink-muted)]">{step.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueRow({
  item,
  onRemove,
  onRetry,
  disableActions,
}: {
  item: UploadQueueItem;
  onRemove: () => void;
  onRetry: () => void;
  disableActions: boolean;
}) {
  const config = statusConfig[item.status];
  const StatusIcon = config.icon;
  const canRetry = item.status === "failed";
  const canRemove = item.status === "queued" || item.status === "failed" || item.status === "completed";

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)]">
          <File size={18} className="text-[var(--ink-muted)]" />
        </div>
        <div className="min-w-0 space-y-1">
          <p title={item.file.name} className="truncate text-sm font-semibold text-[var(--ink)]">
            {item.file.name}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            {formatFileSize(item.file.size)} · {getFileExtension(item.file.name).replace(".", "").toUpperCase() || "FILE"}
          </p>
          {item.message ? (
            <p
              title={item.message}
              className={cn(
                "line-clamp-2 text-xs leading-5",
                item.status === "failed" ? "text-red-300" : "text-[var(--ink-muted)]",
              )}
            >
              {item.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold", config.className)}>
          <StatusIcon
            size={13}
            className={item.status === "uploading" || item.status === "processing" ? "animate-spin" : undefined}
          />
          {config.label}
        </span>

        {canRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={disableActions}
            aria-label={`Retry upload for ${item.file.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--ink-muted)] transition hover:bg-[var(--accent-jade-50)] hover:text-[var(--accent-jade)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={15} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove ${item.file.name} from upload queue`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--ink-muted)] transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {canRemove ? <X size={16} /> : <Trash2 size={15} />}
        </button>
      </div>
    </div>
  );
}
