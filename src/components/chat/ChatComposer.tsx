"use client";

import React from "react";
import { FileText, Mic, MicOff, Send, Square, Sliders } from "lucide-react";

import { cn } from "@/src/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ChatComposerProps = {
  input: string;
  loading: boolean;
  isViewer: boolean;
  isRecording: boolean;
  speechSupported: boolean;
  inputFocused: boolean;
  answerMode: string;
  scopeCollectionId: string;
  collections: Array<{ id: string; name: string }>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onInputChange: (value: string) => void;
  onInputFocus: (focused: boolean) => void;
  onSubmit: (event: React.FormEvent) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onStopGenerating: () => void;
  onToggleRecording: () => void;
  onAnswerModeChange: (value: string) => void;
  onScopeChange: (value: string) => void;
  onAdjustHeight: () => void;
};

const ANSWER_MODES = [
  { value: "summary", label: "Summary" },
  { value: "detailed", label: "Detailed" },
  { value: "executive", label: "Executive" },
  { value: "technical", label: "Technical" },
] as const;

export function ChatComposer({
  input,
  loading,
  isViewer,
  isRecording,
  speechSupported,
  inputFocused,
  answerMode,
  scopeCollectionId,
  collections,
  textareaRef,
  onInputChange,
  onInputFocus,
  onSubmit,
  onKeyDown,
  onStopGenerating,
  onToggleRecording,
  onAnswerModeChange,
  onScopeChange,
  onAdjustHeight,
}: ChatComposerProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 mt-auto bg-[linear-gradient(180deg,rgba(10,12,11,0)_0%,rgba(10,12,11,0.95)_24%,rgba(10,12,11,1)_100%)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6",
        isViewer
          ? "px-3 pt-4 sm:px-5 sm:pb-6 sm:pt-5"
          : "px-3 pt-4 sm:px-5 sm:pb-5 sm:pt-5",
      )}
    >
      <form onSubmit={onSubmit} className="relative mx-auto max-w-3xl">
        <div
          className={cn(
            "flex items-end gap-1.5 rounded-3xl border bg-[var(--surface)] px-2 py-1.5 shadow-[var(--brand-shadow)] transition",
            inputFocused || isRecording
              ? "border-[var(--accent-jade)] ring-4 ring-[var(--accent-jade-100)]"
              : "border-[var(--line)]",
          )}
        >
          <button
            type="button"
            onClick={onToggleRecording}
            disabled={loading}
            aria-label={
              isRecording ? "Stop recording speech" : "Start recording speech"
            }
            title={
              isRecording ? "Stop recording speech" : "Start recording speech"
            }
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none transition active:scale-95",
              isRecording
                ? "bg-[var(--accent-jade)] text-[#04110e]"
                : "text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent-jade-100)]",
              !speechSupported &&
                "cursor-not-allowed opacity-50 hover:bg-transparent",
            )}
          >
            {isRecording ? (
              <MicOff size={18} className="animate-pulse" />
            ) : (
              <Mic size={18} />
            )}
          </button>

          <Textarea
            ref={textareaRef}
            rows={1}
            className="max-h-40 w-full flex-1 resize-none border-0 bg-transparent py-2.5 text-base leading-6 text-[var(--ink)] shadow-none outline-none placeholder:text-[var(--ink-muted)] focus-visible:ring-0"
            placeholder={isRecording ? "Listening…" : "Ask a question…"}
            aria-label="Ask a question from approved documents"
            value={input}
            onChange={(event) => {
              onInputChange(event.target.value);
              onAdjustHeight();
            }}
            onFocus={() => onInputFocus(true)}
            onBlur={() => onInputFocus(false)}
            onKeyDown={onKeyDown}
            disabled={loading}
            style={{ overflow: "hidden" }}
          />

          <div className="flex items-center gap-1">
            {collections.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={loading}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--ink-muted)] outline-none transition hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent-jade-100)] data-[state=open]:bg-[var(--accent-jade-50)] data-[state=open]:text-[var(--accent-jade)]",
                      scopeCollectionId !== "all" &&
                        "text-[var(--accent-jade)]",
                    )}
                    aria-label="Document scope"
                    title="Document scope"
                  >
                    <FileText size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-44 rounded-xl border-[var(--line)]"
                >
                  <DropdownMenuLabel>Document scope</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={scopeCollectionId}
                    onValueChange={onScopeChange}
                  >
                    <DropdownMenuRadioItem value="all">
                      All documents
                    </DropdownMenuRadioItem>
                    {collections.map((collection) => (
                      <DropdownMenuRadioItem
                        key={collection.id}
                        value={collection.id}
                      >
                        {collection.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={loading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--ink-muted)] outline-none transition hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent-jade-100)] data-[state=open]:bg-[var(--accent-jade-50)] data-[state=open]:text-[var(--accent-jade)]"
                  aria-label="Answer style"
                  title="Answer style"
                >
                  <Sliders size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-36 rounded-xl border-[var(--line)]"
              >
                <DropdownMenuLabel>Answer style</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={answerMode}
                  onValueChange={onAnswerModeChange}
                >
                  {ANSWER_MODES.map((mode) => (
                    <DropdownMenuRadioItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {loading ? (
            <button
              aria-label="Stop generating answer"
              type="button"
              onClick={onStopGenerating}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--ink-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            >
              <Square size={15} className="fill-current" />
            </button>
          ) : (
            <button
              aria-label="Send message"
              type="submit"
              disabled={!input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-jade)] text-[#04110e] transition hover:bg-[var(--accent-jade-hover)] focus-visible:ring-4 focus-visible:ring-[var(--accent-jade-100)] active:scale-95 disabled:bg-[var(--surface-2)] disabled:text-[var(--ink-muted)]"
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </form>

      <p className="mt-3 text-center text-xs text-[var(--ink-muted)]">
        {isViewer
          ? "Answers use approved documents when support is available."
          : "Answers use approved company documents and may include sources."}
      </p>
    </div>
  );
}
