# Fitness Coach Front-end Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js chat app where anyone can talk to "Coach" (the n8n `Fitness Coach` workflow) and earn XP, levels and a daily streak. Ship it to GitHub and Vercel.

**Architecture:** One client root (`CoachApp`) owns the chat transcript and the progress state, persisted to `localStorage`. The browser only calls `POST /api/chat`. That route validates the input, rate-limits per IP, and calls the n8n webhook with the server-only `x-api-key`. All gamification math lives in a pure, unit-tested `lib/progress.ts`.

**Tech Stack:** Next.js (App Router, latest) + React + TypeScript + Tailwind v4 + shadcn/ui (button, textarea, sheet), `react-markdown` + `remark-gfm`, `next/font` (Archivo, Figtree), Node 26 built-in test runner (`node --test`, native TS type stripping).

**Spec:** [docs/specs/2026-11-10-fitness-coach-frontend-design.md](../specs/2026-11-10-fitness-coach-frontend-design.md)

All paths below are relative to `apps/fitness-coach/` unless stated otherwise.

## Global Constraints

- The browser never calls n8n. `N8N_WEBHOOK_URL` and `N8N_API_KEY` are read only in `app/api/chat/route.ts`.
- Only extra runtime libraries beyond the scaffold and shadcn: `react-markdown`, `remark-gfm`. No test library, no state library, no `@tailwindcss/typography`.
- Tokens (exact): paper `#F5F6F3`, surface `#FFFFFF`, ink `#1D2420`, muted ink `#6B746F`, line `#DDE1DC`, pine `#1E5B47` (the only accent).
- Fonts: Archivo (numerals and level display, condensed via `font-stretch: 70%`, tabular figures) and Figtree (all UI and chat text, 15–16px, line-height 1.55).
- Radii: bubbles 14px, panel 12px, inputs 10px, buttons 8px. Borders instead of shadows.
- Copy: sentence case. No all-caps labels, no eyebrow labels, no `→` in buttons, no middle-dot meta strings (`A · B`), no monospace labels, no emoji.
- Request rules: `message` trimmed 1–4000 chars; `sessionId` matches `/^[A-Za-z0-9_-]{8,100}$/`.
- Rate limit: 20 requests per rolling 10 minutes per IP, in memory.
- XP: +10 per qualifying message (trimmed length ≥ 12, not case-insensitively equal to the last counted text, Coach replied successfully). +20 on the first qualifying message of a local calendar day.
- Level n → n+1 costs `50 + 20·(n−1)` XP. Titles: 1 Rookie, 2 Regular, 3 Committed, 4 Consistent, 5 Dedicated, 6 Athlete, 7 Competitor, 8+ Elite.
- localStorage key: `fitness-coach:v1`.
- Error copy (exact):
  - rate limited: "You're sending messages quickly. Wait a few minutes and try again."
  - invalid: "That message couldn't be sent. Keep it under 4,000 characters."
  - unavailable: "Coach is unavailable right now. Try again in a moment."
- Respect `prefers-reduced-motion`. Visible 2px pine focus ring. AA contrast.
- `npm run build` must pass before every commit (CLAUDE.md). Never commit `.env.local`.
- Ask the user before creating the GitHub repo or pushing.

## Review Focus

1. **Day rollover and clock skew:** a message just after midnight, across a month boundary, or with the device clock moved backwards must give the bonus at most once a day and never corrupt the streak. Tests are in Task 2.
2. **Corrupt or partial localStorage** (hand-edited JSON, an old shape, wrong types, storage blocked in private mode) must start fresh without crashing, and keep valid progress if only the messages are broken. Tests are in Task 3.
3. **n8n returns 200 with an unexpected body** (HTML, `success:true` without `reply`, empty reply) must become the "unavailable" error, never a blank bubble. Tests are in Task 4.
4. **Double submit** (Enter mashing, clicking a starter while a reply is pending, Retry clicked twice) must send exactly one request. Manual check in Task 7.
5. **Wide markdown tables and long unbroken strings on a 375px screen** must scroll inside the bubble, never the page. Manual check in Task 6.

---

### Task 1: Scaffold the app, design tokens and fonts

**Files:**
- Create (generated): `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `components.json`, `lib/utils.ts`, `components/ui/{button,textarea,sheet}.tsx`, `eslint.config.mjs`, `postcss.config.mjs`
- Modify: `.gitignore`, `tsconfig.json`, `package.json`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
- Keep untouched: `README.md`, `.env.example`, `.env.local`, `n8n/`, `docs/`

**Interfaces:**
- Produces: Tailwind color utilities `bg-paper bg-surface text-ink text-muted-foreground border-line bg-pine text-pine`, font utilities `font-sans` (Figtree) and `font-display` (Archivo), animation classes `animate-level-roll` and `animate-level-pulse`, markdown styles under `.coach-md`, `cn()` from `@/lib/utils`, shadcn `Button`, `Textarea`, `Sheet*`. Script `npm test`.

- [ ] **Step 1: Move existing files aside (create-next-app refuses a non-empty folder)**

```bash
cd "apps/fitness-coach"
mkdir -p ../.fc-keep
mv README.md .env.example .env.local .gitignore n8n docs ../.fc-keep/
ls -A   # expected: empty (or only .DS_Store)
```

- [ ] **Step 2: Scaffold Next.js**

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --disable-git --yes
```

