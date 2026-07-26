"use client";

import { Home, ListChecks, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav({ resultsAdmin }: { resultsAdmin: boolean }) {
  const pathname = usePathname();

  const items = [
    { href: "/rooms", label: "Mis salas", icon: Home },
    { href: "/history", label: "Historial", icon: ListChecks },
    ...(resultsAdmin ? [{ href: "/admin/results", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-base flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                active ? "text-accent" : "text-text-muted"
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
