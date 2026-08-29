"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  Eye,
  Loader2,
  MailPlus,
  ShieldCheck,
  Users,
  UserCog,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAccessToken, getCurrentUserProfile } from "@/src/lib/auth-client";
import { cn } from "@/src/lib/utils";
import { AppButton } from "@/src/components/ui/app-button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { MobileCardList } from "@/src/components/layout/MobileCardList";
import { OverflowGuard } from "@/src/components/layout/OverflowGuard";
import { ResponsiveToolbar } from "@/src/components/layout/ResponsiveToolbar";
import { AdminSearchInput } from "@/src/components/dashboard/AdminSearchInput";
import {
  type AnyAppRole,
  getRoleLabel,
  isWorkspaceAdminRole,
  type AppRole,
  type UserProfile,
} from "@/src/lib/workspace";
import { AppPageHeader } from "@/src/components/shared/AppPageHeader";
import { StatCard } from "@/src/components/ui/stat-card";
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from "@/src/components/ui/app-table";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ManagedUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AnyAppRole;
  status: "active" | "suspended" | "invited" | "disabled";
  workspace_id: string | null;
  workspace_name: string;
  created_at: string;
  updated_at: string;
};

type Invitation = {
  id: string;
  email: string;
  role: AppRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
  invite_url: string;
};

const ROLE_OPTIONS: AppRole[] = ["viewer", "tenant_admin"];
const PAGE_SIZE = 8;

function getRoleTone(role: AnyAppRole) {
  switch (role) {
    case "tenant_admin":
    case "admin":
      return "border-[var(--accent-jade-100)] bg-[var(--accent-jade-50)] text-[var(--accent-jade)]";
    case "platform_admin":
      return "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)]";
    default:
      return "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-soft)]";
  }
}