Expected: `Success! Created fitness-coach`.

- [ ] **Step 3: Restore the kept files and fix `.gitignore`**

```bash
mv -f ../.fc-keep/README.md ../.fc-keep/.env.example ../.fc-keep/.env.local .
mv ../.fc-keep/n8n ../.fc-keep/docs .
rm -rf ../.fc-keep
printf '\n# keep the env template\n!.env.example\n' >> .gitignore
grep -n "env" .gitignore   # expected: a line ".env*" and a line "!.env.example"
```

- [ ] **Step 4: Add shadcn and the markdown libraries**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button textarea sheet
npm install react-markdown remark-gfm
```

Expected: `components/ui/button.tsx`, `textarea.tsx`, `sheet.tsx`, and `lib/utils.ts` exist.

- [ ] **Step 5: Enable `.ts` imports for the Node test runner and add the test script**

In `tsconfig.json`, add inside `compilerOptions`:

```json
"allowImportingTsExtensions": true,
```

In `package.json` `scripts`, add:

```json
"test": "node --test \"lib/**/*.test.ts\""
```

- [ ] **Step 6: Replace `app/globals.css` with the token system**

Overwrite the whole file (this drops shadcn's oklch palette and dark block; the spec is light-only):

```css
@import "tailwindcss";
@import "tw-animate-css";

:root {
  --paper: #f5f6f3;
  --surface: #ffffff;
  --ink: #1d2420;
  --muted-ink: #6b746f;
  --line: #dde1dc;
  --pine: #1e5b47;
  --radius: 0.625rem;

  /* shadcn aliases */
  --background: var(--paper);
  --foreground: var(--ink);
  --card: var(--surface);
  --card-foreground: var(--ink);
  --popover: var(--surface);
  --popover-foreground: var(--ink);
  --primary: var(--pine);
  --primary-foreground: #ffffff;
  --secondary: #ebeeea;
  --secondary-foreground: var(--ink);
  --muted: #ebeeea;
  --muted-foreground: var(--muted-ink);
  --accent: #ebeeea;
  --accent-foreground: var(--ink);
  --destructive: #b42318;
  --border: var(--line);
  --input: var(--line);
  --ring: var(--pine);
}

@theme inline {
  --color-paper: var(--paper);
  --color-surface: var(--surface);
  --color-ink: var(--ink);
  --color-line: var(--line);
  --color-pine: var(--pine);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --font-sans: var(--font-figtree), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-archivo), ui-sans-serif, system-ui, sans-serif;
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --animate-level-roll: level-roll 600ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  --animate-level-pulse: level-pulse 900ms ease-out 1;
}

