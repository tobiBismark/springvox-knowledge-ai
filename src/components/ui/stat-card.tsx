"use client";

import * as React from "react";
import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppCard, AppCardContent } from "@/src/components/ui/app-card";

export function StatCard({
  label,
  value,
  icon: Icon,
  meta,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <AppCard className={cn(className)}>
      <AppCardContent className="flex items-center gap-3 px-4 py-3">
        {Icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--canvas-soft)] text-[var(--accent-jade)]">
            <Icon size={15} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {label}
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--ink)]">
              {value}
            </h3>
            {meta ? (
              <div className="truncate text-[10px] font-medium text-[var(--ink-muted)]">
                {meta}
              </div>
            ) : null}
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}
