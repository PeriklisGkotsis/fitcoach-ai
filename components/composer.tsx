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
        className="field-sizing-content max-h-36 min-h-10 resize-none rounded-[10px] border-0 bg-transparent px-2 py-2 text-[15px] shadow-none focus-visible:ring-0 md:text-[15px]"
      />
      <Button type="submit" disabled={!canSend} className="h-10 rounded-[8px] px-4">
        Send
      </Button>
    </form>
  );
}
