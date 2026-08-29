"use client";

import { ChatMessage } from "@/src/components/chat/ChatMessage";
import { ChatComposer } from "@/src/components/chat/ChatComposer";
import type { Message } from "@/app/dashboard/chat/page";

const MESSAGES: Message[] = [
  {
    id: "u1",
    role: "user",
    content:
      "What services does the company offer according to the approved documents?",
  },
  {
    id: "a1",
    role: "ai",
    content: `Based on the approved company documents, the company offers **four core service lines**:

1. **Knowledge management** — a RAG platform that lets teams search and query approved documents with source-grounded answers.
2. **Document processing** — automated ingestion with chunking and semantic indexing across PDF, Office, and plain-text files.
3. **Evaluation tooling** — built-in answer-quality evaluation sets to measure retrieval accuracy over time.
4. **Analytics** — usage and knowledge-gap dashboards that surface unanswered questions.`,
    citations: [
      {
        filename: "company-overview-2026.pdf",
        chunk_index: 3,
        preview:
          "The company delivers four primary service lines spanning knowledge management, document processing...",
        confidence: "high",
      },
      {
        filename: "product-brochure.docx",
        chunk_index: 12,
        preview:
          "Evaluation sets allow teams to score answer quality against ground-truth expectations...",
        confidence: "high",
      },
      {
        filename: "annual-report-2025.xlsx",
        chunk_index: 8,
        preview:
          "Analytics dashboards report usage volume and flag recurring knowledge gaps...",
        confidence: "medium",
      },
    ],
    followUps: [
      "Which document mentions service pricing?",
      "Summarise the onboarding policy",
      "What security certifications are listed?",
    ],
    chatMessageId: "a1",
    confidence: "high",
    feedbackSubmitted: false,
  },
  {
    id: "u2",
    role: "user",
    content: "Which document mentions service pricing?",
  },
  {
    id: "a2",
    role: "ai",
    content: `The **product-brochure.docx** document contains the service pricing section. It lists tiered plans based on document volume and active users, with a pilot tier included by default.

> Pricing details are approved for internal distribution only.`,
    citations: [
      {
        filename: "product-brochure.docx",
        chunk_index: 14,
        preview:
          "Tiered pricing: Pilot (free), Growth ($49/user/mo), Enterprise (custom)...",
        confidence: "high",
      },
    ],
    chatMessageId: "a2",
    confidence: "medium",
    feedbackSubmitted: true,
    feedbackRating: "helpful",
  },
];

export default function PreviewChatPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--canvas)]">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
        <div className="flex-1 space-y-8 py-8">
          {MESSAGES.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isViewer={false}
              loading={false}
              activeMessageId={null}
              copiedIndex={null}
              elapsedSeconds={0}
              retryQuestion={null}
              feedbackLoadingMessageId={null}
              expandedFeedbackMessageId={null}
              onCopyAnswer={() => undefined}
              onEditQuestion={() => undefined}
              onRegenerate={() => undefined}
              onOpenSource={() => undefined}
              onRetry={() => undefined}
              onStopGenerating={() => undefined}
              onFollowUp={() => undefined}
              onFeedback={() => undefined}
              onToggleFeedback={() => undefined}
              onShowAllSources={() => undefined}
            />
          ))}
        </div>
        <div className="sticky bottom-0 pb-6">
          <ChatComposer
            input=""
            loading={false}
            isViewer={false}
            isRecording={false}
            speechSupported
            inputFocused={false}
            answerMode="detailed"
            scopeCollectionId="all"
            collections={[{ id: "c1", name: "Onboarding" }]}
            textareaRef={{ current: null }}
            onInputChange={() => undefined}
            onInputFocus={() => undefined}
            onSubmit={() => undefined}
            onKeyDown={() => undefined}
            onStopGenerating={() => undefined}
            onToggleRecording={() => undefined}
            onAnswerModeChange={() => undefined}
            onScopeChange={() => undefined}
            onAdjustHeight={() => undefined}
          />
        </div>
      </div>
    </div>
  );
}
