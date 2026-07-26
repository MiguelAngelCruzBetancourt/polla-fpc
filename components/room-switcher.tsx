"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyRooms } from "@/lib/hooks/use-my-rooms";

export function RoomSwitcher({ roomId, roomName, roomCode }: { roomId: string; roomName: string | null; roomCode: string | null }) {
  const { rooms } = useMyRooms();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function switchTo(nextId: string) {
    setOpen(false);
    if (nextId === roomId) return;
    const tab = pathname.split("/")[3] ?? "matches";
    router.push(`/rooms/${nextId}/${tab}`);
  }

  if (rooms === null) {
    return <Skeleton className="h-7 w-40" />;
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="transition-base flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface-alt"
      >
        <h1 className="font-heading text-xl font-semibold text-text">{roomName ?? "Cargando…"}</h1>
        {roomCode && <Badge variant="neutral">{roomCode}</Badge>}
        <ChevronDown size={16} className="text-text-muted" />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-in absolute left-0 top-full z-30 mt-2 w-64 rounded-lg border border-border bg-surface p-1 shadow-md"
        >
          {rooms.map((room) => {
            const active = room.id === roomId;
            return (
              <button
                key={room.id}
                role="menuitem"
                aria-current={active ? "true" : undefined}
                onClick={() => switchTo(room.id)}
                className="transition-base flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-text hover:bg-surface-alt"
              >
                <span className="truncate">{room.data.name}</span>
                {active && <Check size={14} className="shrink-0 text-accent" />}
              </button>
            );
          })}
          <div className="my-1 border-t border-border" />
          <Link
            href={`/rooms/${roomId}/settings`}
            onClick={() => setOpen(false)}
            role="menuitem"
            className="transition-base flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-accent hover:bg-surface-alt"
          >
            Crear o unirse a otra sala
          </Link>
        </div>
      )}
    </div>
  );
}
