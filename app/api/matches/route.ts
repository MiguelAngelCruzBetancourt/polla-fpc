import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { createMatchesSchema } from "@/lib/schemas";
import { forbidden, serviceErrorResponse, unauthorized } from "@/lib/server/http";
import { createMatchesService } from "@/lib/server/matches-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorized();
  if (!auth.resultsAdmin) return forbidden();

  const parsed = createMatchesSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { matchIds } = await createMatchesService(
      adminDb(),
      auth.uid,
      parsed.data.roomId,
      parsed.data.matches,
    );
    return NextResponse.json({ matchIds }, { status: 201 });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
