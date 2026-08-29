"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, ChevronsUpDown, LogOut, UserCircle } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/src/lib/utils";

type ProfileMenuProps = {
  email: string | null;
  roleLabel: string;
  displayName: string;
  helpHref: string;
  onLogout: () => void;
};

export function ProfileMenu({
  email,
  roleLabel,
  displayName,
  helpHref,
  onLogout,
}: ProfileMenuProps) {
  const initial = (email || displayName || "U").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${displayName || email || "user"}`}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--canvas-soft)] px-3 py-2.5 text-left transition",
            "hover:border-[var(--accent-jade-100)] hover:bg-[var(--surface-2)]",
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-jade)] text-xs font-bold text-[#04110e]">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-[var(--ink)]" title={displayName || email || ""}>
              {displayName}
            </span>
            <span className="block text-[11px] font-medium text-[var(--ink-muted)]">
              {roleLabel}
            </span>
          </span>
          <ChevronsUpDown size={14} className="shrink-0 text-[var(--ink-muted)]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={8}
        className="min-w-[13rem] bg-[var(--surface)] text-[var(--ink)]"
      >
        <DropdownMenuLabel className="px-2.5 py-2">
          <span className="block truncate text-sm font-semibold text-[var(--ink)]" title={email || ""}>
            {email || displayName}
          </span>
          <span className="mt-0.5 block text-xs font-medium text-[var(--ink-muted)]">
            {roleLabel}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--line)]" />

        <DropdownMenuItem asChild className="gap-2.5 text-[var(--ink-soft)] focus:bg-[var(--surface-2)] focus:text-[var(--ink)]">
          <Link href="/dashboard/account">
            <UserCircle size={15} className="text-[var(--ink-muted)]" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2.5 text-[var(--ink-soft)] focus:bg-[var(--surface-2)] focus:text-[var(--ink)]">
          <Link href={helpHref}>
            <BookOpen size={15} className="text-[var(--ink-muted)]" />
            Help &amp; Guides
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[var(--line)]" />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onLogout()}
          className="gap-2.5 text-red-300 focus:bg-red-500/10 focus:text-red-300"
        >
          <LogOut size={15} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
