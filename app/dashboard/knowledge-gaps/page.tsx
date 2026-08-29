"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { getAccessToken, getCurrentUserProfile } from "@/src/lib/auth-client";
import { AdminSearchInput } from "@/src/components/dashboard/AdminSearchInput";
import { cn, truncate } from "@/src/lib/utils";
import { isWorkspaceAdminRole, type UserProfile } from "@/src/lib/workspace";
import { AppPageHeader } from "@/src/components/shared/AppPageHeader";
import { EmptyState } from "@/src/components/ui/empty-state";

type KnowledgeGap = {
  id: string;
  question: string;
  status: "open" | "reviewed" | "resolved" | "ignored";
  occurrence_count: number;
  last_asked_at: string;
  created_at: string;
  sample_answer?: string | null;
};

const STATUS_OPTIONS: KnowledgeGap["status"][] = [
  "open",
  "reviewed",
  "resolved",
  "ignored",
];

const NO_ANSWER_FALLBACK = "No answer found in the uploaded documents.";

export default function KnowledgeGapsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | KnowledgeGap["status"]
  >("all");
  const [error, setError] = useState<string | null>(null);

  const loadKnowledgeGaps = async () => {
    try {
      setLoading(true);
      const currentProfile = await getCurrentUserProfile();
      setProfile(currentProfile);

      if (!currentProfile || !isWorkspaceAdminRole(currentProfile.role)) {
        router.replace("/dashboard/chat");
        return;
      }

      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch("/api/knowledge-gaps", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load knowledge gaps");
      }

      const data = await response.json();
      setKnowledgeGaps(data.knowledgeGaps || []);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load knowledge gaps",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledgeGaps();
  }, []);

  const updateGapStatus = async (
    id: string,
    status: KnowledgeGap["status"],
  ) => {
    try {
      setSavingId(id);
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch("/api/knowledge-gaps", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update knowledge gap");
      }

      await loadKnowledgeGaps();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update knowledge gap",
      );
    } finally {
      setSavingId(null);
    }
  };

  const filteredKnowledgeGaps = knowledgeGaps.filter((gap) => {
    const matchesSearch =
      !searchQuery ||
      gap.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || gap.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const gapStatusCounts = {
    all: knowledgeGaps.length,
    open: knowledgeGaps.filter((gap) => gap.status === "open").length,
    reviewed: knowledgeGaps.filter((gap) => gap.status === "reviewed").length,
    resolved: knowledgeGaps.filter((gap) => gap.status === "resolved").length,
    ignored: knowledgeGaps.filter((gap) => gap.status === "ignored").length,
  };

  if (profile && !isWorkspaceAdminRole(profile.role)) {
    return null;
  }

  return (
    <div className="admin-page">
      <AppPageHeader
        eyebrow="Question Review"
        title="Unanswered questions"
        subtitle="Review the questions that still need better document coverage and use them to improve your workspace."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <AdminSearchInput
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by question or topic..."
          className="flex-1 lg:min-w-[20rem]"
        />
        <div className="flex flex-wrap items-center gap-2">
          {(["all", ...STATUS_OPTIONS] as const).map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={statusFilter === status}
              onClick={() =>
                setStatusFilter(status as "all" | KnowledgeGap["status"])
              }
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
                  status === "open" && "bg-red-400",
                  status === "reviewed" && "bg-amber-400",
                  status === "resolved" && "bg-emerald-400",
                  status === "ignored" && "bg-[var(--ink-muted)]",
                  status === "all" && "bg-[var(--accent-jade)]",
                )}
              />
              {status === "all"
                ? "All"
                : status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="text-[var(--ink-muted)]">
                {gapStatusCounts[status]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300 font-medium flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error loading gaps</p>
            <p className="text-xs mt-1 opacity-90">{error}</p>
          </div>
        </div>
      )}

      <div className="admin-shell-card border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[var(--line)]">
            {[1, 2, 3].map((index) => (
              <div key={index} className="animate-pulse space-y-4 p-6 lg:p-8">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-16 rounded-lg bg-[var(--surface-2)]" />
                  <div className="h-6 w-px bg-[var(--surface-2)]" />
                  <div className="h-4 w-24 rounded bg-[var(--surface-2)]" />
                </div>
                <div className="h-6 w-3/4 max-w-xl rounded bg-[var(--surface-2)]" />
                <div className="flex gap-8">
                  <div className="h-4 w-32 rounded bg-[var(--surface-2)]" />
                  <div className="h-4 w-32 rounded bg-[var(--surface-2)]" />
                </div>
                <div className="flex gap-2 pt-2">
                  {[1, 2, 3, 4].map((button) => (
                    <div
                      key={button}
                      className="h-8 w-20 rounded-lg bg-[var(--surface-2)]"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredKnowledgeGaps.length === 0 ? (
          <div className="px-6 py-24 text-center">
            <EmptyState
              icon={AlertTriangle}
              title="No unanswered questions found"
              description={NO_ANSWER_FALLBACK}
              className="border-0 bg-transparent py-0"
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {filteredKnowledgeGaps.map((gap) => (
              <div
                key={gap.id}
                className="p-6 lg:p-8 transition-all hover:bg-[var(--surface-2)] group"
              >
                <div className="flex flex-col gap-6 lg:gap-8">
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border transition-colors",
                          gap.status === "open"
                            ? "bg-red-500/10 text-red-300 border-red-500/30"
                            : gap.status === "resolved"
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                              : gap.status === "ignored"
                                ? "bg-[var(--surface-2)] text-[var(--ink-soft)] border-[var(--line)]"
                                : "bg-[var(--surface-2)] text-[var(--ink-soft)] border-[var(--line)]",
                        )}
                      >
                        {gap.status}
                      </span>
                      <div className="h-6 w-px bg-[var(--surface-2)]" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                        <span className="font-bold text-[var(--ink)]">
                          {gap.occurrence_count}
                        </span>{" "}
                        {gap.occurrence_count === 1 ? "ask" : "asks"}
                      </span>
                    </div>
                    <p className="text-lg lg:text-xl font-semibold tracking-tight text-[var(--ink)] leading-snug">
                      {gap.question}
                    </p>
                    <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs font-medium text-[var(--ink-muted)] pt-2">
                      <span className="flex items-center gap-2">
                        <span className="text-[var(--ink-muted)]">•</span>
                        <span className="text-[var(--ink-muted)]">
                          Reported:
                        </span>{" "}
                        {new Date(gap.created_at).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-[var(--ink-muted)]">•</span>
                        <span className="text-[var(--ink-muted)]">
                          Last seen:
                        </span>{" "}
                        {new Date(gap.last_asked_at).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </span>
                    </div>
                    <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                        Answer status
                      </p>
                      <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
                        {gap.sample_answer
                          ? `"${truncate(gap.sample_answer, 180)}"`
                          : NO_ANSWER_FALLBACK}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] pt-3">
                    <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                        Status
                      </span>

                      <div className="relative">
                        <select
                          aria-label={`Set status for ${gap.question}`}
                          value={gap.status}
                          disabled={savingId === gap.id}
                          onChange={(event) =>
                            updateGapStatus(
                              gap.id,
                              event.target.value as KnowledgeGap["status"],
                            )
                          }
                          className={cn(
                            "appearance-none rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 pr-8 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink)] outline-none transition focus:border-[var(--accent-jade-100)] disabled:cursor-not-allowed disabled:opacity-60",
                            gap.status === "open" && "text-red-300",
                            gap.status === "reviewed" && "text-amber-300",
                            gap.status === "resolved" && "text-emerald-300",
                            gap.status === "ignored" &&
                              "text-[var(--ink-soft)]",
                          )}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]">
                          ▾
                        </span>
                      </div>

                      {savingId === gap.id && (
                        <Loader2
                          size={12}
                          className="animate-spin text-[var(--ink-muted)]"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
