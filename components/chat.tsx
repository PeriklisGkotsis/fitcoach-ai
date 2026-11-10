"use client";

import { useEffect, useRef } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/message";
import type { ChatMessage } from "@/lib/storage";

export type Failed = { id: string; text: string; error: string };

export const STARTERS = [
  "Create a 30-minute HIIT workout",
  "What should I eat after working out?",
  "How do I stay motivated to exercise?",
  "Design a beginner strength routine",
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
      <div className="m-auto flex w-full max-w-md flex-col items-center py-10 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-brand/15 text-brand ring-8 ring-brand/5" aria-hidden>
          <MessageCircle className="size-6" strokeWidth={2.25} />
        </span>
        <h1 className="mt-6 text-xl font-semibold">Ready to crush your goals?</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Start a conversation with your AI fitness coach. Ask about workouts, nutrition, or motivation.
        </p>
        <p className="mt-8 mb-3 text-xs font-medium text-muted-foreground">Try asking</p>
        <div className="flex w-full flex-col gap-2.5">
          {STARTERS.map((s) => (
            <Button
              key={s}
              variant="outline"
              className="h-auto justify-start rounded-lg border-line bg-raised/60 px-4 py-3 text-left text-sm font-normal whitespace-normal hover:border-brand/40 hover:bg-raised"
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
              <Button size="sm" variant="outline" className="rounded-lg" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : null}
        </div>
      ))}
      {pending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-brand" aria-hidden />
          Coach is writing…
        </p>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
