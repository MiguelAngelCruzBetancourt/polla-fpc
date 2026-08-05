import { adminDb } from "../infrastructure/firebase-admin";

export interface LeagueConfig {
  id: string;
  leagueExternalId: string;
  leagueName: string;
  active: boolean;
}

const COLLECTION = "liveMatchesConfig";

export async function listLeagues(): Promise<LeagueConfig[]> {
  const snap = await adminDb().collection(COLLECTION).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<LeagueConfig, "id">) }));
}

export async function addLeague(leagueExternalId: string, leagueName: string): Promise<LeagueConfig> {
  const ref = await adminDb()
    .collection(COLLECTION)
    .add({ leagueExternalId, leagueName, active: true });
  return { id: ref.id, leagueExternalId, leagueName, active: true };
}

export async function listActiveLeagues(): Promise<LeagueConfig[]> {
  const leagues = await listLeagues();
  return leagues.filter((l) => l.active);
}
