"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Inbox } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppButton } from "@/src/components/ui/app-button";
import { AppCard } from "@/src/components/ui/app-card";
import { AppPageHeader } from "@/src/components/shared/AppPageHeader";
import { EmptyState } from "@/src/components/ui/empty-state";
import { getAccessToken } from "@/src/lib/auth-client";
import { cn } from "@/src/lib/utils";

type NotificationType =
  | "maintenance"
  | "billing_reminder"
  | "announcement"
  | "trial_notice"
  | "security_notice";

type TenantNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  is_read: boolean;
};

const typeOptions = [
  { value: "all", label: "All types" },
  { value: "maintenance", label: "Maintenance" },
  { value: "billing_reminder", label: "Billing" },
  { value: "announcement", label: "Announcements" },
  { value: "trial_notice", label: "Trial" },
  { value: "security_notice", label: "Security" },
];

export default function DashboardNotificationsPage() {
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      setError(null);
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing bearer token");
      }

      const params = new URLSearchParams();
      if (typeFilter !== "all") {
        params.set("type", typeFilter);
      }

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load notifications");
      }

      setNotifications(result.notifications || []);
      setUnreadCount(result.unreadCount || 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadNotifications();
  }, [typeFilter]);

  const markRead = async (notificationId: string) => {
    try {
      setSavingId(notificationId);
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing bearer token");
      }

      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to mark notification as read");
      }

      await loadNotifications();
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Failed to mark notification as read");
    } finally {
      setSavingId(null);
    }
  };

  const markAllRead = async () => {
    try {
      setSavingId("all");
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing bearer token");
      }

      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: typeFilter === "all" ? null : typeFilter,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to mark notifications as read");
      }

      await loadNotifications();
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Failed to mark notifications as read");
    } finally {
      setSavingId(null);
    }
  };

  const filteredUnreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  return (
    <div className="admin-page">
      <AppPageHeader
        eyebrow="Alerts"
        title="Notifications"
        subtitle="Review Rekall-IQ announcements, maintenance notes, billing reminders, and security updates for your workspace."
        aside={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-11 w-full rounded-xl border-[var(--line)] bg-[var(--surface)] px-4 text-sm shadow-sm focus-visible:border-[var(--accent-jade)] focus-visible:ring-[var(--accent-jade-100)] sm:w-52">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[var(--line)]">
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AppButton
              tone="secondary"
              onClick={markAllRead}
              disabled={savingId === "all" || filteredUnreadCount === 0}
              className="h-11"
            >
              <Check size={16} />
              Mark all read
            </AppButton>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <AppCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Unread
          </p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ink)]">{unreadCount}</p>
        </AppCard>
        <AppCard className="p-5 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Notification scope
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
            This center includes notifications sent directly to your workspace and global Rekall-IQ notices.
          </p>
        </AppCard>
      </div>

      {error ? (
        <Alert className="rounded-2xl border-red-500/30 bg-red-500/10 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-20 rounded-full bg-[var(--surface-2)]" />
                  <div className="h-6 w-14 rounded-full bg-[var(--surface-2)]" />
                  <div className="h-4 w-24 rounded bg-[var(--surface-2)]" />
                </div>
                <div className="mt-3 h-5 w-2/3 rounded bg-[var(--surface-2)]" />
                <div className="mt-2 h-4 w-full rounded bg-[var(--surface-2)]" />
                <div className="mt-1 h-4 w-1/2 rounded bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No notifications yet"
            description="Workspace and global notices from Rekall-IQ will appear here."
          />
        ) : (
          notifications.map((notification) => (
            <AppCard
              key={notification.id}
              className={cn(
                "p-5 transition",
                !notification.is_read && "border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)]",
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                      getNotificationTypeClass(notification.type),
                    )}>
                      {formatNotificationType(notification.type)}
                    </span>
                    {!notification.is_read ? (
                      <span className="rounded-full bg-[var(--accent-jade)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#04110e]">
                        Unread
                      </span>
                    ) : (
                      <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                        Read
                      </span>
                    )}
                    <span className="text-xs font-medium text-[var(--ink-muted)]">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-[var(--ink)]">
                    {notification.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                    {notification.message}
                  </p>
                </div>
                {!notification.is_read ? (
                  <AppButton
                    tone="secondary"
                    onClick={() => markRead(notification.id)}
                    disabled={savingId === notification.id}
                    className="h-10 shrink-0 text-xs"
                  >
                    <Bell size={15} />
                    Mark read
                  </AppButton>
                ) : null}
              </div>
            </AppCard>
          ))
        )}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatNotificationType(type: string) {
  return type.replace(/_/g, " ");
}

function getNotificationTypeClass(type: string) {
  if (type === "maintenance") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (type === "billing_reminder" || type === "trial_notice") {
    return "border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)] text-[var(--accent-jade)]";
  }

  if (type === "security_notice") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]";
}
