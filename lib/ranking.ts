import type { RoomMemberDoc } from "./types";

export function sortMembers<T extends Pick<RoomMemberDoc, "totalPoints" | "exactCount" | "winnerCount">>(
  members: T[],
): T[] {
  return [...members].sort(
    (a, b) =>
      b.totalPoints - a.totalPoints || b.exactCount - a.exactCount || b.winnerCount - a.winnerCount,
  );
}

/** Miembros empatados en el primer puesto tras aplicar los 3 criterios de desempate. Longitud 1 si no hay empate. */
export function getFirstPlaceTie<
  T extends Pick<RoomMemberDoc, "totalPoints" | "exactCount" | "winnerCount">,
>(sortedMembers: T[]): T[] {
  if (sortedMembers.length === 0) return [];
  const first = sortedMembers[0]!;
  return sortedMembers.filter(
    (m) =>
      m.totalPoints === first.totalPoints &&
      m.exactCount === first.exactCount &&
      m.winnerCount === first.winnerCount,
  );
}