@keyframes level-roll {
  from { transform: translateY(45%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes level-pulse {
  0%, 100% { background-color: transparent; }
  40% { background-color: color-mix(in srgb, var(--pine) 14%, transparent); }
}

@layer base {
  * { @apply border-border; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    @apply bg-background text-foreground font-sans antialiased;
    font-size: 16px;
    line-height: 1.55;
  }
  :focus-visible { outline: 2px solid var(--pine); outline-offset: 2px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}

/* Markdown inside Coach bubbles */
.coach-md > * + * { margin-top: 0.7em; }
.coach-md h1, .coach-md h2, .coach-md h3 { font-weight: 600; font-size: 1em; }
.coach-md ul { list-style: disc; padding-left: 1.25em; }
.coach-md ol { list-style: decimal; padding-left: 1.4em; }
.coach-md li + li { margin-top: 0.25em; }
.coach-md strong { font-weight: 600; }
.coach-md a { color: var(--pine); text-decoration: underline; text-underline-offset: 2px; }
.coach-md code { font-size: 0.9em; background: var(--muted); padding: 0.1em 0.3em; border-radius: 4px; }
.coach-md table { border-collapse: collapse; font-size: 0.92em; min-width: 100%; }
.coach-md th, .coach-md td { border-bottom: 1px solid var(--line); padding: 0.45em 0.75em 0.45em 0; text-align: left; vertical-align: top; white-space: nowrap; }
.coach-md th { font-weight: 600; }
```

- [ ] **Step 7: Fonts and metadata in `app/layout.tsx`**

Overwrite:

```tsx
import type { Metadata } from "next";
import { Archivo, Figtree } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Coach | Fitness chat",
  description: "Chat with Coach about training, form and nutrition, and level up as you go.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Temporary token check page in `app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="p-10">
      <p className="font-display text-[7.5rem] leading-none font-semibold text-pine tabular-nums [font-stretch:70%]">4</p>
      <p className="text-muted-foreground">Tokens and fonts loaded.</p>
    </main>
  );
}
```

Delete unused scaffold assets: `rm -f public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg`.

- [ ] **Step 9: Verify**

```bash
npm run build
npm run dev   # open http://localhost:3000
```

Expected: the build passes. The page shows a tall, narrow pine "4" on a cool off-white background, with Figtree body text.

- [ ] **Step 10: Init a local git repo (no remote) and commit**

```bash
git init -b main
git add -A
git status --short | grep -c ".env.local"   # expected: 0
git commit -m "chore: scaffold Next.js app with design tokens and fonts"
```

---

### Task 2: Gamification logic (`lib/progress.ts`)

**Files:**
- Create: `lib/progress.ts`
- Test: `lib/progress.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Progress = { xp: number; counted: number; streak: number; lastActiveDay: string | null; lastCountedText: string | null };
  const EMPTY_PROGRESS: Progress;
  const XP_PER_MESSAGE = 10; const DAILY_BONUS = 20; const MIN_CHARS = 12;
  function levelCost(level: number): number;
  function titleFor(level: number): string;
  function levelFor(xp: number): { level: number; title: string; intoLevel: number; levelCost: number };
  function localDayKey(d: Date): string;               // "YYYY-MM-DD", local time
  function currentStreak(p: Progress, now: Date): number; // 0 if last active day is before yesterday
  type Award = { progress: Progress; gained: number; dailyBonus: boolean; leveledUpTo: number | null };
  function award(p: Progress, text: string, now: Date): Award;
  function levelUpNote(level: number, counted: number): string;
  ```

- [ ] **Step 1: Write the failing tests**

`lib/progress.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '.../lib/progress.ts'`.

- [ ] **Step 3: Implement `lib/progress.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all `progress` tests pass, 0 fail.

- [ ] **Step 5: Build and commit**

```bash
npm run build
git add lib/progress.ts lib/progress.test.ts
git commit -m "feat: add XP, level and streak logic"
```

---

### Task 3: Browser persistence (`lib/storage.ts`)

**Files:**
- Create: `lib/storage.ts`
- Test: `lib/storage.test.ts`

**Interfaces:**
- Consumes: `Progress`, `EMPTY_PROGRESS` from `./progress.ts`.
- Produces:
  ```ts
  type ChatMessage = { id: string; role: "user" | "coach"; text: string; at: number; xp?: number; dailyBonus?: boolean; kind?: "levelup" };
  type Stored = { sessionId: string; messages: ChatMessage[]; progress: Progress };
  const STORAGE_KEY = "fitness-coach:v1";
  const MAX_STORED_MESSAGES = 200;
  function newSessionId(): string;
  function freshStored(): Stored;
  function parseStored(raw: string | null): Stored | null;
  function loadStored(): Stored;            // never throws
  function saveStored(s: Stored): void;     // never throws, keeps last 200 messages
  ```

- [ ] **Step 1: Write the failing tests**

`lib/storage.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '.../lib/storage.ts'`.

- [ ] **Step 3: Implement `lib/storage.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all `progress` and `storage` tests pass.

- [ ] **Step 5: Build and commit**

```bash
npm run build
git add lib/storage.ts lib/storage.test.ts
git commit -m "feat: add safe localStorage persistence"
```

---

### Task 4: n8n client, request validation and rate limiter

**Files:**
- Create: `lib/n8n.ts`, `lib/rate-limit.ts`
- Test: `lib/n8n.test.ts`, `lib/rate-limit.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // lib/n8n.ts (no env access; safe to import types/messages in client code)
  type ChatRequest = { message: string; sessionId: string };
  type ChatResult = { success: true; data: { reply: string } } | { success: false; error: string };
  const ERRORS: { rateLimited: string; invalid: string; unavailable: string };
  function parseChatRequest(body: unknown): ChatRequest | null;
  function callCoach(req: ChatRequest, opts: { url: string; apiKey: string; fetchImpl?: typeof fetch; timeoutMs?: number }): Promise<{ status: number; body: ChatResult }>;
  // lib/rate-limit.ts
  function createRateLimiter(opts: { limit: number; windowMs: number }): (key: string, now?: number) => boolean;
  ```

- [ ] **Step 1: Write the failing tests**

`lib/n8n.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ERRORS, callCoach, parseChatRequest } from "./n8n.ts";

const req = { message: "Plan my week", sessionId: "abc12345-session" };
const opts = (impl: typeof fetch) => ({ url: "https://n8n.test/webhook/fitness-coach", apiKey: "k", fetchImpl: impl });
const respond = (status: number, body: string, contentType = "application/json") =>
  (async () => new Response(body, { status, headers: { "content-type": contentType } })) as unknown as typeof fetch;

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
```

`lib/rate-limit.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '.../lib/n8n.ts'` and `.../lib/rate-limit.ts`.

- [ ] **Step 3: Implement `lib/n8n.ts`**

```ts
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
```

- [ ] **Step 4: Implement `lib/rate-limit.ts`**

```ts
// Best-effort, per server instance. On Vercel each warm function keeps its own Map.
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return function allow(key: string, now: number = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);

    if (hits.size > 1000) {
      for (const [k, times] of hits) if (now - times[times.length - 1] >= windowMs) hits.delete(k);
    }
    return true;
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: all tests pass (progress, storage, n8n, rate-limit).

- [ ] **Step 6: Build and commit**

```bash
npm run build
git add lib/n8n.ts lib/n8n.test.ts lib/rate-limit.ts lib/rate-limit.test.ts
git commit -m "feat: add n8n client, input validation and rate limiter"
```

---

### Task 5: API route `/api/chat`

**Files:**
- Create: `app/api/chat/route.ts`

**Interfaces:**
- Consumes: `callCoach`, `parseChatRequest`, `ERRORS`, `ChatResult` from `@/lib/n8n`; `createRateLimiter` from `@/lib/rate-limit`.
- Produces: `POST /api/chat` with body `{ message, sessionId }` → `ChatResult` JSON, statuses 200/400/429/500/502/503.

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from "next/server";
import { ERRORS, callCoach, parseChatRequest, type ChatResult } from "@/lib/n8n";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
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
```

- [ ] **Step 2: Verify against the real webhook**

Start the dev server (`npm run dev`) and in another terminal:

```bash
curl -s -X POST localhost:3000/api/chat -H 'Content-Type: application/json' \
  -d '{"message":"I want to build muscle, 3 days a week at home","sessionId":"plan-check-0001"}' | head -c 400; echo
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"message":"","sessionId":"plan-check-0001"}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/chat -H 'Content-Type: application/json' -d 'not json'
```

Expected:
- first call: `{"success":true,"data":{"reply":"..."}}`. If the free model is rate-limited you get `503` with the unavailable message; retry once later.
- second and third calls: `400`.

- [ ] **Step 3: Verify the key never reaches the client bundle**

```bash
npm run build
grep -rl "$(grep N8N_API_KEY .env.local | cut -d= -f2)" .next/static || echo "key not in client bundle"
```

Expected: `key not in client bundle`.

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add /api/chat proxy to the n8n webhook"
```

