"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import {
  Check,
  Copy,
  Loader2,
  Pencil,
  RefreshCw,
  Square,
} from "lucide-react";

import { cn } from "@/src/lib/utils";
import { type FeedbackRating } from "@/src/lib/workspace";
import type { Citation, Message } from "@/app/dashboard/chat/page";
import { CitationChips } from "@/src/components/chat/CitationChips";

type ChatMessageProps = {
  message: Message;
  isViewer: boolean;
  loading: boolean;
  activeMessageId: string | null;
  copiedIndex: string | null;
  elapsedSeconds: number;
  retryQuestion: string | null;
  feedbackLoadingMessageId: string | null;
  expandedFeedbackMessageId: string | null;
  onCopyAnswer: (content: string, id: string) => void;
  onEditQuestion: (content: string) => void;
  onRegenerate: (assistantMessageId: string) => void;
  onOpenSource: (citation: Citation) => void;
  onRetry: (event: React.FormEvent, question: string) => void;
  onStopGenerating: () => void;
  onFollowUp: (followUp: string) => void;
  onFeedback: (messageId: string, rating: FeedbackRating) => void;
  onToggleFeedback: (messageId: string) => void;
  onShowAllSources: () => void;
};

export function ChatMessage({
  message,
  isViewer,
  loading,
  activeMessageId,
  copiedIndex,
  elapsedSeconds,
  retryQuestion,
  feedbackLoadingMessageId,
  expandedFeedbackMessageId,
  onCopyAnswer,
  onEditQuestion,
  onRegenerate,
  onOpenSource,
  onRetry,
  onStopGenerating,
  onFollowUp,
  onFeedback,
  onToggleFeedback,
  onShowAllSources,
}: ChatMessageProps) {
  const isActive = loading && activeMessageId === message.id;

  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[92%] sm:max-w-[75%]">
        <div className="group/usermsg flex flex-col items-end gap-1">
          <div className="rounded-2xl rounded-br-md bg-[var(--surface-2)] px-4 py-2.5 text-[15px] leading-7 text-[var(--ink)]">
            <div className="whitespace-pre-wrap wrap-anywhere">{message.content}</div>
          </div>
          {!loading && (
            <button
              type="button"
              onClick={() => onEditQuestion(message.content)}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] text-[var(--ink-muted)] opacity-0 transition-all hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)] group-hover/usermsg:opacity-100"
              aria-label="Edit and resend this question"
            >
              <Pencil size={11} />
              Edit
            </button>
          )}
        </div>
      </div>
    );
  }

  const showMetadata = Boolean(
    message.confidence || message.citations?.length,
  );

  return (
    <div className="group/msg min-w-0 space-y-3">
      {isActive && !message.content ? (
        <div className="flex items-center gap-2 pt-1 text-sm text-[var(--ink-muted)]">
          <ThinkingDots />
          <span>{getVisibleStatus(message.statusMessage || "", isViewer)}</span>
          <span className="text-xs tabular-nums text-[var(--ink-muted)] opacity-70">
            {elapsedSeconds.toFixed(1)}s
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {!!message.content && (
            <div className="markdown-container min-w-0 text-[15px] leading-8 text-[var(--ink)]">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}

          {!message.content && message.statusMessage && (
            <p className="text-sm text-[var(--ink-muted)]">
              {getVisibleStatus(message.statusMessage, isViewer)}
            </p>
          )}

          {message.citations && message.citations.length > 0 && (
            <CitationChips
              citations={message.citations}
              onOpenSource={onOpenSource}
              onShowAll={onShowAllSources}
            />
          )}

          {/* Hover action bar — ChatGPT-style */}
          <div
            className={cn(
              "flex flex-wrap items-center gap-1 -ml-1 transition-opacity",
              isActive
                ? "opacity-100"
                : "opacity-0 focus-within:opacity-100 group-hover/msg:opacity-100",
            )}
          >
            {!!message.content && (
              <button
                type="button"
                onClick={() => onCopyAnswer(message.content, message.id)}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)]"
                aria-label="Copy answer"
              >
                {copiedIndex === message.id ? (
                  <Check size={12} className="text-emerald-300" />
                ) : (
                  <Copy size={12} />
                )}
                {copiedIndex === message.id ? "Copied" : "Copy"}
              </button>
            )}
            {message.error && retryQuestion ? (
              <button
                type="button"
                onClick={(event) => onRetry(event, retryQuestion)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)]"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            ) : (
              !message.error &&
              !!message.content &&
              !loading && (
                <button
                  type="button"
                  onClick={() => onRegenerate(message.id)}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)]"
                >
                  <RefreshCw size={12} />
                  Regenerate
                </button>
              )
            )}
            {isActive && (
              <button
                type="button"
                onClick={onStopGenerating}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)]"
              >
                <Square size={11} className="fill-current" />
                Stop generating
              </button>
            )}
            {showMetadata && (
              <span className="ml-auto hidden items-center gap-1.5 pr-1 text-[11px] text-[var(--ink-muted)] sm:inline-flex">
                {message.confidence && (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        message.confidence === "high" && "bg-emerald-400",
                        message.confidence === "medium" && "bg-amber-400",
                        message.confidence === "low" && "bg-red-400",
                      )}
                    />
                    {formatConfidence(message.confidence)} confidence
                  </span>
                )}
                {message.confidence && message.citations?.length ? (
                  <span aria-hidden>·</span>
                ) : null}
                {message.citations?.length ? (
                  <span>{message.citations.length} sources</span>
                ) : null}
              </span>
            )}
          </div>

          {message.followUps && message.followUps.length > 0 && (
            <div className="pt-1">
              <div className="flex flex-wrap gap-2">
                {message.followUps.slice(0, 5).map((followUp) => (
                  <button
                    key={followUp}
                    type="button"
                    disabled={loading}
                    onClick={() => onFollowUp(followUp)}
                    className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-left text-xs font-medium text-[var(--ink-soft)] transition hover:border-[var(--accent-jade-100)] hover:bg-[var(--accent-jade-50)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-jade-100)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {followUp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {message.chatMessageId && (
            <div className="pt-1">
              {message.feedbackSubmitted ? (
                <p className="text-xs text-[var(--ink-muted)]">
                  Thanks for the feedback
                  {message.feedbackRating
                    ? ` · ${message.feedbackRating.replaceAll("_", " ")}`
                    : ""}
                  .
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={feedbackLoadingMessageId === message.id}
                      onClick={() => onFeedback(message.id, "helpful")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                    >
                      <span className="text-sm leading-none">▲</span>
                      Helpful
                    </button>
                    <button
                      type="button"
                      disabled={feedbackLoadingMessageId === message.id}
                      onClick={() => onFeedback(message.id, "not_helpful")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                    >
                      <span className="text-sm leading-none">▼</span>
                      Not helpful
                    </button>
                    <button
                      type="button"
                      disabled={feedbackLoadingMessageId === message.id}
                      onClick={() => onToggleFeedback(message.id)}
                      aria-expanded={expandedFeedbackMessageId === message.id}
                      aria-label="Show more feedback options"
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)]"
                    >
                      More options
                    </button>
                    {feedbackLoadingMessageId === message.id && (
                      <Loader2
                        size={13}
                        className="animate-spin text-[var(--accent-jade)]"
                      />
                    )}
                  </div>
                  {expandedFeedbackMessageId === message.id && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(
                        ["wrong", "outdated", "needs_more_detail"] as FeedbackRating[]
                      ).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => onFeedback(message.id, option)}
                          className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                        >
                          {option.replaceAll("_", " ")}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatConfidence(confidence: "high" | "medium" | "low") {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function getVisibleStatus(statusMessage: string, isViewer: boolean) {
  if (isViewer) {
    if (statusMessage.toLowerCase().includes("no supported answer")) {
      return "I couldn't find an answer in the uploaded documents.";
    }

    return "Answer prepared from uploaded documents.";
  }

  return statusMessage || "Thinking...";
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-jade)]"
          style={{
            animation: "thinking-dot 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes thinking-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </span>
  );
}
