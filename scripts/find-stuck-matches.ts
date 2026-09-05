/**
 * Lista partidos "atascados": status === "scheduled" con kickoff ya pasado
 * (sin resultado cargado ni aplazamiento), agrupados por sala. Solo lectura,
 * no modifica nada.
 *
 * Para cada partido listado, decidir manualmente según lo que pasó en la
 * vida real:
 *   - Si el partido sí se jugó y falta cargar el resultado (Caso A): usar el
 *     botón "Cargar resultado" en /admin/results — ya funciona hoy sin
 *     límite de tiempo, no requiere ningún cambio de código.
 *   - Si el partido se aplazó/suspendió en la vida real y nunca tendrá
 *     resultado (Caso B): usar el botón "Aplazar" en /admin/results (una
 *     vez desplegado) para limpiar los pronósticos huérfanos.
 *
 * Contra producción (usa las credenciales reales de .env.local):
 *   npx tsx --env-file=.env.local scripts/find-stuck-matches.ts
 *
 * Contra el emulador:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_ADMIN_PROJECT_ID=pollabetplay \
 *   npx tsx scripts/find-stuck-matches.ts
 */
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../lib/firebase-admin";

interface StuckMatch {
  id: string;
  roomId: string;
  homeTeam: string;
  awayTeam: string;
  jornada: number;
  kickoff: Timestamp;
}

async function main() {
  const db = adminDb();
  const now = new Date();

  // Nota: NO se filtra por kickoff en la query (evita repetir el mismo
  // patrón de lectura sostenida que agrava la cuota de Firestore, ver
  // lib/server/match-schedule-service.ts) —
  // esta es una corrida manual única, así que se trae todo status=="scheduled"
  // (debería ser un conjunto chico) y se filtra por kickoff en memoria.
  const [matchesSnap, roomsSnap] = await Promise.all([
    db.collection("matches").where("status", "==", "scheduled").get(),
    db.collection("rooms").get(),
  ]);

  const roomNames = new Map(roomsSnap.docs.map((d) => [d.id, (d.data().name as string) ?? d.id]));

  const stuck: StuckMatch[] = matchesSnap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        roomId: data.roomId as string,
        homeTeam: data.homeTeam as string,
        awayTeam: data.awayTeam as string,
        jornada: data.jornada as number,
        kickoff: data.kickoff as Timestamp,
      };
    })
    .filter((m) => m.kickoff.toDate() < now);

  if (stuck.length === 0) {
    console.log("No hay partidos atascados (scheduled + kickoff pasado). Todo al día.");
    return;
  }

  const byRoom = new Map<string, StuckMatch[]>();
  for (const m of stuck) {
    const list = byRoom.get(m.roomId) ?? [];
    list.push(m);
    byRoom.set(m.roomId, list);
  }

  console.log(`${stuck.length} partido(s) atascado(s) en ${byRoom.size} sala(s):\n`);
  for (const [roomId, list] of byRoom) {
    console.log(`Sala: ${roomNames.get(roomId) ?? "(sala desconocida)"} (${roomId})`);
    for (const m of list.sort((a, b) => a.kickoff.toMillis() - b.kickoff.toMillis())) {
      console.log(
        `  - [${m.id}] ${m.homeTeam} vs ${m.awayTeam} · jornada ${m.jornada} · kickoff ${m.kickoff
          .toDate()
          .toISOString()}`,
      );
    }
    console.log("");
  }

  console.log(
    "Para cada uno: si se jugó, carga el resultado real ya mismo (botón existente). Si se aplazó en la vida real, márcalo con \"Aplazar\" una vez esté desplegado.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
