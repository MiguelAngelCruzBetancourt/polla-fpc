"use client";

import { collection, getDocs } from "firebase/firestore";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { RankingTable } from "@/components/ranking-table";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase-client";
import { getFirstPlaceTie, sortMembers } from "@/lib/ranking";
import type { RoomMemberDoc } from "@/lib/types";

export default function RoomRankingPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const [members, setMembers] = useState<RoomMemberDoc[] | null>(null);

  useEffect(() => {
    getDocs(collection(db, "rooms", roomId, "members")).then((snap) => {
      const list = snap.docs.map((d) => d.data() as RoomMemberDoc);
      setMembers(sortMembers(list));
    });
  }, [roomId]);

  if (members === null) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Image src="/assets/illustrations/empty-ranking.svg" alt="" width={120} height={120} />
        <p className="text-sm text-text-muted">Todavía no hay miembros en esta sala.</p>
      </div>
    );
  }

  const tie = getFirstPlaceTie(members);

  return (
    <div className="flex flex-col gap-6">
      {tie.length > 1 && (
        <Alert variant="warning">
          Empate en el primer puesto: el premio se divide en partes iguales entre{" "}
          {tie.map((m) => m.displayName).join(", ")}.
        </Alert>
      )}

      <RankingTable members={members} currentUid={user?.uid} />
    </div>
  );
}
