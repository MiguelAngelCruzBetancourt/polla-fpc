import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { parseBonusPointsFile } from "@/lib/bonus-points";
import { applyBonusPoints, resolveBonusRows } from "@/lib/bonus-points-service";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!auth.resultsAdmin) {
    return NextResponse.json({ error: "No tienes permiso de admin de resultados." }, { status: 403 });
  }

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
    rows = parseBonusPointsFile(await file.arrayBuffer());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo leer el archivo." },
      { status: 400 },
    );
  }

  const db = adminDb();
  const resolved = await resolveBonusRows(db, roomId, rows);

  if (mode === "apply") {
    const { applied } = await applyBonusPoints(db, auth.uid, roomId, resolved);
    return NextResponse.json({ ok: true, mode: "apply", rows: resolved, applied });
  }

  return NextResponse.json({ ok: true, mode: "preview", rows: resolved });
}
