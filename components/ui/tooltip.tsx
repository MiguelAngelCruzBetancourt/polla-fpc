"use client";

import { cloneElement, useId, useState } from "react";

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {cloneElement(children, { "aria-describedby": id } as Record<string, unknown>)}
      <span
        role="tooltip"
        id={id}
        className={`transition-base pointer-events-none absolute -top-1.5 left-1/2 z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-text px-2 py-1 text-xs text-bg ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
