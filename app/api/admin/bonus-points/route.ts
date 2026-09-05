import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { parseBonusPointsFile } from "@/lib/server/bonus-points";
import { applyBonusPoints, resolveBonusRows } from "@/lib/server/bonus-points-service";
import { forbidden, serviceErrorResponse, unauthorized } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorized();
  if (!auth.resultsAdmin) return forbidden();

  // Antes esto lo parseaba multer; en Next.js el propio Request trae FormData.
  const formData = await request.formData();
  const roomId = formData.get("roomId");
  const mode = formData.get("mode");
  const file = formData.get("file");

  if (typeof roomId !== "string" || !roomId) {
    return NextResponse.json({ error: "Falta roomId." }, { status: 400 });
  }
  if (mode !== "preview" && mode !== "apply") {
    return NextResponse.json({ error: 'mode debe ser "preview" o "apply".' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo .xlsx." }, { status: 400 });
  }

  let rows;
  try {
    rows = parseBonusPointsFile(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo leer el archivo." },
      { status: 400 },
    );
  }

  try {
    const db = adminDb();
    const resolved = await resolveBonusRows(db, roomId, rows);

    if (mode === "apply") {
      const { applied } = await applyBonusPoints(db, auth.uid, roomId, resolved);
      return NextResponse.json({ ok: true, mode: "apply", rows: resolved, applied });
    }

    return NextResponse.json({ ok: true, mode: "preview", rows: resolved });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