---

### Task 6: Chat UI components (message, composer, chat list)

**Files:**
- Create: `components/message.tsx`, `components/composer.tsx`, `components/chat.tsx`
- Modify: `app/page.tsx` (temporary fixture preview, replaced in Task 8)

**Interfaces:**
- Consumes: `ChatMessage` from `@/lib/storage`; `MAX_MESSAGE_CHARS` from `@/lib/n8n`; `Button`, `Textarea` from `@/components/ui/*`; `cn` from `@/lib/utils`.
- Produces:
  ```ts
  function Message(props: { message: ChatMessage }): JSX.Element;
  function Composer(props: { onSend: (text: string) => void; disabled: boolean }): JSX.Element;
  type Failed = { id: string; text: string; error: string };
  function Chat(props: { messages: ChatMessage[]; pending: boolean; failed: Failed | null; onRetry: () => void; onStarter: (text: string) => void }): JSX.Element;
  const STARTERS: string[];
  ```

- [ ] **Step 1: `components/message.tsx`**

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function Message({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[14px] rounded-br-[4px] bg-pine px-4 py-2.5 text-[15px] leading-[1.55] text-white">
          {message.text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div
        className={cn(
          "coach-md max-w-full min-w-0 break-words rounded-[14px] rounded-bl-[4px] border bg-surface px-4 py-3 text-[15px] leading-[1.55]",
          message.kind === "levelup" && "border-pine/40",
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="-mx-1 overflow-x-auto px-1">
                <table>{children}</table>
              </div>
            ),
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {message.text}
        </ReactMarkdown>
      </div>
      {message.xp ? (
        <p className="pl-1 text-xs text-muted-foreground tabular-nums">
          +{message.xp} XP{message.dailyBonus ? ", including your daily check-in" : ""}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: `components/composer.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MESSAGE_CHARS } from "@/lib/n8n";

export function Composer({ onSend, disabled }: { onSend: (text: string) => void; disabled: boolean }) {
  const [text, setText] = useState("");
  const canSend = !disabled && text.trim().length > 0;

  function submit() {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 rounded-[12px] border bg-surface p-2 focus-within:border-pine"
    >
      <label htmlFor="composer" className="sr-only">
        Message Coach
      </label>
      <Textarea
        id="composer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Message Coach…"
        rows={1}
        maxLength={MAX_MESSAGE_CHARS}
        className="field-sizing-content max-h-36 min-h-10 resize-none rounded-[10px] border-0 bg-transparent px-2 py-2 text-[15px] shadow-none focus-visible:ring-0"
      />
      <Button type="submit" disabled={!canSend} className="h-10 rounded-[8px] px-4">
        Send
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: `components/chat.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/message";
import type { ChatMessage } from "@/lib/storage";

export type Failed = { id: string; text: string; error: string };

export const STARTERS = [
  "Build me a 3-day home workout plan",
  "Check my squat form cues",
  "How much protein do I need?",
];

type Props = {
  messages: ChatMessage[];
  pending: boolean;
  failed: Failed | null;
  onRetry: () => void;
  onStarter: (text: string) => void;
};

export function Chat({ messages, pending, failed, onRetry, onStarter }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending, failed]);

  if (messages.length === 0 && !pending) {
    return (
      <div className="flex flex-1 flex-col justify-end gap-6 pb-4">
        <p className="max-w-[40ch] text-xl leading-snug">
          I&apos;m Coach. Tell me your goal and I&apos;ll build a plan around your week.
        </p>
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <Button key={s} variant="outline" className="h-auto rounded-[8px] bg-surface px-3.5 py-2 text-left text-sm font-normal whitespace-normal" onClick={() => onStarter(s)}>
              {s}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div role="log" aria-live="polite" aria-label="Conversation with Coach" className="flex flex-col gap-4 py-6">
      {messages.map((m) => (
        <div key={m.id} className="flex flex-col gap-2">
          <Message message={m} />
          {failed?.id === m.id && !pending ? (
            <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground" role="alert">
              <span>{failed.error}</span>
              <Button size="sm" variant="outline" className="rounded-[8px]" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : null}
        </div>
      ))}
      {pending ? <p className="text-sm text-muted-foreground animate-pulse">Coach is writing…</p> : null}
      <div ref={endRef} />
    </div>
  );
}
```

- [ ] **Step 4: Temporary fixture page to check rendering (Review Focus 5)**

Replace `app/page.tsx`:

```tsx
"use client";

import { Chat } from "@/components/chat";
import { Composer } from "@/components/composer";
import type { ChatMessage } from "@/lib/storage";

const table = `Here's your week:\n\n| Day | Focus | Exercises | Sets x reps | Rest |\n|---|---|---|---|---|\n| Mon | Push | Push-ups, pike push-ups, dips | 4 x 8-12 | 90s |\n| Wed | Pull | Rows, curls, superman holds | 4 x 10 | 90s |\n| Fri | Legs | Split squats, hip thrusts, calf raises | 4 x 12 | 60s |\n\n- **Progress** when all sets feel easy\n- Sleep 7+ hours`;
const fixture: ChatMessage[] = [
  { id: "1", role: "user", text: "I want to build muscle, 3 days a week at home", at: 1 },
  { id: "2", role: "coach", text: table, at: 2, xp: 30, dailyBonus: true },
  { id: "3", role: "user", text: "https://example.com/averyveryveryveryveryveryverylongunbrokenstringwithoutanyspacesatall", at: 3 },
];

export default function Preview() {
  return (
    <main className="mx-auto flex h-dvh max-w-[44rem] flex-col px-4">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Chat messages={fixture} pending failed={{ id: "3", text: "x", error: "Coach is unavailable right now. Try again in a moment." }} onRetry={() => {}} onStarter={() => {}} />
      </div>
      <div className="pb-4"><Composer onSend={(t) => console.log(t)} disabled={false} /></div>
    </main>
  );
}
```

- [ ] **Step 5: Verify in the browser**

Run `npm run dev`. Open `http://localhost:3000` at desktop width, then at 375px wide (DevTools device toolbar). Check:
- The table scrolls sideways inside its bubble. The page has no horizontal scrollbar at 375px.
- The long URL wraps inside the pine bubble.
- "+30 XP, including your daily check-in" appears under the Coach reply.
- Enter sends (console logs the text), Shift+Enter adds a line, and the textarea grows to about 6 lines and then scrolls.
- The focus ring is visible when tabbing.

Also check the empty state: temporarily pass `messages={[]}` and `pending={false}`. You should see the intro line and three starter buttons.

- [ ] **Step 6: Build and commit**

```bash
npm run build
git add components/message.tsx components/composer.tsx components/chat.tsx app/page.tsx
git commit -m "feat: add chat, message and composer components"
```

---

### Task 7: Progress panel, mobile bar and level-up moment

**Files:**
- Create: `components/level-up.tsx`, `components/progress-panel.tsx`, `components/mobile-progress.tsx`

**Interfaces:**
- Consumes: `Progress`, `levelFor`, `currentStreak` from `@/lib/progress`; `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetTrigger` from `@/components/ui/sheet`; `cn`.
- Produces:
  ```ts
  function LevelNumeral(props: { level: number; celebrate: boolean }): JSX.Element;
  function XpBar(props: { value: number; max: number; label: string }): JSX.Element;
  function ProgressPanel(props: { progress: Progress; celebrate: boolean }): JSX.Element;
  function MobileProgress(props: { progress: Progress; celebrate: boolean }): JSX.Element;
  ```

- [ ] **Step 1: `components/level-up.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function LevelNumeral({ level, celebrate }: { level: number; celebrate: boolean }) {
  return (
    <div className="overflow-hidden">
      <p className="sr-only" aria-live="polite">Level {level}</p>
      <span
        key={level}
        aria-hidden
        className={cn(
          "block font-display text-[7.5rem] leading-[0.85] font-semibold text-pine tabular-nums [font-stretch:70%]",
          celebrate && "animate-level-roll",
        )}
      >
        {level}
      </span>
    </div>
  );
}

// Mount at 0 and grow to the value, so a remount (keyed by level) refills the bar from empty.
export function XpBar({ value, max, label }: { value: number; max: number; label: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(Math.min(100, (value / max) * 100)));
    return () => cancelAnimationFrame(id);
  }, [value, max]);

  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-2 overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-pine transition-[width] duration-700 ease-out" style={{ width: `${width}%` }} />
    </div>
  );
}
```

- [ ] **Step 2: `components/progress-panel.tsx`**

```tsx
"use client";

import { LevelNumeral, XpBar } from "@/components/level-up";
import { currentStreak, levelFor, type Progress } from "@/lib/progress";

export function ProgressPanel({ progress, celebrate }: { progress: Progress; celebrate: boolean }) {
  const { level, title, intoLevel, levelCost } = levelFor(progress.xp);
  const streak = currentStreak(progress, new Date());

  return (
    <section aria-label="Your progress" className="flex flex-col gap-8">
      <div>
        <LevelNumeral level={level} celebrate={celebrate} />
        <p className="mt-2 text-lg font-medium">{title}</p>
      </div>

      <div className="flex flex-col gap-2">
        <XpBar key={level} value={intoLevel} max={levelCost} label={`XP toward level ${level + 1}`} />
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground tabular-nums">
            {intoLevel} of {levelCost} XP
          </span>{" "}
          to level {level + 1}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-t pt-6">
        <div>
          <dt className="text-sm text-muted-foreground">Streak</dt>
          <dd className="font-display text-2xl font-semibold tabular-nums">
            {streak ? `${streak} ${streak === 1 ? "day" : "days"}` : "0 days"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Messages</dt>
          <dd className="font-display text-2xl font-semibold tabular-nums">{progress.counted}</dd>
        </div>
      </dl>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Each question Coach answers earns 10 XP. Your first one each day earns 20 more and keeps your streak going.
      </p>
    </section>
  );
}
```

- [ ] **Step 3: `components/mobile-progress.tsx`**

```tsx
"use client";

import { ProgressPanel } from "@/components/progress-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { currentStreak, levelFor, type Progress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export function MobileProgress({ progress, celebrate }: { progress: Progress; celebrate: boolean }) {
  const { level, intoLevel, levelCost } = levelFor(progress.xp);
  const streak = currentStreak(progress, new Date());

  return (
    <Sheet>
      <SheetTrigger
        className={cn("flex items-center gap-3 rounded-[8px] px-2 py-1.5", celebrate && "animate-level-pulse")}
        aria-label={`Level ${level}, ${intoLevel} of ${levelCost} XP, ${streak}-day streak. Show progress`}
      >
        <span className="font-display text-lg font-semibold text-pine tabular-nums [font-stretch:70%]">Lv {level}</span>
        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-line">
          <span className="block h-full rounded-full bg-pine" style={{ width: `${(intoLevel / levelCost) * 100}%` }} />
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">{streak ? `Day ${streak}` : "No streak"}</span>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-[16px] px-6 pb-10">
        <SheetHeader className="px-0">
          <SheetTitle>Your progress</SheetTitle>
        </SheetHeader>
        <ProgressPanel progress={progress} celebrate={false} />
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS. Visual checks happen in Task 8 once the panel is wired into the page.

- [ ] **Step 5: Commit**

```bash
git add components/level-up.tsx components/progress-panel.tsx components/mobile-progress.tsx
git commit -m "feat: add progress panel, mobile progress bar and level-up numeral"
```

---

### Task 8: Wire it together (`CoachApp`) and end-to-end check

**Files:**
- Create: `components/coach-app.tsx`
- Modify: `app/page.tsx` (replace the fixture)

**Interfaces:**
- Consumes: everything above. `award`, `levelUpNote` from `@/lib/progress`; `loadStored`, `saveStored`, `newSessionId`, `ChatMessage`, `Stored` from `@/lib/storage`; `ERRORS`, `ChatResult` from `@/lib/n8n`; `Chat`, `Failed`, `Composer`, `ProgressPanel`, `MobileProgress`, `Button`.
- Produces: `function CoachApp(): JSX.Element` rendered by `app/page.tsx`.

- [ ] **Step 1: `components/coach-app.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Chat, type Failed } from "@/components/chat";
import { Composer } from "@/components/composer";
import { MobileProgress } from "@/components/mobile-progress";
import { ProgressPanel } from "@/components/progress-panel";
import { Button } from "@/components/ui/button";
import { ERRORS, type ChatResult } from "@/lib/n8n";
import { award, levelUpNote } from "@/lib/progress";
import { loadStored, newSessionId, saveStored, type ChatMessage, type Stored } from "@/lib/storage";

async function sendToCoach(message: string, sessionId: string): Promise<ChatResult> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId }),
    });
    const body = await res.json().catch(() => null);
    return body && typeof body.success === "boolean" ? body : { success: false, error: ERRORS.unavailable };
  } catch {
    return { success: false, error: ERRORS.unavailable };
  }
}

