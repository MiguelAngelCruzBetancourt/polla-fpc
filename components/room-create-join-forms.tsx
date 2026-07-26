"use client";

import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { db } from "@/lib/firebase-client";
import { generateRoomCode } from "@/lib/room-code";
import type { RoomDoc } from "@/lib/types";

async function generateUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const existing = await getDocs(query(collection(db, "rooms"), where("code", "==", code)));
    if (existing.empty) return code;
  }
  throw new Error("No se pudo generar un código de sala único, intenta de nuevo.");
}

export function RoomCreateJoinForms({ layout = "grid" }: { layout?: "grid" | "stack" }) {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function goToRoom(roomId: string) {
    router.push(`/rooms/${roomId}/matches`);
  }

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
      showToast("Sala creada.", "success");
      await goToRoom(roomId);
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
      showToast("Te uniste a la sala.", "success");
      await goToRoom(roomSnap.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo unir a la sala.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={layout === "grid" ? "grid gap-4 sm:grid-cols-2" : "flex flex-col gap-4"}>
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
    </div>
  );
}
