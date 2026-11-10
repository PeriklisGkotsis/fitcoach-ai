"use client";

import { LevelNumeral, XpBar } from "@/components/level-up";
import { currentStreak, levelFor, type Progress } from "@/lib/progress";

export function ProgressPanel({ progress, celebrate }: { progress: Progress; celebrate: boolean }) {
  const { level, title, intoLevel, levelCost } = levelFor(progress.xp);
  const streak = currentStreak(progress, new Date());

  return (
    <section aria-label="Your progress" className="flex flex-col gap-8">
      <div>
        <LevelNumeral level={level} celebrate={celebrate} />
        <p className="mt-2 text-lg font-medium">{title}</p>
      </div>

      <div className="flex flex-col gap-2">
        <XpBar key={level} value={intoLevel} max={levelCost} label={`XP toward level ${level + 1}`} />
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground tabular-nums">
            {intoLevel} of {levelCost} XP
          </span>{" "}
          to level {level + 1}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-t pt-6">
        <div>
          <dt className="text-sm text-muted-foreground">Streak</dt>
          <dd className="font-display text-2xl font-semibold tabular-nums">
            {streak ? `${streak} ${streak === 1 ? "day" : "days"}` : "0 days"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Messages</dt>
          <dd className="font-display text-2xl font-semibold tabular-nums">{progress.counted}</dd>
        </div>
      </dl>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Each question Coach answers earns 10 XP. Your first one each day earns 20 more and keeps your streak going.
      </p>
    </section>
  );
}
