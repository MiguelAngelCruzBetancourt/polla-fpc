import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { serviceErrorResponse, unauthorized } from "@/lib/server/http";
import { kickMemberService } from "@/lib/server/rooms-service";

export const runtime = "nodejs";

const kickSchema = z.object({ uid: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorized();

  const { roomId } = await params;
  const parsed = kickSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { newCode } = await kickMemberService(
      adminDb(),
      auth.uid,
      auth.resultsAdmin,
      roomId,
      parsed.data.uid,
    );
    return NextResponse.json({ ok: true, newCode });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
