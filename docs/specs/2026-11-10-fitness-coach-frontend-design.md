# Fitness Coach front-end: design spec

Date: 2026-11-10 · Status: approved in chat, pending written review

## Goal

A public, no-login web app where anyone with the link can chat with "Coach", the AI fitness coach served by the n8n workflow `Fitness Coach` (`qPOHLnNakXj29yVv`). It is a portfolio demo of the n8n → Next.js → Vercel pipeline. It must look professional, minimal and clean (not templated or "AI-generated"), and use light gamification (XP, levels, daily streak) to make people come back and keep talking.

**Success criteria**
- A first-time visitor understands what to do within 3 seconds (intro and starter prompts) and gets a markdown-rendered reply.
- Chat and progress survive a page refresh.
- Progress is always visible: the right panel on desktop, the top bar on mobile.
- Every failure (rate limit, model down, timeout) shows a clear message and a Retry action. Raw upstream errors never appear.
- `npm run build` passes, the `progress.ts` unit tests pass, and the app works end to end against the production webhook.

**Non-goals:** accounts, cross-device sync, multiple conversations, badges, streaming responses, server-side progress, changing the n8n workflow.

## Decisions

| Topic | Decision |
|---|---|
| Audience | Portfolio/demo, public link, no login |
| Persistence | Browser `localStorage` only (transcript and progress) |
| Gamification | XP + levels + daily streak; one level-up moment |
| Conversations | One ongoing chat with "Start over" (keeps progress) |
| Look | "Training log" direction (below) |
| Mobile | Compact top progress bar → bottom sheet with the full panel |
| Abuse guard | Basic per-IP in-memory limit in the API route |
| First visit | Coach intro line and 3 starter prompts |

## Architecture

```
Browser (React client)
  └─ POST /api/chat { message, sessionId }
       └─ app/api/chat/route.ts   validate → rate-limit → lib/n8n.ts
            └─ POST N8N_WEBHOOK_URL  (x-api-key header, server-only)
```

- The client never calls n8n and never sees `N8N_API_KEY`.
- `sessionId` is generated once on the client with `crypto.randomUUID()`, stored in `localStorage` and reused on every message. "Start over" generates a new one.

### Files

```
apps/fitness-coach/
├── app/
│   ├── layout.tsx            fonts (next/font: Archivo, Figtree), metadata
│   ├── globals.css           Tailwind + design tokens (CSS variables)
│   ├── page.tsx              renders <CoachApp/>
│   └── api/chat/route.ts     proxy + validation + rate limit
├── components/
│   ├── coach-app.tsx         client root: owns state, persistence, send/retry
│   ├── chat.tsx              message list, empty state, typing + error rows
│   ├── message.tsx           one bubble; assistant text rendered as markdown
│   ├── composer.tsx          textarea + send; Enter sends, Shift+Enter newline
│   ├── progress-panel.tsx    level numeral, title, XP bar, streak, total
│   ├── progress-bar-mobile.tsx  slim top bar that opens the Sheet
│   ├── level-up.tsx          the single orchestrated animation
│   └── ui/                   shadcn: button, textarea, sheet, progress
├── lib/
│   ├── n8n.ts                types + callCoach() fetch helper
│   ├── progress.ts           pure XP/level/streak logic (unit tested)
│   ├── progress.test.ts      node:test
│   └── storage.ts            safe localStorage read/write (try/catch, versioned key)
└── README.md                 updated with run/test/deploy notes
```

Only extra libraries beyond the CLAUDE.md stack: `react-markdown` and `remark-gfm`. Coach replies contain markdown tables, so they are needed.

## Data model (localStorage)

Key `fitness-coach:v1`:

```ts
type Stored = {
  sessionId: string;
  messages: { id: string; role: "user" | "coach"; text: string; at: number; xp?: number }[];
  progress: Progress;
};
type Progress = {
  xp: number;              // total lifetime XP
  counted: number;         // messages that earned XP
  streak: number;          // consecutive active days
  lastActiveDay: string | null; // "YYYY-MM-DD" in local time
  lastCountedText: string | null; // for duplicate check
};
```