function UserStatusBadge({ status }: { status: ManagedUser["status"] }) {
  const className =
    status === "active"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : status === "suspended" || status === "disabled"
        ? "border-red-500/30 bg-red-500/10 text-red-300"
        : "border-amber-500/30 bg-amber-500/10 text-amber-300";

  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
        className,
      )}
    >
      {status}
    </span>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AnyAppRole>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | ManagedUser["status"]
  >("all");
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    user: ManagedUser;
    nextRole: AppRole;
  } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("viewer");
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewUser, setViewUser] = useState<ManagedUser | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const currentProfile = await getCurrentUserProfile();
      setProfile(currentProfile);

      if (!currentProfile || !isWorkspaceAdminRole(currentProfile.role)) {
        router.replace("/dashboard");
        return;
      }

      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load users");
      }

      const data = await response.json();
      setUsers(data.users || []);
      const inviteResponse = await fetch("/api/invitations", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (inviteResponse.ok) {
        const inviteData = await inviteResponse.json();
        setInvitations(inviteData.invitations || []);
      }
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      (user.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const hasFilters =
    Boolean(searchQuery) || roleFilter !== "all" || statusFilter !== "all";
  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status === "pending",
  );

  const getDisplayUserName = (user: ManagedUser) => {
    const trimmedName = user.full_name?.trim();

    if (
      trimmedName &&
      trimmedName.toLowerCase() !== user.workspace_name.toLowerCase()
    ) {
      return trimmedName;
    }

    if (user.email) {
      return user.email.split("@")[0];
    }

    return "Anonymous";
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const updateRole = async (
    user: ManagedUser,
    nextRole: AppRole,
    confirmSelfDemotion = false,
  ) => {
    try {
      setSaving(true);
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch("/api/users/role", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: user.id,
          role: nextRole,
          confirmSelfDemotion,
        }),
      });

      if (response.status === 409) {
        setConfirmState({ user, nextRole });
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      await loadUsers();
      setConfirmState(null);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update role",
      );
    } finally {
      setSaving(false);
    }
  };

  const createInvitation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSaving(true);
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create invitation");
      }

      setCreatedInviteUrl(data.invitation.invite_url);
      setInviteEmail("");
      await loadUsers();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Failed to create invitation",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateUserStatus = async (
    targetUser: ManagedUser,
    status: "active" | "suspended",
  ) => {
    try {
      setSaving(true);
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch("/api/users/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: targetUser.id,
          status,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user status");
      }

      await loadUsers();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Failed to update user status",
      );
    } finally {
      setSaving(false);
    }
  };

  const revokeInvitation = async (id: string) => {
    try {
      setSaving(true);
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Authentication session expired");
      }

      const response = await fetch("/api/invitations/revoke", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to revoke invitation");
      }

      await loadUsers();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Failed to revoke invitation",
      );
    } finally {
      setSaving(false);
    }
  };

  if (profile && !isWorkspaceAdminRole(profile.role)) {
    return null;
  }

  return (
    <div className="admin-page">
      <AppPageHeader
        eyebrow="Access Control"
        title="Workspace users"
        subtitle="Manage team roles and invitations."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Workspace users" value={users.length} icon={Users} />
        <StatCard
          label="Workspace admins"
          value={users.filter((u) => u.role === "tenant_admin").length}
          icon={UserCog}
        />
        <StatCard
          label="Viewers"
          value={users.filter((u) => u.role === "viewer").length}
          icon={ShieldCheck}
        />
        <StatCard
          label="Pending invites"
          value={pendingInvitations.length}
          icon={Clock}
        />
      </div>

      <ResponsiveToolbar className="lg:items-center">
        <AppButton
          type="button"
          onClick={() => {
            setInviteOpen(true);
            setCreatedInviteUrl(null);
          }}
          className="w-full whitespace-nowrap px-6 sm:w-auto"
        >
          <MailPlus size={18} />
          Invite user
        </AppButton>
        <AdminSearchInput
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 lg:min-w-[20rem]"
        />
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as "all" | AnyAppRole)}
        >
          <SelectTrigger className="h-12 w-full rounded-xl border-[var(--line)] bg-[var(--surface)] px-4 text-sm shadow-sm lg:w-[14rem]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[var(--line)]">
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="platform_admin">Platform Admin</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="tenant_admin">Workspace Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as "all" | ManagedUser["status"])
          }
        >
          <SelectTrigger className="h-12 w-full rounded-xl border-[var(--line)] bg-[var(--surface)] px-4 text-sm shadow-sm lg:w-[13rem]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[var(--line)]">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters ? (
          <AppButton
            tone="secondary"
            className="h-11 w-full px-4 text-xs sm:w-auto"
            onClick={() => {
              setSearchQuery("");
              setRoleFilter("all");
              setStatusFilter("all");
            }}
          >
            Clear filters
          </AppButton>
        ) : null}
      </ResponsiveToolbar>

      {error && (
        <Alert className="rounded-2xl border-red-500/30 bg-red-500/10 text-red-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <OverflowGuard
        className="hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--brand-shadow)] md:block"
        mode="scroll"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-24">
            <div className="relative w-12 h-12">
              <Loader2
                size={24}
                className="animate-spin text-[var(--ink-muted)]"
              />
            </div>
            <p className="text-sm font-medium text-[var(--ink-soft)]">
              Loading users...
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-6 py-24 text-center">
            <EmptyState
              icon={Users}
              title="No users found"
              description="Adjust your search filters or invite new users to get started."
              className="border-0 bg-transparent py-0"
            />
          </div>
        ) : (
          <AppTable className="min-w-[620px]">
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead className="w-[32%]">User</AppTableHead>
                <AppTableHead className="w-[16%]">Role</AppTableHead>
                <AppTableHead className="w-[14%]">Status</AppTableHead>
                <AppTableHead className="w-[14%]">Added</AppTableHead>
                <AppTableHead className="w-[14%]">Updated</AppTableHead>
                <AppTableHead className="w-[20%] text-right">
                  Actions
                </AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {pagedUsers.map((user) => (
                <AppTableRow key={user.id}>
                  <AppTableCell className="max-w-[18rem]">
                    <p
                      className="truncate text-sm font-semibold text-[var(--ink)]"
                      title={user.full_name || user.email || ""}
                    >
                      {getDisplayUserName(user)}
                    </p>
                    <p
                      className="mt-0.5 truncate text-xs text-[var(--ink-muted)]"
                      title={user.email || ""}
                    >
                      {user.email}
                    </p>
                  </AppTableCell>
                  <AppTableCell>
                    <span
                      className={cn(
                        "inline-flex max-w-full truncate rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                        getRoleTone(user.role),
                      )}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                  </AppTableCell>
                  <AppTableCell>
                    <UserStatusBadge status={user.status} />
                  </AppTableCell>
                  <AppTableCell className="text-xs text-[var(--ink-muted)]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </AppTableCell>
                  <AppTableCell className="text-xs text-[var(--ink-muted)]">
                    {new Date(user.updated_at).toLocaleDateString()}
                  </AppTableCell>
                  <AppTableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <AppButton
                        type="button"
                        tone="secondary"
                        onClick={() => setViewUser(user)}
                        className="h-8 rounded-lg px-2.5 text-[11px]"
                      >
                        <Eye size={13} />
                        View
                      </AppButton>
                      {user.status === "active" ? (
                        <AppButton
                          type="button"
                          disabled={saving}
                          onClick={() => updateUserStatus(user, "suspended")}
                          tone="destructive"
                          className="h-8 rounded-lg px-2.5 text-[11px]"
                        >
                          Suspend
                        </AppButton>
                      ) : (
                        <AppButton
                          type="button"
                          disabled={saving}
                          onClick={() => updateUserStatus(user, "active")}
                          tone="secondary"
                          className="h-8 rounded-lg px-2.5 text-[11px]"
                        >
                          Activate
                        </AppButton>
                      )}
                    </div>
                  </AppTableCell>
                </AppTableRow>
              ))}
            </AppTableBody>
          </AppTable>
        )}
      </OverflowGuard>

      {!loading && filteredUsers.length > 0 ? (
        <MobileCardList>
          {pagedUsers.map((user) => (
            <div
              key={`${user.id}-mobile`}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--brand-shadow)]"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold text-[var(--ink)]"
                      title={user.full_name || user.email || ""}
                    >
                      {getDisplayUserName(user)}
                    </p>
                    <p
                      className="mt-0.5 truncate text-xs text-[var(--ink-muted)]"
                      title={user.email || ""}
                    >
                      {user.email}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "max-w-[8rem] truncate rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]",
                      getRoleTone(user.role),
                    )}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </div>
                <UserStatusBadge status={user.status} />
                <div className="grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs text-[var(--ink-muted)]">
                  <p>Added: {new Date(user.created_at).toLocaleDateString()}</p>
                  <p>
                    Updated: {new Date(user.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <AppButton
                    type="button"
                    tone="secondary"
                    onClick={() => setViewUser(user)}
                    className="h-9 px-3 text-xs"
                  >
                    <Eye size={14} />
                    View
                  </AppButton>
                  {user.status === "active" ? (
                    <AppButton
                      type="button"
                      disabled={saving}
                      onClick={() => updateUserStatus(user, "suspended")}
                      tone="destructive"
                      className="h-9 px-3 text-xs"
                    >
                      Suspend
                    </AppButton>
                  ) : (
                    <AppButton
                      type="button"
                      disabled={saving}
                      onClick={() => updateUserStatus(user, "active")}
                      tone="secondary"
                      className="h-9 px-3 text-xs"
                    >
                      Activate
                    </AppButton>
                  )}
                </div>
              </div>
            </div>
          ))}
        </MobileCardList>
      ) : null}

      {filteredUsers.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--ink-muted)]">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}-
            {Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of{" "}
            {filteredUsers.length}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <AppButton
              tone="secondary"
              className="h-9 px-3 text-xs"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </AppButton>
            <AppButton
              tone="secondary"
              className="h-9 px-3 text-xs"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              Next
            </AppButton>
          </div>
        </div>
      ) : null}

      <div className="admin-shell-card border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">
              Active invitations
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Manage pending access requests and generated invite links.
            </p>
          </div>
          <div className="flex h-9 items-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 text-xs font-bold text-[var(--ink-soft)]">
            {pendingInvitations.length} pending
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          {pendingInvitations.length === 0 ? (
            <div className="col-span-full py-12 text-center rounded-2xl border-2 border-dashed border-[var(--line)] bg-[var(--surface-2)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--ink-muted)] mx-auto mb-3">
                <MailPlus size={24} />
              </div>
              <p className="text-sm font-medium text-[var(--ink-soft)]">
                No active invitations
              </p>
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Send an invite to add new users to your workspace.
              </p>
            </div>
          ) : (
            pendingInvitations.slice(0, 12).map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-muted)]">
                    <MailPlus size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-semibold text-[var(--ink)]"
                      title={invitation.email}
                    >
                      {invitation.email}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 font-bold uppercase tracking-[0.14em]",
                          getRoleTone(invitation.role),
                        )}
                      >
                        {getRoleLabel(invitation.role)}
                      </span>
                      <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-bold uppercase tracking-[0.14em] text-amber-300">
                        Pending
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <AppButton
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(invitation.invite_url)
                    }
                    tone="secondary"
                    className="h-8 px-2.5 text-[11px]"
                  >
                    <Copy size={13} />
                    Copy link
                  </AppButton>
                  <AppButton
                    type="button"
                    disabled={saving}
                    onClick={() => revokeInvitation(invitation.id)}
                    tone="destructive"
                    className="h-8 px-2.5 text-[11px]"
                  >
                    Revoke
                  </AppButton>
                </div>

                <div className="w-28 text-right text-[11px] text-[var(--ink-muted)]">
                  {new Date(invitation.expires_at).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric" },
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title="Confirm role change"
        description={
          confirmState
            ? `You are about to change your own role to ${getRoleLabel(confirmState.nextRole)}. This may limit your access to this page.`
            : ""
        }
        confirmLabel="Confirm role change"
        cancelLabel="Keep current access"
        confirmTone="destructive"
        loading={saving}
        onConfirm={async () => {
          if (!confirmState) return;
          await updateRole(confirmState.user, confirmState.nextRole, true);
        }}
      />

      <Sheet
        open={Boolean(viewUser)}
        onOpenChange={(open) => {
          if (!open) setViewUser(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-[min(100vw-1rem,28rem)] overflow-y-auto bg-[var(--surface)]"
        >
          <SheetHeader>
            <SheetTitle>User details</SheetTitle>
          </SheetHeader>
          {viewUser ? (
            <div className="mt-6 space-y-5 px-1">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-jade)] text-base font-bold text-[#04110e]">
                  {(viewUser.full_name || viewUser.email || "U")
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ink)]">
                    {viewUser.full_name ||
                      (viewUser.email
                        ? viewUser.email.split("@")[0]
                        : "Anonymous")}
                  </p>
                  <p className="truncate text-xs text-[var(--ink-muted)]">
                    {viewUser.email}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                    Role
                  </dt>
                  <dd className="mt-1.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                        getRoleTone(viewUser.role),
                      )}
                    >
                      {getRoleLabel(viewUser.role)}
                    </span>
                  </dd>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                    Status
                  </dt>
                  <dd className="mt-1.5">
                    <UserStatusBadge status={viewUser.status} />
                  </dd>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                    Added
                  </dt>
                  <dd className="mt-1.5 text-sm text-[var(--ink)]">
                    {new Date(viewUser.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                    Updated
                  </dt>
                  <dd className="mt-1.5 text-sm text-[var(--ink)]">
                    {new Date(viewUser.updated_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>

              <div className="border-t border-[var(--line)] pt-5">
                <p className="mb-2.5 text-xs font-semibold text-[var(--ink)]">
                  Change role
                </p>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((roleOption) => (
                    <AppButton
                      key={roleOption}
                      type="button"
                      disabled={saving || roleOption === viewUser.role}
                      tone={
                        roleOption === viewUser.role ? "ghost" : "secondary"
                      }
                      onClick={async () => {
                        await updateRole(viewUser, roleOption, false);
                        setViewUser(null);
                      }}
                      className="h-9 px-3 text-xs"
                    >
                      {roleOption === viewUser.role
                        ? "Current"
                        : roleOption === "tenant_admin"
                          ? "Make admin"
                          : "Make viewer"}
                    </AppButton>
                  ))}
                </div>
              </div>

              <div className="border-t border-[var(--line)] pt-5">
                <p className="mb-2.5 text-xs font-semibold text-[var(--ink)]">
                  Account status
                </p>
                {viewUser.status === "active" ? (
                  <AppButton
                    type="button"
                    disabled={saving}
                    tone="destructive"
                    onClick={async () => {
                      await updateUserStatus(viewUser, "suspended");
                      setViewUser(null);
                    }}
                    className="h-9 px-3 text-xs"
                  >
                    Suspend user
                  </AppButton>
                ) : (
                  <AppButton
                    type="button"
                    disabled={saving}
                    tone="secondary"
                    onClick={async () => {
                      await updateUserStatus(viewUser, "active");
                      setViewUser(null);
                    }}
                    className="h-9 px-3 text-xs"
                  >
                    Activate user
                  </AppButton>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          if (!saving) {
            setInviteOpen(open);
          }
        }}
      >
        <DialogContent
          showCloseButton={!saving}
          onEscapeKeyDown={(event) => {
            if (saving) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (saving) {
              event.preventDefault();
            }
          }}
          className="rounded-2xl border-[var(--line)] bg-[var(--surface)] p-0 sm:max-w-lg"
        >
          <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-xl font-bold tracking-tight text-[var(--ink)]">
                Invite user
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs font-medium text-[var(--ink-muted)]">
                Create a secure entry link for this workspace.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={createInvitation} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] ml-1">
                  Email Address
                </label>
                <Input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  className="admin-input"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-muted)] ml-1">
                  Workspace Role
                </label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as AppRole)}
                >
                  <SelectTrigger className="admin-input h-12 rounded-xl border-[var(--line)] bg-[var(--surface)] px-4 text-sm shadow-sm">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[var(--line)]">
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="tenant_admin">
                      Workspace Admin
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {createdInviteUrl && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                      Invitation link ready
                    </p>
                    <p className="mt-2 rounded-lg border border-emerald-500/30 bg-[var(--surface)] p-3 font-mono text-xs text-emerald-300 wrap-anywhere">
                      {createdInviteUrl}
                    </p>
                  </div>
                  <AppButton
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(createdInviteUrl)
                    }
                    tone="subtle"
                    className="w-full"
                  >
                    <Copy size={14} />
                    Copy Invite Link
                  </AppButton>
                </div>
              )}

              {!createdInviteUrl && (
                <div className="flex flex-col gap-3 pt-4">
                  <AppButton type="submit" disabled={saving} className="w-full">
                    {saving ? "Creating invite..." : "Create Invite Link"}
                  </AppButton>
                </div>
              )}
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
