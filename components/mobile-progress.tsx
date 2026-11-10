"use client";

import { ProgressPanel } from "@/components/progress-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { currentStreak, levelFor, type Progress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export function MobileProgress({ progress, celebrate }: { progress: Progress; celebrate: boolean }) {
  const { level, intoLevel, levelCost } = levelFor(progress.xp);
  const streak = currentStreak(progress, new Date());

  return (
    <Sheet>
      <SheetTrigger
        className={cn("flex items-center gap-3 rounded-[8px] px-2 py-1.5", celebrate && "animate-level-pulse")}
        aria-label={`Level ${level}, ${intoLevel} of ${levelCost} XP, ${streak}-day streak. Show progress`}
      >
        <span className="font-display text-lg font-semibold text-pine tabular-nums [font-stretch:70%]">Lv {level}</span>
        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-line">
          <span className="block h-full rounded-full bg-pine" style={{ width: `${(intoLevel / levelCost) * 100}%` }} />
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">{streak ? `Day ${streak}` : "No streak"}</span>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-[16px] px-6 pb-10">
        <SheetHeader className="px-0">
          <SheetTitle>Your progress</SheetTitle>
        </SheetHeader>
        <ProgressPanel progress={progress} celebrate={false} />
      </SheetContent>
    </Sheet>
  );
}
