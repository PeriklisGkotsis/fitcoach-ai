import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_PROGRESS, award, currentStreak, levelCost, levelFor, levelUpNote, localDayKey, titleFor,
  type Progress,
} from "./progress.ts";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0);
const LONG = "Build me a plan for legs";

test("level costs rise by 20", () => {
  assert.deepEqual([1, 2, 3, 4].map(levelCost), [50, 70, 90, 110]);
});

test("levelFor maps XP to level and progress inside it", () => {
  assert.deepEqual(levelFor(0), { level: 1, title: "Rookie", intoLevel: 0, levelCost: 50 });
  assert.deepEqual(levelFor(49), { level: 1, title: "Rookie", intoLevel: 49, levelCost: 50 });
  assert.deepEqual(levelFor(50), { level: 2, title: "Regular", intoLevel: 0, levelCost: 70 });
  assert.deepEqual(levelFor(125), { level: 3, title: "Committed", intoLevel: 5, levelCost: 90 });
});

test("titles stop at Elite", () => {
  assert.equal(titleFor(8), "Elite");
  assert.equal(titleFor(15), "Elite");
});

test("localDayKey uses local date, zero padded", () => {
  assert.equal(localDayKey(at(2026, 3, 5, 0)), "2026-03-05");
  assert.equal(localDayKey(at(2026, 3, 5, 23)), "2026-03-05");
});

test("first message of the day earns 10 + 20 and starts a streak", () => {
  const r = award(EMPTY_PROGRESS, LONG, at(2026, 11, 10));
  assert.equal(r.gained, 30);
  assert.equal(r.dailyBonus, true);
  assert.deepEqual(r.progress, {
    xp: 30, counted: 1, streak: 1, lastActiveDay: "2026-11-10", lastCountedText: LONG.toLowerCase(),
  });
});

test("second message the same day earns 10 and no bonus", () => {
  const first = award(EMPTY_PROGRESS, LONG, at(2026, 11, 10, 9)).progress;
  const r = award(first, "What about my upper body?", at(2026, 11, 10, 22));
  assert.equal(r.gained, 10);
  assert.equal(r.dailyBonus, false);
  assert.equal(r.progress.streak, 1);
  assert.equal(r.progress.xp, 40);
});

test("short messages earn nothing", () => {
  const r = award(EMPTY_PROGRESS, "  hi coach  ", at(2026, 11, 10));
  assert.equal(r.gained, 0);
  assert.equal(r.progress, EMPTY_PROGRESS);
});

test("repeating the last counted message (any case) earns nothing", () => {
  const first = award(EMPTY_PROGRESS, LONG, at(2026, 11, 10)).progress;
  const r = award(first, `  ${LONG.toUpperCase()} `, at(2026, 11, 10));
  assert.equal(r.gained, 0);
  assert.equal(r.progress, first);
});

test("next calendar day extends the streak, including across month ends", () => {
  const feb = award(EMPTY_PROGRESS, LONG, at(2026, 2, 28)).progress;
  const r = award(feb, "Day two, what should I train?", at(2026, 3, 1, 0));
  assert.equal(r.progress.streak, 2);
  assert.equal(r.dailyBonus, true);
});

test("a missed day resets the streak to 1", () => {
  const p = award(EMPTY_PROGRESS, LONG, at(2026, 11, 10)).progress;
  const r = award(p, "Back after a break, help!", at(2026, 11, 12));
  assert.equal(r.progress.streak, 1);
  assert.equal(r.gained, 30);
});

test("clock moved backwards gives no bonus and keeps the streak", () => {
  const p: Progress = { ...EMPTY_PROGRESS, xp: 30, counted: 1, streak: 3, lastActiveDay: "2026-11-10" };
  const r = award(p, "Is my clock wrong today?", at(2026, 11, 9));
  assert.equal(r.gained, 10);
  assert.equal(r.dailyBonus, false);
  assert.equal(r.progress.streak, 3);
  assert.equal(r.progress.lastActiveDay, "2026-11-10");
});

test("crossing a level boundary reports the new level only once", () => {
  const p: Progress = { ...EMPTY_PROGRESS, xp: 45, counted: 4, streak: 1, lastActiveDay: "2026-11-10" };
  const up = award(p, "One more question please", at(2026, 11, 10));
  assert.equal(up.leveledUpTo, 2);
  const after = award(up.progress, "And another question here", at(2026, 11, 10));
  assert.equal(after.leveledUpTo, null);
});

test("currentStreak is 0 once a day has been missed", () => {
  const p: Progress = { ...EMPTY_PROGRESS, streak: 5, lastActiveDay: "2026-11-10" };
  assert.equal(currentStreak(p, at(2026, 11, 10)), 5);
  assert.equal(currentStreak(p, at(2026, 11, 11)), 5);
  assert.equal(currentStreak(p, at(2026, 11, 12)), 0);
  assert.equal(currentStreak(EMPTY_PROGRESS, at(2026, 11, 12)), 0);
});

test("levelUpNote names the level, title and message count", () => {
  assert.equal(
    levelUpNote(5, 30),
    "**Level 5: Dedicated.** That's 30 messages of real work. Keep the streak going.",
  );
});
