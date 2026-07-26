"use client";

import { CalendarDays, History, Settings, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const ROOM_TABS = [
  { seg: "history", label: "Historial", short: "Historial", icon: History },
  { seg: "matches", label: "Calendario", short: "Partidos", icon: CalendarDays },
  { seg: "ranking", label: "Ranking", short: "Ranking", icon: Trophy },
  { seg: "members", label: "Miembros", short: "Miembros", icon: Users },
  { seg: "settings", label: "Configuración", short: "Ajustes", icon: Settings },
];

export function RoomTabsDesktop({ roomId }: { roomId: string }) {
  const pathname = usePathname();
  const basePath = `/rooms/${roomId}`;

  return (
    <nav aria-label="Secciones de la sala" className="hidden gap-1 rounded-lg bg-surface-alt p-1 sm:flex">
      {ROOM_TABS.map((tab) => {
        const href = `${basePath}/${tab.seg}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.seg}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`transition-base flex-1 rounded-md px-3 py-2 text-center text-sm font-medium ${
              active ? "bg-surface text-accent shadow-sm" : "text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function RoomBottomNav({ roomId }: { roomId: string }) {
  const pathname = usePathname();
  const basePath = `/rooms/${roomId}`;

  return (
    <nav
      aria-label="Secciones de la sala"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {ROOM_TABS.map((tab) => {
          const href = `${basePath}/${tab.seg}`;
          const active = pathname === href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.seg}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`transition-base flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? "text-accent" : "text-text-muted"
              }`}
            >
              <Icon size={19} />
              {tab.short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
