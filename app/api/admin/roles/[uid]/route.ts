import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { setResultsAdminRole } from "@/lib/server/auth-service";
import { forbidden, serviceErrorResponse, unauthorized } from "@/lib/server/http";

export const runtime = "nodejs";

const roleSchema = z.object({ resultsAdmin: z.boolean() });

export async function POST(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorized();
  if (!auth.resultsAdmin) return forbidden();

  const { uid: targetUid } = await params;
  const parsed = roleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await setResultsAdminRole(targetUid, parsed.data.resultsAdmin);

    await adminDb().collection("auditLog").add({
      action: "role_changed",
      performedBy: auth.uid,
      performedAt: Timestamp.now(),
      targetType: "system",
      targetId: targetUid,
      details: { resultsAdmin: parsed.data.resultsAdmin },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
