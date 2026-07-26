"use client";

import { collectionGroup, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase-client";
import type { RoomListItem } from "@/lib/last-room";

export function useMyRooms(): { rooms: RoomListItem[] | null; reload: () => Promise<void> } {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomListItem[] | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    const memberDocs = await getDocs(
      query(collectionGroup(db, "members"), where("uid", "==", user.uid)),
    );
    const roomIds = memberDocs.docs.map((d) => d.ref.parent.parent!.id);
    const roomEntries = await Promise.all(
      roomIds.map(async (roomId) => {
        const snap = await getDoc(doc(db, "rooms", roomId));
        return snap.exists() ? { id: roomId, data: snap.data() as RoomListItem["data"] } : null;
      }),
    );
    setRooms(roomEntries.filter((r): r is RoomListItem => r !== null));
  }, [user]);

  useEffect(() => {
    if (user) void reload();
  }, [user, reload]);

  return { rooms, reload };
}
