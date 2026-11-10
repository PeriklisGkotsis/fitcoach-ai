"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function LevelNumeral({ level, celebrate }: { level: number; celebrate: boolean }) {
  return (
    <div className="overflow-hidden">
      <p className="sr-only" aria-live="polite">Level {level}</p>
      <span
        key={level}
        aria-hidden
        className={cn(
          "block font-display text-[7.5rem] leading-[0.85] font-semibold text-pine tabular-nums [font-stretch:70%]",
          celebrate && "animate-level-roll",
        )}
      >
        {level}
      </span>
    </div>
  );
}

// Mount at 0 and grow to the value, so a remount (keyed by level) refills the bar from empty.
export function XpBar({ value, max, label }: { value: number; max: number; label: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(Math.min(100, (value / max) * 100)));
    return () => cancelAnimationFrame(id);
  }, [value, max]);

  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-2 overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-pine transition-[width] duration-700 ease-out" style={{ width: `${width}%` }} />
    </div>
  );
}
