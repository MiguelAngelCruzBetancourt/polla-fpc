"use client";

import { doc, getDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { RoomCreateJoinForms } from "@/components/room-create-join-forms";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast-provider";
import { authFetchJson } from "@/lib/api-client";
import { db } from "@/lib/firebase-client";
import { useMyRooms } from "@/lib/hooks/use-my-rooms";
import { clearLastRoomId, getLastRoomId } from "@/lib/last-room";
import type { RoomDoc } from "@/lib/types";

export default function RoomSettingsPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { rooms } = useMyRooms();
  const router = useRouter();
  const { showToast } = useToast();

  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDoc(doc(db, "rooms", roomId)).then((snap) => {
      if (snap.exists()) setRoom(snap.data() as RoomDoc);
    });
  }, [roomId]);

  const isOwner = !!user && room?.ownerUid === user.uid;

  async function handleLeave() {
    setError(null);
    setLeaving(true);
    try {
      await authFetchJson(`/api/rooms/${roomId}/leave`, { method: "POST" });
      showToast("Saliste de la sala.", "success");
      if (getLastRoomId() === roomId) clearLastRoomId();
      const remaining = (rooms ?? []).filter((r) => r.id !== roomId);
      router.replace(remaining.length > 0 ? `/rooms/${remaining[0]!.id}/matches` : "/rooms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo salir de la sala.");
      setLeaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3 p-4 sm:p-5">
        <h2 className="font-heading font-semibold text-text">Salir de la sala</h2>
        <p className="text-sm text-text-muted">
          Dejarás de ver los partidos, el ranking y a los miembros de esta sala. Podrás volver a
          unirte más tarde con el código de la sala.
        </p>
        <Button variant="danger" onClick={() => setConfirmOpen(true)} className="self-start">
          Salir de la sala
        </Button>
      </Card>

      <RoomCreateJoinForms layout="stack" />

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Salir de la sala">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text">
            ¿Seguro que quieres salir de «{room?.name}»? Podrás volver a unirte con el código si
            alguien te lo comparte.
          </p>

          {isOwner && (
            <Alert variant="warning">
              Eres el dueño de esta sala. Si sales, nadie podrá administrarla (expulsar miembros o
              cerrarla); solo un administrador global podrá moderarla.
            </Alert>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={leaving}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleLeave} isLoading={leaving}>
              Sí, salir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
