"use client";

import { Check } from "lucide-react";
import { LevelBadge, ProgressBar, TIER_ICONS } from "@/components/level-up";
import { TIERS, currentStreak, levelFor, localDayKey, tierRange, type Progress } from "@/lib/progress";
import { cn } from "@/lib/utils";

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

function formatDay(key: string | null): string {
  const [y, m, d] = (key ?? localDayKey(new Date())).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-bg/40 p-5", className)}>
      {title ? <h3 className="mb-4 text-[15px] font-semibold">{title}</h3> : null}
      {children}
    </section>
  );
}

export function ProgressCards({ progress, celebrate }: { progress: Progress; celebrate: boolean }) {
  const { level, title, min, next, toNext } = levelFor(progress.counted);
  const streak = currentStreak(progress, new Date());
  const fill = next === null ? 1 : (progress.counted - min) / (next - min);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center gap-4">
          <LevelBadge level={level} size="lg" celebrate={celebrate} />
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">Level {level}</p>
            <p className="text-xl font-semibold">{title}</p>
            <p className="sr-only" aria-live="polite">Level {level}, {title}</p>
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar key={level} value={fill} label={next === null ? "Top level reached" : `Progress to level ${level + 1}`} />
        </div>
        <div className="mt-2.5 flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{progress.counted} {progress.counted === 1 ? "message" : "messages"}</span>
          <span>{next === null ? "Top level" : `${toNext} to next level`}</span>
        </div>
      </Card>

      <Card title="Your stats">
        <dl className="flex flex-col gap-3 text-sm">
          {[
            ["Total messages", String(progress.counted)],
            ["Current streak", days(streak)],
            ["Best streak", days(Math.max(progress.bestStreak, streak))],
            ["Member since", formatDay(progress.memberSince)],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Level roadmap">
        <ol className="flex flex-col gap-3.5">
          {TIERS.map((t, i) => {
            const Icon = TIER_ICONS[i];
            const state = i + 1 < level ? "done" : i + 1 === level ? "current" : "locked";
            return (
              <li key={t.title} className="flex items-center gap-3" aria-current={state === "current" ? "step" : undefined}>
                <span
                  aria-hidden
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    state === "current" && "bg-gold/15 text-gold",
                    state === "done" && "bg-brand/15 text-brand",
                    state === "locked" && "bg-raised text-muted-foreground/70",
                  )}
                >
                  {state === "done" ? <Check className="size-4" strokeWidth={2.5} /> : <Icon className="size-4" strokeWidth={2.25} />}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className={cn("text-sm font-semibold", state === "current" && "text-brand", state === "locked" && "text-muted-foreground")}>
                    {t.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{tierRange(i)} messages</p>
                </div>
                {state === "current" ? <span className="text-xs font-semibold text-brand">Current</span> : null}
              </li>
            );
          })}
        </ol>
      </Card>

      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        Every real question Coach answers counts toward your next level. Check in each day to grow your streak.
      </p>
    </div>
  );
}
