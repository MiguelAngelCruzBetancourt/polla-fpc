import { adminDb } from "../infrastructure/firebase-admin";

export interface MatchMapping {
  id: string;
  internalMatchId: string;
  externalMatchId: string;
  leagueExternalId: string;
}

const COLLECTION = "matchMappings";

/**
 * Los nombres de equipo en matches.homeTeam/awayTeam del backend de negocio
 * son strings libres (ver lib/types.ts del monolito), así que no hay forma
 * confiable de emparejarlos automáticamente contra la API externa. Este
 * mapeo explícito (creado a mano por un admin) es la fuente de verdad de
 * "este partido interno corresponde a este fixture externo".
 */
export async function createMapping(
  internalMatchId: string,
  externalMatchId: string,
  leagueExternalId: string,
): Promise<MatchMapping> {
  const ref = await adminDb()
    .collection(COLLECTION)
    .add({ internalMatchId, externalMatchId, leagueExternalId });
  return { id: ref.id, internalMatchId, externalMatchId, leagueExternalId };
}

export async function listMappingsForLeague(leagueExternalId: string): Promise<MatchMapping[]> {
  const snap = await adminDb()
    .collection(COLLECTION)
    .where("leagueExternalId", "==", leagueExternalId)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<MatchMapping, "id">) }));
}
