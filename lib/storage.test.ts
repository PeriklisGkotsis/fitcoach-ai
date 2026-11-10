import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_PROGRESS } from "./progress.ts";
import { freshStored, newSessionId, parseStored, type Stored } from "./storage.ts";

const valid: Stored = {
  sessionId: "abc12345-session",
  messages: [
    { id: "1", role: "user", text: "Plan my week please", at: 1 },
    { id: "2", role: "coach", text: "Sure.", at: 2 },
  ],
  progress: {
    counted: 1, streak: 1, bestStreak: 1, lastActiveDay: "2026-11-10",
    lastCountedText: "plan my week please", memberSince: "2026-11-10",
  },
};

test("newSessionId matches the webhook's sessionId rule", () => {
  assert.match(newSessionId(), /^[A-Za-z0-9_-]{8,100}$/);
});

test("freshStored has an empty chat, empty progress and today as member since", () => {
  const s = freshStored(new Date(2026, 10, 10));
  assert.deepEqual(s.messages, []);
  assert.deepEqual(s.progress, { ...EMPTY_PROGRESS, memberSince: "2026-11-10" });
});

test("parseStored round-trips a valid value", () => {
  assert.deepEqual(parseStored(JSON.stringify(valid)), valid);
});

test("parseStored returns null for missing, non-JSON or wrong-shape values", () => {
  assert.equal(parseStored(null), null);
  assert.equal(parseStored("{not json"), null);
  assert.equal(parseStored("42"), null);
  assert.equal(parseStored(JSON.stringify({ progress: "x" })), null);
});

test("parseStored keeps valid progress when messages are broken", () => {
  const broken = { ...valid, messages: [{ id: 1, role: "robot" }] };
  const s = parseStored(JSON.stringify(broken));
  assert.ok(s);
  assert.deepEqual(s.progress, valid.progress);
  assert.deepEqual(s.messages, []);
});

test("parseStored replaces an invalid sessionId", () => {
  const s = parseStored(JSON.stringify({ ...valid, sessionId: "bad id!" }));
  assert.ok(s);
  assert.match(s.sessionId, /^[A-Za-z0-9_-]{8,100}$/);
  assert.deepEqual(s.progress, valid.progress);
});

test("parseStored rejects negative or non-numeric progress", () => {
  assert.equal(parseStored(JSON.stringify({ ...valid, progress: { ...valid.progress, counted: -5 } })), null);
  assert.equal(parseStored(JSON.stringify({ ...valid, progress: { ...valid.progress, streak: "3" } })), null);
});

test("parseStored rejects absurd or fractional counts that would break the tracker", () => {
  for (const counted of [1e21, 1e8, 12.5]) {
    assert.equal(parseStored(JSON.stringify({ ...valid, progress: { ...valid.progress, counted } })), null);
  }
});

test("parseStored rejects a malformed lastActiveDay", () => {
  assert.equal(parseStored(JSON.stringify({ ...valid, progress: { ...valid.progress, lastActiveDay: "zzz" } })), null);
});

test("parseStored upgrades old XP-era progress: keeps counts, best streak = streak", () => {
  const old = { ...valid, progress: { xp: 120, counted: 9, streak: 3, lastActiveDay: "2026-11-10", lastCountedText: "x" } };
  const s = parseStored(JSON.stringify(old));
  assert.ok(s);
  assert.deepEqual(s.progress, {
    counted: 9, streak: 3, bestStreak: 3, lastActiveDay: "2026-11-10", lastCountedText: "x", memberSince: null,
  });
});

test("parseStored rejects a malformed memberSince", () => {
  assert.equal(parseStored(JSON.stringify({ ...valid, progress: { ...valid.progress, memberSince: "soon" } })), null);
});
