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
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current !== null) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
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
      <h3 className="shrink-0 font-black text-white">💬 Room Chat</h3>
      <div ref={messagesContainerRef} className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-500">No messages yet. Say hello!</p>
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
                  {isOwn ? "You" : message.sender_name}
                </p>
                <p className="break-words leading-5">{message.text}</p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="mt-3 flex shrink-0 gap-2">
        <input
          aria-label="Chat message"
          className="text-input min-w-0 flex-1 text-sm"
          maxLength={200}
          placeholder="Type a message…"
          value={text}
          onChange={(event) => { setText(event.target.value); }}
        />
        <button type="submit" className="primary-button px-3" disabled={text.trim() === ""}>
          <Send className="size-4" /> <span className="sr-only sm:not-sr-only">Send</span>
        </button>
      </form>
    </section>
  );
}
