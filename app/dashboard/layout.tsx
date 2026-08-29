"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChartColumnBig,
  FileText,
  MessageSquare,
  Upload,
  Users,
  CircleAlert,
  ClipboardCheck,
  Settings,
  PanelLeftOpen,
  Bell,
  UserCircle,
  MoreHorizontal,
} from "lucide-react";
import { BrandLogo } from "@/src/components/brand/BrandLogo";
import { ViewerChatSidebarHistory } from "@/src/components/dashboard/ViewerChatSidebarHistory";
import {
  CommandPalette,
  type CommandAction,
} from "@/src/components/shell/CommandPalette";
import { ProfileMenu } from "@/src/components/shell/ProfileMenu";
import { WorkspaceSwitcher } from "@/src/components/shell/WorkspaceSwitcher";
import {
  getAccessToken,
  getCurrentUserProfile,
  getCurrentWorkspaceSettings,
} from "@/src/lib/auth-client";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getWorkspaceStatusMessage,
  getUserStatusMessage,
  getRoleLabel,
  isPlatformAdminRole,
  isWorkspaceRestrictedStatus,
  isWorkspaceAdminRole,
  type UserProfile,
  type WorkspaceSettings,
} from "@/src/lib/workspace";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSettings | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    async function loadAuthContext() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      try {
        const currentProfile = await getCurrentUserProfile();
        setProfile(currentProfile);
        const currentWorkspace = await getCurrentWorkspaceSettings();
        setWorkspace(currentWorkspace);

        if (!currentProfile?.workspace_id) {
          router.replace("/login");
          return;
        }

        if (!isAllowedPath(currentProfile.role, pathname)) {
          router.replace(getDefaultPathForRole(currentProfile.role));
          return;
        }

        try {
          const token = await getAccessToken();
          if (token) {
            const response = await fetch(
              "/api/notifications?limit=5&unreadOnly=true",
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            if (response.ok) {
              const result = await response.json();
              setUnreadNotificationCount(result.unreadCount || 0);
            }
          }
        } catch {
          setUnreadNotificationCount(0);
        }
      } finally {
        setAuthLoading(false);
      }
    }

    loadAuthContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navGroups = profile ? getNavGroups(profile.role) : [];
  const isViewer = profile ? !isWorkspaceAdminRole(profile.role) : false;
  // Chat is a focused full-screen surface with its own bottom composer, so the
  // mobile tab bar is hidden there (nav stays reachable via the top-bar menu).
  const isChatRoute = pathname === "/dashboard/chat";
  // Mobile bottom-tab destinations (≤5). Viewers see all of theirs; admins get a
  // curated set + a "More" tab that opens the full nav drawer.
  const mobilePrimaryNav = isViewer
    ? [
        { name: "Ask", href: "/dashboard/chat", icon: MessageSquare },
        { name: "Alerts", href: "/dashboard/notifications", icon: Bell },
        { name: "Account", href: "/dashboard/account", icon: UserCircle },
      ]
    : [
        { name: "Home", href: "/dashboard", icon: BarChart3 },
        { name: "Library", href: "/dashboard/documents", icon: FileText },
        { name: "Ask", href: "/dashboard/chat", icon: MessageSquare },
        {
          name: "Insights",
          href: "/dashboard/analytics",
          icon: ChartColumnBig,
        },
      ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authLoading || !user || !profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--surface)] text-sm font-medium text-[var(--ink-muted)]">
        Loading workspace...
      </div>
    );
  }

  const workspaceStatusMessage = workspace
    ? getWorkspaceStatusMessage(workspace.status)
    : null;
  const userStatusMessage = getUserStatusMessage(profile.status);
  const trialExpired =
    workspace?.subscription_status === "trial" &&
    workspace.trial_ends_at &&
    new Date(workspace.trial_ends_at).getTime() <= Date.now();
  const workspaceBlocked =
    Boolean(
      userStatusMessage ||
      trialExpired ||
      (workspace && isWorkspaceRestrictedStatus(workspace.status)) ||
      (workspace?.subscription_status &&
        ["past_due", "expired", "suspended"].includes(
          workspace.subscription_status,
        )),
    ) && !isPlatformAdminRole(profile.role);
  const isViewerRole = !isWorkspaceAdminRole(profile.role);
  const commandActions = navGroups.flatMap((group) =>
    group.items.map((item) => ({
      id: `nav-${item.href}`,
      label: item.name,
      group: "Go to",
      href: item.href,
      icon: item.icon,
      keywords: [group.label],
    })),
  );
  const quickActions = [
    ...(isViewerRole
      ? []
      : ([
          {
            id: "upload",
            label: "Upload documents",
            group: "Actions",
            href: "/dashboard/upload",
            icon: Upload,
            keywords: ["add", "import", "files"],
          },
        ] as CommandAction[])),
    {
      id: "new-chat",
      label: "New chat",
      group: "Actions",
      href: "/dashboard/chat",
      icon: MessageSquare,
      keywords: ["ask", "question", "session"],
    },
    {
      id: "notifications",
      label: "View notifications",
      group: "Actions",
      href: "/dashboard/notifications",
      icon: Bell,
      keywords: ["alerts", "unread"],
    },
  ];
  const navContent = (
    <>
      <div className={cn("flex h-full flex-col", isViewerRole && "gap-6")}>
        <div className={cn("px-2", !isViewerRole && "mb-8")}>
          <BrandLogo
            variant="full"
            theme="light"
            className="h-11"
            imageClassName="h-10 w-auto max-w-[190px] object-contain object-left"
          />
          <div className="mt-4">
            <WorkspaceSwitcher
              workspaceName={workspace?.name || "Workspace"}
              isPlatformAdmin={isPlatformAdminRole(profile.role)}
            />
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const showNotificationBadge =
                    item.href === "/dashboard/notifications" &&
                    unreadNotificationCount > 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md border-l border-transparent px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "border-[var(--accent-jade)] bg-[var(--accent-jade-50)]/60 text-[var(--ink)]"
                          : "text-[var(--ink-soft)] hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]",
                      )}
                    >
                      <item.icon
                        size={16}
                        className={cn(
                          "shrink-0 transition-colors",
                          isActive
                            ? "text-[var(--accent-jade)]"
                            : "text-[var(--ink-muted)] group-hover:text-[var(--ink-soft)]",
                        )}
                      />
                      <span className="min-w-0 flex-1">{item.name}</span>
                      {showNotificationBadge ? (
                        <span className="rounded-full bg-[var(--accent-jade)] px-2 py-0.5 text-[10px] font-bold text-[#04110e]">
                          {unreadNotificationCount > 9
                            ? "9+"
                            : unreadNotificationCount}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {isViewerRole && pathname === "/dashboard/chat" && (
            <ViewerChatSidebarHistory
              onNavigate={() => setSidebarOpen(false)}
            />
          )}
        </nav>

        <div
          className={cn(
            "border-t border-[var(--line)]",
            isViewerRole ? "pt-5" : "mt-6 pt-6",
          )}
        >
          <ProfileMenu
            email={user.email || null}
            roleLabel={getRoleLabel(profile.role)}
            displayName={(user.email || "User").split("@")[0]}
            helpHref={isViewerRole ? "/help/user-guide" : "/help/admin-guide"}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] lg:flex">
        <aside
          className={cn(
            "hidden border-r border-[var(--line)] bg-[var(--brand-sidebar)] lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:overflow-y-auto",
            isViewerRole ? "w-[17.5rem]" : "w-64",
          )}
        >
          <div className="flex w-full flex-col p-4">{navContent}</div>
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            aria-describedby={undefined}
            className="w-[min(100vw-1rem,20rem)] border-r-0 bg-[var(--brand-sidebar)] p-0"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Workspace navigation</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col p-6">{navContent}</div>
          </SheetContent>
        </Sheet>

        <main
          className={cn(
            "flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden",
            isViewerRole ? "lg:ml-[17.5rem]" : "lg:ml-64",
          )}
        >
          <header
            className={cn(
              "sticky top-0 z-20 flex w-full items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] backdrop-blur-xl",
              isViewerRole
                ? "min-h-[4.75rem] px-5 py-4 md:px-8"
                : "min-h-16 px-4 py-3 md:px-8",
            )}
          >
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open workspace navigation"
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5 text-[var(--ink-muted)] transition-all hover:bg-[var(--surface-2)] lg:hidden"
              >
                <PanelLeftOpen size={18} />
              </button>
              <Link href="/dashboard" className="flex items-center lg:hidden">
                <BrandLogo
                  variant="full"
                  theme="light"
                  imageClassName="h-8 w-auto max-w-[120px] object-contain object-left"
                />
              </Link>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                  {workspace?.name || "Workspace"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              {isPlatformAdminRole(profile.role) && (
                <Link
                  href="/platform"
                  className="hidden rounded-full border border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-jade-hover)] transition hover:bg-[var(--accent-jade-100)] sm:inline-flex"
                >
                  Platform Console
                </Link>
              )}
              <Link
                href="/dashboard/notifications"
                aria-label={`${unreadNotificationCount} unread notifications`}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] transition hover:border-[var(--accent-jade-100)] hover:bg-[var(--accent-jade-50)] hover:text-[var(--accent-jade-hover)]"
              >
                <Bell size={16} />
                {unreadNotificationCount > 0 ? (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[var(--accent-jade)] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-[#04110e]">
                    {unreadNotificationCount > 9
                      ? "9+"
                      : unreadNotificationCount}
                  </span>
                ) : null}
              </Link>
            </div>
          </header>

          <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[var(--canvas)]">
            <div
              className={cn(
                "mx-auto w-full max-w-7xl min-w-0 p-4 sm:p-6 md:p-8",
                !isChatRoute && "pb-24 lg:pb-10",
              )}
            >
              {workspaceBlocked ? (
                <div className="admin-page">
                  <div className="admin-hero-card rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400/80">
                        Workspace Access Restricted
                      </p>
                      <h1 className="admin-hero-title text-[var(--ink)]">
                        {userStatusMessage
                          ? "Account access is suspended."
                          : trialExpired
                            ? "Your 14-day trial has ended."
                            : `${workspace?.name} is currently ${workspace?.status}.`}
                      </h1>
                      <p className="max-w-2xl text-sm font-medium leading-7 text-[var(--ink-soft)] sm:text-base">
                        {userStatusMessage ||
                          (trialExpired
                            ? "Your 14-day trial has ended. Please upgrade to continue using Rekall-IQ."
                            : workspaceStatusMessage)}
                      </p>
                      <p className="text-xs font-medium text-[var(--ink-muted)]">
                        Tenant uploads, chat, invites, settings updates, and
                        document management are blocked until Rekall-IQ
                        reactivates this workspace.
                      </p>
                      {trialExpired ? (
                        <Link
                          href="/billing-required"
                          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent-jade)] px-5 text-sm font-semibold text-[#04110e] transition hover:bg-[var(--accent-jade-hover)]"
                        >
                          View payment required details
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </main>

        {/* Mobile bottom tab bar — native-app navigation on small screens (hidden on the focused chat surface) */}
        <nav
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--brand-sidebar)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden",
            isChatRoute && "hidden",
          )}
        >
          <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
            {mobilePrimaryNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                    active
                      ? "text-[var(--accent-jade)]"
                      : "text-[var(--ink-muted)] active:text-[var(--ink)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                      active && "bg-[var(--accent-jade-50)]",
                    )}
                  >
                    <item.icon size={20} className="shrink-0" />
                  </span>
                  <span className="max-w-full truncate">{item.name}</span>
                </Link>
              );
            })}
            {!isViewer && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium text-[var(--ink-muted)] active:text-[var(--ink)]"
              >
                <span className="flex h-8 w-12 items-center justify-center rounded-full">
                  <MoreHorizontal size={20} className="shrink-0" />
                </span>
                <span>More</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      <CommandPalette actions={[...quickActions, ...commandActions]} />
    </>
  );
}

