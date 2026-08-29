import { getRequestErrorStatus } from "@/src/lib/api-errors";
import {
  createChatSession,
  DEFAULT_CHAT_SESSION_TITLE,
} from "@/src/lib/chat-sessions";
import {
  getAuthenticatedUserWithProfile,
  getSupabaseAdmin,
} from "@/src/lib/supabase-server";
import { assertWorkspaceOperational } from "@/src/lib/workspace-access";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { user, profile } = await getAuthenticatedUserWithProfile(req);
    await assertWorkspaceOperational(profile.workspace_id!);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("workspace_id", profile.workspace_id)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    const sessions = data || [];
    if (sessions.length === 0) {
      return Response.json({ sessions: [] });
    }

    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("session_id")
      .eq("workspace_id", profile.workspace_id)
      .eq("user_id", user.id)
      .in(
        "session_id",
        sessions.map((session) => session.id),
      );

    if (messagesError) {
      throw messagesError;
    }

    const completedSessionIds = new Set(
      (messages || [])
        .map((message) => message.session_id)
        .filter((sessionId): sessionId is string => Boolean(sessionId)),
    );

    return Response.json({
      sessions: sessions.filter((session) =>
        completedSessionIds.has(session.id),
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected session lookup error";
    const status = getRequestErrorStatus(message);

    return Response.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const { user, profile } = await getAuthenticatedUserWithProfile(req);
    await assertWorkspaceOperational(profile.workspace_id!);

    const body = await req.json().catch(() => ({}));
    const requestedTitle =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : DEFAULT_CHAT_SESSION_TITLE;

    const supabase = getSupabaseAdmin();
    const session = await createChatSession(supabase, {
      workspaceId: profile.workspace_id!,
      userId: user.id,
      title: requestedTitle,
    });

    return Response.json({ session });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected session creation error";
    const status = getRequestErrorStatus(message);

    return Response.json({ error: message }, { status });
  }
}
