import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { gradeMatchResultService, MatchServiceError } from "@/lib/matches-service";
import { resultSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
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
  const parsed = resultSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { predictionsGraded } = await gradeMatchResultService(
      adminDb(),
      auth.uid,
      matchId,
      parsed.data.homeScore,
      parsed.data.awayScore,
    );
    return NextResponse.json({ ok: true, predictionsGraded });
  } catch (err) {
    if (err instanceof MatchServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
