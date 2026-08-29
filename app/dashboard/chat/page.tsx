"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  History,
  Loader2,
  MessageSquarePlus,
  PanelLeftClose,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import {
  getAccessToken,
  getCurrentUserProfile,
  getCurrentWorkspaceSettings,
} from "@/src/lib/auth-client";
import { cn, truncate } from "@/src/lib/utils";
import {
  isWorkspaceAdminRole,
  type FeedbackRating,
  type UserProfile,
  type WorkspaceSettings,
} from "@/src/lib/workspace";
import { AppButton } from "@/src/components/ui/app-button";
import { BrandLogo } from "@/src/components/brand/BrandLogo";
import { ChatComposer } from "@/src/components/chat/ChatComposer";
import { ChatMessage } from "@/src/components/chat/ChatMessage";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { EmptyState } from "@/src/components/ui/empty-state";
import { FilePreviewDrawer } from "@/src/components/file-preview/FilePreviewDrawer";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";

export type Citation = {
  filename: string;
  chunk_index: number;
  preview: string;
  document_id?: string | null;
  chunk_text?: string;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
  document_category?: string | null;
  relevance_score?: number;
  confidence?: "high" | "medium" | "low";
};

type StoredChatMessage = {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  created_at: string;
};

type ChatSessionSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  citations?: Citation[];
  followUps?: string[];
  statusMessage?: string;
  confidence?: "high" | "medium" | "low";
  error?: boolean;
  chatMessageId?: string;
  feedbackSubmitted?: boolean;
  feedbackRating?: FeedbackRating | null;
};

const EMPTY_PROMPTS = [
  "Summarise the uploaded documents",
  "What services are mentioned?",
  "What policies should I know?",
  "What are the key points?",
];

