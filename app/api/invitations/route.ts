import { getRequestErrorStatus } from "@/src/lib/api-errors";
import {
  getAuthenticatedUserWithProfile,
  getSupabaseAdmin,
} from "@/src/lib/supabase-server";
import { assertWorkspaceOperational } from "@/src/lib/workspace-access";
import {
  ASSIGNABLE_ROLES,
  getRoleLabel,
  isWorkspaceAdminRole,
  type AnyAppRole,
} from "@/src/lib/workspace";
import { sendEmail } from "@/src/lib/email";
import { buildInvitationEmail } from "@/src/lib/email/templates/invitation";

export const dynamic = "force-dynamic";

function buildInviteUrl(token: string, req: Request) {
  // Prefer the configured app URL; otherwise use the host the admin is actually
  // on (correct in prod and local even when NEXT_PUBLIC_APP_URL is unset).
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  return `${base.replace(/\/$/, "")}/invite/${token}`;
}

export async function GET(req: Request) {
  try {
    const { profile } = await getAuthenticatedUserWithProfile(req);
    await assertWorkspaceOperational(profile.workspace_id!);

    if (!isWorkspaceAdminRole(profile.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("invitations")
      .select(
        "id, email, role, token, invited_by, status, expires_at, accepted_at, created_at, updated_at",
      )
      .eq("workspace_id", profile.workspace_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const invitations = (data || []).map((invitation) => ({
      ...invitation,
      invite_url: buildInviteUrl(invitation.token, req),
    }));

    return Response.json({ invitations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected invitations error";
    const status = getRequestErrorStatus(message);

    return Response.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const { user, profile } = await getAuthenticatedUserWithProfile(req);
    await assertWorkspaceOperational(profile.workspace_id!);

    if (!isWorkspaceAdminRole(profile.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { error: "A valid email is required" },
        { status: 400 },
      );
    }

    if (!ASSIGNABLE_ROLES.includes(role as (typeof ASSIGNABLE_ROLES)[number])) {
      return Response.json({ error: "Invalid role selected" }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 7,
    ).toISOString();
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("invitations")
      .insert({
        workspace_id: profile.workspace_id,
        email,
        role,
        token,
        invited_by: user.id,
        status: "pending",
        expires_at: expiresAt,
      })
      .select(
        "id, email, role, token, invited_by, status, expires_at, accepted_at, created_at, updated_at",
      )
      .single();

    if (error || !data) {
      throw error || new Error("Failed to create invitation");
    }

    const inviteUrl = buildInviteUrl(data.token, req);

    // Email the invite link inline (fast Resend call). A mail failure must not
    // fail the invite — the admin can still copy the link from the UI.
    try {
      const { data: workspaceRow } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", profile.workspace_id)
        .maybeSingle();
      await sendEmail({
        to: email,
        ...buildInvitationEmail({
          workspaceName: workspaceRow?.name || "your workspace",
          roleLabel: getRoleLabel(role as AnyAppRole),
          inviteUrl,
        }),
      });
    } catch (inviteEmailError) {
      console.warn(
        "Invitation created, but the invite email failed to send:",
        inviteEmailError,
      );
    }

    return Response.json({
      invitation: {
        ...data,
        invite_url: inviteUrl,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected invitation creation error";
    const status = getRequestErrorStatus(message);

    return Response.json({ error: message }, { status });
  }
}
