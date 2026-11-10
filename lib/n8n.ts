export type ChatRequest = { message: string; sessionId: string };
export type ChatResult = { success: true; data: { reply: string } } | { success: false; error: string };

export const ERRORS = {
  rateLimited: "You're sending messages quickly. Wait a few minutes and try again.",
  invalid: "That message couldn't be sent. Keep it under 4,000 characters.",
  unavailable: "Coach is unavailable right now. Try again in a moment.",
};

const SESSION_RE = /^[A-Za-z0-9_-]{8,100}$/;
export const MAX_MESSAGE_CHARS = 4000;

export function parseChatRequest(body: unknown): ChatRequest | null {
  if (!body || typeof body !== "object") return null;
  const { message, sessionId } = body as Record<string, unknown>;
  if (typeof message !== "string" || typeof sessionId !== "string") return null;
  const trimmed = message.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_MESSAGE_CHARS || !SESSION_RE.test(sessionId)) return null;
  return { message: trimmed, sessionId };
}

const fail = (status: number, error: string) => ({ status, body: { success: false as const, error } });

export async function callCoach(
  req: ChatRequest,
  opts: { url: string; apiKey: string; fetchImpl?: typeof fetch; timeoutMs?: number },
): Promise<{ status: number; body: ChatResult }> {
  const doFetch = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(opts.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": opts.apiKey },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 55_000),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[coach] request to n8n failed:", err);
    return fail(503, ERRORS.unavailable);
  }

  if (res.status === 400) return fail(400, ERRORS.invalid);
  if (res.status >= 500) {
    console.error(`[coach] n8n returned ${res.status}`);
    return fail(503, ERRORS.unavailable);
  }
  if (res.status !== 200) {
    console.error(`[coach] n8n returned ${res.status} (check N8N_API_KEY / URL)`);
    return fail(502, ERRORS.unavailable);
  }

  const data = await res.json().catch(() => null);
  const reply = data?.success === true && typeof data?.data?.reply === "string" ? data.data.reply.trim() : "";
  if (!reply) {
    console.error("[coach] n8n returned 200 with an unexpected body");
    return fail(502, ERRORS.unavailable);
  }
  return { status: 200, body: { success: true, data: { reply } } };
}
