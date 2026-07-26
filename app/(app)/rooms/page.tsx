"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RoomCreateJoinForms } from "@/components/room-create-join-forms";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useMyRooms } from "@/lib/hooks/use-my-rooms";
import { resolveInitialRoomId } from "@/lib/last-room";

export default function RoomsPage() {
  const { rooms } = useMyRooms();
  const router = useRouter();

  useEffect(() => {
    if (rooms && rooms.length > 0) {
      router.replace(`/rooms/${resolveInitialRoomId(rooms)}/matches`);
    }
  }, [rooms, router]);

  if (rooms === null || rooms.length > 0) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text">Mis salas</h1>
        <p className="text-sm text-text-muted">Crea una sala nueva o únete con un código.</p>
      </div>

      <RoomCreateJoinForms layout="grid" />

      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Image src="/assets/illustrations/empty-rooms.svg" alt="" width={120} height={120} />
        <p className="text-sm text-text-muted">Todavía no perteneces a ninguna sala.</p>
      </div>
    </div>
  );
}
