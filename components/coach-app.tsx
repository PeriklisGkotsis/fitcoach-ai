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
    <div className="grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px]">
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
