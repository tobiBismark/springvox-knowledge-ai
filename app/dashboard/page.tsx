"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  FileText,
  MessageSquare,
  Upload,
  Users,
} from "lucide-react";

import { getAccessToken, getCurrentUserProfile } from "@/src/lib/auth-client";
import { cn } from "@/src/lib/utils";
import { greetingForHour, timeAgo } from "@/src/lib/utils";
import { type UserProfile } from "@/src/lib/workspace";
import { AppPageHeader } from "@/src/components/shared/AppPageHeader";
import { AppButton } from "@/src/components/ui/app-button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { StatCard } from "@/src/components/ui/stat-card";

type AnalyticsSummary = {
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  totalChunks: number;
  totalQuestions: number;
  questionsLast7Days: number;
  openKnowledgeGaps: number;
  totalUsers: number;
  viewers: number;
  tenantAdmins: number;
  platformAdmins: number;
  pendingInvitations: number;
  totalFeedback: number;
  helpfulFeedback: number;
  negativeFeedback: number;
};

type AnalyticsResponse = {
  workspace: { name: string; assistant_name: string | null } | null;
  summary: AnalyticsSummary;
  recentQuestions: Array<{
    id: string;
    question: string;
    user_email: string;
    had_sources: boolean;
    knowledge_gap: boolean;
    created_at: string;
  }>;
  recentKnowledgeGaps: Array<{
    id: string;
    question: string;
    occurrence_count: number;
    status: string;
  }>;
};

const EMPTY_SUMMARY: AnalyticsSummary = {
  totalDocuments: 0,
  completedDocuments: 0,
  failedDocuments: 0,
  totalChunks: 0,
  totalQuestions: 0,
  questionsLast7Days: 0,
  openKnowledgeGaps: 0,
  totalUsers: 0,
  viewers: 0,
  tenantAdmins: 0,
  platformAdmins: 0,
  pendingInvitations: 0,
  totalFeedback: 0,
  helpfulFeedback: 0,
  negativeFeedback: 0,
};

