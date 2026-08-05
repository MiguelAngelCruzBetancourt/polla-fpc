function businessApiUrl(): string {
  const base = process.env.BUSINESS_API_URL;
  if (!base) throw new Error("Falta la variable de entorno BUSINESS_API_URL");
  return base;
}

/**
 * Único punto de contacto con business-api. Nunca escribe Firestore de
 * negocio directamente — ver principio "single writer" del plan de migración.
 */
export async function reportLiveScore(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  const res = await fetch(`${businessApiUrl()}/internal/matches/${matchId}/live-update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ homeScore, awayScore }),
  });

  if (!res.ok) {
    throw new Error(`business-api respondió ${res.status} al reportar marcador de ${matchId}`);
  }
}
