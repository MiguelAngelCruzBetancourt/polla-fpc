"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useMyRooms } from "@/lib/hooks/use-my-rooms";
import { resolveInitialRoomId } from "@/lib/last-room";

export default function LegacyHistoryRedirect() {
  const { rooms } = useMyRooms();
  const router = useRouter();

  useEffect(() => {
    if (rooms === null) return;
    const roomId = resolveInitialRoomId(rooms);
    router.replace(roomId ? `/rooms/${roomId}/history` : "/rooms");
  }, [rooms, router]);

  return (
    <div className="flex flex-col gap-2">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
