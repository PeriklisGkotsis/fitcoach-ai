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
            <Button
              key={s}
              variant="outline"
              className="h-auto rounded-[8px] bg-surface px-3.5 py-2 text-left text-sm font-normal whitespace-normal"
              onClick={() => onStarter(s)}
            >
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
