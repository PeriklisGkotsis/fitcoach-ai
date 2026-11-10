import { EMPTY_PROGRESS, type Progress } from "./progress.ts";

export type ChatMessage = {
  id: string;
  role: "user" | "coach";
  text: string;
  at: number;
  xp?: number;
  dailyBonus?: boolean;
  kind?: "levelup";
};

export type Stored = { sessionId: string; messages: ChatMessage[]; progress: Progress };

export const STORAGE_KEY = "fitness-coach:v1";
export const MAX_STORED_MESSAGES = 200;
const SESSION_RE = /^[A-Za-z0-9_-]{8,100}$/;

export function newSessionId(): string {
  return crypto.randomUUID();
}

export function freshStored(): Stored {
  return { sessionId: newSessionId(), messages: [], progress: { ...EMPTY_PROGRESS } };
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isStrOrNull = (v: unknown) => v === null || typeof v === "string";

function isProgress(v: unknown): v is Progress {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return isCount(p.xp) && isCount(p.counted) && isCount(p.streak) && isStrOrNull(p.lastActiveDay) && isStrOrNull(p.lastCountedText);
}

function isMessage(v: unknown): v is ChatMessage {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return typeof m.id === "string" && (m.role === "user" || m.role === "coach") && typeof m.text === "string" && typeof m.at === "number";
}

export function parseStored(raw: string | null): Stored | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (!isProgress(d.progress)) return null;

  const messages = Array.isArray(d.messages) && d.messages.every(isMessage) ? (d.messages as ChatMessage[]) : [];
  const sessionId = typeof d.sessionId === "string" && SESSION_RE.test(d.sessionId) ? d.sessionId : newSessionId();
  return { sessionId, messages, progress: d.progress };
}

export function loadStored(): Stored {
  try {
    return parseStored(window.localStorage.getItem(STORAGE_KEY)) ?? freshStored();
  } catch {
    return freshStored();
  }
}

export function saveStored(s: Stored): void {
  try {
    const trimmed = { ...s, messages: s.messages.slice(-MAX_STORED_MESSAGES) };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage blocked or full: the app keeps working for this session.
  }
}
