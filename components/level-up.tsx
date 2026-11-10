"use client";

import { useEffect, useState } from "react";
import { Crown, Flame, Sprout, Trophy, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const TIER_ICONS: LucideIcon[] = [Sprout, Flame, Zap, Trophy, Crown];

export function LevelBadge({ level, size, celebrate = false }: { level: number; size: "sm" | "lg"; celebrate?: boolean }) {
  const Icon = TIER_ICONS[level - 1];
  return (
    <span
      key={celebrate ? `pop-${level}` : level}
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gold/15 text-gold",
        size === "lg" ? "size-16 ring-1 ring-gold/25" : "size-7",
        celebrate && "animate-level-pop",
      )}
    >
      <Icon className={size === "lg" ? "size-7" : "size-3.5"} strokeWidth={2.25} />
    </span>
  );
}

// Mount at 0 and grow to the value, so a remount (keyed by level) refills the bar from empty.
export function ProgressBar({ value, label, thin = false }: { value: number; label?: string; thin?: boolean }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(Math.min(100, Math.max(0, value * 100))));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div
      {...(label ? { role: "progressbar", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(value * 100) } : { "aria-hidden": true })}
      className={cn("overflow-hidden rounded-full bg-raised", thin ? "h-1" : "h-1.5")}
    >
      <div className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out" style={{ width: `${width}%` }} />
    </div>
  );
}
