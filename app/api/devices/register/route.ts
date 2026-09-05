import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/api-auth";
import { registerDevice } from "@/lib/server/device-service";
import { serviceErrorResponse, unauthorized } from "@/lib/server/http";

export const runtime = "nodejs";

const registerSchema = z.object({ fcmToken: z.string().min(1) });

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorized();

  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { tokenId } = await registerDevice(auth.uid, parsed.data.fcmToken);
    return NextResponse.json({ ok: true, tokenId }, { status: 201 });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
