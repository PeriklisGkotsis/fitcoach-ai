import { test } from "node:test";
import assert from "node:assert/strict";
import { ERRORS, callCoach, parseChatRequest } from "./n8n.ts";

const req = { message: "Plan my week", sessionId: "abc12345-session" };
const opts = (impl: typeof fetch) => ({ url: "https://n8n.test/webhook/fitness-coach", apiKey: "k", fetchImpl: impl });
const respond = (status: number, body: string, contentType = "application/json") =>
  (async () => new Response(body, { status, headers: { "content-type": contentType } })) as unknown as typeof fetch;

// Keep expected console.error noise out of the test output.
console.error = () => {};

test("parseChatRequest trims and accepts valid input", () => {
  assert.deepEqual(parseChatRequest({ message: "  hi there  ", sessionId: "abc12345" }), { message: "hi there", sessionId: "abc12345" });
});

test("parseChatRequest rejects bad input", () => {
  assert.equal(parseChatRequest(null), null);
  assert.equal(parseChatRequest({ message: "   ", sessionId: "abc12345" }), null);
  assert.equal(parseChatRequest({ message: "x".repeat(4001), sessionId: "abc12345" }), null);
  assert.equal(parseChatRequest({ message: "hi", sessionId: "short" }), null);
  assert.equal(parseChatRequest({ message: "hi", sessionId: "has space!" }), null);
  assert.equal(parseChatRequest({ message: 5, sessionId: "abc12345" }), null);
});

test("callCoach sends the key and returns the reply", async () => {
  let seen: RequestInit | undefined;
  const impl = (async (_url: string, init: RequestInit) => {
    seen = init;
    return new Response(JSON.stringify({ success: true, data: { reply: "Hi!", sessionId: req.sessionId } }), { status: 200 });
  }) as unknown as typeof fetch;
  const r = await callCoach(req, opts(impl));
  assert.deepEqual(r, { status: 200, body: { success: true, data: { reply: "Hi!" } } });
  assert.equal((seen?.headers as Record<string, string>)["x-api-key"], "k");
  assert.deepEqual(JSON.parse(String(seen?.body)), req);
});

test("callCoach maps n8n 400 to the invalid message", async () => {
  const r = await callCoach(req, opts(respond(400, JSON.stringify({ success: false, error: "Invalid request." }))));
  assert.deepEqual(r, { status: 400, body: { success: false, error: ERRORS.invalid } });
});

test("callCoach maps n8n 500 to 503 unavailable", async () => {
  const r = await callCoach(req, opts(respond(500, JSON.stringify({ success: false, error: "x" }))));
  assert.deepEqual(r, { status: 503, body: { success: false, error: ERRORS.unavailable } });
});

test("callCoach maps 403 plain text to 502 unavailable", async () => {
  const r = await callCoach(req, opts(respond(403, "Authorization data is wrong!", "text/plain")));
  assert.deepEqual(r, { status: 502, body: { success: false, error: ERRORS.unavailable } });
});

test("callCoach treats a 200 with an unexpected body as unavailable", async () => {
  for (const body of ["<html>oops</html>", JSON.stringify({ success: true }), JSON.stringify({ success: true, data: { reply: "  " } })]) {
    const r = await callCoach(req, opts(respond(200, body)));
    assert.deepEqual(r, { status: 502, body: { success: false, error: ERRORS.unavailable } });
  }
});

test("callCoach maps network errors and timeouts to 503", async () => {
  const boom = (async () => { throw new DOMException("timed out", "TimeoutError"); }) as unknown as typeof fetch;
  const r = await callCoach(req, opts(boom));
  assert.deepEqual(r, { status: 503, body: { success: false, error: ERRORS.unavailable } });
});
