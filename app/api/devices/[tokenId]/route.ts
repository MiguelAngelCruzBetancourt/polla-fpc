import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { removeDevice } from "@/lib/server/device-service";
import { serviceErrorResponse, unauthorized } from "@/lib/server/http";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ tokenId: string }> }) {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorized();

  const { tokenId } = await params;

  try {
    await removeDevice(auth.uid, tokenId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
