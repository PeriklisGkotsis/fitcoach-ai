import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_PROGRESS } from "./progress.ts";
import { freshStored, newSessionId, parseStored, type Stored } from "./storage.ts";

const valid: Stored = {
  sessionId: "abc12345-session",
  messages: [
    { id: "1", role: "user", text: "Plan my week please", at: 1 },
    { id: "2", role: "coach", text: "Sure.", at: 2, xp: 30, dailyBonus: true },
  ],
  progress: { xp: 30, counted: 1, streak: 1, lastActiveDay: "2026-11-10", lastCountedText: "plan my week please" },
};

test("newSessionId matches the webhook's sessionId rule", () => {
  assert.match(newSessionId(), /^[A-Za-z0-9_-]{8,100}$/);
});

test("freshStored has an empty chat and empty progress", () => {
  const s = freshStored();
  assert.deepEqual(s.messages, []);
  assert.deepEqual(s.progress, EMPTY_PROGRESS);
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
  assert.equal(parseStored(JSON.stringify({ ...valid, progress: { ...valid.progress, xp: -5 } })), null);
  assert.equal(parseStored(JSON.stringify({ ...valid, progress: { ...valid.progress, streak: "3" } })), null);
});
