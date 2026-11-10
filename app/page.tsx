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
        <Chat messages={[]} pending={false} failed={{ id: "3", text: "x", error: "Coach is unavailable right now. Try again in a moment." }} onRetry={() => {}} onStarter={() => {}} />
      </div>
      <div className="pb-4"><Composer onSend={(t) => console.log(t)} disabled={false} /></div>
    </main>
  );
}
