import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function Message({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md border border-brand/25 bg-brand/15 px-4 py-2.5 text-[15px] leading-[1.55]">
          {message.text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start">
      <div
        className={cn(
          "coach-md max-w-full min-w-0 break-words rounded-2xl rounded-bl-md border bg-raised px-4 py-3 text-[15px] leading-[1.55]",
          message.kind === "levelup" && "border-gold/40 bg-gold/10",
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
    </div>
  );
}
