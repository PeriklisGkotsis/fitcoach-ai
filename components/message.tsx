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
