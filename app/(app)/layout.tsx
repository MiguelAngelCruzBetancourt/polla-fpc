"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/lib/firebase-client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, resultsAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/rooms" className="font-semibold text-slate-900">
            Polla Liga BetPlay
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/rooms" className="text-slate-600 hover:text-slate-900">
              Mis salas
            </Link>
            <Link href="/history" className="text-slate-600 hover:text-slate-900">
              Historial
            </Link>
            {resultsAdmin && (
              <Link href="/admin/results" className="text-slate-600 hover:text-slate-900">
                Admin
              </Link>
            )}
            <button
              onClick={() => signOut(auth)}
              className="text-slate-600 hover:text-slate-900"
            >
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