function HealthBar({
  value,
  tone = "jade",
}: {
  value: number;
  tone?: "jade" | "amber" | "red";
}) {
  const fill =
    tone === "jade"
      ? "bg-[var(--accent-jade)]"
      : tone === "amber"
        ? "bg-amber-400/80"
        : "bg-red-400/80";

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
      <div
        className={cn("h-full rounded-full transition-all", fill)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function DashboardOverview() {
  const [summary, setSummary] = useState<AnalyticsSummary>(EMPTY_SUMMARY);
  const [recentQuestions, setRecentQuestions] = useState<
    AnalyticsResponse["recentQuestions"]
  >([]);
  const [recentKnowledgeGaps, setRecentKnowledgeGaps] = useState<
    AnalyticsResponse["recentKnowledgeGaps"]
  >([]);
  const [workspaceName, setWorkspaceName] = useState("Your Workspace");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      const currentProfile = await getCurrentUserProfile();
      setProfile(currentProfile);

      if (!currentProfile || currentProfile.role === "viewer") {
        setLoading(false);
        return;
      }

      const accessToken = await getAccessToken();
      if (!accessToken) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/analytics/summary", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        setLoading(false);
        return;
      }

      const data = (await response.json()) as AnalyticsResponse;
      setSummary(data.summary || EMPTY_SUMMARY);
      setRecentQuestions(data.recentQuestions || []);
      setRecentKnowledgeGaps(data.recentKnowledgeGaps || []);
      setWorkspaceName(data.workspace?.name || "Your Workspace");
      setLoading(false);
    }

    fetchSummary();
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return greetingForHour(hour);
  }, []);

  if (profile?.role === "viewer") {
    return null;
  }

  const cards = [
    {
      title: "Documents ready",
      value: summary.completedDocuments,
      icon: FileText,
    },
    {
      title: "Questions asked",
      value: summary.totalQuestions,
      icon: MessageSquare,
      meta: `${summary.questionsLast7Days} in 7 days`,
    },
    {
      title: "Team members",
      value: summary.totalUsers,
      icon: Users,
      meta: `${summary.pendingInvitations} pending`,
    },
    {
      title: "Open gaps",
      value: summary.openKnowledgeGaps,
      icon: CircleAlert,
      alert: summary.openKnowledgeGaps > 0,
      meta: summary.openKnowledgeGaps > 0 ? "Needs attention" : undefined,
    },
  ];

  const quickActions = [
    {
      href: "/dashboard/chat",
      icon: MessageSquare,
      label: "Ask a question",
      description: "Chat with your documents",
    },
    {
      href: "/dashboard/upload",
      icon: Upload,
      label: "Upload documents",
      description: "Add new approved files",
    },
    {
      href: "/dashboard/documents",
      icon: FileText,
      label: "Manage documents",
      description: "Review and organise files",
    },
    {
      href: "/dashboard/users",
      icon: Users,
      label: "Invite your team",
      description: "Add workspace members",
    },
  ];

  const readinessPct =
    summary.totalDocuments > 0
      ? Math.round((summary.completedDocuments / summary.totalDocuments) * 100)
      : 0;
  const sourcedCount = recentQuestions.filter((q) => q.had_sources).length;
  const coveragePct =
    recentQuestions.length > 0
      ? Math.round((sourcedCount / recentQuestions.length) * 100)
      : null;
  const hasDocuments = summary.totalDocuments > 0;

  if (loading) {
    return (
      <div className="admin-page animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-2/3 max-w-md rounded-lg bg-[var(--surface-2)]" />
          <div className="h-4 w-1/2 max-w-sm rounded bg-[var(--surface-2)]" />
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="h-4 w-40 rounded bg-[var(--surface-2)]" />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item}>
                <div className="h-3 w-20 rounded bg-[var(--surface-2)]" />
                <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-32 rounded-2xl border border-[var(--line)] bg-[var(--surface)]"
            />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
          <div className="h-72 rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
          <div className="space-y-4">
            <div className="h-40 rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
            <div className="h-40 rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <AppPageHeader
        title={`${greeting}, ${workspaceName}`}
        subtitle={
          hasDocuments
            ? `You have ${summary.completedDocuments} documents ready and ${summary.totalQuestions} questions answered for your team.`
            : "Upload your first documents to start answering questions from your company knowledge."
        }
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <AppButton asChild tone="primary">
              <Link href="/dashboard/chat">
                <MessageSquare size={15} />
                Ask a question
              </Link>
            </AppButton>
            <AppButton asChild tone="secondary">
              <Link href="/dashboard/upload">
                <Upload size={15} />
                Upload documents
              </Link>
            </AppButton>
          </div>
        }
      />

      {/* Workspace health strip */}
      <section className="admin-shell-card px-5 py-5 sm:px-6">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--ink)]">
              Workspace health
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              A quick read on your knowledge base.
            </p>
          </div>
          <Link
            href="/dashboard/analytics"
            className="shrink-0 text-xs font-medium text-[var(--accent-jade)] transition-colors hover:text-[var(--accent-jade-hover)]"
          >
            View analytics
          </Link>
        </header>
        <div className="grid gap-x-6 gap-y-6 sm:grid-cols-3">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                Documents ready
              </p>
              <p className="text-xs font-medium text-[var(--ink)]">
                {summary.completedDocuments}/{summary.totalDocuments}
                {summary.failedDocuments > 0 && (
                  <span className="ml-1.5 text-red-300">
                    {summary.failedDocuments} failed
                  </span>
                )}
              </p>
            </div>
            <div className="mt-2.5">
              <HealthBar
                value={readinessPct}
                tone={
                  readinessPct === 100
                    ? "jade"
                    : readinessPct > 0
                      ? "amber"
                      : "red"
                }
              />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                Questions with sources
              </p>
              <p className="text-xs font-medium text-[var(--ink)]">
                {coveragePct === null ? "—" : `${coveragePct}%`}
              </p>
            </div>
            <div className="mt-2.5">
              <HealthBar
                value={coveragePct ?? 0}
                tone={
                  coveragePct === null || coveragePct < 50 ? "amber" : "jade"
                }
              />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                Open knowledge gaps
              </p>
              <p
                className={cn(
                  "text-xs font-medium",
                  summary.openKnowledgeGaps > 0
                    ? "text-red-300"
                    : "text-[var(--ink)]",
                )}
              >
                {summary.openKnowledgeGaps}
              </p>
            </div>
            <div className="mt-2.5">
              <HealthBar
                value={Math.min(100, summary.openKnowledgeGaps * 20)}
                tone={summary.openKnowledgeGaps > 0 ? "red" : "jade"}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} href="/dashboard/analytics" className="block">
            <StatCard
              label={card.title}
              value={card.value}
              icon={card.icon}
              meta={card.meta}
              className={cn(
                "transition-colors hover:border-[var(--accent-jade-100)]",
                card.alert && "border-red-500/30",
              )}
            />
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr] lg:gap-5">
        {/* Recent questions */}
        <section className="admin-shell-card px-5 py-5 sm:px-6">
          <header className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--ink)]">
                Recent questions
              </h2>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                What your team has been asking.
              </p>
            </div>
            <Link
              href="/dashboard/analytics"
              className="shrink-0 text-xs font-medium text-[var(--accent-jade)] transition-colors hover:text-[var(--accent-jade-hover)]"
            >
              View all
            </Link>
          </header>
          {recentQuestions.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No questions yet"
              description="Activity appears here once your team starts asking."
              action={
                <AppButton asChild tone="subtle" className="h-10">
                  <Link href="/dashboard/chat">Ask the first question</Link>
                </AppButton>
              }
              className="border-0 bg-transparent py-10"
            />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {recentQuestions.slice(0, 6).map((question) => (
                <li
                  key={question.id}
                  className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[11px] font-semibold text-[var(--ink-muted)]">
                    {(question.user_email || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm leading-6 text-[var(--ink)]">
                      {question.question}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[var(--ink-muted)]">
                      <span>
                        {question.user_email
                          ? question.user_email.split("@")[0]
                          : "Workspace member"}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{timeAgo(question.created_at)}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      question.knowledge_gap
                        ? "bg-red-500/10 text-red-300"
                        : question.had_sources
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-[var(--surface-2)] text-[var(--ink-muted)]",
                    )}
                  >
                    {question.knowledge_gap
                      ? "Gap"
                      : question.had_sources
                        ? "Sourced"
                        : "No answer"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Side rail: quick actions + top gaps */}
        <aside className="space-y-4">
          <section className="admin-shell-card px-5 py-5 sm:px-6">
            <h2 className="mb-4 text-base font-semibold text-[var(--ink)]">
              Quick actions
            </h2>
            <div className="divide-y divide-[var(--line)]">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-3 py-3 text-left transition-colors hover:text-[var(--ink)]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--canvas-soft)] text-[var(--ink-muted)] transition-colors group-hover:border-[var(--accent-jade-100)] group-hover:text-[var(--accent-jade)]">
                    <action.icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--ink)]">
                      {action.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="shrink-0 text-[var(--ink-muted)] opacity-60 transition-opacity group-hover:opacity-100"
                  />
                </Link>
              ))}
            </div>
          </section>

          {summary.openKnowledgeGaps > 0 && recentKnowledgeGaps.length > 0 && (
            <section className="admin-shell-card px-5 py-5 sm:px-6">
              <header className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-[var(--ink)]">
                  Top knowledge gaps
                </h2>
                <Link
                  href="/dashboard/knowledge-gaps"
                  className="shrink-0 text-xs font-medium text-[var(--accent-jade)] transition-colors hover:text-[var(--accent-jade-hover)]"
                >
                  Resolve
                </Link>
              </header>
              <ul className="divide-y divide-[var(--line)]">
                {recentKnowledgeGaps.slice(0, 4).map((gap) => (
                  <li
                    key={gap.id}
                    className="flex items-start gap-2.5 py-3 first:pt-0 last:pb-0"
                  >
                    <span
                      title={`Asked ${gap.occurrence_count} times`}
                      className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/10 px-1 text-[10px] font-semibold text-red-300"
                    >
                      {gap.occurrence_count}
                    </span>
                    <p className="line-clamp-2 text-xs leading-5 text-[var(--ink-soft)]">
                      {gap.question}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
