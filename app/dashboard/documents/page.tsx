"use client";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getAccessToken, getCurrentUserProfile } from "@/src/lib/auth-client";
import { supabase } from "@/src/lib/supabase";
import {
  Check,
  File,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  Presentation,
  Rows3,
  Trash2,
  Database,
  Eye,
  Loader2,
  Upload,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FolderInput,
  Download,
  RefreshCw,
} from "lucide-react";
import { FilePreviewDrawer } from "@/src/components/file-preview/FilePreviewDrawer";
import { cn } from "@/src/lib/utils";
import { type UserProfile } from "@/src/lib/workspace";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminSearchInput } from "@/src/components/dashboard/AdminSearchInput";
import { MobileCardList } from "@/src/components/layout/MobileCardList";
import { OverflowGuard } from "@/src/components/layout/OverflowGuard";
import { ResponsiveToolbar } from "@/src/components/layout/ResponsiveToolbar";
import { AppPageHeader } from "@/src/components/shared/AppPageHeader";
import { AppButton } from "@/src/components/ui/app-button";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { EmptyState } from "@/src/components/ui/empty-state";
import { StatusBadge } from "@/src/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DocumentRecord = {
  id: string;
  filename: string;
  file_type?: string | null;
  parser?: string | null;
  status: "ready" | "processing" | "failed";
  total_chunks: number | null;
  created_at: string;
  error_message?: string | null;
  document_summary?: string | null;
  document_keywords?: string[] | null;
  document_category?: string | null;
  collection_id?: string | null;
};

type Collection = {
  id: string;
  name: string;
  slug: string;
  is_default: boolean;
};

type SortColumn = "status" | "category" | "collection" | "updated";
type SortDirection = "asc" | "desc";

function getDisplayFileType(document: DocumentRecord) {
  if (document.file_type) {
    if (document.file_type.includes("/")) {
      const subtype = document.file_type.split("/").pop() || document.file_type;
      return subtype.split(".").pop()?.toUpperCase() || subtype.toUpperCase();
    }

    return document.file_type.replace(".", "").toUpperCase();
  }

  const extension = document.filename.split(".").pop();
  return extension ? extension.toUpperCase() : "File";
}

function getFileTypeMeta(document: DocumentRecord) {
  const extension = (document.filename.split(".").pop() || "").toLowerCase();
  const extensionMap: Record<string, { icon: typeof FileText; tint: string }> =
    {
      pdf: { icon: FileText, tint: "bg-red-500/10 text-red-300" },
      doc: { icon: FileText, tint: "bg-blue-500/10 text-blue-300" },
      docx: { icon: FileText, tint: "bg-blue-500/10 text-blue-300" },
      xls: {
        icon: FileSpreadsheet,
        tint: "bg-emerald-500/10 text-emerald-300",
      },
      xlsx: {
        icon: FileSpreadsheet,
        tint: "bg-emerald-500/10 text-emerald-300",
      },
      csv: {
        icon: FileSpreadsheet,
        tint: "bg-emerald-500/10 text-emerald-300",
      },
      ppt: { icon: Presentation, tint: "bg-orange-500/10 text-orange-300" },
      pptx: { icon: Presentation, tint: "bg-orange-500/10 text-orange-300" },
      txt: {
        icon: FileText,
        tint: "bg-[var(--surface-2)] text-[var(--ink-soft)]",
      },
      md: {
        icon: FileText,
        tint: "bg-[var(--surface-2)] text-[var(--ink-soft)]",
      },
    };
  return (
    extensionMap[extension] || {
      icon: File,
      tint: "bg-[var(--surface-2)] text-[var(--ink-soft)]",
    }
  );
}

function getParserStatus(document: DocumentRecord) {
  if (document.status === "processing") {
    return "Processing";
  }

  if (document.status === "failed") {
    return document.error_message || "Parsing failed";
  }

  return document.parser || "Ready";
}

