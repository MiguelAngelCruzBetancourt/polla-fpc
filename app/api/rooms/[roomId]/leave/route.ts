import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { roomId } = await params;

  const db = adminDb();
  const roomRef = db.collection("rooms").doc(roomId);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) {
    return NextResponse.json({ error: "La sala no existe." }, { status: 404 });
  }

  const memberRef = roomRef.collection("members").doc(auth.uid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    return NextResponse.json({ error: "No eres miembro de esta sala." }, { status: 404 });
  }

  const room = roomSnap.data()!;

  const batch = db.batch();
  batch.delete(memberRef);
  batch.set(db.collection("auditLog").doc(), {
    action: "member_left",
    performedBy: auth.uid,
    performedAt: Timestamp.now(),
    targetType: "room",
    targetId: roomId,
    details: { uid: auth.uid, wasOwner: room.ownerUid === auth.uid },
  });
  await batch.commit();

  return NextResponse.json({ ok: true });
}
