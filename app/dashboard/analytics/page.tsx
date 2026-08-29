"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  FileText,
  MessageSquare,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getAccessToken, getCurrentUserProfile } from "@/src/lib/auth-client";
import { cn } from "@/src/lib/utils";
import { OverflowGuard } from "@/src/components/layout/OverflowGuard";
import { isWorkspaceAdminRole, type UserProfile } from "@/src/lib/workspace";
import { AppPageHeader } from "@/src/components/shared/AppPageHeader";
import { EmptyState } from "@/src/components/ui/empty-state";
import { StatCard } from "@/src/components/ui/stat-card";
import { SkeletonKpiGrid, SkeletonCard } from "@/src/components/ui/skeleton-card";

type AnalyticsData = {
  workspace: { name: string; assistant_name: string | null } | null;
  summary: Record<string, number>;
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
    last_asked_at: string;
  }>;
  dailyQuestionCounts: Array<{ date: string; count: number }>;
  feedbackSummary: {
    recentNegativeFeedback: Array<{
      id: string;
      rating: string;
      created_at: string;
      chat_message_id: string | null;
    }>;
  };
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      const currentProfile = await getCurrentUserProfile();
      setProfile(currentProfile);

      if (!currentProfile || !isWorkspaceAdminRole(currentProfile.role)) {
        router.replace("/dashboard/chat");
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
        setError("Failed to load analytics");
        setLoading(false);
        return;
      }

      setData(await response.json());
      setLoading(false);
    }

    loadAnalytics();
  }, [router]);

  if (profile && !isWorkspaceAdminRole(profile.role)) {
    return null;
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--surface-2)]" />
        <SkeletonKpiGrid count={4} />
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),340px]">
          <SkeletonCard className="h-64" />
          <div className="flex flex-col gap-6">
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <p className="text-sm font-bold text-red-300">
          {error || "Analytics unavailable."}
        </p>
      </div>
    );
  }

  const totalQuestions = data.summary.totalQuestions || 0;
  const sourceBacked = data.summary.sourceBackedAnswers || 0;
  const fallback = data.summary.fallbackAnswers || 0;
  const gapRate = totalQuestions
    ? Math.round((fallback / totalQuestions) * 100)
    : 0;
  const healthScore = Math.max(0, 100 - gapRate);
  const recentNegativeFeedback =
    data.feedbackSummary.recentNegativeFeedback.length || 0;

  const pieData = [
    { name: "Answers with sources", value: sourceBacked, color: "var(--accent-jade)" },
    { name: "No answer found", value: fallback, color: "var(--line)" },
  ];

  const userSummaryData = [
    { label: "Users", value: data.summary.totalUsers || 0 },
    { label: "Admins", value: data.summary.tenantAdmins || 0 },
    { label: "Invites", value: data.summary.pendingInvitations || 0 },
  ];

  const hasRecentQuestions = data.recentQuestions.length > 0;
  const hasKnowledgeGaps = data.recentKnowledgeGaps.length > 0;

  return (
    <div className="admin-page">
      <AppPageHeader
        title="Analytics"
        subtitle="Track usage, answer coverage, and knowledge gaps."
        aside={
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
              Answer coverage
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg font-bold text-[var(--ink)]">
                {healthScore}%
              </span>
              <TrendingUp size={14} className="text-emerald-500" />
            </div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Documents uploaded"
          value={data.summary.totalDocuments || 0}
          icon={FileText}
          meta={`${data.summary.totalChunks || 0} sections`}
          className="transition-all hover:border-[var(--accent-jade-100)] hover:shadow-[var(--brand-shadow)]"
        />
        <StatCard
          label="Questions asked"
          value={data.summary.totalQuestions || 0}
          icon={MessageSquare}
          meta={`${data.summary.questionsLast7Days || 0} in 7 days`}
          className="transition-all hover:border-[var(--accent-jade-100)] hover:shadow-[var(--brand-shadow)]"
        />
        <StatCard
          label="Unanswered questions"
          value={data.summary.openKnowledgeGaps || 0}
          icon={Search}
          meta={<TrendingDown size={14} className="text-red-500" />}
          className="transition-all hover:border-[var(--accent-jade-100)] hover:shadow-[var(--brand-shadow)]"
        />
        <StatCard
          label="Answers with sources"
          value={`${healthScore}%`}
          icon={ShieldCheck}
          meta={<TrendingUp size={14} className="text-emerald-500" />}
          className="transition-all hover:border-[var(--accent-jade-100)] hover:shadow-[var(--brand-shadow)]"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Recent feedback flags
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink)]">
            {recentNegativeFeedback}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Recent responses marked as not helpful.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Pending invites
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink)]">
            {data.summary.pendingInvitations || 0}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Team members still waiting to join this workspace.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            No answer rate
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink)]">
            {gapRate}%
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Questions that still need better document support.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),340px]">
        <div className="admin-shell-card p-4 sm:p-5 lg:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)]">
                <BarChart3 size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
                  Question activity
                </h2>
                <p className="text-sm text-[var(--ink-muted)]">
                  Last 14 days of question volume.
                </p>
              </div>
            </div>
          </div>

          {data.dailyQuestionCounts.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No activity data yet"
              description="Activity will appear here after questions are asked."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <div className="min-w-0 w-full">
              <ResponsiveContainer width="100%" height={240} minWidth={1}>
                <AreaChart data={data.dailyQuestionCounts}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--accent-jade)"
                        stopOpacity={0.18}
                      />
                      <stop offset="95%" stopColor="var(--accent-jade)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--line-soft)"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: "var(--ink-muted)" }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: "var(--ink-muted)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid var(--line)",
                      backgroundColor: "var(--surface)",
                      boxShadow: "var(--brand-shadow)",
                      fontSize: "12px",
                      color: "var(--ink)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--accent-jade)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                    activeDot={{
                      r: 5,
                      fill: "var(--accent-jade-hover)",
                      stroke: "var(--surface)",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="admin-shell-card p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
                Answer summary
              </h2>
              <p className="text-sm text-[var(--ink-muted)]">
                Coverage of answers with source documents.
              </p>
            </div>

            <div className="relative min-w-0 w-full">
              <ResponsiveContainer width="100%" height={240} minWidth={1}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid var(--line)",
                      backgroundColor: "var(--surface)",
                      boxShadow: "var(--brand-shadow)",
                      fontSize: "12px",
                      color: "var(--ink)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[var(--ink)]">
                  {healthScore}%
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                  Covered
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {pieData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-semibold text-[var(--ink-soft)]">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[var(--ink)]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-shell-card p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)] text-[var(--accent-jade)]">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
                  Team summary
                </h2>
                <p className="text-sm text-[var(--ink-muted)]">
                  Users, admins, and pending invites.
                </p>
              </div>
            </div>

            <div className="min-w-0">
              <ResponsiveContainer width="100%" height={240} minWidth={1}>
                <BarChart data={userSummaryData}>
                  <CartesianGrid vertical={false} stroke="var(--line-soft)" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--ink-muted)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--ink-muted)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid var(--line)",
                      backgroundColor: "var(--surface)",
                      boxShadow: "var(--brand-shadow)",
                      fontSize: "12px",
                      color: "var(--ink)",
                    }}
                  />
                  <Bar dataKey="value" fill="var(--accent-jade)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="admin-shell-card overflow-hidden p-4 sm:p-5 lg:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
                Recent questions
              </h2>
              <p className="text-sm text-[var(--ink-muted)]">
                Latest questions from your team.
              </p>
            </div>
            <Link
              href="/dashboard/chat"
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
            >
              Open chat
              <ArrowRight size={12} />
            </Link>
          </div>

          {!hasRecentQuestions ? (
            <EmptyState
              icon={MessageSquare}
              title="No recent questions"
              description="Recent question activity will appear here."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <>
              <OverflowGuard className="hidden md:block" mode="scroll">
                <table className="app-table w-full min-w-170 border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                      <th className="pb-3 pr-4">Question</th>
                      <th className="pb-3 pr-4">Outcome</th>
                      <th className="pb-3 pr-4">Review</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line-soft)]">
                    {data.recentQuestions.map((item) => (
                      <tr
                        key={item.id}
                        className="group transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <td className="py-3 pr-4">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--ink)]">
                            {item.question}
                          </p>
                          <p
                            className="mt-1 truncate text-[11px] text-[var(--ink-muted)]"
                            title={item.user_email}
                          >
                            {item.user_email}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                              item.had_sources
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-soft)]",
                            )}
                          >
                            {item.had_sources
                              ? "Has sources"
                              : "No answer found"}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                              item.knowledge_gap
                                ? "text-red-300"
                                : "text-[var(--ink-muted)]",
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                item.knowledge_gap
                                  ? "bg-red-600"
                                  : "bg-[var(--ink-muted)]",
                              )}
                            />
                            {item.knowledge_gap ? "Needs review" : "Covered"}
                          </span>
                        </td>
                        <td className="py-3 text-[11px] font-semibold text-[var(--ink-muted)]">
                          {new Date(item.created_at).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </OverflowGuard>

              <div className="grid gap-3 md:hidden">
                {data.recentQuestions.slice(0, 6).map((item) => (
                  <div
                    key={`${item.id}-mobile`}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4"
                  >
                    <p className="text-sm font-semibold leading-snug text-[var(--ink)]">
                      {item.question}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        {item.had_sources ? "Has sources" : "No answer found"}
                      </span>
                      <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-3 truncate text-[11px] text-[var(--ink-muted)]">
                      {item.user_email}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="admin-shell-card p-4 sm:p-5 lg:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
              Unanswered questions
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              Knowledge gaps needing document coverage.
            </p>
          </div>

          <div className="space-y-3">
            {!hasKnowledgeGaps ? (
              <EmptyState
                icon={ShieldCheck}
                title="No unanswered questions"
                description="New knowledge gaps will appear here when questions need more document support."
                className="py-10"
              />
            ) : (
              data.recentKnowledgeGaps.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 transition-all hover:border-[var(--line)]"
                >
                  <p className="text-sm font-semibold leading-snug text-[var(--ink)]">
                    {item.question}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-300">
                        {item.status.replaceAll("_", " ")}
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--ink-muted)]">
                        {item.occurrence_count}{" "}
                        {item.occurrence_count === 1 ? "mention" : "mentions"}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-[var(--ink-muted)]">
                      {new Date(item.last_asked_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6">
            <Link
              href="/dashboard/knowledge-gaps"
              className="app-button-primary flex w-full py-3 text-xs uppercase tracking-[0.18em]"
            >
              View all unanswered questions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
