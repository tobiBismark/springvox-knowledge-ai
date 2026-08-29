import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, ShieldCheck, Users } from "lucide-react";

import WorkspaceOnboardingForm from "@/src/components/WorkspaceOnboardingForm";
import { BrandLogo } from "@/src/components/brand/BrandLogo";

const highlights = [
  {
    icon: ShieldCheck,
    title: "You become the workspace admin",
    copy: "The account you create is the admin for your company workspace — you control documents, members, and access.",
  },
  {
    icon: FileText,
    title: "One shared knowledge base",
    copy: "Upload approved documents once; your team asks in plain English and gets answers with citations back to the source.",
  },
  {
    icon: Users,
    title: "Invite your team",
    copy: "Add staff, assign roles, and review analytics and answer quality from a single dashboard.",
  },
];

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen w-full bg-[var(--canvas)]">
      {/* Brand panel — matches /login */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-[var(--brand-sidebar)] p-12 text-white lg:flex lg:min-h-screen">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90 [background:radial-gradient(circle_at_20%_15%,rgba(20,184,166,0.22),transparent_42%),radial-gradient(circle_at_85%_75%,rgba(13,148,136,0.16),transparent_45%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:48px_48px]"
        />
        <div className="relative">
          <BrandLogo variant="full" theme="light" imageClassName="h-10" />
        </div>

        <div className="relative max-w-md space-y-8">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Set up your company workspace
            <br />
            in minutes.
          </h1>
          <div className="space-y-5">
            {highlights.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-teal-300">
                  <item.icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                    {item.copy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-[var(--ink-muted)]">
          © 2026 Rekall-IQ
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col px-5 py-8 sm:px-10 lg:w-[58%]">
        <div className="mx-auto flex w-full max-w-2xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </div>
        <div className="flex flex-1 items-start justify-center py-10">
          <Suspense
            fallback={
              <div className="w-full max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--ink-muted)]">
                Loading workspace setup...
              </div>
            }
          >
            <WorkspaceOnboardingForm embedded />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