function getStatusLabel(status: DocumentRecord["status"]) {
  return status === "ready"
    ? "Completed"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function getBadgeClass(kind: "status" | "category", value: string) {
  if (kind === "status") {
    return value === "ready"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
      : value === "processing"
        ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
        : "border-red-500/30 bg-red-500/15 text-red-300";
  }

  return "border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)] text-[var(--accent-jade-hover)]";
}

function formatDocumentDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DocumentBadge({
  kind,
  value,
}: {
  kind: "status" | "category";
  value: string;
}) {
  const label =
    kind === "status" && value === "ready"
      ? "Completed"
      : value.charAt(0).toUpperCase() + value.slice(1);
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
        getBadgeClass(kind, value),
      )}
    >
      {label}
    </span>
  );
}

export default function DocumentsPage() {
  const PAGE_SIZE = 8;
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionFilter, setCollectionFilter] = useState<string>("all");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    filename: string;
    mimeType?: string | null;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [statusFilter, setStatusFilter] = useState<
    "all" | DocumentRecord["status"]
  >("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [bulkCollectionId, setBulkCollectionId] = useState("none");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const collectionNameById = new Map(collections.map((c) => [c.id, c.name]));

  const fetchCollections = async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      const res = await fetch("/api/collections", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCollections(data.collections || []);
    } catch {
      // Collections are optional context for this page.
    }
  };

  const assignCollection = async (documentId: string, collectionId: string) => {
    setAssigningId(documentId);
    setActionError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Authentication session expired");
      const res = await fetch("/api/documents/collection", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          documentId,
          collectionId: collectionId === "none" ? null : collectionId,
        }),
      });
      if (!res.ok) throw new Error("Failed to update collection");
      setDocuments((current) =>
        current.map((doc) =>
          doc.id === documentId
            ? {
                ...doc,
                collection_id: collectionId === "none" ? null : collectionId,
              }
            : doc,
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update collection",
      );
    } finally {
      setAssigningId(null);
    }
  };

  const fetchDocs = async (silent = false) => {
    if (!silent) setLoading(true);
    const currentProfile = await getCurrentUserProfile();
    if (!silent) setProfile(currentProfile);

    if (!currentProfile?.workspace_id) {
      if (!silent) setLoading(false);
      return;
    }

    // On a full load, fail any documents stuck in "processing" (e.g. the worker
    // never ran) so they don't hang forever and can be re-uploaded. Best-effort.
    if (!silent) {
      try {
        const token = await getAccessToken();
        if (token) {
          await fetch("/api/documents/reconcile", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch {
        // Non-blocking: listing still proceeds if reconcile fails.
      }
    }

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("workspace_id", currentProfile.workspace_id)
      .order("created_at", { ascending: false });

    if (data) setDocuments(data as DocumentRecord[]);
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    fetchDocs();
    fetchCollections();
  }, []);

  // Poll while any document is processing
  useEffect(() => {
    const isProcessing = documents.some((doc) => doc.status === "processing");
    if (!isProcessing) return;

    const intervalId = setInterval(() => {
      fetchDocs(true);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [documents]);

  if (profile?.role === "viewer") {
    return null;
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setActionError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Authentication session expired");

      const res = await fetch(
        `/api/documents/delete?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!res.ok) throw new Error("Delete failed");
      fetchDocs();
    } catch (err: any) {
      setActionError(err.message || "Error deleting document");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDocuments = documents.filter((document) => {
    const matchesSearch = document.filename
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCollection =
      collectionFilter === "all" ||
      (collectionFilter === "none"
        ? !document.collection_id
        : document.collection_id === collectionFilter);
    const matchesStatus =
      statusFilter === "all" || document.status === statusFilter;
    return matchesSearch && matchesCollection && matchesStatus;
  });
  const sortedDocuments = [...filteredDocuments].sort((left, right) => {
    if (!sortColumn) return 0;

    const leftValue =
      sortColumn === "status"
        ? getStatusLabel(left.status)
        : sortColumn === "category"
          ? left.document_category || "Other"
          : sortColumn === "collection"
            ? collectionNameById.get(left.collection_id || "") || "Unassigned"
            : left.created_at;
    const rightValue =
      sortColumn === "status"
        ? getStatusLabel(right.status)
        : sortColumn === "category"
          ? right.document_category || "Other"
          : sortColumn === "collection"
            ? collectionNameById.get(right.collection_id || "") || "Unassigned"
            : right.created_at;
    const comparison = leftValue.localeCompare(rightValue, undefined, {
      numeric: true,
    });
    return sortDirection === "asc" ? comparison : -comparison;
  });
  const totalPages = Math.max(1, Math.ceil(sortedDocuments.length / PAGE_SIZE));
  const pagedDocuments = sortedDocuments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const hasFilters =
    Boolean(searchQuery) ||
    collectionFilter !== "all" ||
    statusFilter !== "all";

  const statusCounts = {
    all: documents.length,
    ready: documents.filter((document) => document.status === "ready").length,
    processing: documents.filter((document) => document.status === "processing")
      .length,
    failed: documents.filter((document) => document.status === "failed").length,
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const allVisibleSelected = pagedDocuments.every((doc) =>
        current.has(doc.id),
      );
      const next = new Set(current);
      if (allVisibleSelected) {
        pagedDocuments.forEach((doc) => next.delete(doc.id));
      } else {
        pagedDocuments.forEach((doc) => next.add(doc.id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    setActionError(null);
    try {
      for (const id of selectedIds) {
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error("Authentication session expired");
        const res = await fetch(
          `/api/documents/delete?id=${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        if (!res.ok) throw new Error("Delete failed");
      }
      setSelectedIds(new Set());
      fetchDocs();
    } catch (err: any) {
      setActionError(err.message || "Error deleting documents");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleReprocess = async (documentId: string) => {
    setBulkWorking(true);
    setActionError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Authentication session expired");
      const response = await fetch("/api/documents/reprocess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ documentId }),
      });
      if (!response.ok) throw new Error("Reprocess failed");
      await fetchDocs(true);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Error reprocessing document",
      );
    } finally {
      setBulkWorking(false);
    }
  };

  const handleBulkMove = async (collectionId: string) => {
    setBulkWorking(true);
    setActionError(null);
    try {
      for (const documentId of selectedIds) {
        await assignCollection(documentId, collectionId);
      }
      setSelectedIds(new Set());
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Error moving documents",
      );
    } finally {
      setBulkWorking(false);
      setBulkCollectionId("none");
    }
  };

  const handleBulkReprocess = async () => {
    setBulkWorking(true);
    setActionError(null);
    try {
      for (const documentId of selectedIds) {
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error("Authentication session expired");
        const response = await fetch("/api/documents/reprocess", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ documentId }),
        });
        if (!response.ok) throw new Error("Reprocess failed");
      }
      setSelectedIds(new Set());
      await fetchDocs(true);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Error reprocessing documents",
      );
    } finally {
      setBulkWorking(false);
    }
  };

  const exportSelected = () => {
    const selectedDocuments = documents.filter((document) =>
      selectedIds.has(document.id),
    );
    const rows = [
      [
        "Document",
        "Status",
        "Type",
        "Category",
        "Collection",
        "Sections",
        "Updated",
      ],
      ...selectedDocuments.map((document) => [
        document.filename,
        getStatusLabel(document.status),
        getDisplayFileType(document),
        document.document_category || "Other",
        collectionNameById.get(document.collection_id || "") || "Unassigned",
        String(document.total_chunks || 0),
        formatDocumentDate(document.created_at),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = "company-documents.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: SortColumn;
    children: ReactNode;
  }) => (
    <button
      type="button"
      onClick={() => toggleSort(column)}
      className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)] hover:text-[var(--ink)]"
    >
      {children}
      {sortColumn === column ? (
        sortDirection === "asc" ? (
          <ArrowUp size={13} />
        ) : (
          <ArrowDown size={13} />
        )
      ) : (
        <ArrowUpDown size={13} className="opacity-50" />
      )}
    </button>
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, collectionFilter, statusFilter]);

  return (
    <div className="admin-page">
      <AppPageHeader
        eyebrow="Library"
        title="Company library"
        subtitle="Manage uploaded documents and processing status."
      />

      <ResponsiveToolbar className="lg:items-center">
        <AdminSearchInput
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search documents by filename..."
          className="flex-1"
        />
        <Select value={collectionFilter} onValueChange={setCollectionFilter}>
          <SelectTrigger className="h-12 w-full rounded-xl border-[var(--line)] bg-[var(--surface)] px-4 text-sm shadow-sm focus-visible:border-[var(--accent-jade)] focus-visible:ring-[var(--accent-jade-100)] lg:w-56">
            <SelectValue placeholder="All collections" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[var(--line)]">
            <SelectItem value="all">All collections</SelectItem>
            <SelectItem value="none">Uncategorized</SelectItem>
            {collections.map((collection) => (
              <SelectItem key={collection.id} value={collection.id}>
                {collection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters ? (
          <AppButton
            tone="secondary"
            onClick={() => {
              setSearchQuery("");
              setCollectionFilter("all");
              setStatusFilter("all");
            }}
            className="w-full whitespace-nowrap sm:w-auto"
          >
            Clear filters
          </AppButton>
        ) : null}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-sm">
          <button
            type="button"
            aria-label="Table view"
            aria-pressed={viewMode === "table"}
            onClick={() => setViewMode("table")}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition",
              viewMode === "table"
                ? "bg-[var(--accent-jade-50)] text-[var(--accent-jade)]"
                : "text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)]",
            )}
          >
            <Rows3 size={16} />
          </button>
          <button
            type="button"
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition",
              viewMode === "grid"
                ? "bg-[var(--accent-jade-50)] text-[var(--accent-jade)]"
                : "text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)]",
            )}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
        <AppButton asChild className="w-full whitespace-nowrap px-6 sm:w-auto">
          <Link href="/dashboard/upload">
            <Upload size={18} />
            Upload document
          </Link>
        </AppButton>
      </ResponsiveToolbar>

      {documents.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "ready", "processing", "failed"] as const).map((status) => {
            const count = statusCounts[status];
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                  statusFilter === status
                    ? "border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)] text-[var(--accent-jade-hover)]"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    status === "ready" && "bg-emerald-400",
                    status === "processing" && "bg-amber-400",
                    status === "failed" && "bg-red-400",
                    status === "all" && "bg-[var(--accent-jade)]",
                  )}
                />
                {status === "all"
                  ? "All"
                  : status.charAt(0).toUpperCase() + status.slice(1)}
                <span className="text-[var(--ink-muted)]">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--accent-jade-100)] bg-[var(--surface-2)] px-4 py-3 shadow-lg">
          <p className="text-sm font-semibold text-[var(--ink)]">
            {selectedIds.size}{" "}
            {selectedIds.size === 1 ? "document" : "documents"} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={bulkCollectionId}
              onValueChange={(value) => void handleBulkMove(value)}
              disabled={bulkWorking || bulkDeleting}
            >
              <SelectTrigger className="h-9 w-44 rounded-lg border-[var(--line)] bg-[var(--surface)] text-xs shadow-sm focus-visible:border-[var(--accent-jade)] focus-visible:ring-[var(--accent-jade-100)]">
                <FolderInput size={14} />
                <SelectValue placeholder="Move to collection" />
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
            <AppButton
              tone="secondary"
              onClick={exportSelected}
              disabled={bulkWorking || bulkDeleting}
              className="h-9 px-3 text-xs"
            >
              <Download size={14} /> Export
            </AppButton>
            <AppButton
              tone="secondary"
              onClick={() => void handleBulkReprocess()}
              disabled={bulkWorking || bulkDeleting}
              className="h-9 px-3 text-xs"
            >
              {bulkWorking ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Reprocess
            </AppButton>
            <AppButton
              tone="secondary"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkWorking || bulkDeleting}
              className="h-9 px-3 text-xs"
            >
              Cancel
            </AppButton>
            <AppButton
              tone="destructive"
              onClick={() => void handleBulkDelete()}
              disabled={bulkWorking || bulkDeleting}
              className="h-9 px-3 text-xs"
            >
              {bulkDeleting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Delete selected
            </AppButton>
          </div>
        </div>
      )}

      {actionError && (
        <Alert className="rounded-2xl border-red-500/30 bg-red-500/10 text-red-300">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <div className="admin-shell-card overflow-hidden">
        {viewMode === "table" && (
          <>
            <OverflowGuard mode="scroll" className="hidden lg:block">
              <table className="hidden w-full border-collapse text-left lg:table">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--canvas-soft)]">
                    <th className="w-12 px-2 py-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={
                          pagedDocuments.length > 0 &&
                          pagedDocuments.every((doc) => selectedIds.has(doc.id))
                        }
                        aria-label="Select all documents on this page"
                        onClick={toggleAllVisible}
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-md border transition",
                          pagedDocuments.length > 0 &&
                            pagedDocuments.every((doc) =>
                              selectedIds.has(doc.id),
                            )
                            ? "border-[var(--accent-jade)] bg-[var(--accent-jade)] text-[#04110e]"
                            : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent-jade-100)]",
                        )}
                      >
                        {pagedDocuments.length > 0 &&
                          pagedDocuments.every((doc) =>
                            selectedIds.has(doc.id),
                          ) && <Check size={13} strokeWidth={3} />}
                      </button>
                    </th>
                    <th className="min-w-0 flex-1 px-3 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                      Document
                    </th>
                    <th className="px-2 py-3">
                      <SortableHeader column="status">Status</SortableHeader>
                    </th>
                    <th className="px-2 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                      Type
                    </th>
                    <th className="px-2 py-3">
                      <SortableHeader column="category">
                        Category
                      </SortableHeader>
                    </th>
                    <th className="px-2 py-3">
                      <SortableHeader column="collection">
                        Collection
                      </SortableHeader>
                    </th>
                    <th className="px-2 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                      Sections
                    </th>
                    <th className="px-2 py-3">
                      <SortableHeader column="updated">Updated</SortableHeader>
                    </th>
                    <th className="px-2 py-3 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line-soft)]">
                  {loading ? (
                    [1, 2, 3].map((i) => (
                      <tr key={i}>
                        <td colSpan={9} className="px-6 py-16 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <Loader2
                              size={18}
                              className="animate-spin text-[var(--ink-muted)]"
                            />
                            <span className="text-sm font-medium text-[var(--ink-soft)]">
                              Loading documents...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-24 text-center">
                        <EmptyState
                          icon={FileText}
                          title={
                            documents.length === 0
                              ? "No documents yet"
                              : "No matching documents"
                          }
                          description={
                            documents.length === 0
                              ? "Start by uploading your first approved document."
                              : "Try a different search term or clear filters."
                          }
                          className="border-0 bg-transparent py-0"
                        />
                      </td>
                    </tr>
                  ) : (
                    pagedDocuments.map((doc) => (
                      <tr
                        key={doc.id}
                        className={cn(
                          "transition-colors",
                          selectedIds.has(doc.id)
                            ? "bg-[var(--accent-jade-50)]"
                            : "hover:bg-[var(--canvas-soft)]",
                        )}
                      >
                        <td className="px-2 py-4">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={selectedIds.has(doc.id)}
                            aria-label={`Select ${doc.filename}`}
                            onClick={() => toggleSelected(doc.id)}
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-md border transition",
                              selectedIds.has(doc.id)
                                ? "border-[var(--accent-jade)] bg-[var(--accent-jade)] text-[#04110e]"
                                : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent-jade-100)]",
                            )}
                          >
                            {selectedIds.has(doc.id) && (
                              <Check size={13} strokeWidth={3} />
                            )}
                          </button>
                        </td>
                        <td className="min-w-0 flex-1 px-3 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                getFileTypeMeta(doc).tint,
                              )}
                            >
                              {(() => {
                                const meta = getFileTypeMeta(doc);
                                const Icon = meta.icon;
                                return <Icon size={18} />;
                              })()}
                            </div>
                            <span
                              title={doc.filename}
                              className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]"
                            >
                              {doc.filename}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-4">
                          <div className="flex items-center gap-2">
                            <DocumentBadge kind="status" value={doc.status} />
                            {doc.status === "processing" && (
                              <Loader2
                                size={14}
                                className="animate-spin text-[var(--accent-jade)]"
                              />
                            )}
                          </div>
                          <p
                            title={getParserStatus(doc)}
                            className={cn(
                              "mt-2 max-w-xs truncate text-[11px]",
                              doc.status === "failed"
                                ? "text-red-300"
                                : "text-[var(--ink-muted)]",
                            )}
                          >
                            {getParserStatus(doc)}
                          </p>
                        </td>
                        <td className="px-2 py-4">
                          <span className="inline-flex rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-soft)]">
                            {getDisplayFileType(doc)}
                          </span>
                        </td>
                        <td className="px-2 py-4">
                          <DocumentBadge
                            kind="category"
                            value={doc.document_category || "Other"}
                          />
                        </td>
                        <td className="px-2 py-4">
                          <Select
                            value={doc.collection_id || "none"}
                            onValueChange={(value) =>
                              assignCollection(doc.id, value)
                            }
                            disabled={assigningId === doc.id}
                          >
                            <SelectTrigger className="h-9 w-36 rounded-lg border-[var(--line)] bg-[var(--surface)] text-xs shadow-sm focus-visible:border-[var(--accent-jade)] focus-visible:ring-[var(--accent-jade-100)]">
                              <SelectValue placeholder="Unassigned">
                                {doc.collection_id
                                  ? collectionNameById.get(doc.collection_id)
                                  : "Unassigned"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-[var(--line)]">
                              <SelectItem value="none">Unassigned</SelectItem>
                              {collections.map((collection) => (
                                <SelectItem
                                  key={collection.id}
                                  value={collection.id}
                                >
                                  {collection.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-4">
                          <span className="text-xs font-semibold text-[var(--ink-soft)] bg-[var(--surface-2)] px-2.5 py-1 rounded-lg inline-block">
                            {doc.total_chunks || 0}
                          </span>
                        </td>
                        <td className="px-2 py-4">
                          <span className="text-xs font-medium text-[var(--ink-muted)]">
                            {formatDocumentDate(doc.created_at)}
                          </span>
                        </td>
                        <td className="px-2 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              aria-label={`Preview ${doc.filename}`}
                              onClick={() =>
                                setPreviewDoc({
                                  id: doc.id,
                                  filename: doc.filename,
                                  mimeType: doc.file_type,
                                })
                              }
                              disabled={doc.status !== "ready"}
                              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--ink-muted)] transition-all hover:bg-[var(--canvas-soft)] hover:text-[var(--accent-jade)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Eye size={14} />
                              Preview
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={`Menu for ${doc.filename}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => void handleReprocess(doc.id)}
                                  disabled={doc.status === "processing"}
                                >
                                  <RefreshCw size={14} /> Reprocess
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setConfirmDeleteId(doc.id)}
                                >
                                  <Trash2 size={14} /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </OverflowGuard>

            <MobileCardList hideAbove="lg" className="space-y-0 p-4">
              {loading ? (
                [1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="h-40 animate-pulse rounded-2xl bg-[var(--surface-2)]"
                  />
                ))
              ) : filteredDocuments.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={
                    documents.length === 0
                      ? "No documents yet"
                      : "No matches found"
                  }
                  description={
                    documents.length === 0
                      ? "Upload your first document to get started."
                      : "Try adjusting your search filters."
                  }
                />
              ) : (
                pagedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0 flex-1">
                        <p
                          title={doc.filename}
                          className="truncate text-sm font-bold text-[var(--ink)]"
                        >
                          {doc.filename}
                        </p>
                        <p className="mt-2 text-xs font-medium text-[var(--ink-muted)]">
                          {new Date(doc.created_at).toLocaleDateString()} •{" "}
                          {getDisplayFileType(doc)} • {doc.total_chunks || 0}{" "}
                          sections
                        </p>
                        <p className="mt-2 text-xs font-semibold text-[var(--accent-jade)]">
                          {doc.document_category || "Other"}
                        </p>
                        {doc.document_summary ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--ink-muted)]">
                            {doc.document_summary}
                          </p>
                        ) : null}
                        <p
                          title={getParserStatus(doc)}
                          className={cn(
                            "mt-1 line-clamp-2 text-xs",
                            doc.status === "failed"
                              ? "text-red-300"
                              : "text-[var(--ink-muted)]",
                          )}
                        >
                          {getParserStatus(doc)}
                        </p>
                      </div>
                      <button
                        aria-label={`Delete ${doc.filename}`}
                        onClick={() => setConfirmDeleteId(doc.id)}
                        disabled={deletingId === doc.id}
                        className="rounded-lg p-2 text-[var(--ink-muted)] hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-40"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                ))
              )}
            </MobileCardList>
          </>
        )}

        {viewMode === "grid" && (
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((index) => (
                  <div
                    key={index}
                    className="h-44 animate-pulse rounded-2xl bg-[var(--surface-2)]"
                  />
                ))}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={
                  documents.length === 0
                    ? "No documents yet"
                    : "No matching documents"
                }
                description={
                  documents.length === 0
                    ? "Upload your first approved document to get started."
                    : "Try a different search term or clear filters."
                }
                action={
                  documents.length === 0 ? (
                    <AppButton asChild tone="primary">
                      <Link href="/dashboard/upload">
                        <Upload size={16} />
                        Upload document
                      </Link>
                    </AppButton>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pagedDocuments.map((doc) => {
                  const meta = getFileTypeMeta(doc);
                  const Icon = meta.icon;
                  const isSelected = selectedIds.has(doc.id);
                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        "group flex flex-col rounded-2xl border bg-[var(--surface)] p-4 transition-colors",
                        isSelected
                          ? "border-[var(--accent-jade)] ring-2 ring-[var(--accent-jade-100)]"
                          : "border-[var(--line)] hover:border-[var(--accent-jade-100)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                            meta.tint,
                          )}
                        >
                          <Icon size={20} />
                        </div>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={`Select ${doc.filename}`}
                          onClick={() => toggleSelected(doc.id)}
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                            isSelected
                              ? "border-[var(--accent-jade)] bg-[var(--accent-jade)] text-[#04110e]"
                              : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent-jade-100)]",
                          )}
                        >
                          {isSelected && <Check size={13} strokeWidth={3} />}
                        </button>
                      </div>

                      <div className="mt-3 min-w-0">
                        <p
                          className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--ink)]"
                          title={doc.filename}
                        >
                          {doc.filename}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <DocumentBadge kind="status" value={doc.status} />
                          <DocumentBadge
                            kind="category"
                            value={doc.document_category || "Other"}
                          />
                        </div>
                      </div>

                      {doc.document_summary ? (
                        <p
                          className="mt-2.5 line-clamp-2 text-xs leading-5 text-[var(--ink-muted)]"
                          title={doc.document_summary}
                        >
                          {doc.document_summary}
                        </p>
                      ) : null}

                      <div className="mt-3 flex items-center gap-3 text-[11px] text-[var(--ink-muted)]">
                        <span className="inline-flex items-center gap-1">
                          <Database size={12} />
                          {doc.total_chunks || 0} sections
                        </span>
                        <span aria-hidden>·</span>
                        <span>
                          {collectionNameById.get(doc.collection_id || "") ||
                            "Unassigned"}
                        </span>
                        <span aria-hidden>·</span>
                        <span>{formatDocumentDate(doc.created_at)}</span>
                      </div>

                      <div className="mt-4 flex items-center gap-1 border-t border-[var(--line-soft)] pt-3">
                        <button
                          type="button"
                          aria-label={`Preview ${doc.filename}`}
                          onClick={() =>
                            setPreviewDoc({
                              id: doc.id,
                              filename: doc.filename,
                              mimeType: doc.file_type,
                            })
                          }
                          disabled={doc.status !== "ready"}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:bg-[var(--canvas-soft)] hover:text-[var(--accent-jade)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Eye size={13} />
                          Preview
                        </button>
                        <span className="flex-1" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Menu for ${doc.filename}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => void handleReprocess(doc.id)}
                              disabled={doc.status === "processing"}
                            >
                              <RefreshCw size={13} /> Reprocess
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setConfirmDeleteId(doc.id)}
                            >
                              <Trash2 size={13} /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {filteredDocuments.length > PAGE_SIZE ? (
          <div className="flex flex-col gap-3 border-t border-[var(--line)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--ink-muted)]">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(currentPage * PAGE_SIZE, filteredDocuments.length)} of{" "}
              {filteredDocuments.length}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <AppButton
                tone="secondary"
                disabled={currentPage === 1}
                className="h-10 px-3 text-xs"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </AppButton>
              <AppButton
                tone="secondary"
                disabled={currentPage === totalPages}
                className="h-10 px-3 text-xs"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
              >
                Next
              </AppButton>
            </div>
          </div>
        ) : null}
      </div>
      <FilePreviewDrawer
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        documentId={previewDoc?.id ?? null}
        filename={previewDoc?.filename ?? ""}
        mimeType={previewDoc?.mimeType ?? null}
      />

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
        title="Delete document?"
        description="This removes the document from your workspace. The action is reversible only by uploading the document again."
        confirmLabel="Delete document"
        loading={Boolean(deletingId)}
        onConfirm={async () => {
          if (!confirmDeleteId) return;
          await handleDelete(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
      />
    </div>
  );
}
