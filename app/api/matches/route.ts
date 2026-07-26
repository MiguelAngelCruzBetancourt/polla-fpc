import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { createMatchesService } from "@/lib/matches-service";
import { createMatchesSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!auth.resultsAdmin) {
    return NextResponse.json({ error: "No tienes permiso de admin de resultados." }, { status: 403 });
  }

  const parsed = createMatchesSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { matchIds } = await createMatchesService(
    adminDb(),
    auth.uid,
    parsed.data.roomId,
    parsed.data.matches,
  );
  return NextResponse.json({ matchIds }, { status: 201 });
}
