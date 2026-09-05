import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { editMatchSchema } from "@/lib/schemas";
import { forbidden, serviceErrorResponse, unauthorized } from "@/lib/server/http";
import {
  cancelMatchService,
  postponeMatchService,
  rescheduleMatchService,
  updateMatchService,
} from "@/lib/server/matches-service";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorized();
  if (!auth.resultsAdmin) return forbidden();

  const { matchId } = await params;
  const parsed = editMatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.action === "cancel") {
      await cancelMatchService(adminDb(), auth.uid, matchId);
    } else if (parsed.data.action === "postpone") {
      await postponeMatchService(adminDb(), auth.uid, matchId);
    } else if (parsed.data.action === "reschedule") {
      await rescheduleMatchService(adminDb(), auth.uid, matchId, parsed.data.kickoff);
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
    return serviceErrorResponse(err);
  }
}
