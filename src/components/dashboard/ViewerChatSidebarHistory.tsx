"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";

import { getAccessToken } from "@/src/lib/auth-client";
import { cn } from "@/src/lib/utils";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";

type ChatSessionSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

const CHAT_SESSION_EVENT = "springvox-chat-sessions-changed";

export function ViewerChatSidebarHistory({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSessionId = searchParams.get("session");
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions],
  );

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch("/api/chat/sessions", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load chats");
      }

      setSessions(data.sessions || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load chats.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const handleReload = () => {
      void loadSessions();
    };

    window.addEventListener(CHAT_SESSION_EVENT, handleReload);
    return () => {
      window.removeEventListener(CHAT_SESSION_EVENT, handleReload);
    };
  }, [loadSessions]);

  const navigateToSession = (sessionId: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("session", sessionId);
    router.push(`${pathname}?${next.toString()}`);
    onNavigate?.();
  };

  const handleNewChat = async () => {
    setError(null);
    router.push(pathname);
    onNavigate?.();
  };

  const handleDelete = async () => {
    if (!deleteSessionId) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch(`/api/chat/sessions/${deleteSessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to delete chat");
      }

      const wasActive = activeSessionId === deleteSessionId;
      setDeleteSessionId(null);
      window.dispatchEvent(new Event(CHAT_SESSION_EVENT));
      await loadSessions();

      if (wasActive) {
        router.push(pathname);
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete chat.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-3 px-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
            Recent Chats
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--ink-muted)]">
              <Loader2
                size={14}
                className="animate-spin text-[var(--accent-jade)]"
              />
              Loading chats...
            </div>
          ) : sessions.length === 0 ? (
            <p className="px-3 text-sm text-[var(--ink-muted)]">No chats yet</p>
          ) : (
            <div className="space-y-1.5">
              {sessions.map((session) => {
                const isActive = session.id === activeSession?.id;

                return (
                  <div
                    key={session.id}
                    className={cn(
                      "group flex items-start gap-2 rounded-xl px-3 py-2.5 transition",
                      isActive
                        ? "bg-[var(--accent-jade-50)]"
                        : "hover:bg-[var(--canvas-soft)]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => navigateToSession(session.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-[0.42rem] h-1.5 w-1.5 shrink-0 rounded-full",
                            isActive
                              ? "bg-[var(--accent-jade)]"
                              : "bg-[var(--ink-muted)]",
                          )}
                        />
                        <span
                          className={cn(
                            "line-clamp-2 text-sm leading-5",
                            isActive
                              ? "text-[var(--ink)]"
                              : "text-[var(--ink-soft)]",
                          )}
                          title={session.title}
                        >
                          {session.title}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      aria-label={`Delete chat ${session.title}`}
                      onClick={() => setDeleteSessionId(session.id)}
                      className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--ink-muted)] opacity-0 transition hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error ? (
          <p className="mt-3 px-3 text-xs leading-5 text-red-300">{error}</p>
        ) : null}

        <div className="mt-5 border-t border-[var(--line)] pt-5">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)] text-sm font-semibold text-[var(--accent-jade-hover)] transition hover:border-[var(--accent-jade-200)] hover:bg-[var(--accent-jade-100)]"
          >
            <MessageSquarePlus size={16} />
            New chat
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteSessionId)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteSessionId(null);
          }
        }}
        title="Delete chat"
        description="This conversation will be removed from your chat history."
        confirmLabel="Delete chat"
        cancelLabel="Keep chat"
        confirmTone="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
