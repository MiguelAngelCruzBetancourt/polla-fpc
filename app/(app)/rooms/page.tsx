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
import { Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
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
  const { showToast } = useToast();
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
      showToast("Sala creada.", "success");
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
      showToast("Te uniste a la sala.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo unir a la sala.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text">Mis salas</h1>
        <p className="text-sm text-text-muted">Crea una sala nueva o únete con un código.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <form onSubmit={handleCreate} className="flex flex-col gap-3 p-4 sm:p-5">
            <h2 className="font-heading font-semibold text-text">Crear sala</h2>
            <TextField
              label="Nombre de la sala"
              name="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <Button type="submit" isLoading={creating}>
              Crear sala
            </Button>
          </form>
        </Card>

        <Card>
          <form onSubmit={handleJoin} className="flex flex-col gap-3 p-4 sm:p-5">
            <h2 className="font-heading font-semibold text-text">Unirse con código</h2>
            <TextField
              label="Código de sala"
              name="joinCode"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <Button type="submit" variant="outline" isLoading={joining}>
              Unirme
            </Button>
          </form>
        </Card>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-2">
        {rooms === null && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
        {rooms?.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center sm:col-span-2">
            <Image src="/assets/illustrations/empty-rooms.svg" alt="" width={120} height={120} />
            <p className="text-sm text-text-muted">Todavía no perteneces a ninguna sala.</p>
          </div>
        )}
        {rooms?.map((room, i) => (
          <Link key={room.id} href={`/rooms/${room.id}`} className="animate-in block" style={{ animationDelay: `${i * 40}ms` }}>
            <Card className="transition-base hover:border-accent hover:shadow-md">
              <CardHeader>
                <div>
                  <p className="font-medium text-text">{room.data.name}</p>
                  <p className="text-xs text-text-muted">Código: {room.data.code}</p>
                </div>
                <Badge variant={room.data.status === "open" ? "success" : "warning"} icon={<Users size={12} />}>
                  {room.data.status === "open" ? "Abierta" : "Cerrada"}
                </Badge>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
