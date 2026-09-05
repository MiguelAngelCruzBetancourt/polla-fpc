import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { resultSchema } from "@/lib/schemas";
import { forbidden, serviceErrorResponse, unauthorized } from "@/lib/server/http";
import { gradeMatchResultService } from "@/lib/server/matches-service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorized();
  if (!auth.resultsAdmin) return forbidden();

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
    return serviceErrorResponse(err);
  }
}
