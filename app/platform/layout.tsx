"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  Bell,
  Activity,
  LayoutGrid,
  Menu,
  Monitor,
  ReceiptText,
  ScrollText,
  Server,
  Wrench,
  Users,
} from "lucide-react";

import { BrandLogo } from "@/src/components/brand/BrandLogo";
import {
  CommandPalette,
  type CommandAction,
} from "@/src/components/shell/CommandPalette";
import { ProfileMenu } from "@/src/components/shell/ProfileMenu";
import { getCurrentUserProfile } from "@/src/lib/auth-client";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import {
  getDefaultRouteForRole,
  getRoleLabel,
  getUserStatusMessage,
  isPlatformAdminRole,
  type UserProfile,
} from "@/src/lib/workspace";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const platformNavGroups = [
  {
    label: "Monitor",
    items: [
      { name: "Overview", href: "/platform", icon: LayoutGrid },
      { name: "Companies", href: "/platform/companies", icon: Building2 },
      { name: "Workspaces", href: "/platform/workspaces", icon: Server },
      { name: "Users", href: "/platform/users", icon: Users },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Audit logs", href: "/platform/audit-logs", icon: ScrollText },
      { name: "Usage", href: "/platform/usage", icon: Activity },
      { name: "Diagnostics", href: "/platform/diagnostics", icon: Wrench },
    ],
  },
  {
    label: "Administration",
    items: [
      { name: "Notifications", href: "/platform/notifications", icon: Bell },
      { name: "Analytics", href: "/platform/analytics", icon: BarChart3 },
      { name: "Plans", href: "/platform/plans", icon: ReceiptText },
    ],
  },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const currentProfile = await getCurrentUserProfile();

        setProfile(currentProfile);

        if (!currentProfile) {
          router.replace("/login");
          return;
        }

        if (getUserStatusMessage(currentProfile.status)) {
          router.replace("/dashboard");
          return;
        }

        if (!isPlatformAdminRole(currentProfile.role)) {
          router.replace(getDefaultRouteForRole(currentProfile.role));
          return;
        }
      } finally {
        setAuthLoading(false);
      }
    }

    load();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authLoading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface-2)] text-sm font-medium text-[var(--ink-muted)]">
        Loading platform...
      </div>
    );
  }

  const commandActions: CommandAction[] = [
    {
      id: "my-workspace",
      label: "Open my workspace",
      group: "Actions",
      href: "/dashboard",
      icon: Monitor,
      keywords: ["tenant", "company", "dashboard"],
    },
    ...platformNavGroups.flatMap((group) =>
      group.items.map((item) => ({
        id: `nav-${item.href}`,
        label: item.name,
        group: "Go to",
        href: item.href,
        icon: item.icon,
        keywords: [group.label],
      })),
    ),
  ];

  const navContent = (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <BrandLogo
            variant="full"
            theme="light"
            className="h-11"
            imageClassName="h-10 w-auto max-w-[190px] object-contain object-left"
          />
          <p className="mt-4 px-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent-jade)]">
            Platform Admin
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto">
        {platformNavGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/platform" &&
                    pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-[var(--accent-jade-50)] text-[var(--accent-jade-hover)]"
                        : "text-[var(--ink-muted)] hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]",
                    )}
                  >
                    <item.icon
                      size={18}
                      className={
                        active
                          ? "text-[var(--accent-jade)]"
                          : "text-[var(--ink-muted)]"
                      }
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 border-t border-[var(--line)] pt-6">
        <Link
          href="/dashboard"
          onClick={() => setSidebarOpen(false)}
          className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--ink-soft)] transition hover:border-[var(--accent-jade-100)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
        >
          <Monitor size={16} className="text-[var(--accent-jade)]" />
          <span>My workspace</span>
        </Link>
        <ProfileMenu
          email={profile.email}
          roleLabel={getRoleLabel(profile.role)}
          displayName={profile.email.split("@")[0]}
          helpHref="/help/admin-guide"
          onLogout={handleLogout}
        />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] lg:flex">
      <aside
        className={cn(
          "hidden border-r border-[var(--line)] bg-[var(--brand-sidebar)] lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:overflow-y-auto",
          "w-72",
        )}
      >
        <div className="flex w-full flex-col p-4">{navContent}</div>
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          aria-describedby={undefined}
          className="w-[min(100vw-1rem,20rem)] border-r-0 bg-[var(--brand-sidebar)] p-0 text-[var(--ink)]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Platform navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col p-4">{navContent}</div>
        </SheetContent>
      </Sheet>

      <main className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden lg:ml-72">
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)] backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open platform navigation"
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5 text-[var(--ink-muted)] lg:hidden"
              >
                <Menu size={18} />
              </button>
              <Link href="/platform" className="flex items-center lg:hidden">
                <BrandLogo
                  variant="full"
                  theme="light"
                  imageClassName="h-8 w-auto max-w-[120px] object-contain object-left"
                />
              </Link>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                  Platform admin
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl min-w-0 p-4 sm:p-6 md:p-8">
            {children}
          </div>
        </div>
      </main>

      <CommandPalette actions={commandActions} />
    </div>
  );
}