const ANSWER_MODES = [
  { value: "summary", label: "Summary" },
  { value: "detailed", label: "Detailed" },
  { value: "executive", label: "Executive" },
  { value: "technical", label: "Technical" },
] as const;

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: {
  minHeight: number;
  maxHeight?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity),
      );
      textarea.style.height = `${newHeight}px`;
    },
    [maxHeight, minHeight],
  );

  useEffect(() => {
    if (textareaRef.current)
      textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

function mapStoredMessagesToThread(messages: StoredChatMessage[]): Message[] {
  return messages.flatMap((item) => [
    {
      id: `question-${item.id}`,
      role: "user" as const,
      content: item.question,
    },
    {
      id: `answer-${item.id}`,
      role: "ai" as const,
      content: item.answer,
      citations: Array.isArray(item.citations) ? item.citations : [],
      chatMessageId: item.id,
    },
  ]);
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSettings | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedSource, setSelectedSource] = useState<Citation | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    filename: string;
  } | null>(null);
  const [sourceDetails, setSourceDetails] = useState<Citation | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [feedbackLoadingMessageId, setFeedbackLoadingMessageId] = useState<
    string | null
  >(null);
  const [expandedFeedbackMessageId, setExpandedFeedbackMessageId] = useState<
    string | null
  >(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [desktopHistoryOpen, setDesktopHistoryOpen] = useState(true);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [answerMode, setAnswerMode] =
    useState<(typeof ANSWER_MODES)[number]["value"]>("detailed");
  const [collections, setCollections] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [scopeCollectionId, setScopeCollectionId] = useState<string>("all");
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [expandedSourceMessageId, setExpandedSourceMessageId] = useState<
    string | null
  >(null);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const typingQueueRef = useRef("");
  const typingIntervalRef = useRef<number | null>(null);
  const typingMessageIdRef = useRef<string | null>(null);
  const pendingCompletionRef = useRef<{
    messageId: string;
    payload: {
      answer: string;
      citations: Citation[];
      followUps: string[];
      chatMessageId?: string;
      statusMessage?: string;
      confidence?: "high" | "medium" | "low";
    };
  } | null>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 192,
  });
  const sessionParam = searchParams.get("session");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInput((prev) => {
            const trimmed = prev.trim();
            const connector = trimmed ? " " : "";
            return `${trimmed}${connector}${finalTranscript.trim()}`;
          });
          setTimeout(() => adjustHeight(), 10);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "aborted") {
          // 'aborted' is a benign lifecycle status triggered when stopping recognition programmatically
          return;
        }
        console.warn("Speech recognition warning:", event.error);
        setIsRecording(false);

        if (event.error === "not-allowed") {
          toast.error(
            "Microphone permission denied. Please allow microphone access in your browser settings.",
          );
        } else if (event.error === "network") {
          toast.error(
            "Network error during speech recognition. Please check your network connection.",
          );
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [adjustHeight]);

  const toggleRecording = () => {
    if (!speechSupported) {
      toast.error(
        "Speech recognition is not supported on this browser. Please try using Chrome, Edge, or Safari.",
      );
      return;
    }
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    async function loadChatContext() {
      try {
        const [currentProfile, currentWorkspace] = await Promise.all([
          getCurrentUserProfile(),
          getCurrentWorkspaceSettings(),
        ]);

        setProfile(currentProfile);
        setWorkspace(currentWorkspace);

        if (!currentProfile?.workspace_id) {
          setSessions([]);
          return;
        }

        await loadSessions();
      } catch (error) {
        setHistoryError(
          error instanceof Error
            ? error.message
            : "Unable to load chats right now.",
        );
      } finally {
        setHistoryLoading(false);
        setSessionsLoading(false);
      }
    }

    void loadChatContext();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch("/api/collections", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setCollections(
          (data.collections || []).map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          })),
        );
      } catch {
        // Collection scoping is optional.
      }
    })();
  }, []);

  useEffect(() => {
    if (sessionsLoading) {
      return;
    }

    if (!sessionParam) {
      setActiveSessionId(null);
      setMessages([]);
      setRetryQuestion(null);
      return;
    }

    if (sessionParam !== activeSessionId) {
      void loadSession(sessionParam, false);
    }
  }, [activeSessionId, sessionParam, sessionsLoading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, sourceDetails]);

  useEffect(() => {
    if (!loading) {
      setElapsedSeconds(0);
      return;
    }

    const interval = window.setInterval(() => {
      if (!startedAtRef.current) {
        return;
      }

      setElapsedSeconds((Date.now() - startedAtRef.current) / 1000);
    }, 100);

    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    return () => {
      stopTypingBuffer();
    };
  }, []);

  const loadSessions = async () => {
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
      throw new Error(data.error || "Failed to load chats");
    }

    setSessions(data.sessions || []);
  };

  const notifySessionSidebar = () => {
    window.dispatchEvent(new Event("springvox-chat-sessions-changed"));
  };

  const loadSession = async (sessionId: string, closeHistory = true) => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);

      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load chat");
      }

      setActiveSessionId(sessionId);
      setMessages(mapStoredMessagesToThread(data.messages || []));
      setRetryQuestion(null);
      if (sessionParam !== sessionId) {
        router.replace(`/dashboard/chat?session=${sessionId}`);
      }
      if (closeHistory) {
        setHistoryOpen(false);
      }
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Unable to load that chat.",
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const createNewChat = async () => {
    setHistoryError(null);
    setActiveSessionId(null);
    setMessages([]);
    setRetryQuestion(null);
    setInput("");
    adjustHeight(true);
    setHistoryOpen(false);
    router.replace("/dashboard/chat");
  };

  const deleteSession = async (sessionId: string) => {
    try {
      setHistoryError(null);
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete chat");
      }

      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
        setRetryQuestion(null);
        router.replace("/dashboard/chat");
      }

      setDeleteSessionId(null);
      await loadSessions();
      notifySessionSidebar();
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Unable to delete that chat.",
      );
    }
  };

  const handleCopyAnswer = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(id);
    window.setTimeout(
      () => setCopiedIndex((current) => (current === id ? null : current)),
      1800,
    );
  };

  const updateMessage = (
    messageId: string,
    updater: (message: Message) => Message,
  ) => {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId ? updater(message) : message,
      ),
    );
  };

  const stopTypingBuffer = () => {
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    typingQueueRef.current = "";
    typingMessageIdRef.current = null;
    pendingCompletionRef.current = null;
  };

  const finalizePendingCompletion = () => {
    const pending = pendingCompletionRef.current;
    if (!pending) {
      return;
    }

    updateMessage(pending.messageId, (message) => ({
      ...message,
      content: pending.payload.answer || message.content,
      citations: pending.payload.citations || [],
      followUps: pending.payload.followUps || [],
      statusMessage: pending.payload.statusMessage || message.statusMessage,
      confidence: pending.payload.confidence || message.confidence,
      chatMessageId: pending.payload.chatMessageId,
    }));

    pendingCompletionRef.current = null;
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    typingMessageIdRef.current = null;
  };

  const startTypingBuffer = (messageId: string) => {
    typingMessageIdRef.current = messageId;

    if (typingIntervalRef.current) {
      return;
    }

    typingIntervalRef.current = window.setInterval(() => {
      const activeId = typingMessageIdRef.current;
      if (!activeId) {
        stopTypingBuffer();
        return;
      }

      if (!typingQueueRef.current) {
        if (pendingCompletionRef.current) {
          finalizePendingCompletion();
        }
        return;
      }

      const nextSlice = typingQueueRef.current.slice(0, 5);
      typingQueueRef.current = typingQueueRef.current.slice(5);

      updateMessage(activeId, (message) => ({
        ...message,
        content: message.content + nextSlice,
      }));
    }, 20);
  };

  const handleSend = async (
    event?: React.FormEvent,
    explicitQuestion?: string,
  ) => {
    event?.preventDefault();

    const question = (explicitQuestion ?? input).trim();
    if (!question || loading) {
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsRecording(false);
    }

    stopTypingBuffer();

    const generateId = () => {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
      );
    };

    const userMessageId = generateId();
    const assistantMessageId = generateId();

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: userMessageId, role: "user", content: question },
      {
        id: assistantMessageId,
        role: "ai",
        content: "",
        statusMessage: "Thinking...",
      },
    ]);
    setActiveMessageId(assistantMessageId);
    setRetryQuestion(question);
    setLoading(true);
    setHistoryError(null);
    setInput("");
    adjustHeight(true);
    startedAtRef.current = Date.now();

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          question,
          session_id: activeSessionId,
          answer_mode: answerMode,
          collection_id: scopeCollectionId === "all" ? null : scopeCollectionId,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Query failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const eventMatch = part.match(/^event:\s*(.+)$/m);
          const dataMatch = part.match(/^data:\s*(.+)$/m);

          if (!dataMatch) {
            continue;
          }

          const eventName = eventMatch?.[1]?.trim() || "message";
          const payload = JSON.parse(dataMatch[1]);

          if (eventName === "status") {
            updateMessage(assistantMessageId, (message) => ({
              ...message,
              statusMessage: String(payload.message || ""),
            }));
          }

          if (eventName === "chunk") {
            typingQueueRef.current += String(payload.delta || "");
            startTypingBuffer(assistantMessageId);
          }

          if (eventName === "complete") {
            const sessionId =
              typeof payload.sessionId === "string" ? payload.sessionId : null;
            if (sessionId) {
              setActiveSessionId(sessionId);
              void loadSessions();
              notifySessionSidebar();
              router.replace(`/dashboard/chat?session=${sessionId}`);
            }

            const completionPayload = {
              answer: String(payload.answer || ""),
              citations: Array.isArray(payload.citations)
                ? (payload.citations as Citation[])
                : [],
              followUps: Array.isArray(payload.followUps)
                ? (payload.followUps as string[])
                : [],
              chatMessageId:
                typeof payload.chatMessageId === "string"
                  ? payload.chatMessageId
                  : undefined,
              statusMessage: String(payload.statusMessage || ""),
              confidence:
                payload.confidence === "high" ||
                payload.confidence === "medium" ||
                payload.confidence === "low"
                  ? payload.confidence
                  : undefined,
            };

            if (typingQueueRef.current) {
              pendingCompletionRef.current = {
                messageId: assistantMessageId,
                payload: completionPayload,
              };
            } else {
              pendingCompletionRef.current = {
                messageId: assistantMessageId,
                payload: completionPayload,
              };
              finalizePendingCompletion();
            }
          }

          if (eventName === "error") {
            throw new Error(String(payload.message || "Query failed"));
          }
        }
      }
    } catch (error) {
      stopTypingBuffer();
      if ((error as Error).name === "AbortError") {
        updateMessage(assistantMessageId, (message) => ({
          ...message,
          statusMessage: "Generation stopped.",
        }));
      } else {
        updateMessage(assistantMessageId, (message) => ({
          ...message,
          content:
            message.content ||
            "Sorry, I encountered an error while preparing your answer.",
          statusMessage: "Could not finish the answer. Please try again.",
          error: true,
        }));
      }
    } finally {
      setLoading(false);
      setActiveMessageId(null);
      startedAtRef.current = null;
      abortControllerRef.current = null;
    }
  };

  const handleStopGenerating = () => {
    stopTypingBuffer();
    abortControllerRef.current?.abort();
  };

  // Find the user question that produced a given assistant message and re-ask it.
  const handleRegenerate = (assistantMessageId: string) => {
    if (loading) return;
    const index = messages.findIndex(
      (message) => message.id === assistantMessageId,
    );
    if (index <= 0) return;
    const priorQuestion = messages[index - 1];
    if (
      !priorQuestion ||
      priorQuestion.role !== "user" ||
      !priorQuestion.content.trim()
    ) {
      return;
    }
    void handleSend(undefined, priorQuestion.content);
  };

  // Put a previous question back into the composer so the user can revise it.
  const handleEditQuestion = (content: string) => {
    if (loading) return;
    setInput(content);
    setTimeout(() => {
      adjustHeight();
      textareaRef.current?.focus();
    }, 10);
  };

  const openSource = async (citation: Citation) => {
    setSelectedSource(citation);
    setSourceDetails(citation);
    setSourceError(null);

    if (!citation.document_id) {
      return;
    }

    try {
      setSourceLoading(true);
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch(
        `/api/sources?documentId=${encodeURIComponent(citation.document_id)}&chunkIndex=${encodeURIComponent(String(citation.chunk_index))}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Unable to load source details");
      }

      const data = await response.json();
      setSourceDetails(data.source as Citation);
    } catch (error) {
      setSourceError(
        error instanceof Error
          ? error.message
          : "Unable to load source details",
      );
    } finally {
      setSourceLoading(false);
    }
  };

  const closeSource = () => {
    setSelectedSource(null);
    setSourceDetails(null);
    setSourceLoading(false);
    setSourceError(null);
  };

  const submitFeedback = async (messageId: string, rating: FeedbackRating) => {
    const targetMessage = messages.find((message) => message.id === messageId);
    if (!targetMessage?.chatMessageId) {
      return;
    }

    try {
      setFeedbackLoadingMessageId(messageId);
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          chatMessageId: targetMessage.chatMessageId,
          rating,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save feedback");
      }

      updateMessage(messageId, (message) => ({
        ...message,
        feedbackSubmitted: true,
        feedbackRating: rating,
      }));
      setExpandedFeedbackMessageId(null);
    } catch {
      updateMessage(messageId, (message) => ({
        ...message,
        feedbackSubmitted: true,
      }));
    } finally {
      setFeedbackLoadingMessageId(null);
    }
  };

  const isViewer = profile?.role === "viewer";
  const assistantName =
    workspace?.assistant_name ||
    (isViewer ? "Rekall-IQ Assistant" : "Rekall-IQ");
  const companyName = workspace?.name || "your company";
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) || null;

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(sessionSearch.toLowerCase()),
  );
  const activeSessionTitle = activeSession?.title || "Current chat";

  const historyPanel = (
    <ChatHistoryPanel
      sessions={filteredSessions}
      loading={sessionsLoading}
      search={sessionSearch}
      onSearchChange={setSessionSearch}
      activeSessionId={activeSessionId}
      onNewChat={createNewChat}
      onOpenSession={(sessionId) => void loadSession(sessionId)}
      onDeleteSession={(sessionId) => setDeleteSessionId(sessionId)}
      disabled={loading}
    />
  );

  return (
    <>
      <div className={cn("admin-page", isViewer && "px-0")}>
        {!isViewer && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDesktopHistoryOpen((open) => !open)}
                aria-expanded={desktopHistoryOpen}
                aria-label={
                  desktopHistoryOpen ? "Hide chat history" : "Show chat history"
                }
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] shadow-sm transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)] lg:inline-flex"
              >
                <PanelLeftClose size={16} />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--ink)]">
                  {activeSessionTitle}
                </h1>
                <p className="truncate text-xs text-[var(--ink-muted)]">
                  Ask questions from {companyName}&apos;s approved documents.
                </p>
              </div>
            </div>
            <AppButton
              type="button"
              tone="secondary"
              onClick={createNewChat}
              disabled={loading}
              className="shrink-0"
            >
              <MessageSquarePlus size={16} />
              New chat
            </AppButton>
          </div>
        )}

        <div
          className={cn(
            isViewer
              ? "grid grid-cols-1 gap-4"
              : "flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6",
          )}
        >
          {!isViewer && desktopHistoryOpen && (
            <aside className="hidden lg:sticky lg:top-6 lg:block lg:w-[18.5rem] lg:shrink-0">
              {historyPanel}
            </aside>
          )}

          <div className="min-w-0 flex-1">
            {!isViewer && (
              <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  aria-label="Open recent chats"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink-soft)] shadow-sm transition hover:bg-[var(--surface-2)]"
                >
                  <History size={16} />
                  Recent Chats
                </button>
                <AppButton
                  type="button"
                  tone="secondary"
                  onClick={createNewChat}
                  disabled={loading}
                  className="shrink-0"
                >
                  <MessageSquarePlus size={16} />
                  New Chat
                </AppButton>
              </div>
            )}

            {historyError ? (
              <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {historyError}
              </div>
            ) : null}

            <div
              className={cn(
                "relative isolate flex min-w-0 flex-col overflow-hidden",
                isViewer
                  ? "mx-auto h-[calc(100dvh-112px)] w-full"
                  : "mx-auto h-[calc(100dvh-150px)] w-full sm:h-[calc(100dvh-160px)]",
              )}
            >
              <div
                ref={scrollRef}
                role="log"
                aria-live="polite"
                aria-label="Chat conversation"
                className={cn(
                  "mx-auto w-full max-w-3xl flex-1 overflow-y-auto scrollbar-hide px-4",
                  isViewer ? "pb-28 pt-4 sm:pb-32" : "pb-32 pt-5 sm:pb-36",
                )}
              >
                {historyLoading && messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-3 text-sm text-[var(--ink-muted)]">
                      <Loader2
                        size={18}
                        className="animate-spin text-[var(--accent-jade)]"
                      />
                      <span>Loading chat…</span>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div
                    className={cn(
                      "flex h-full flex-col items-center justify-center text-center",
                      isViewer ? "space-y-5 px-4 pt-6" : "space-y-5 px-4 pt-6",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--brand-shadow)]",
                      )}
                    >
                      <BrandLogo
                        variant="mark"
                        theme="dark"
                        className="h-10 w-10 rounded-xl"
                        imageClassName="h-10"
                      />
                    </div>
                    <div className="space-y-3">
                      <h2
                        className={cn(
                          "font-semibold tracking-tight text-[var(--ink)]",
                          isViewer
                            ? "text-2xl sm:text-3xl"
                            : "text-2xl sm:text-3xl",
                        )}
                      >
                        {messages.length === 0 && !activeSessionId ? (
                          <>
                            Hi, I&apos;m{" "}
                            <span className="text-[var(--accent-jade)]">
                              {assistantName}
                            </span>
                            .
                          </>
                        ) : (
                          "Ask your first question"
                        )}
                      </h2>
                      <p
                        className={cn(
                          "max-w-xl leading-7 text-[var(--ink-muted)]",
                          isViewer
                            ? "text-sm sm:text-base"
                            : "text-sm sm:text-base",
                        )}
                      >
                        Ask questions from your organisation&apos;s approved
                        documents.
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex w-full max-w-3xl flex-wrap gap-2 sm:gap-3",
                        isViewer ? "justify-center" : "justify-center",
                      )}
                    >
                      {EMPTY_PROMPTS.map((prompt) => (
                        <button
                          type="button"
                          key={prompt}
                          onClick={() => setInput(prompt)}
                          className={cn(
                            "rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] transition-all hover:border-[var(--accent-jade-100)] hover:bg-[var(--accent-jade-50)] hover:text-[var(--accent-jade-hover)]",
                            isViewer
                              ? "px-4 py-2.5 text-sm shadow-sm"
                              : "px-4 py-2.5 text-sm shadow-sm",
                          )}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <ChatMessage
                        message={message}
                        isViewer={isViewer}
                        loading={loading}
                        activeMessageId={activeMessageId}
                        copiedIndex={copiedIndex}
                        elapsedSeconds={elapsedSeconds}
                        retryQuestion={retryQuestion}
                        feedbackLoadingMessageId={feedbackLoadingMessageId}
                        expandedFeedbackMessageId={expandedFeedbackMessageId}
                        onCopyAnswer={handleCopyAnswer}
                        onEditQuestion={handleEditQuestion}
                        onRegenerate={handleRegenerate}
                        onOpenSource={(citation) => void openSource(citation)}
                        onRetry={handleSend}
                        onStopGenerating={handleStopGenerating}
                        onFollowUp={(followUp) =>
                          void handleSend(undefined, followUp)
                        }
                        onFeedback={submitFeedback}
                        onToggleFeedback={(messageId) =>
                          setExpandedFeedbackMessageId((current) =>
                            current === messageId ? null : messageId,
                          )
                        }
                        onShowAllSources={() =>
                          setExpandedSourceMessageId((current) =>
                            current === message.id ? null : message.id,
                          )
                        }
                      />
                      {expandedSourceMessageId === message.id &&
                        message.citations &&
                        message.citations.length > 0 && (
                          <div className="mt-1">
                            <CitationList
                              citations={message.citations}
                              onOpenSource={(citation) =>
                                void openSource(citation)
                              }
                            />
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>

              <ChatComposer
                input={input}
                loading={loading}
                isViewer={isViewer}
                isRecording={isRecording}
                speechSupported={speechSupported}
                inputFocused={inputFocused}
                answerMode={answerMode}
                scopeCollectionId={scopeCollectionId}
                collections={collections}
                textareaRef={textareaRef}
                onInputChange={setInput}
                onInputFocus={setInputFocused}
                onSubmit={handleSend}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                onStopGenerating={handleStopGenerating}
                onToggleRecording={toggleRecording}
                onAnswerModeChange={(value) =>
                  setAnswerMode(value as typeof answerMode)
                }
                onScopeChange={setScopeCollectionId}
                onAdjustHeight={adjustHeight}
              />
            </div>
          </div>
        </div>
      </div>

      {!isViewer && (
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetContent
            side="left"
            className="w-[min(100vw-1rem,22rem)] border-r border-[var(--line)] bg-[var(--surface)] p-0"
          >
            <SheetHeader className="border-b border-[var(--line)] px-5 py-4">
              <SheetTitle>Recent Chats</SheetTitle>
              <SheetDescription className="sr-only">
                Browse, reopen, or delete your recent private chat sessions.
              </SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <ChatHistoryPanel
                sessions={filteredSessions}
                loading={sessionsLoading}
                search={sessionSearch}
                onSearchChange={setSessionSearch}
                activeSessionId={activeSessionId}
                onNewChat={createNewChat}
                onOpenSession={(sessionId) => void loadSession(sessionId, true)}
                onDeleteSession={(sessionId) => setDeleteSessionId(sessionId)}
                disabled={loading}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <ConfirmDialog
        open={Boolean(deleteSessionId)}
        onOpenChange={(open) => {
          if (!open) setDeleteSessionId(null);
        }}
        title="Delete chat"
        description="This conversation will be removed from your chat history."
        confirmLabel="Delete chat"
        cancelLabel="Keep chat"
        confirmTone="destructive"
        loading={false}
        onConfirm={async () => {
          if (!deleteSessionId) return;
          await deleteSession(deleteSessionId);
        }}
      />

      <SourceDrawer
        open={!!selectedSource}
        onClose={closeSource}
        citation={sourceDetails}
        loading={sourceLoading}
        error={sourceError}
        managerView={!!profile && isWorkspaceAdminRole(profile.role)}
        sessionTitle={activeSessionTitle}
        onViewDocument={(documentId, filename) =>
          setPreviewDoc({ id: documentId, filename })
        }
      />

      <FilePreviewDrawer
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        documentId={previewDoc?.id ?? null}
        filename={previewDoc?.filename ?? ""}
      />
    </>
  );
}

function ChatHistoryPanel({
  sessions,
  loading,
  search,
  onSearchChange,
  activeSessionId,
  onNewChat,
  onOpenSession,
  onDeleteSession,
  disabled,
}: {
  sessions: ChatSessionSummary[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  activeSessionId: string | null;
  onNewChat: () => void;
  onOpenSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex h-full min-h-[24rem] flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--brand-shadow)]">
      <div className="border-b border-[var(--line)] p-4">
        <AppButton
          type="button"
          onClick={onNewChat}
          disabled={disabled}
          className="w-full justify-center"
        >
          <MessageSquarePlus size={16} />
          New Chat
        </AppButton>
        <div className="relative mt-3">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search chats..."
            aria-label="Search recent chats"
            className="h-11 rounded-xl border-[var(--line)] bg-[var(--surface)] pl-9 text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
          Recent Chats
        </div>
        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl px-3 py-4 text-sm text-[var(--ink-muted)]">
            <Loader2
              size={16}
              className="animate-spin text-[var(--accent-jade)]"
            />
            Loading chats...
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={History}
            title="No chats yet"
            description="Start a new conversation to see it here."
            className="px-4 py-10"
          />
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const active = activeSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-start gap-2 rounded-2xl border px-3 py-3 transition",
                    active
                      ? "border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)]"
                      : "border-transparent hover:border-[var(--line)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onOpenSession(session.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p
                      className={cn(
                        "truncate text-sm font-semibold",
                        active
                          ? "text-[var(--accent-jade)]"
                          : "text-[var(--ink)]",
                      )}
                      title={session.title}
                    >
                      {session.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {formatSessionDate(session.updated_at)}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete chat ${session.title}`}
                    title={`Delete ${session.title}`}
                    onClick={() => onDeleteSession(session.id)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--ink-muted)] transition hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatSessionDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getVisibleStatus(
  statusMessage: string,
  isViewer: boolean,
  isActive: boolean,
) {
  if (isViewer && isActive) {
    return "Searching approved documents...";
  }

  if (isViewer && !isActive) {
    if (statusMessage.toLowerCase().includes("no supported answer")) {
      return "I couldn't find an answer in the uploaded documents.";
    }

    return "Answer prepared from uploaded documents.";
  }

  if (isActive) {
    return "Thinking...";
  }

  return statusMessage || "Thinking...";
}

function CitationList({
  citations,
  onOpenSource,
}: {
  citations: Citation[];
  onOpenSource: (citation: Citation) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Group citations by filename and count references
  const groupedCitations = citations.reduce(
    (acc, citation) => {
      const existing = acc.find((item) => item.filename === citation.filename);
      if (existing) {
        existing.count += 1;
        existing.citations.push(citation);
      } else {
        acc.push({
          filename: citation.filename,
          count: 1,
          citations: [citation],
          category: citation.document_category,
          relevance_score: citation.relevance_score,
        });
      }
      return acc;
    },
    [] as Array<{
      filename: string;
      count: number;
      citations: Citation[];
      category?: string;
      relevance_score?: number;
    }>,
  );

  // Show top 5 unique documents
  const visibleGroups = groupedCitations.slice(0, 5);
  const hasMore = groupedCitations.length > 5;

  return (
    <div className="pl-0 sm:pl-10">
      <button
        type="button"
        onClick={() => setExpanded((currentValue) => !currentValue)}
        aria-expanded={expanded}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left text-xs text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] shadow-sm"
      >
        <ShieldCheck size={12} className="text-[var(--accent-jade)]" />
        <span>Sources</span>
        <span className="text-[var(--ink-muted)]">
          · {visibleGroups.length}
        </span>
        {expanded ? (
          <ChevronUp size={14} className="text-[var(--ink-muted)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--ink-muted)]" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 grid gap-2.5">
          {visibleGroups.map((group) => (
            <button
              type="button"
              key={group.filename}
              onClick={() => void onOpenSource(group.citations[0])}
              aria-label={`Open source ${group.filename} with ${group.count} references`}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-left shadow-sm transition-colors hover:border-[var(--accent-jade-100)] hover:bg-[var(--accent-jade-50)]"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)]">
                  <FileText size={14} className="text-[var(--accent-jade)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-medium text-[var(--ink)]"
                        title={group.filename}
                      >
                        {group.filename}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                        {group.count} reference{group.count !== 1 ? "s" : ""}
                        {group.category ? ` · ${group.category}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[11px] text-[var(--accent-jade)]">
                        Open
                      </span>
                      {group.relevance_score ? (
                        <p className="mt-1 text-[10px] text-[var(--ink-muted)]">
                          {(group.relevance_score * 100).toFixed(0)}% relevance
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {hasMore && expanded && (
        <p className="mt-2 text-[11px] text-[var(--ink-soft)]">
          Showing {visibleGroups.length} of {groupedCitations.length} sources
        </p>
      )}
    </div>
  );
}

function formatConfidence(confidence: "high" | "medium" | "low") {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function getConfidenceClass(confidence: "high" | "medium" | "low") {
  if (confidence === "high") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (confidence === "medium") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  return "border-red-500/30 bg-red-500/10 text-red-300";
}

function SourceDrawer({
  open,
  onClose,
  citation,
  loading,
  error,
  managerView,
  sessionTitle,
  onViewDocument,
}: {
  open: boolean;
  onClose: () => void;
  citation: Citation | null;
  loading: boolean;
  error: string | null;
  managerView: boolean;
  sessionTitle: string;
  onViewDocument: (documentId: string, filename: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const excerpt = citation?.chunk_text || citation?.preview || "";

  const handleCopyExcerpt = async () => {
    await navigator.clipboard.writeText(excerpt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full max-w-full border-l border-[var(--line)] bg-[var(--surface)] p-0 sm:max-w-xl"
      >
        <div className="flex h-full min-w-0 flex-col">
          <SheetHeader className="border-b border-[var(--line)] px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                  {managerView ? "Document Source" : "Source"}
                </p>
                <SheetTitle className="mt-1 wrap-anywhere text-left text-lg font-semibold text-[var(--ink)]">
                  {citation?.filename || "Source details"}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  View source details and excerpt for the selected citation from{" "}
                  {sessionTitle}.
                </SheetDescription>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close source panel"
                className="rounded-xl border border-[var(--line)] p-2.5 text-[var(--ink-muted)] transition-colors hover:text-[var(--ink-soft)]"
              >
                <X size={16} />
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
            {citation?.document_id ? (
              <button
                type="button"
                onClick={() =>
                  onViewDocument(
                    citation.document_id as string,
                    citation.filename || "Document",
                  )
                }
                className="app-button-primary mb-5 flex w-full justify-center"
              >
                <FileText size={15} />
                View full document
              </button>
            ) : null}

            {loading && (
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--ink-soft)]">
                <Loader2
                  size={16}
                  className="animate-spin text-[var(--accent-jade)]"
                />
                Loading source details...
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                  Section
                </p>
                <p className="mt-2 text-sm text-[var(--ink)]">
                  Section {citation?.chunk_index || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                    Excerpt
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyExcerpt}
                    className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                  >
                    {copied ? (
                      <Check size={12} className="text-green-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                    {copied ? "Copied" : "Copy excerpt"}
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-wrap wrap-anywhere text-sm leading-7 text-[var(--ink-soft)]">
                  {excerpt || "No excerpt available."}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                  Preview
                </p>
                <p className="mt-3 wrap-anywhere text-sm leading-7 text-[var(--ink-soft)]">
                  {citation?.preview || "No preview available."}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                  Uploaded
                </p>
                <p className="mt-3 text-sm text-[var(--ink-soft)]">
                  {citation?.uploaded_at
                    ? new Date(citation.uploaded_at).toLocaleString()
                    : "Unknown"}
                </p>
              </div>

              {managerView && (
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                    Source metadata
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
                    <p className="wrap-anywhere">
                      Document ID: {citation?.document_id || "Unknown"}
                    </p>
                    <p className="wrap-anywhere">
                      Uploaded by: {citation?.uploaded_by || "Unknown"}
                    </p>
                    <p>Section: {citation?.chunk_index || 0}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
