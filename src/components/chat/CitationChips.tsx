"use client";

import { FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { truncate } from "@/src/lib/utils";
import type { Citation } from "@/app/dashboard/chat/page";

type CitationChipsProps = {
  citations: Citation[];
  onOpenSource: (citation: Citation) => void;
  onShowAll: () => void;
  compact?: boolean;
};

export function CitationChips({
  citations,
  onOpenSource,
  onShowAll,
  compact = true,
}: CitationChipsProps) {
  if (citations.length === 0) {
    return null;
  }

  const unique = citations
    .filter(
      (citation, index, all) =>
        all.findIndex(
          (item) =>
            item.filename === citation.filename &&
            item.chunk_index === citation.chunk_index,
        ) === index,
    )
    .slice(0, compact ? 4 : 10);

  return (
    <div className="sm:pl-10">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
        <ShieldCheck size={12} className="text-[var(--accent-jade)]" />
        Sources
      </div>
      <div className="flex flex-wrap gap-2">
        {unique.map((citation) => (
          <button
            key={`${citation.filename}-${citation.chunk_index}`}
            type="button"
            onClick={() => onOpenSource(citation)}
            aria-label={`Open source ${citation.filename} section ${citation.chunk_index}`}
            className={cn(
              "group inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left text-xs transition-colors",
              "shadow-sm hover:border-[var(--accent-jade-100)] hover:bg-[var(--accent-jade-50)]",
            )}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--accent-jade-50)] text-[10px] font-bold text-[var(--accent-jade)]">
              {citation.chunk_index + 1}
            </span>
            <span className="min-w-0 max-w-[160px] truncate font-medium text-[var(--ink-soft)] group-hover:text-[var(--ink)]">
              {truncate(citation.filename, 24)}
            </span>
          </button>
        ))}
        {citations.length > unique.length && (
          <button
            type="button"
            onClick={onShowAll}
            className="inline-flex items-center rounded-xl border border-transparent px-3 py-2 text-xs font-semibold text-[var(--accent-jade)] transition-colors hover:border-[var(--accent-jade-100)] hover:bg-[var(--accent-jade-50)]"
          >
            +{citations.length - unique.length} more
          </button>
        )}
      </div>
    </div>
  );
}
