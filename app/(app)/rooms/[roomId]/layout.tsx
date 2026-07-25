"use client";

import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
        <Link href="/rooms" className="text-sm text-slate-500 hover:text-slate-700">
          ← Mis salas
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">{room?.name ?? "Cargando…"}</h1>
        {room && <p className="text-xs text-slate-500">Código: {room.code}</p>}
      </div>

      <nav className="flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => {
          const href = `${basePath}${tab.href}`;
          const active = pathname === href;
          return (
            <Link
              key={tab.href}
              href={href}
              className={`px-3 py-2 text-sm font-medium ${
                active
                  ? "border-b-2 border-emerald-600 text-emerald-700"
                  : "text-slate-500 hover:text-slate-700"
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
