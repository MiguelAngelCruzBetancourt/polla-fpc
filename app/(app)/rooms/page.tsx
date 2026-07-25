"use client";

import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { db } from "@/lib/firebase-client";
import { generateRoomCode } from "@/lib/room-code";
import type { RoomDoc } from "@/lib/types";

interface RoomListItem {
  id: string;
  data: RoomDoc;
}

async function generateUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const existing = await getDocs(query(collection(db, "rooms"), where("code", "==", code)));
    if (existing.empty) return code;
  }
  throw new Error("No se pudo generar un código de sala único, intenta de nuevo.");
}

export default function RoomsPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomListItem[] | null>(null);
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRooms(uid: string) {
    const memberDocs = await getDocs(
      query(collectionGroup(db, "members"), where("uid", "==", uid)),
    );
    const roomIds = memberDocs.docs.map((d) => d.ref.parent.parent!.id);
    const roomEntries = await Promise.all(
      roomIds.map(async (roomId) => {
        const snap = await getDoc(doc(db, "rooms", roomId));
        return snap.exists() ? { id: roomId, data: snap.data() as RoomDoc } : null;
      }),
    );
    setRooms(roomEntries.filter((r): r is RoomListItem => r !== null));
  }

  useEffect(() => {
    if (user) void loadRooms(user.uid);
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (!roomName.trim()) {
      setError("Ponle un nombre a la sala.");
      return;
    }

    setCreating(true);
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const displayName = userSnap.exists() ? userSnap.data().displayName : user.email;

      const roomId = crypto.randomUUID();
      const code = await generateUniqueRoomCode();

      await setDoc(doc(db, "rooms", roomId), {
        name: roomName.trim(),
        code,
        ownerUid: user.uid,
        championship: "Liga BetPlay 2026-II",
        createdAt: serverTimestamp(),
        status: "open",
        bannedUids: [],
      });
      await setDoc(doc(db, "rooms", roomId, "members", user.uid), {
        uid: user.uid,
        displayName,
        joinedAt: serverTimestamp(),
        totalPoints: 0,
        exactCount: 0,
        winnerCount: 0,
      });

      setRoomName("");
      await loadRooms(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la sala.");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Ingresa un código de sala.");
      return;
    }

    setJoining(true);
    try {
      const matches = await getDocs(query(collection(db, "rooms"), where("code", "==", code)));
      if (matches.empty) {
        setError("No existe ninguna sala con ese código.");
        return;
      }
      const roomSnap = matches.docs[0]!;
      const room = roomSnap.data() as RoomDoc;

      if (room.status !== "open") {
        setError("Esta sala ya no acepta nuevos miembros.");
        return;
      }
      if (room.bannedUids?.includes(user.uid)) {
        setError("No puedes unirte a esta sala.");
        return;
      }

      const userSnap = await getDoc(doc(db, "users", user.uid));
      const displayName = userSnap.exists() ? userSnap.data().displayName : user.email;

      await setDoc(doc(db, "rooms", roomSnap.id, "members", user.uid), {
        uid: user.uid,
        displayName,
        joinedAt: serverTimestamp(),
        totalPoints: 0,
        exactCount: 0,
        winnerCount: 0,
      });

      setJoinCode("");
      await loadRooms(user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo unir a la sala.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Mis salas</h1>
        <p className="text-sm text-slate-500">Crea una sala nueva o únete con un código.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
          <h2 className="font-medium text-slate-900">Crear sala</h2>
          <TextField
            label="Nombre de la sala"
            name="roomName"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <Button type="submit" disabled={creating}>
            {creating ? "Creando…" : "Crear sala"}
          </Button>
        </form>

        <form onSubmit={handleJoin} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
          <h2 className="font-medium text-slate-900">Unirse con código</h2>
          <TextField
            label="Código de sala"
            name="joinCode"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={joining}>
            {joining ? "Uniendo…" : "Unirme"}
          </Button>
        </form>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {rooms === null && <p className="text-sm text-slate-500">Cargando salas…</p>}
        {rooms?.length === 0 && (
          <p className="text-sm text-slate-500">Todavía no perteneces a ninguna sala.</p>
        )}
        {rooms?.map((room) => (
          <Link
            key={room.id}
            href={`/rooms/${room.id}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-emerald-600"
          >
            <div>
              <p className="font-medium text-slate-900">{room.data.name}</p>
              <p className="text-xs text-slate-500">Código: {room.data.code}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
