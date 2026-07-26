import type { RoomDoc } from "@/lib/types";

const STORAGE_KEY = "polla:lastRoomId";

export interface RoomListItem {
  id: string;
  data: RoomDoc;
}

export function getLastRoomId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setLastRoomId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Safari en modo privado, o localStorage deshabilitado: no es crítico.
  }
}

export function clearLastRoomId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorar
  }
}

/** La última sala visitada, solo si el usuario sigue siendo miembro; si no, la primera de la lista. */
export function resolveInitialRoomId(rooms: RoomListItem[]): string | null {
  if (rooms.length === 0) return null;
  const lastId = getLastRoomId();
  if (lastId && rooms.some((r) => r.id === lastId)) return lastId;
  return rooms[0]!.id;
}
