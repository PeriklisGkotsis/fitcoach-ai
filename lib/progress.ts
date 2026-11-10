export type Progress = {
  counted: number;
  streak: number;
  bestStreak: number;
  lastActiveDay: string | null;
  lastCountedText: string | null;
  memberSince: string | null;
};

export type Award = {
  progress: Progress;
  counted: boolean;
  leveledUpTo: number | null;
};

export const EMPTY_PROGRESS: Progress = {
  counted: 0,
  streak: 0,
  bestStreak: 0,
  lastActiveDay: null,
  lastCountedText: null,
  memberSince: null,
};

export const MIN_CHARS = 12;

export const TIERS = [
  { title: "Rookie", min: 0 },
  { title: "Dedicated", min: 11 },
  { title: "Warrior", min: 26 },
  { title: "Champion", min: 51 },
  { title: "Legend", min: 100 },
] as const;

export function tierRange(i: number): string {
  const next = TIERS[i + 1];
  return next ? `${TIERS[i].min}–${next.min - 1}` : `${TIERS[i].min}+`;
}

export function levelFor(counted: number) {
  let i = 0;
  while (i + 1 < TIERS.length && counted >= TIERS[i + 1].min) i++;
  const next = i + 1 < TIERS.length ? TIERS[i + 1].min : null;
  return { level: i + 1, title: TIERS[i].title as string, min: TIERS[i].min as number, next, toNext: next === null ? 0 : next - counted };
}

export function localDayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function yesterdayKey(now: Date): string {
  return localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
}

export function currentStreak(p: Progress, now: Date): number {
  if (!p.lastActiveDay) return 0;
  const active = p.lastActiveDay === localDayKey(now) || p.lastActiveDay === yesterdayKey(now);
  return active ? p.streak : 0;
}

export function award(p: Progress, text: string, now: Date): Award {
  const clean = text.trim();
  const normalized = clean.toLowerCase();
  if (clean.length < MIN_CHARS || normalized === p.lastCountedText) {
    return { progress: p, counted: false, leveledUpTo: null };
  }

  const today = localDayKey(now);
  // A stored day in the future means the clock moved back: keep the streak as-is
  // and re-anchor to today.
  const firstToday = today !== p.lastActiveDay;
  const fromFuture = p.lastActiveDay !== null && p.lastActiveDay > today;
  const streak = !firstToday ? p.streak : fromFuture ? p.streak : p.lastActiveDay === yesterdayKey(now) ? p.streak + 1 : 1;

  const progress: Progress = {
    counted: p.counted + 1,
    streak,
    bestStreak: Math.max(p.bestStreak, streak),
    lastActiveDay: today,
    lastCountedText: normalized,
    memberSince: p.memberSince ?? today,
  };

  const before = levelFor(p.counted).level;
  const after = levelFor(progress.counted).level;
  return { progress, counted: true, leveledUpTo: after > before ? after : null };
}

export function levelUpNote(level: number, counted: number): string {
  return `**Level ${level}: ${TIERS[level - 1].title}.** That's ${counted} messages of real work. Keep the streak going.`;
}
