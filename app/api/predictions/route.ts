import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";
import { predictionSchema } from "@/lib/schemas";
import { serviceErrorResponse, unauthorized } from "@/lib/server/http";
import { submitPredictionService } from "@/lib/server/predictions-service";
import { checkRateLimit } from "@/lib/server/rate-limit-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorized();

  // Antes esto era una llamada HTTP a security-api; ahora corre en proceso.
  const { allowed } = await checkRateLimit(auth.uid);
  if (!allowed) {
    return NextResponse.json({ error: "Estás enviando solicitudes demasiado rápido." }, { status: 429 });
  }

  const parsed = predictionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await submitPredictionService(adminDb(), auth.uid, parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
