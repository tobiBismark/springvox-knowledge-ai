"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { cn } from "@/src/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type CommandAction = {
  id: string;
  label: string;
  group: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  href?: string;
  onSelect?: () => void;
  keywords?: string[];
  shortcut?: string;
};

type CommandPaletteProps = {
  actions: CommandAction[];
  /** Extra keyboard shortcuts that toggle the palette, e.g. "g" for "go to". */
  openShortcuts?: string[];
};

export function CommandPalette({
  actions,
  openShortcuts = ["k"],
}: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isModifier = event.metaKey || event.ctrlKey;

      if (isModifier && openShortcuts.includes(key)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }

      if (!isModifier && key === "escape" && open) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, openShortcuts]);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleSelect = (action: CommandAction) => {
    setOpen(false);
    if (action.onSelect) {
      action.onSelect();
    } else if (action.href) {
      router.push(action.href);
    }
  };

  const groups = React.useMemo(() => {
    const grouped = new Map<string, CommandAction[]>();
    for (const action of actions) {
      const list = grouped.get(action.group) ?? [];
      list.push(action);
      grouped.set(action.group, list);
    }
    return Array.from(grouped.entries());
  }, [actions]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="!top-[16%] w-[calc(100vw-1.5rem)] max-w-xl !translate-y-0 gap-0 p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <CommandPrimitive className="overflow-hidden rounded-xl bg-[var(--surface)] text-[var(--ink)]">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-4">
            <Search size={16} className="shrink-0 text-[var(--ink-muted)]" />
            <CommandPrimitive.Input
              placeholder="Search pages and actions…"
              className="h-12 min-w-0 flex-1 bg-transparent py-4 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
            />
            <kbd className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ink-muted)]">
              ESC
            </kbd>
          </div>

          <CommandPrimitive.List className="max-h-96 overflow-y-auto p-1.5">
            <CommandPrimitive.Empty className="py-10 text-center text-sm text-[var(--ink-muted)]">
              No results found.
            </CommandPrimitive.Empty>

            {groups.map(([group, items]) => (
              <CommandPrimitive.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-[var(--ink-muted)]"
              >
                {items.map((action) => (
                  <CommandPrimitive.Item
                    key={action.id}
                    value={`${action.label} ${action.keywords?.join(" ") ?? ""}`}
                    onSelect={() => handleSelect(action)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-[var(--ink-soft)] outline-none",
                      "aria-selected:bg-[var(--accent-jade-50)] aria-selected:text-[var(--ink)]",
                    )}
                  >
                    {action.icon ? (
                      <action.icon
                        size={16}
                        className="shrink-0 text-[var(--ink-muted)]"
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{action.label}</span>
                    {action.shortcut ? (
                      <kbd className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ink-muted)]">
                        {action.shortcut}
                      </kbd>
                    ) : null}
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
