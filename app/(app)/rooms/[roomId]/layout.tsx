"use client";

import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase-client";
import type { RoomDoc } from "@/lib/types";

const TABS = [
  { href: "/matches", label: "Calendario" },
  { href: "/ranking", label: "Ranking" },
  { href: "/members", label: "Miembros" },
];

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  const { roomId } = useParams<{ roomId: string }>();
  const pathname = usePathname();
  const [room, setRoom] = useState<RoomDoc | null>(null);

  useEffect(() => {
    getDoc(doc(db, "rooms", roomId)).then((snap) => {
      if (snap.exists()) setRoom(snap.data() as RoomDoc);
    });
  }, [roomId]);

  const basePath = `/rooms/${roomId}`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/rooms"
          className="transition-base inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft size={14} /> Mis salas
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="font-heading text-xl font-semibold text-text">{room?.name ?? "Cargando…"}</h1>
          {room && <Badge variant="neutral">{room.code}</Badge>}
        </div>
      </div>

      <nav className="flex gap-1 rounded-lg bg-surface-alt p-1">
        {TABS.map((tab) => {
          const href = `${basePath}${tab.href}`;
          const active = pathname === href;
          return (
            <Link
              key={tab.href}
              href={href}
              className={`transition-base flex-1 rounded-md px-3 py-2 text-center text-sm font-medium ${
                active ? "bg-surface text-accent shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
