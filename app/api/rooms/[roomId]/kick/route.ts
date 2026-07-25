import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { generateRoomCode } from "@/lib/room-code";

export const runtime = "nodejs";

const kickSchema = z.object({ uid: z.string().min(1) });

async function generateUniqueRoomCode(db: FirebaseFirestore.Firestore): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const existing = await db.collection("rooms").where("code", "==", code).get();
    if (existing.empty) return code;
  }
  throw new Error("No se pudo generar un código de sala único.");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { roomId } = await params;
  const parsed = kickSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { uid: kickedUid } = parsed.data;

  const db = adminDb();
  const roomRef = db.collection("rooms").doc(roomId);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) {
    return NextResponse.json({ error: "La sala no existe." }, { status: 404 });
  }

  const room = roomSnap.data()!;
  if (auth.uid !== room.ownerUid && !auth.resultsAdmin) {
    return NextResponse.json(
      { error: "Solo el dueño de la sala o un admin de resultados puede expulsar miembros." },
      { status: 403 },
    );
  }

  const memberRef = roomRef.collection("members").doc(kickedUid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    return NextResponse.json({ error: "Esa persona no es miembro de esta sala." }, { status: 404 });
  }

  const newCode = await generateUniqueRoomCode(db);

  const batch = db.batch();
  batch.delete(memberRef);
  batch.update(roomRef, {
    bannedUids: FieldValue.arrayUnion(kickedUid),
    code: newCode,
  });
  batch.set(db.collection("auditLog").doc(), {
    action: "member_kicked",
    performedBy: auth.uid,
    performedAt: Timestamp.now(),
    targetType: "room",
    targetId: roomId,
    details: { kickedUid },
  });
  await batch.commit();

  return NextResponse.json({ ok: true, newCode });
}
