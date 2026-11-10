export type Progress = {
  xp: number;
  counted: number;
  streak: number;
  lastActiveDay: string | null;
  lastCountedText: string | null;
};

export type Award = {
  progress: Progress;
  gained: number;
  dailyBonus: boolean;
  leveledUpTo: number | null;
};

export const EMPTY_PROGRESS: Progress = {
  xp: 0,
  counted: 0,
  streak: 0,
  lastActiveDay: null,
  lastCountedText: null,
};

export const XP_PER_MESSAGE = 10;
export const DAILY_BONUS = 20;
export const MIN_CHARS = 12;

const TITLES = ["Rookie", "Regular", "Committed", "Consistent", "Dedicated", "Athlete", "Competitor", "Elite"];

export function levelCost(level: number): number {
  return 50 + 20 * (level - 1);
}

export function titleFor(level: number): string {
  return TITLES[Math.min(level, TITLES.length) - 1];
}

export function levelFor(xp: number) {
  let level = 1;
  let floor = 0;
  while (xp >= floor + levelCost(level)) {
    floor += levelCost(level);
    level++;
  }
  return { level, title: titleFor(level), intoLevel: xp - floor, levelCost: levelCost(level) };
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
    return { progress: p, gained: 0, dailyBonus: false, leveledUpTo: null };
  }

  const today = localDayKey(now);
  // String compare works for zero-padded YYYY-MM-DD. A past "today" (clock moved back) is not a new day.
  const firstToday = p.lastActiveDay === null || today > p.lastActiveDay;
  const streak = !firstToday ? p.streak : p.lastActiveDay === yesterdayKey(now) ? p.streak + 1 : 1;
  const gained = XP_PER_MESSAGE + (firstToday ? DAILY_BONUS : 0);

  const progress: Progress = {
    xp: p.xp + gained,
    counted: p.counted + 1,
    streak,
    lastActiveDay: firstToday ? today : p.lastActiveDay,
    lastCountedText: normalized,
  };

  const before = levelFor(p.xp).level;
  const after = levelFor(progress.xp).level;
  return { progress, gained, dailyBonus: firstToday, leveledUpTo: after > before ? after : null };
}

export function levelUpNote(level: number, counted: number): string {
  return `**Level ${level}: ${titleFor(level)}.** That's ${counted} messages of real work. Keep the streak going.`;
}
