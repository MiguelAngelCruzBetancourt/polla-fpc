"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={resolvedTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="transition-base flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-alt hover:text-text"
    >
      {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