function getDefaultPathForRole(role: UserProfile["role"]) {
  return isWorkspaceAdminRole(role) ? "/dashboard" : "/dashboard/chat";
}

function isAllowedPath(role: UserProfile["role"], pathname: string) {
  if (!isWorkspaceAdminRole(role)) {
    return (
      pathname === "/dashboard/chat" ||
      pathname === "/dashboard/notifications" ||
      pathname === "/dashboard/account"
    );
  }

  return true;
}

function getNavGroups(role: UserProfile["role"]) {
  if (!isWorkspaceAdminRole(role)) {
    return [
      {
        label: "Workspace",
        items: [
          {
            name: "Ask questions",
            href: "/dashboard/chat",
            icon: MessageSquare,
          },
          {
            name: "Notifications",
            href: "/dashboard/notifications",
            icon: Bell,
          },
          { name: "Account", href: "/dashboard/account", icon: UserCircle },
        ],
      },
    ];
  }

  return [
    {
      label: "Workspace",
      items: [
        { name: "Overview", href: "/dashboard", icon: BarChart3 },
        { name: "Library", href: "/dashboard/documents", icon: FileText },
        { name: "Upload documents", href: "/dashboard/upload", icon: Upload },
        { name: "Ask questions", href: "/dashboard/chat", icon: MessageSquare },
      ],
    },
    {
      label: "Insights",
      items: [
        {
          name: "Analytics",
          href: "/dashboard/analytics",
          icon: ChartColumnBig,
        },
        {
          name: "Evaluations",
          href: "/dashboard/evaluations",
          icon: ClipboardCheck,
        },
        {
          name: "Unanswered questions",
          href: "/dashboard/knowledge-gaps",
          icon: CircleAlert,
        },
      ],
    },
    {
      label: "Administration",
      items: [
        { name: "Users", href: "/dashboard/users", icon: Users },
        { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
        {
          name: "Company settings",
          href: "/dashboard/settings",
          icon: Settings,
        },
      ],
    },
  ];
}
