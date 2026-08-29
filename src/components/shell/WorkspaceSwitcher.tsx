"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Monitor } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/src/lib/utils";

type WorkspaceSwitcherProps = {
  workspaceName: string;
  isPlatformAdmin: boolean;
};

export function WorkspaceSwitcher({
  workspaceName,
  isPlatformAdmin,
}: WorkspaceSwitcherProps) {
  const initial = workspaceName.charAt(0).toUpperCase() || "W";

  const trigger = (
    <button
      type="button"
      aria-label={isPlatformAdmin ? "Switch workspace context" : "Current workspace"}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-left transition",
        isPlatformAdmin
          ? "hover:border-[var(--accent-jade-100)] hover:bg-[var(--surface-2)]"
          : "cursor-default",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-jade-50)] text-xs font-bold text-[var(--accent-jade)]">
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-[var(--ink)]">
          {workspaceName}
        </span>
        <span className="block text-[10px] font-medium text-[var(--ink-muted)]">
          Workspace
        </span>
      </span>
      {isPlatformAdmin ? (
        <ChevronsUpDown size={14} className="shrink-0 text-[var(--ink-muted)]" />
      ) : null}
    </button>
  );

  if (!isPlatformAdmin) {
    return trigger;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={8}
        className="min-w-[13rem] bg-[var(--surface)] text-[var(--ink)]"
      >
        <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-bold text-[var(--ink-muted)]">
          Context
        </DropdownMenuLabel>
        <DropdownMenuItem
          disabled
          className="gap-2.5 text-[var(--ink)]"
        >
          <Check size={15} className="text-[var(--accent-jade)]" />
          {workspaceName}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[var(--line)]" />
        <DropdownMenuItem
          asChild
          className="gap-2.5 text-[var(--ink-soft)] focus:bg-[var(--surface-2)] focus:text-[var(--ink)]"
        >
          <Link href="/platform">
            <Monitor size={15} className="text-[var(--ink-muted)]" />
            Platform console
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