All storage access goes through `storage.ts` and is wrapped in try/catch. If storage is unavailable or corrupt, the app starts fresh and still works for the session.

## Gamification rules (`lib/progress.ts`)

- **Qualifying message:** Coach returned success, the trimmed text is 12 characters or more, and it is not case-insensitively equal to `lastCountedText`.
- **XP:** +10 per qualifying message. +20 bonus on the first qualifying message of a local calendar day (the "daily check-in"). Failed requests earn 0.
- **Streak:** on the first qualifying message of a day, the streak becomes `streak + 1` if `lastActiveDay` was yesterday, otherwise 1.
- **Levels:** reaching level n+1 from level n costs `50 + 20·(n−1)` XP (50, 70, 90, 110, …). Level 1 starts at 0 XP.
- **Titles:** 1 Rookie, 2 Regular, 3 Committed, 4 Consistent, 5 Dedicated, 6 Athlete, 7 Competitor, 8 Elite, 9+ Elite (reuse).
- **API (pure, takes `now: Date`):**
  - `award(progress, text, now) → { progress, gained, leveledUpTo: number | null }`
  - `levelFor(xp) → { level, title, intoLevel, levelCost }`
- **Start over** clears `messages` and `sessionId` only. Progress is kept.

## UI design

### Tokens ("Training log")

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F5F6F3` | page background (cool off-white) |
| `--surface` | `#FFFFFF` | Coach bubbles, panel |
| `--ink` | `#1D2420` | text (graphite) |
| `--muted` | `#6B746F` | secondary text |
| `--line` | `#DDE1DC` | borders, dividers |
| `--pine` | `#1E5B47` | single accent: user bubbles, XP bar, focus ring, level numeral |

- Type: **Archivo** for numerals and the level display, using its condensed width at large sizes with tabular figures. **Figtree** for all UI and chat text at 15–16px body and 1.55 line-height. Sentence case everywhere: no all-caps labels, no eyebrow labels.
- Radii follow hierarchy: bubbles 14px, panel 12px, inputs 10px, buttons 8px. One flat border (`--line`) instead of drop shadows.
- Avoid: cream backgrounds, neon accents, gradient washes, identical card grids, `→` in button text, middle-dot meta strings, monospace labels.

### Layout

```
Desktop (≥ 1024px)
+---------------------------------------------+-------------------+
| Coach                         [Start over]  |                   |
|---------------------------------------------|   4               |  ← Archivo condensed, ~120px, pine
|                                             |   Consistent      |
|  Coach  What's your main goal right now?    |   ━━━━━━━━━──     |
|                       build muscle  [You]   |   38 of 110 XP    |
|  Coach  | Day | Focus | Sets |  (table)     |   to level 5      |
|                                             |                   |
|  Coach is writing…                          |   6-day streak    |
|---------------------------------------------|   42 messages     |
| [ Message Coach…                     ] Send |                   |
+---------------------------------------------+-------------------+
  chat column max-width ~68ch, left aligned        ~300px panel

Mobile (< 1024px)
+---------------------------+
| Coach        Lv 4 ━━━─ 6d |  ← tap → bottom Sheet with full panel
|---------------------------|
|  chat…                    |
|---------------------------|
| [ Message Coach…   ] Send |
+---------------------------+
```

- Coach messages are left aligned on `--surface` with a border. User messages are right aligned on `--pine` with white text.
- The composer is pinned to the bottom. The textarea auto-grows to 6 lines.

### States

