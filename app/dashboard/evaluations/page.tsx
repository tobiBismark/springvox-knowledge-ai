"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, Play, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAccessToken } from "@/src/lib/auth-client";
import { AppButton } from "@/src/components/ui/app-button";
import { AppCard } from "@/src/components/ui/app-card";
import { AppPageHeader } from "@/src/components/shared/AppPageHeader";
import { EmptyState } from "@/src/components/ui/empty-state";
import { SkeletonCard } from "@/src/components/ui/skeleton-card";
import { cn } from "@/src/lib/utils";

type EvalRun = {
  id: string;
  status: string;
  passed_questions: number;
  total_questions: number;
  average_latency_ms: number | null;
  created_at: string;
};

type EvalSet = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  rag_eval_questions?: { id: string }[];
  rag_eval_runs?: EvalRun[];
};

export default function EvaluationsPage() {
  const [evalSets, setEvalSets] = useState<EvalSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  // Create set form
  const [setName, setSetName] = useState("");
  const [creatingSet, setCreatingSet] = useState(false);
  const [showCreateSet, setShowCreateSet] = useState(false);

  // Add question form
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [documentNames, setDocumentNames] = useState("");
  const [addingQuestion, setAddingQuestion] = useState(false);

  const api = async (path: string, init?: RequestInit) => {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication session expired.");
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Request failed");
    return data;
  };

  const load = async () => {
    try {
      setError(null);
      const data = await api("/api/evaluations");
      setEvalSets(data.evalSets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evaluations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createSet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setCreatingSet(true);
      await api("/api/evaluations", { method: "POST", body: JSON.stringify({ name: setName }) });
      setSetName("");
      setShowCreateSet(false);
      toast.success("Evaluation set created.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create evaluation set");
    } finally {
      setCreatingSet(false);
    }
  };

  const addQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSetId) return;
    try {
      setAddingQuestion(true);
      await api(`/api/evaluations/${selectedSetId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          question: questionText,
          expectedKeywords: splitCsv(keywords),
          expectedDocumentNames: splitCsv(documentNames),
        }),
      });
      setQuestionText("");
      setKeywords("");
      setDocumentNames("");
      toast.success("Golden question added.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add question");
    } finally {
      setAddingQuestion(false);
    }
  };

  const runEval = async (id: string) => {
    try {
      setRunningId(id);
      const result = await api(`/api/evaluations/${id}/run`, { method: "POST" });
      toast.success(`Evaluation complete: ${result.passed}/${result.total} checks passed.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Evaluation run failed");
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="admin-page">
      <AppPageHeader
        eyebrow="Answer quality"
        title="Evaluations"
        subtitle="Create golden questions and run deterministic retrieval checks before answer quality issues reach your team."
        aside={
          <AppButton
            type="button"
            onClick={() => setShowCreateSet((v) => !v)}
            className="shrink-0"
          >
            {showCreateSet ? <X size={16} /> : <Plus size={16} />}
            {showCreateSet ? "Cancel" : "New eval set"}
          </AppButton>
        }
      />

      {error && (
        <Alert className="rounded-2xl border-red-500/30 bg-red-500/10 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Create eval set panel */}
      {showCreateSet && (
        <AppCard className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">New evaluation set</h2>
          <form onSubmit={createSet} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label htmlFor="eval-set-name" className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)]">
                Set name
              </label>
              <Input
                id="eval-set-name"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="e.g. Cisco manual quality checks"
                className="h-11 rounded-xl border-[var(--line)] bg-[var(--surface)] text-sm shadow-sm focus-visible:border-[var(--accent-jade)] focus-visible:ring-[var(--accent-jade-100)]"
                required
              />
            </div>
            <AppButton
              type="submit"
              disabled={!setName.trim() || creatingSet}
              className="h-11 shrink-0"
            >
              {creatingSet ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Create set
            </AppButton>
          </form>
        </AppCard>
      )}

      {/* Add golden question panel */}
      {evalSets.length > 0 && (
        <AppCard className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Add golden question</h2>
          <form onSubmit={addQuestion} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <label htmlFor="eval-question" className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)]">
                Question
              </label>
              <Input
                id="eval-question"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="How do I transfer a call?"
                className="h-11 rounded-xl border-[var(--line)] bg-[var(--surface)] text-sm shadow-sm focus-visible:border-[var(--accent-jade)] focus-visible:ring-[var(--accent-jade-100)]"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="eval-docs" className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)]">
                Expected documents
              </label>
              <Input
                id="eval-docs"
                value={documentNames}
                onChange={(e) => setDocumentNames(e.target.value)}
                placeholder="doc1.pdf, doc2.pdf"
                className="h-11 rounded-xl border-[var(--line)] bg-[var(--surface)] text-sm shadow-sm focus-visible:border-[var(--accent-jade)] focus-visible:ring-[var(--accent-jade-100)]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="eval-keywords" className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)]">
                Expected keywords
              </label>
              <Input
                id="eval-keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="transfer, hold, extension"
                className="h-11 rounded-xl border-[var(--line)] bg-[var(--surface)] text-sm shadow-sm focus-visible:border-[var(--accent-jade)] focus-visible:ring-[var(--accent-jade-100)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)]">
                Eval set
              </label>
              <div className="flex gap-2">
                <Select value={selectedSetId ?? ""} onValueChange={(v) => setSelectedSetId(v || null)}>
                  <SelectTrigger className="h-11 min-w-[10rem] rounded-xl border-[var(--line)] bg-[var(--surface)] text-sm shadow-sm focus-visible:border-[var(--accent-jade)] focus-visible:ring-[var(--accent-jade-100)]">
                    <SelectValue placeholder="Choose set" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[var(--line)]">
                    {evalSets.map((set) => (
                      <SelectItem key={set.id} value={set.id}>{set.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AppButton
                  type="submit"
                  disabled={!selectedSetId || !questionText.trim() || addingQuestion}
                  className="h-11 shrink-0"
                >
                  {addingQuestion ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Add
                </AppButton>
              </div>
            </div>
          </form>
        </AppCard>
      )}

      {/* Eval sets list */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : evalSets.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No evaluation sets yet"
          description="Create your first evaluation set to start testing answer quality against golden questions."
          action={
            <AppButton type="button" onClick={() => setShowCreateSet(true)}>
              <Plus size={16} />
              Create first eval set
            </AppButton>
          }
        />
      ) : (
        <div className="grid gap-4">
          {evalSets.map((set) => {
            const latestRun = set.rag_eval_runs?.[0];
            const questionCount = set.rag_eval_questions?.length ?? 0;
            const passRate = latestRun && latestRun.total_questions > 0
              ? Math.round((latestRun.passed_questions / latestRun.total_questions) * 100)
              : null;

            return (
              <AppCard key={set.id} className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-[var(--ink)]">{set.name}</h2>
                      <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                        {questionCount} {questionCount === 1 ? "question" : "questions"}
                      </span>
                    </div>

                    {latestRun ? (
                      <>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                            latestRun.status === "completed"
                              ? passRate !== null && passRate >= 80
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                              : latestRun.status === "failed"
                                ? "border-red-500/30 bg-red-500/10 text-red-300"
                                : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-soft)]",
                          )}>
                            {latestRun.status === "completed" && <CheckCircle2 size={10} />}
                            {latestRun.status}
                          </span>
                          {passRate !== null && (
                            <span className="text-xs font-semibold text-[var(--ink-soft)]">
                              {latestRun.passed_questions}/{latestRun.total_questions} passed
                              {" · "}
                              <span className={passRate >= 80 ? "text-emerald-300" : "text-amber-300"}>
                                {passRate}%
                              </span>
                            </span>
                          )}
                          {latestRun.average_latency_ms && (
                            <span className="text-xs text-[var(--ink-muted)]">
                              {latestRun.average_latency_ms}ms avg
                            </span>
                          )}
                          <span className="text-xs text-[var(--ink-muted)]">
                            {new Date(latestRun.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        {passRate !== null && (
                          <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--surface-2)]">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                passRate >= 80
                                  ? "bg-emerald-400"
                                  : "bg-amber-400",
                              )}
                              style={{ width: `${Math.max(4, passRate)}%` }}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-[var(--ink-muted)]">No runs yet</p>
                    )}
                  </div>

                  <AppButton
                    type="button"
                    tone="secondary"
                    onClick={() => runEval(set.id)}
                    disabled={runningId === set.id || questionCount === 0}
                    className="shrink-0"
                  >
                    {runningId === set.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Play size={15} />
                    )}
                    {runningId === set.id ? "Running..." : "Run evaluation"}
                  </AppButton>
                </div>
              </AppCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function splitCsv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
