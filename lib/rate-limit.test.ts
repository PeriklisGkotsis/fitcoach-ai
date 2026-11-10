import { test } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "./rate-limit.ts";

test("allows up to the limit inside the window, then blocks", () => {
  const allow = createRateLimiter({ limit: 3, windowMs: 1000 });
  assert.deepEqual([allow("a", 0), allow("a", 10), allow("a", 20), allow("a", 30)], [true, true, true, false]);
});

test("keys are independent", () => {
  const allow = createRateLimiter({ limit: 1, windowMs: 1000 });
  assert.equal(allow("a", 0), true);
  assert.equal(allow("b", 0), true);
  assert.equal(allow("a", 1), false);
});

test("old hits fall out of the rolling window", () => {
  const allow = createRateLimiter({ limit: 2, windowMs: 1000 });
  allow("a", 0);
  allow("a", 500);
  assert.equal(allow("a", 999), false);
  assert.equal(allow("a", 1001), true);
});
