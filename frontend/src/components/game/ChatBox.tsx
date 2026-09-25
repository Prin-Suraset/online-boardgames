import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { Send } from "lucide-react";

import type { ChatMessage } from "../../types";
import { cn } from "../../lib/styles";

interface ChatBoxProps {
  messages: readonly ChatMessage[];
  currentPlayerId: string;
  onSend: (text: string) => void;
}

export function ChatBox({ messages, currentPlayerId, onSend }: ChatBoxProps) {
  const [text, setText] = useState("");
  const latestMessageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    latestMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const submit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const normalized = text.trim();
    if (normalized === "") {
      return;
    }
    onSend(normalized);
    setText("");
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <h3 className="font-black text-white">💬 คุยกันในห้อง</h3>
      <div className="mt-3 min-h-24 flex-1 space-y-2 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-500">ยังไม่มีใครพิมพ์เลย ทักเพื่อนหน่อยไหม?</p>
        )}
        {messages.map((message, index) => {
          const isOwn = message.sender_id === currentPlayerId;
          return (
            <div
              key={`${message.timestamp}-${message.sender_id}-${String(index)}`}
              className={cn("flex", isOwn ? "justify-end" : "justify-start")}
            >
              <div className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow",
                isOwn
                  ? "rounded-br-sm bg-cyan-500/20 text-cyan-50"
                  : "rounded-bl-sm bg-white/[0.07] text-slate-200",
              )}>
                <p className={cn("mb-0.5 text-[10px] font-bold", isOwn ? "text-cyan-300" : "text-amber-300")}>
                  {isOwn ? "คุณ" : message.sender_name}
                </p>
                <p className="break-words leading-5">{message.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={latestMessageRef} />
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          aria-label="ข้อความแชต"
          className="text-input min-w-0 flex-1 text-sm"
          maxLength={200}
          placeholder="พิมพ์คุยกับเพื่อน…"
          value={text}
          onChange={(event) => { setText(event.target.value); }}
        />
        <button type="submit" className="primary-button px-3" disabled={text.trim() === ""}>
          <Send className="size-4" /> <span className="sr-only sm:not-sr-only">ส่ง</span>
        </button>
      </form>
    </section>
  );
}