- **Empty:** the line "I'm Coach. Tell me your goal and I'll build a plan around your week." plus three starter buttons: "Build me a 3-day home workout plan", "Check my squat form cues", "How much protein do I need?". Clicking one sends it.
- **Loading:** the row "Coach is writing…" with a subtle opacity pulse (disabled under reduced motion). Send is disabled and input stays editable.
- **Error:** under the failed user message, `--muted` text with the specific cause and a **Retry** button that resends the same text with no duplicate bubble. Messages:
  - 429 (our guard): "You're sending messages quickly. Wait a few minutes and try again."
  - 400: "That message couldn't be sent. Keep it under 4,000 characters."
  - 500 / timeout / network: "Coach is unavailable right now. Try again in a moment."
- **XP feedback:** after a qualifying reply, a quiet "+10 XP" (or "+30 XP · daily check-in") appears under Coach's reply and the panel bar animates to its new width.
- **Level-up (the one bold moment):** the panel numeral rolls from n to n+1 (vertical slide, ~600ms), the bar refills from 0, and the title changes. Coach adds a local, non-AI note: "Level 5: Dedicated. That's 30 messages of real work. Keep the streak going." On mobile the top bar pulses once. With reduced motion the number swaps instantly.
- **Start over:** a text button in the header, with an inline confirm ("Clear this chat? Your level and streak stay." with Clear and Cancel buttons), not a browser dialog.

### Accessibility

The message list uses `aria-live="polite"` for new Coach replies. Focus rings are visible (2px `--pine`, offset). All controls are reachable by keyboard. The Sheet comes from shadcn (Radix) with a focus trap. Color contrast is AA or better: pine on paper is about 7:1. `prefers-reduced-motion` is respected.

## API route (`app/api/chat/route.ts`)

- `export const runtime = "nodejs"`, `export const maxDuration = 60`.
- Validate the body: `message` is a trimmed string of 1–4000 chars, and `sessionId` matches `/^[A-Za-z0-9_-]{8,100}$/`. Return 400 with the JSON error shape otherwise.
- Rate limit: in-memory `Map<ip, timestamps[]>`, 20 requests per rolling 10 minutes per IP (from `x-forwarded-for`). Return 429. This is best-effort on serverless and documented as such.
- `callCoach()` in `lib/n8n.ts`: POST with `x-api-key`, `AbortSignal.timeout(55_000)`. Response mapping:
  - 200 + `{success:true}` → `{ success: true, data: { reply } }`
  - 400 → passthrough of n8n's 400 error message
  - 403 / non-JSON / other → log on the server, return 502 "Coach is unavailable right now."
  - 500 / timeout / network → 503 with the same message
- If env vars are missing, log it on the server and return 500 with a generic message.

Response shape to the client is always `{ success: true, data: { reply: string } } | { success: false, error: string }`.

## Testing

- **Unit (`node --test lib/progress.test.ts`, Node 26 type stripping, no test library):** threshold math, the title lookup, 12-character and duplicate rules, the daily bonus once per day, streak increment, streak reset after a gap, and a level-up across a boundary. A single award is at most 30 XP and the smallest level cost is 50, so `leveledUpTo` can only ever be the next level.
- **Manual end to end in Chrome:**
  - first visit with starters
  - send 6+ messages to reach a level-up
  - refresh to confirm persistence
  - Start over keeps progress
  - a forced error (bad env URL) shows Retry, and Retry succeeds
  - the 429 path, by temporarily lowering the limit
  - mobile width with the Sheet
  - keyboard-only pass
  - reduced motion
- **Design critique:** screenshots of desktop and mobile reviewed against the anti-template list above. Run `impeccable` polish/audit before shipping.
- **Gate:** `npm run build` passes before any commit.

## Shipping

1. After a green build, ask the user, then `git init` in `apps/fitness-coach`, commit (including this spec), and `gh repo create PeriklisGkotsis/fitness-coach --private --source . --push`.
2. The user imports the repo in Vercel and sets `N8N_WEBHOOK_URL` and `N8N_API_KEY`.
3. Smoke-test the Vercel URL. After that, every push to `main` auto-deploys.
