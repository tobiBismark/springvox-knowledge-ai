import { getRequestErrorStatus } from "@/src/lib/api-errors";
import { deleteDocumentVectors } from "@/src/lib/qdrant";
import {
  getAuthenticatedUserWithProfile,
  getSupabaseAdmin,
} from "@/src/lib/supabase-server";
import { assertWorkspaceOperational } from "@/src/lib/workspace-access";
import { WORKSPACE_ADMIN_ROLES } from "@/src/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { user, profile } = await getAuthenticatedUserWithProfile(
      req,
      WORKSPACE_ADMIN_ROLES,
    );
    await assertWorkspaceOperational(profile.workspace_id!);

    const body = await req.json();
    const documentId =
      typeof body.documentId === "string" ? body.documentId : "";
    if (!documentId)
      return Response.json(
        { error: "documentId is required" },
        { status: 400 },
      );

    const supabase = getSupabaseAdmin();
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id, filename, file_path, file_type, workspace_id")
      .eq("id", documentId)
      .eq("workspace_id", profile.workspace_id)
      .maybeSingle();

    if (documentError) throw documentError;
    if (!document)
      return Response.json({ error: "Document not found" }, { status: 404 });

    await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", document.id)
      .eq("workspace_id", profile.workspace_id);
    await deleteDocumentVectors(document.id, profile.workspace_id!);

    const { error: updateError } = await supabase
      .from("documents")
      .update({ status: "processing", error_message: null, total_chunks: 0 })
      .eq("id", document.id)
      .eq("workspace_id", profile.workspace_id);
    if (updateError) throw updateError;

    const { inngest } = await import("@/src/lib/inngest/client");
    await inngest.send({
      name: "document/process.started",
      data: {
        documentId: document.id,
        workspaceId: profile.workspace_id,
        storagePath: document.file_path,
        originalFilename: document.filename,
        mimeType: document.file_type,
        userId: user.id,
      },
    });

    return Response.json({ success: true, status: "processing" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected reprocess error";
    return Response.json(
      { error: message },
      { status: getRequestErrorStatus(message) },
    );
  }
}
