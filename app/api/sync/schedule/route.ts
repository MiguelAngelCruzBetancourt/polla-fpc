import { timingSafeEqual } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildCsvUrl, fetchAndParseSchedule } from "@/lib/schedule-sheet";
import { runScheduleSync } from "@/lib/schedule-sync";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const header = request.headers.get("authorization");
  const expected = process.env.SYNC_SECRET;
  if (!expected || !header?.startsWith("Bearer ")) return false;

  const provided = Buffer.from(header.slice(7));
  const expectedBuf = Buffer.from(expected);
  return provided.length === expectedBuf.length && timingSafeEqual(provided, expectedBuf);
}

function resolveCsvUrl(): string | null {
  if (process.env.SCHEDULE_SHEET_CSV_URL) return process.env.SCHEDULE_SHEET_CSV_URL;
  const sheetId = process.env.SCHEDULE_SHEET_ID;
  const gid = process.env.SCHEDULE_SHEET_GID ?? "0";
  return sheetId ? buildCsvUrl(sheetId, gid) : null;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const csvUrl = resolveCsvUrl();
  if (!csvUrl) {
    return NextResponse.json(
      { error: "Falta configurar SCHEDULE_SHEET_CSV_URL o SCHEDULE_SHEET_ID." },
      { status: 500 },
    );
  }

  const db = adminDb();

  let rows, skipped;
  try {
    ({ rows, skipped } = await fetchAndParseSchedule(csvUrl));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo leer la hoja de cálculo." },
      { status: 502 },
    );
  }

  const summary = await runScheduleSync(db, rows);

  await db.collection("syncRuns").add({
    runAt: Timestamp.now(),
    rowsRead: rows.length,
    rowsSkipped: skipped.length,
    skipped,
    ...summary,
  });

  return NextResponse.json({ ok: true, rowsRead: rows.length, skipped, ...summary });
}
