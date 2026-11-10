"use client";

import { LevelBadge, ProgressBar } from "@/components/level-up";
import { ProgressCards } from "@/components/progress-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { currentStreak, levelFor, type Progress } from "@/lib/progress";
import { cn } from "@/lib/utils";

function ChipBody({ progress, celebrate }: { progress: Progress; celebrate: boolean }) {
  const { level, min, next } = levelFor(progress.counted);
  const fill = next === null ? 1 : (progress.counted - min) / (next - min);
  return (
    <>
      <LevelBadge level={level} size="sm" celebrate={celebrate} />
      <span className="flex w-16 flex-col gap-1.5">
        <span className="text-right text-xs font-semibold tabular-nums">Lv.{level}</span>
        <ProgressBar key={level} value={fill} thin />
      </span>
    </>
  );
}

const chip = "flex items-center gap-2.5 rounded-xl border bg-surface py-2 pr-3 pl-2";

// The header's level chip. On phones it opens the progress cards in a bottom sheet;
// on desktop the cards are already on screen, so it's display only.
export function LevelChip({ progress, celebrate }: { progress: Progress; celebrate: boolean }) {
  const { level, title, toNext, next } = levelFor(progress.counted);
  const streak = currentStreak(progress, new Date());
  const summary = `Level ${level}, ${title}. ${next === null ? "Top level" : `${toNext} messages to next level`}. ${streak}-day streak.`;

  return (
    <>
      <div className={cn(chip, "hidden md:flex", celebrate && "animate-level-pulse")} title={summary}>
        <ChipBody progress={progress} celebrate={celebrate} />
      </div>
      <Sheet>
        <SheetTrigger
          className={cn(chip, "transition-colors hover:bg-raised md:hidden", celebrate && "animate-level-pulse")}
          aria-label={`${summary} Show progress`}
        >
          <ChipBody progress={progress} celebrate={celebrate} />
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl px-5 pb-8">
          <SheetHeader className="px-0">
            <SheetTitle>Progress</SheetTitle>
          </SheetHeader>
          <ProgressCards progress={progress} celebrate={false} />
        </SheetContent>
      </Sheet>
    </>
  );
}
