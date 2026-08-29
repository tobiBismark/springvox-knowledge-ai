"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, FileText, MessageSquare, Users } from "lucide-react";

import { fetchPlatformJson } from "@/src/lib/platform-client";
import {
  PlanBadge,
  StatusBadge,
} from "@/src/components/platform/PlatformBadges";
import { PlatformPageHeader } from "@/src/components/platform/PlatformPageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppCard, AppCardContent } from "@/src/components/ui/app-card";
import { StatCard } from "@/src/components/ui/stat-card";

type SummaryResponse = {
  totals: {
    totalWorkspaces: number;
    activeWorkspaces: number;
    suspendedWorkspaces: number;
    trialWorkspaces: number;
    totalUsers: number;
    totalDocuments: number;
    totalQuestions: number;
    totalUnansweredQuestions: number;
    totalFeedback: number;
    newCompaniesLast7Days: number;
    questionsLast7Days: number;
  };
  topCompaniesByQuestions: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    totalQuestions: number;
  }>;
  companiesByOpenQuestions: Array<{
    id: string;
    name: string;
    slug: string;
    openKnowledgeGaps: number;
  }>;
  recentCompanies: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    plan: string;
    created_at: string;
  }>;
};

const EMPTY_DATA: SummaryResponse = {
  totals: {
    totalWorkspaces: 0,
    activeWorkspaces: 0,
    suspendedWorkspaces: 0,
    trialWorkspaces: 0,
    totalUsers: 0,
    totalDocuments: 0,
    totalQuestions: 0,
    totalUnansweredQuestions: 0,
    totalFeedback: 0,
    newCompaniesLast7Days: 0,
    questionsLast7Days: 0,
  },
  topCompaniesByQuestions: [],
  companiesByOpenQuestions: [],
  recentCompanies: [],
};

export default function PlatformOverviewPage() {
  const [data, setData] = useState<SummaryResponse>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchPlatformJson<SummaryResponse>(
          "/api/platform/summary",
        );
        setData(result);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load platform summary",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const cards = [
    { label: "Companies", value: data.totals.totalWorkspaces, icon: Building2 },
    { label: "Platform users", value: data.totals.totalUsers, icon: Users },
    {
      label: "Uploaded documents",
      value: data.totals.totalDocuments,
      icon: FileText,
    },
    {
      label: "Questions asked",
      value: data.totals.totalQuestions,
      icon: MessageSquare,
    },
  ];

  return (
    <div className="admin-page">
      <PlatformPageHeader
        title="Platform Overview"
        subtitle="Monitor companies, users, plans, and workspace status."
      />

      {error && (
        <Alert className="rounded-2xl border-red-500/30 bg-red-500/10 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            meta={loading ? "Updating" : undefined}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AppCard className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                Recent companies
              </p>
              <h2 className="mt-1 text-lg font-bold text-[var(--ink)]">
                Newest workspaces
              </h2>
            </div>
            <Link
              href="/platform/companies"
              className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-jade)] hover:text-[var(--accent-jade)]"
            >
              View all
            </Link>
          </div>
          <AppCardContent className="space-y-3 px-0 pb-0">
            {data.recentCompanies.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">
                No companies created yet.
              </p>
            ) : (
              data.recentCompanies.map((company) => (
                <div
                  key={company.id}
                  className="border-b border-[var(--line)] py-3 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Link
                        href={`/platform/companies/${company.id}`}
                        className="text-sm font-semibold text-[var(--ink)] hover:text-[var(--accent-jade)]"
                      >
                        {company.name}
                      </Link>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {company.slug}
                      </p>
                    </div>
                    <StatusBadge status={company.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <PlanBadge plan={company.plan} />
                    <span className="text-xs text-[var(--ink-muted)]">
                      {formatDate(company.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </AppCardContent>
        </AppCard>

        <div className="space-y-5">
          <AppCard className="p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
              Platform activity
            </p>
            <div className="mt-4 space-y-3">
              <MetricRow
                label="New companies in last 7 days"
                value={data.totals.newCompaniesLast7Days}
              />
              <MetricRow
                label="Questions in last 7 days"
                value={data.totals.questionsLast7Days}
              />
              <MetricRow
                label="Open unanswered questions"
                value={data.totals.totalUnansweredQuestions}
              />
              <MetricRow
                label="Feedback submitted"
                value={data.totals.totalFeedback}
              />
            </div>
          </AppCard>

          <AppCard className="p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
              Status distribution
            </p>
            <div className="mt-4 space-y-3">
              {[
                {
                  label: "Active",
                  count: data.totals.activeWorkspaces,
                  status: "active",
                },
                {
                  label: "Trial",
                  count: data.totals.trialWorkspaces,
                  status: "trial",
                },
                {
                  label: "Suspended",
                  count: data.totals.suspendedWorkspaces,
                  status: "suspended",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between border-b border-[var(--line)] py-2.5 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={item.status} />
                    <span className="text-sm font-medium text-[var(--ink-soft)]">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-[var(--ink)]">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] py-2.5 last:border-b-0">
      <span className="text-sm font-medium text-[var(--ink-soft)]">
        {label}
      </span>
      <span className="text-lg font-bold text-[var(--ink)]">{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
