"use client";

import { collection, getDocs } from "firebase/firestore";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Podium } from "@/components/podium";
import { RankingTable } from "@/components/ranking-table";
import { db } from "@/lib/firebase-client";
import { getFirstPlaceTie, sortMembers } from "@/lib/ranking";
import type { RoomMemberDoc } from "@/lib/types";

export default function RoomRankingPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [members, setMembers] = useState<RoomMemberDoc[] | null>(null);

  useEffect(() => {
    getDocs(collection(db, "rooms", roomId, "members")).then((snap) => {
      const list = snap.docs.map((d) => d.data() as RoomMemberDoc);
      setMembers(sortMembers(list));
    });
  }, [roomId]);

  if (members === null) {
    return <p className="text-sm text-slate-500">Cargando ranking…</p>;
  }
  if (members.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no hay miembros en esta sala.</p>;
  }

  const tie = getFirstPlaceTie(members);

  return (
    <div className="flex flex-col gap-6">
      {tie.length > 1 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Empate en el primer puesto: el premio se divide en partes iguales entre{" "}
          {tie.map((m) => m.displayName).join(", ")}.
        </p>
      )}

      <Podium members={members} />
      <RankingTable members={members} />
    </div>
  );
}