export function CoachApp() {
  const [store, setStore] = useState<Stored | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const inFlight = useRef(false);
  const storeRef = useRef<Stored | null>(null);
  storeRef.current = store;

  // Read localStorage after mount so server and client HTML match.
  useEffect(() => {
    setStore(loadStored());
  }, []);

  useEffect(() => {
    if (store) saveStored(store);
  }, [store]);

  async function ask(text: string, userMessageId: string) {
    const current = storeRef.current;
    if (!current || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setFailed(null);

    const result = await sendToCoach(text, current.sessionId);

    inFlight.current = false;
    setPending(false);
    const latest = storeRef.current;
    if (!latest) return;
    if (!result.success) {
      setFailed({ id: userMessageId, text, error: result.error });
      return;
    }

    const a = award(latest.progress, text, new Date());
    const reply: ChatMessage = {
      id: crypto.randomUUID(),
      role: "coach",
      text: result.data.reply,
      at: Date.now(),
      ...(a.gained ? { xp: a.gained, dailyBonus: a.dailyBonus } : {}),
    };
    const messages = [...latest.messages, reply];
    if (a.leveledUpTo) {
      messages.push({ id: crypto.randomUUID(), role: "coach", kind: "levelup", text: levelUpNote(a.leveledUpTo, a.progress.counted), at: Date.now() });
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1500);
    }
    setStore({ ...latest, messages, progress: a.progress });
  }

  function send(text: string) {
    if (!store || inFlight.current) return;
    const message: ChatMessage = { id: crypto.randomUUID(), role: "user", text, at: Date.now() };
    const next = { ...store, messages: [...store.messages, message] };
    storeRef.current = next;
    setStore(next);
    void ask(text, message.id);
  }

  function retry() {
    if (failed) void ask(failed.text, failed.id);
  }

  function startOver() {
    if (!store) return;
    setStore({ ...store, sessionId: newSessionId(), messages: [] });
    setFailed(null);
    setConfirmReset(false);
  }

  const hasMessages = (store?.messages.length ?? 0) > 0;

  return (
    <div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-1">
      <main className="flex min-h-0 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 lg:px-8">
          <p className="font-display text-xl font-semibold tracking-tight">Coach</p>
          <div className="flex items-center gap-1">
            {store ? (
              <div className="lg:hidden">
                <MobileProgress progress={store.progress} celebrate={celebrate} />
              </div>
            ) : null}
            {hasMessages && !confirmReset ? (
              <Button variant="ghost" size="sm" className="rounded-[8px] text-muted-foreground" disabled={pending} onClick={() => setConfirmReset(true)}>
                Start over
              </Button>
            ) : null}
          </div>
        </header>

        {confirmReset ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-surface px-4 py-3 text-sm lg:px-8" role="alert">
            <span>Clear this chat? Your level and streak stay.</span>
            <span className="flex gap-2">
              <Button size="sm" className="rounded-[8px]" onClick={startOver}>Clear chat</Button>
              <Button size="sm" variant="outline" className="rounded-[8px]" onClick={() => setConfirmReset(false)}>Cancel</Button>
            </span>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[44rem] flex-col px-4">
            {store ? <Chat messages={store.messages} pending={pending} failed={failed} onRetry={retry} onStarter={send} /> : null}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[44rem] px-4 pb-4">
          <Composer onSend={send} disabled={pending || !store} />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Coach gives general fitness guidance, not medical advice.
          </p>
        </div>
      </main>

      <aside className="hidden overflow-y-auto border-l bg-surface px-8 py-10 lg:block">
        {store ? <ProgressPanel progress={store.progress} celebrate={celebrate} /> : null}
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Replace `app/page.tsx`**

```tsx
import { CoachApp } from "@/components/coach-app";

export default function Home() {
  return <CoachApp />;
}
```

- [ ] **Step 3: End-to-end check in Chrome (real webhook)**

Run `npm run dev`, open `http://localhost:3000` in a fresh profile or after clearing site data, and check each item:
1. First visit: the intro line and three starters show. The panel shows a large "1", "Rookie", "0 of 50 XP to level 2", and "0 days".
2. Click a starter. You see your bubble, then "Coach is writing…", then a markdown reply with "+30 XP, including your daily check-in". The streak shows "1 day".
3. Send "hi". You get a reply with no XP line. Send the same long message twice: the second one earns no XP.
4. Send qualifying messages until XP passes 50. The numeral rolls to "2", the bar refills from empty, the title becomes "Regular", and the Coach note "**Level 2: Regular.** …" appears.
5. Refresh the page. The chat and progress are unchanged.
6. Start over → Clear chat. The chat is empty with the starters, and the level and streak are unchanged.
7. **Double submit (Review Focus 4):** type a message and press Enter 5 times fast, and click a starter while "Coach is writing…" shows. DevTools Network shows exactly one `/api/chat` request per send.
8. **Forced error:** stop the dev server, set `N8N_WEBHOOK_URL=https://example.invalid/webhook/x` in `.env.local`, and restart. Sending shows "Coach is unavailable right now. Try again in a moment." with Retry. Restore the real URL, restart, and click Retry. The reply arrives with no duplicate user bubble.
9. **429:** temporarily set `limit: 2` in `app/api/chat/route.ts`. The third send shows the "sending messages quickly" copy. Revert to `20`.
10. **Mobile (375px):** the top bar shows "Lv n", a mini bar and "Day n". Tapping it opens the bottom sheet with the full panel. Esc or swiping closes it, and focus returns to the trigger.
11. Keyboard only: Tab reaches the starters, composer, Send, Retry, Start over and the mobile trigger, and focus is always visible.
12. DevTools → Rendering → emulate `prefers-reduced-motion: reduce`. Leveling up swaps the number with no slide.

- [ ] **Step 4: Run the tests and build, then commit**

```bash
npm test
npm run build
git add components/coach-app.tsx app/page.tsx
git commit -m "feat: wire chat, progress and persistence into the coach app"
```

---

### Task 9: Design polish pass and README

**Files:**
- Modify: any component from Tasks 6–8 (styling only), `README.md`

- [ ] **Step 1: Screenshot review**

With the dev server running, use the Chrome browser tools to take screenshots of:
- desktop at 1440×900: the empty state, a mid-conversation with a table, and right after a level-up
- mobile at 375×812: the chat, and the sheet open

Review the screenshots against the Global Constraints copy and style rules and the spec's "Avoid" list. Fix anything that reads as templated: uneven spacing rhythm, a weak hierarchy between the numeral and the rest of the panel, bubbles that are too wide, gray-on-gray contrast. Keep exactly one bold element, the level numeral.

- [ ] **Step 2: Run the `impeccable` skill in audit/polish mode on `components/` and `app/`**

Apply only fixes that stay inside the Global Constraints: no new libraries, no new colors.

- [ ] **Step 3: Update `README.md`**

Append below the existing content:

````markdown
## Front-end

Next.js (App Router) + Tailwind + shadcn/ui. The browser calls `POST /api/chat`, which validates the input, rate-limits (20 requests per 10 min per IP, in memory, best-effort on Vercel) and forwards to the n8n webhook with `x-api-key`.

Chat history and progress (XP, level, daily streak) live in the browser's `localStorage` (`fitness-coach:v1`). There are no accounts, and progress doesn't sync across devices.

Gamification: +10 XP per answered message (12+ characters, not a repeat), +20 for the first one each day. Level n → n+1 costs `50 + 20·(n−1)` XP.

```bash
npm install
cp .env.example .env.local   # fill in N8N_WEBHOOK_URL and N8N_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # unit tests (node --test)
npm run build
```

Design spec: [docs/specs/2026-11-10-fitness-coach-frontend-design.md](docs/specs/2026-11-10-fitness-coach-frontend-design.md)
````

- [ ] **Step 4: Run the tests and build, then commit**

```bash
npm test
npm run build
git add -A
git status --short | grep -c ".env.local"   # expected: 0
git commit -m "style: polish pass and README front-end notes"
```

---

### Task 10: Push to GitHub and deploy on Vercel

**Files:** none

- [ ] **Step 1: Ask the user for approval** to create `PeriklisGkotsis/fitness-coach` (private) and push `main`. Do not continue without a yes.

- [ ] **Step 2: Create the repo and push**

```bash
git ls-files | grep -E "^\.env" # expected: only .env.example
gh repo create PeriklisGkotsis/fitness-coach --private --source . --remote origin --push
```

Expected: the repo URL is printed and `main` is pushed.

- [ ] **Step 3: Vercel (user action)**

Give the user these steps: Vercel → Add New → Project → import `fitness-coach`. Leave the framework preset on Next.js. Add the env vars `N8N_WEBHOOK_URL` (the production `/webhook/` URL) and `N8N_API_KEY`, then deploy.

- [ ] **Step 4: Smoke-test the production URL**

```bash
curl -s -X POST https://<vercel-domain>/api/chat -H 'Content-Type: application/json' \
  -d '{"message":"Give me a 20 minute mobility routine","sessionId":"prod-smoke-0001"}' | head -c 300; echo
```

Expected: `{"success":true,"data":{"reply":"..."}}`. Then open the URL in Chrome, send one message and confirm XP appears.
