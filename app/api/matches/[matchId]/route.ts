import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { cancelMatchService, MatchServiceError, updateMatchService } from "@/lib/matches-service";
import { editMatchSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!auth.resultsAdmin) {
    return NextResponse.json({ error: "No tienes permiso de admin de resultados." }, { status: 403 });
  }

  const { matchId } = await params;
  const parsed = editMatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.action === "cancel") {
      await cancelMatchService(adminDb(), auth.uid, matchId);
    } else {
      const { action: _action, ...fields } = parsed.data;
      void _action;
      const { changed } = await updateMatchService(adminDb(), auth.uid, matchId, fields);
      if (!changed) {
        return NextResponse.json({ error: "No se especificó ningún campo a editar." }, { status: 400 });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof MatchServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
