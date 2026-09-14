"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TeamCrest } from "@/components/ui/team-crest";
import { TextField } from "@/components/ui/text-field";
import { MIN_TEAM_QUERY, canonicalTeam, filterTeams } from "@/lib/teams";

interface TeamComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Equipo del otro lado del partido: no se ofrece como sugerencia. */
  exclude?: string;
  required?: boolean;
}

// Normaliza solo tildes y mayusculas (conserva la longitud) para poder resaltar
// el fragmento coincidente sobre el nombre original.
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function HighlightedTeam({ team, query }: { team: string; query: string }) {
  const needle = query.trim();
  const start = fold(team).indexOf(fold(needle));
  if (!needle || start < 0) return <span className="truncate">{team}</span>;
  const end = start + needle.length;
  return (
    <span className="truncate">
      {team.slice(0, start)}
      <strong className="font-semibold text-accent">{team.slice(start, end)}</strong>
      {team.slice(end)}
    </span>
  );
}

export function TeamCombobox({ label, value, onChange, exclude, required }: TeamComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [error, setError] = useState<string | undefined>();

  const listId = useId();
  const options = filterTeams(value, exclude);
  const tooShort = value.trim().length < MIN_TEAM_QUERY;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(team: string) {
    onChange(team);
    setOpen(false);
    setHighlight(0);
    setError(undefined);
  }

  function handleChange(next: string) {
    onChange(next);
    setHighlight(0);
    setError(undefined);
    setOpen(true);
  }

  function handleBlur() {
    setOpen(false);
    if (!value.trim()) {
      setError(undefined);
      return;
    }
    const canonical = canonicalTeam(value);
    if (canonical) {
      setError(undefined);
      if (canonical !== value) onChange(canonical);
    } else {
      setError("Selecciona un equipo de la lista");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlight(0);
        return;
      }
      setHighlight((i) => (options.length ? (i + 1) % options.length : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (options.length ? (i - 1 + options.length) % options.length : 0));
      return;
    }
    if (e.key === "Enter" && open && options[highlight]) {
      // Sin esto, Enter enviaria el formulario que envuelve al combobox.
      e.preventDefault();
      select(options[highlight]);
    }
  }

  const hasOptions = open && !tooShort && options.length > 0;

  return (
    <div className="relative" ref={rootRef}>
      <TextField
        label={label}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        error={error}
        required={required}
        autoComplete="off"
        placeholder="Buscar equipo…"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={hasOptions ? `${listId}-${highlight}` : undefined}
      />

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="animate-in absolute left-0 top-full z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-md"
        >
          {tooShort ? (
            <p className="px-2 py-2 text-xs text-text-muted">
              Escribe al menos {MIN_TEAM_QUERY} letras…
            </p>
          ) : options.length === 0 ? (
            <p className="px-2 py-2 text-xs text-text-muted">Sin coincidencias</p>
          ) : (
            options.map((team, i) => (
              <button
                key={team}
                id={`${listId}-${i}`}
                type="button"
                role="option"
                aria-selected={i === highlight}
                // Evita que el input pierda el foco antes de registrar el click.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => select(team)}
                className={`transition-base flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-text ${
                  i === highlight ? "bg-surface-alt" : ""
                }`}
              >
                <TeamCrest teamName={team} size="sm" />
                <HighlightedTeam team={team} query={value} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
