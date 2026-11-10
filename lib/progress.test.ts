import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_PROGRESS, TIERS, award, currentStreak, levelFor, levelUpNote, localDayKey, tierRange,
  type Progress,
} from "./progress.ts";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0);
const LONG = "Build me a plan for legs";

test("tiers match the roadmap", () => {
  assert.deepEqual(TIERS.map((t) => t.title), ["Rookie", "Dedicated", "Warrior", "Champion", "Legend"]);
  assert.deepEqual(TIERS.map((_, i) => tierRange(i)), ["0–10", "11–25", "26–50", "51–99", "100+"]);
});

test("levelFor maps message count to tier and messages to next level", () => {
  assert.deepEqual(levelFor(0), { level: 1, title: "Rookie", min: 0, next: 11, toNext: 11 });
  assert.deepEqual(levelFor(10), { level: 1, title: "Rookie", min: 0, next: 11, toNext: 1 });
  assert.deepEqual(levelFor(11), { level: 2, title: "Dedicated", min: 11, next: 26, toNext: 15 });
  assert.deepEqual(levelFor(100), { level: 5, title: "Legend", min: 100, next: null, toNext: 0 });
  assert.deepEqual(levelFor(5000), { level: 5, title: "Legend", min: 100, next: null, toNext: 0 });
});

test("localDayKey uses local date, zero padded", () => {
  assert.equal(localDayKey(at(2026, 3, 5, 0)), "2026-03-05");
  assert.equal(localDayKey(at(2026, 3, 5, 23)), "2026-03-05");
});

test("first message counts, starts a streak and sets member since", () => {
  const r = award(EMPTY_PROGRESS, LONG, at(2026, 11, 10));
  assert.equal(r.counted, true);
  assert.deepEqual(r.progress, {
    counted: 1, streak: 1, bestStreak: 1, lastActiveDay: "2026-11-10",
    lastCountedText: LONG.toLowerCase(), memberSince: "2026-11-10",
  });
});

test("member since never changes once set", () => {
  const p: Progress = { ...EMPTY_PROGRESS, memberSince: "2026-01-14" };
  assert.equal(award(p, LONG, at(2026, 11, 10)).progress.memberSince, "2026-01-14");
});

test("second message the same day counts but keeps the streak", () => {
  const first = award(EMPTY_PROGRESS, LONG, at(2026, 11, 10, 9)).progress;
  const r = award(first, "What about my upper body?", at(2026, 11, 10, 22));
  assert.equal(r.progress.counted, 2);
  assert.equal(r.progress.streak, 1);
});

test("short messages count for nothing", () => {
  const r = award(EMPTY_PROGRESS, "  hi coach  ", at(2026, 11, 10));
  assert.equal(r.counted, false);
  assert.equal(r.progress, EMPTY_PROGRESS);
});

test("repeating the last counted message (any case) counts for nothing", () => {
  const first = award(EMPTY_PROGRESS, LONG, at(2026, 11, 10)).progress;
  const r = award(first, `  ${LONG.toUpperCase()} `, at(2026, 11, 10));
  assert.equal(r.counted, false);
  assert.equal(r.progress, first);
});

test("next calendar day extends the streak, including across month ends", () => {
  const feb = award(EMPTY_PROGRESS, LONG, at(2026, 2, 28)).progress;
  const r = award(feb, "Day two, what should I train?", at(2026, 3, 1, 0));
  assert.equal(r.progress.streak, 2);
  assert.equal(r.progress.bestStreak, 2);
});

test("a missed day resets the streak to 1 but keeps the best streak", () => {
  const p: Progress = { ...EMPTY_PROGRESS, counted: 9, streak: 4, bestStreak: 4, lastActiveDay: "2026-11-10" };
  const r = award(p, "Back after a break, help!", at(2026, 11, 12));
  assert.equal(r.progress.streak, 1);
  assert.equal(r.progress.bestStreak, 4);
});

test("a last active day in the future (clock moved back) keeps the streak and re-anchors to today", () => {
  const p: Progress = { ...EMPTY_PROGRESS, counted: 1, streak: 3, bestStreak: 3, lastActiveDay: "2027-03-01" };
  const r = award(p, "Is my clock wrong today?", at(2026, 11, 9));
  assert.equal(r.progress.streak, 3);
  assert.equal(r.progress.lastActiveDay, "2026-11-09");
  const next = award(r.progress, "Next day question here", at(2026, 11, 10));
  assert.equal(next.progress.streak, 4);
});

test("crossing a tier boundary reports the new level only once", () => {
  const p: Progress = { ...EMPTY_PROGRESS, counted: 10, streak: 1, bestStreak: 1, lastActiveDay: "2026-11-10" };
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
    levelUpNote(3, 26),
    "**Level 3: Warrior.** That's 26 messages of real work. Keep the streak going.",
  );
});
