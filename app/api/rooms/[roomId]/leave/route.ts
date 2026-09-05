import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { serviceErrorResponse, unauthorized } from "@/lib/server/http";
import { leaveRoomService } from "@/lib/server/rooms-service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorized();

  const { roomId } = await params;

  try {
    await leaveRoomService(adminDb(), auth.uid, roomId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
