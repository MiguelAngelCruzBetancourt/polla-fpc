"use client";

import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RoomBottomNav, RoomTabsDesktop } from "@/components/room-nav";
import { RoomSwitcher } from "@/components/room-switcher";
import { db } from "@/lib/firebase-client";
import { setLastRoomId } from "@/lib/last-room";
import type { RoomDoc } from "@/lib/types";

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<RoomDoc | null>(null);

  useEffect(() => {
    setRoom(null);
    getDoc(doc(db, "rooms", roomId)).then((snap) => {
      if (snap.exists()) {
        setRoom(snap.data() as RoomDoc);
        setLastRoomId(roomId);
      }
    });
  }, [roomId]);

  return (
    <div className="flex flex-col gap-4 pb-20 sm:pb-0">
      <div>
        <Link
          href="/rooms"
          className="transition-base inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft size={14} /> Mis salas
        </Link>
        <div className="mt-1">
          <RoomSwitcher roomId={roomId} roomName={room?.name ?? null} roomCode={room?.code ?? null} />
        </div>
      </div>

      <RoomTabsDesktop roomId={roomId} />

      <div key={roomId}>{children}</div>

      <RoomBottomNav roomId={roomId} />
    </div>
  );
}
