"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppButtonTone =
  | "primary"
  | "secondary"
  | "subtle"
  | "ghost"
  | "destructive";

const toneClasses: Record<AppButtonTone, string> = {
  primary:
    "border-transparent bg-[var(--accent-jade)] text-[#04110e] shadow-none hover:bg-[var(--accent-jade-hover)] disabled:border-[var(--line)] disabled:bg-[var(--surface-2)] disabled:text-[var(--ink-muted)]",
  secondary:
    "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent-jade-200)] hover:bg-[var(--accent-jade-50)] hover:text-[var(--accent-jade-hover)] disabled:bg-[var(--surface-2)] disabled:text-[var(--ink-muted)]",
  subtle:
    "border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)] text-[var(--accent-jade)] hover:border-[var(--accent-jade-200)] hover:bg-[var(--accent-jade-100)] disabled:border-[var(--line)] disabled:bg-[var(--surface-2)] disabled:text-[var(--ink-muted)]",
  ghost:
    "border-transparent bg-transparent text-[var(--ink-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] disabled:text-[var(--ink-muted)]",
  destructive:
    "border-red-500/30 bg-red-500/10 text-red-300 hover:border-red-300 hover:bg-red-500/20 disabled:border-[var(--line)] disabled:bg-[var(--surface-2)] disabled:text-[var(--ink-muted)]",
};

export function AppButton({
  tone = "primary",
  className,
  ...props
}: React.ComponentProps<typeof Button> & { tone?: AppButtonTone }) {
  return (
    <Button
      className={cn(
        "h-11 rounded-lg px-4 text-sm font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent-jade-100)]",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
