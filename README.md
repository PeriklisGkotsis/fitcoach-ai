# Fitness Coach

Chat with an AI fitness coach. The web app sends each message to an n8n workflow, which runs an AI Agent (OpenRouter free model `nvidia/nemotron-3.5-lightning:free`) with per-session memory.

Free OpenRouter models are rate-limited (small daily cap on accounts with no credits, and upstream congestion can return errors). The app gets a 500 when that happens, so the UI should show a "try again" message. If a free model stops working, swap the model in the n8n "OpenRouter Chat Model" node for another `:free` model.

## n8n workflow

- **Name:** Fitness Coach
- **ID:** `qPOHLnNakXj29yVv`
- **Flow:** Webhook → Valid input? → AI Agent (+ OpenRouter model, Simple Memory, last 30 messages per `sessionId`) → Respond 200
  - invalid input → Respond 400
  - AI error (after 1 retry) → Respond 500
- **Backup (pre-conversion):** [n8n/workflow.backup.json](n8n/workflow.backup.json)

## Webhook contract

`POST {N8N_WEBHOOK_URL}` (production path `/webhook/fitness-coach`)

Headers:

```
Content-Type: application/json
x-api-key: <N8N_API_KEY>
```

Request body:

```json
{
  "message": "I want to build muscle, 3 days a week at home",
  "sessionId": "b1c2d3e4-f5a6-7890-abcd-ef1234567890"
}
```

| Field | Rules |
|---|---|
| `message` | string, 1–4000 chars, not blank |
| `sessionId` | string, 8–100 chars, `A-Z a-z 0-9 - _`. The front-end generates one per conversation (e.g. `crypto.randomUUID()`) and reuses it so the coach remembers context. |

Responses:

| Status | Body |
|---|---|
| 200 | `{ "success": true, "data": { "reply": "<markdown text>", "sessionId": "..." } }` |
| 400 | `{ "success": false, "error": "Invalid request. ..." }` |
| 403 | plain text `Authorization data is wrong!` (missing/wrong `x-api-key`; sent by n8n itself, not JSON) |
| 500 | `{ "success": false, "error": "The coach is unavailable right now. Please try again." }` |

`reply` is markdown (lists, tables), so render it as markdown in the UI.

Memory is n8n's in-memory store: it is lost when n8n restarts.

## Env vars

See `.env.example`. Real values live in `.env.local` (gitignored) and in Vercel.

## Front-end

Next.js (App Router) + Tailwind + shadcn/ui. The browser calls `POST /api/chat`, which validates the input, rate-limits (20 requests per 10 min per IP, in memory, best-effort on Vercel) and forwards to the n8n webhook with `x-api-key`.

Chat history and progress (message count, level, daily streak, best streak, member since) live in the browser's `localStorage` (`fitness-coach:v1`). There are no accounts, and progress doesn't sync across devices.

Gamification: every answered message counts (12+ characters, not a repeat of the last one). Levels by message count: Rookie 0–10, Dedicated 11–25, Warrior 26–50, Champion 51–99, Legend 100+. The streak counts consecutive local days with at least one counted message. Progress saved by the older XP version carries over (its message count and streak are kept).

```bash
npm install
cp .env.example .env.local   # fill in N8N_WEBHOOK_URL and N8N_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # unit tests (node --test)
npm run build
```

Design spec: [docs/specs/2026-11-10-fitness-coach-frontend-design.md](docs/specs/2026-11-10-fitness-coach-frontend-design.md)
