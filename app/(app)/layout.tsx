"use client";

import { signOut } from "firebase/auth";
import { LogOut, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { BottomNav } from "@/components/ui/bottom-nav";
import { auth } from "@/lib/firebase-client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, resultsAdmin } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (loading || !user) {
    return <div className="flex flex-1 items-center justify-center text-sm text-text-muted">Cargando…</div>;
  }

  const displayName = user.displayName ?? user.email ?? "Usuario";

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/rooms" className="flex items-center gap-2 font-heading text-base font-bold text-text">
            <Image src="/assets/logos/polla-mark.svg" alt="" width={28} height={28} className="rounded-md" />
            Polla <span className="text-accent">BetPlay</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/rooms"
              className="transition-base rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-alt hover:text-text"
            >
              Mis salas
            </Link>
            <Link
              href="/history"
              className="transition-base rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-alt hover:text-text"
            >
              Historial
            </Link>
            {resultsAdmin && (
              <Link
                href="/admin/results"
                className="transition-base flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-alt hover:text-text"
              >
                <Shield size={14} /> Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Menú de usuario"
                aria-expanded={menuOpen}
                className="transition-base rounded-full hover:opacity-80"
              >
                <Avatar name={displayName} size="sm" />
              </button>
              {menuOpen && (
                <div className="animate-in absolute right-0 top-full mt-2 w-44 rounded-lg border border-border bg-surface p-1 shadow-md">
                  <p className="truncate px-3 py-2 text-xs text-text-muted">{displayName}</p>
                  <button
                    onClick={() => signOut(auth)}
                    className="transition-base flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text hover:bg-surface-alt"
                  >
                    <LogOut size={14} /> Salir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-20 sm:pb-6">{children}</main>
      <BottomNav resultsAdmin={resultsAdmin} />
    </div>
  );
}
