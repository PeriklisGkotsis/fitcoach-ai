import { NextResponse } from "next/server";
import { ERRORS, callCoach, parseChatRequest, type ChatResult } from "@/lib/n8n";
import { createRateLimiter } from "@/lib/rate-limit";

// Node.js is the default runtime; `runtime` can't be declared with cacheComponents enabled.
export const maxDuration = 60;

const allow = createRateLimiter({ limit: 20, windowMs: 10 * 60 * 1000 });

const json = (body: ChatResult, status: number) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allow(ip)) return json({ success: false, error: ERRORS.rateLimited }, 429);

  const input = parseChatRequest(await req.json().catch(() => null));
  if (!input) return json({ success: false, error: ERRORS.invalid }, 400);

  const url = process.env.N8N_WEBHOOK_URL;
  const apiKey = process.env.N8N_API_KEY;
  if (!url || !apiKey) {
    console.error("[coach] N8N_WEBHOOK_URL or N8N_API_KEY is not set");
    return json({ success: false, error: ERRORS.unavailable }, 500);
  }

  const { status, body } = await callCoach(input, { url, apiKey });
  return json(body, status);
}
