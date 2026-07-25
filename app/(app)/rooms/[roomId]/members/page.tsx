"use client";

import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuditFeed } from "@/components/audit-feed";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { authFetchJson } from "@/lib/api-client";
import { db } from "@/lib/firebase-client";
import type { RoomDoc, RoomMemberDoc } from "@/lib/types";

export default function RoomMembersPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, resultsAdmin } = useAuth();

  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [members, setMembers] = useState<RoomMemberDoc[] | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const roomSnap = await getDoc(doc(db, "rooms", roomId));
    if (roomSnap.exists()) setRoom(roomSnap.data() as RoomDoc);

    const membersSnap = await getDocs(
      query(collection(db, "rooms", roomId, "members"), orderBy("joinedAt", "asc")),
    );
    setMembers(membersSnap.docs.map((d) => d.data() as RoomMemberDoc));
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canModerate = !!user && (resultsAdmin || room?.ownerUid === user.uid);

  async function handleKick(uid: string, displayName: string) {
    if (!window.confirm(`¿Expulsar a ${displayName} de esta sala?`)) return;
    setError(null);
    setBusyUid(uid);
    try {
      await authFetchJson(`/api/rooms/${roomId}/kick`, {
        method: "POST",
        body: JSON.stringify({ uid }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo expulsar al miembro.");
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {members === null && <p className="text-sm text-slate-500">Cargando miembros…</p>}
        {members?.map((member) => (
          <div
            key={member.uid}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
          >
            <span className="font-medium text-slate-900">{member.displayName}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{member.totalPoints} pts</span>
              {canModerate && member.uid !== user?.uid && (
                <Button
                  variant="danger"
                  onClick={() => handleKick(member.uid, member.displayName)}
                  disabled={busyUid === member.uid}
                  className="text-xs"
                >
                  Expulsar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-900">Actividad de la sala</h2>
        <AuditFeed targetType="room" targetId={roomId} />
      </div>
    </div>
  );
}
