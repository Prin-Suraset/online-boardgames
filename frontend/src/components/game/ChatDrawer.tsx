import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import { ChatBox } from "./ChatBox";
import type { ChatMessage } from "../../types";

interface ChatDrawerProps {
  messages: readonly ChatMessage[];
  currentPlayerId: string;
  onSend: (text: string) => void;
}

export function ChatDrawer({ messages, currentPlayerId, onSend }: ChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [readMessageCount, setReadMessageCount] = useState(messages.length);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setReadMessageCount(messages.length);
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => { window.removeEventListener("keydown", closeOnEscape); };
  }, [isOpen, messages.length]);

  const unreadCount = isOpen ? 0 : Math.max(0, messages.length - readMessageCount);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setReadMessageCount(messages.length);
          setIsOpen(true);
        }}
        className="absolute top-1/2 right-3 z-40 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl transition-transform hover:scale-105 hover:bg-indigo-500 focus-visible:outline-indigo-300 xl:hidden"
        aria-label={unreadCount > 0 ? `Open chat, ${String(unreadCount)} unread messages` : "Open chat"}
        aria-expanded={isOpen}
      >
          <MessageCircle className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full border-2 border-slate-950 bg-rose-500 px-1 text-[10px] font-black leading-4 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <div
        className={`absolute inset-0 z-50 xl:hidden ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-slate-950/65 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => {
            setReadMessageCount(messages.length);
            setIsOpen(false);
          }}
          aria-label="Close chat drawer"
          tabIndex={isOpen ? 0 : -1}
        />
        <aside
          className={`absolute inset-y-0 right-0 flex min-h-0 w-80 max-w-[calc(100vw-3.5rem)] flex-col border-l border-slate-800 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl transition-transform duration-300 sm:w-96 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
          aria-label="Room chat"
        >
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <h2 className="text-lg font-black text-white">Room Chat</h2>
            <button
              type="button"
              onClick={() => {
                setReadMessageCount(messages.length);
                setIsOpen(false);
              }}
              className="grid size-10 place-items-center rounded-full border border-slate-700 bg-slate-800 text-xl text-slate-200 transition hover:bg-slate-700 hover:text-white"
              aria-label="Close chat drawer"
            >
              ✕
            </button>
          </div>
          <ChatBox
            messages={messages}
            currentPlayerId={currentPlayerId}
            onSend={onSend}
          />
        </aside>
      </div>
    </>
  );
}
