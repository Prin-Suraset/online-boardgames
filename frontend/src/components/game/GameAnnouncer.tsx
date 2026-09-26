import { useEffect, useRef, useState } from "react";

import { cn } from "../../lib/styles";
import type { GameEvent } from "../../types";

interface GameAnnouncerProps {
  events: readonly GameEvent[];
  currentPlayerId: string;
}

interface NotificationItem {
  id: number;
  icon: string;
  message: string;
  isExiting: boolean;
}

interface MajorAnnouncement {
  id: number;
  icon: string;
  message: string;
  subtext: string;
  status: "waiting" | "visible" | "exiting";
}

function eventDisplayName(name: string | null, fallback: string): string {
  const normalized = name?.trim() ?? "";
  return normalized
    && !normalized.toLowerCase().startsWith("guest_")
    && !normalized.toLowerCase().startsWith("guest-")
    ? normalized
    : fallback;
}

function isMajorEvent(event: GameEvent): boolean {
  return [
    "TURN_START",
    "VOLUNTEER",
    "TIMEOUT_PICK",
    "TURN_END",
    "CENTER_CARD_REVEALED",
    "CENTER_REVEALED_FROM_GUESS",
    "ROUND_RESULT",
  ].includes(event.event_type);
}

function majorAnnouncementContent(event: GameEvent): Omit<MajorAnnouncement, "id" | "status"> {
  const actor = eventDisplayName(event.actor_name, "ผู้เล่น");
  const value = typeof event.value === "string" || typeof event.value === "number"
    ? String(event.value)
    : "";
  switch (event.event_type) {
    case "TURN_START":
      return {
        icon: "🎲",
        message: `เทิร์นที่ ${value} เริ่มแล้ว!`,
        subtext: "ดูไพ่บนโต๊ะให้ดี ใครพร้อมก็กดขอเล่นได้เลย",
      };
    case "VOLUNTEER":
      return {
        icon: "✋",
        message: `${actor} ขอเป็นคนบุก!`,
        subtext: "มาดูกันว่าจะทายเลขใคร",
      };
    case "TIMEOUT_PICK":
      return {
        icon: "⏱️",
        message: `หมดเวลา! ${actor} ได้บุก`,
        subtext: "ไม่มีใครอาสา รอบนี้ระบบเลยสุ่มให้",
      };
    case "TURN_END":
      return {
        icon: "🏁",
        message: "จบเทิร์นนี้แล้ว",
        subtext: "เตรียมลุยเทิร์นต่อไป",
      };
    case "CENTER_CARD_REVEALED":
      return {
        icon: "",
        message: `กองกลางเปิดเลข ${value} เพิ่ม!`,
        subtext: "ได้เบาะแสใหม่แล้ว ลองตัดเลขนี้ออกดู",
      };
    case "CENTER_REVEALED_FROM_GUESS":
      return {
        icon: "",
        message: `อ้าว เลข ${value} อยู่ในกองกลาง!`,
        subtext: "ทายพลาดครั้งนี้ แต่ทุกคนได้เบาะแสเพิ่ม",
      };
    case "ROUND_RESULT":
      return {
        icon: "🏆",
        message: "รู้ผลรอบนี้แล้ว!",
        subtext: "ดูว่าใครได้เหรียญจากกองกลาง",
      };
    default:
      return {
        icon: eventIcon(event),
        message: eventMessage(event, ""),
        subtext: "",
      };
  }
}

function eventMessage(event: GameEvent, currentPlayerId: string): string {
  const actor = eventDisplayName(event.actor_name, "ผู้เล่น");
  const target = eventDisplayName(event.target_name, "ผู้เล่นเป้าหมาย");
  const value = typeof event.value === "string" || typeof event.value === "number"
    ? String(event.value)
    : "";
  switch (event.event_type) {
    case "TIMEOUT_PICK":
      return `หมดเวลา! ${actor} ได้เป็นคนบุก`;
    case "VOLUNTEER":
      return `${actor} ขอเป็นคนบุก!`;
    case "ATTACK_GUESS":
      return `${actor} ทายว่า ${target} มีเลข ${value}`;
    case "GUESS_CORRECT":
      return event.actor_id === currentPlayerId
        ? "ทายถูกแล้ว! จะทายใครต่อดี?"
        : `${actor} ทายถูก! ได้ทายต่ออีก`;
    case "GUESS_WRONG":
      return event.actor_id === currentPlayerId
        ? "ทายพลาด! เลือกหงายการ์ดตัวเอง 1 ใบได้เลย"
        : `${actor} ทายพลาด ต้องหงายการ์ดตัวเอง 1 ใบ`;
    case "TURN_END":
      return "จบเทิร์นแล้ว เตรียมเล่นต่อ!";
    case "TURN_START":
      return `เทิร์นที่ ${value} เริ่มแล้ว!`;
    case "SKILL_USED":
      if (value === "SWAP") {
        return `${actor} สลับการ์ดคว่ำของ ${target} แล้ว!`;
      }
      return event.target_name === null
        ? `${actor} ใช้การ์ด ${value} แล้ว!`
        : `${actor} ใช้การ์ด ${value} กับ ${target}`;
    case "CENTER_CARD_REVEALED":
      return `กองกลางเปิดเลข ${value} เพิ่มแล้ว!`;
    case "CENTER_REVEALED_FROM_GUESS":
      return `เลข ${value} อยู่ในกองกลาง! ได้เบาะแสเพิ่มแล้ว`;
    case "GUESS_HELD_BY_ANOTHER":
      return `เลข ${value} ไม่อยู่ในกองจั่วแล้ว ลองตัดช้อยส์ใหม่!`;
    case "ROUND_RESULT":
      return "รู้ผลรอบนี้แล้ว!";
    case "TOP100_GUESS_RESULT":
      return "";
    case "TURN_PASSED":
      return event.player_id === currentPlayerId
        ? "คุณผ่านเทิร์นแล้ว"
        : `${eventDisplayName(event.player_name ?? event.actor_name, "ผู้เล่น")} ผ่านเทิร์นแล้ว`;
  }
}

function eventIcon(event: GameEvent): string {
  switch (event.event_type) {
    case "TIMEOUT_PICK":
      return "⏱️";
    case "VOLUNTEER":
      return "✋";
    case "ATTACK_GUESS":
    case "GUESS_CORRECT":
    case "GUESS_WRONG":
      return "🎯";
    case "SKILL_USED":
      return "🃏";
    case "TURN_END":
      return "🏁";
    case "TURN_START":
      return "🎲";
    case "CENTER_CARD_REVEALED":
      return "🔍";
    case "CENTER_REVEALED_FROM_GUESS":
      return "🔍";
    case "GUESS_HELD_BY_ANOTHER":
      return "🤫";
    case "ROUND_RESULT":
      return "🏆";
    case "TOP100_GUESS_RESULT":
      return "";
    case "TURN_PASSED":
      return "⏭️";
  }
}

export function GameAnnouncer({ events, currentPlayerId }: GameAnnouncerProps) {
  const consumedRef = useRef(0);
  const nextIdRef = useRef(1);
  const timersRef = useRef<Map<number, readonly number[]>>(new Map());
  const majorAvailableAtRef = useRef(0);
  const [notifications, setNotifications] = useState<readonly NotificationItem[]>([]);
  const [majorAnnouncements, setMajorAnnouncements] = useState<readonly MajorAnnouncement[]>([]);

  useEffect(() => {
    if (events.length < consumedRef.current) {
      consumedRef.current = 0;
    }
    const unseen = events.slice(consumedRef.current);
    consumedRef.current = events.length;
    if (unseen.length === 0) {
      return;
    }

    const incoming = unseen.filter((event) => event.event_type !== "ROUND_RESULT" && event.event_type !== "TOP100_GUESS_RESULT" && !isMajorEvent(event)).map((event) => ({
      id: nextIdRef.current++,
      icon: eventIcon(event),
      message: eventMessage(event, currentPlayerId),
      isExiting: false,
    }));
    if (incoming.length > 0) {
      setNotifications((current) => [
        ...[...incoming].reverse(),
        ...current,
      ].slice(0, 4));
    }

    for (const notification of incoming) {
      const exitTimer = window.setTimeout(() => {
        setNotifications((current) => current.map((item) =>
          item.id === notification.id ? { ...item, isExiting: true } : item
        ));
      }, 5000);
      const removeTimer = window.setTimeout(() => {
        setNotifications((current) => current.filter(
          (item) => item.id !== notification.id
        ));
        timersRef.current.delete(notification.id);
      }, 5300);
      timersRef.current.set(notification.id, [exitTimer, removeTimer]);
    }

    const now = Date.now();
    let availableAt = Math.max(now, majorAvailableAtRef.current);
    const majorIncoming = unseen.filter((event) => event.event_type !== "ROUND_RESULT" && isMajorEvent(event)).map((event) => {
      const id = nextIdRef.current++;
      const startDelay = availableAt - now;
      const announcement: MajorAnnouncement = {
        id,
        ...majorAnnouncementContent(event),
        status: startDelay === 0 ? "visible" : "waiting",
      };
      const showTimer = window.setTimeout(() => {
        setMajorAnnouncements((current) => current.map((item) =>
          item.id === id ? { ...item, status: "visible" } : item
        ));
      }, startDelay);
      const exitTimer = window.setTimeout(() => {
        setMajorAnnouncements((current) => current.map((item) =>
          item.id === id ? { ...item, status: "exiting" } : item
        ));
      }, startDelay + 1750);
      const removeTimer = window.setTimeout(() => {
        setMajorAnnouncements((current) => current.filter((item) => item.id !== id));
        timersRef.current.delete(id);
      }, startDelay + 2000);
      timersRef.current.set(id, [showTimer, exitTimer, removeTimer]);
      availableAt += 2000;
      return announcement;
    });
    majorAvailableAtRef.current = availableAt;
    if (majorIncoming.length > 0) {
      setMajorAnnouncements((current) => [...current, ...majorIncoming]);
    }
  }, [currentPlayerId, events]);

  useEffect(() => () => {
    for (const timers of timersRef.current.values()) {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    }
    timersRef.current.clear();
  }, []);

  const activeMajor = majorAnnouncements.find(
    (announcement) => announcement.status !== "waiting",
  );

  return (
    <>
      {activeMajor !== undefined && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-live="assertive">
          <div
            role="status"
            className={cn(
              "flex w-full flex-col items-center gap-2 border-y-2 border-amber-400/80 bg-slate-950/90 px-12 py-5 shadow-2xl backdrop-blur-md transition-all duration-[250ms] ease-out",
              activeMajor.status === "exiting"
                ? "scale-95 opacity-0"
                : "animate-[phase-banner-in_250ms_ease-out] scale-100 opacity-100",
            )}
          >
            <div className="text-2xl font-extrabold tracking-wider text-amber-200 drop-shadow-lg md:text-4xl">
              <span className="mr-3" aria-hidden="true">{activeMajor.icon}</span>
              {activeMajor.message}
            </div>
            <p className="text-center text-sm font-medium text-slate-300 md:text-base">
              {activeMajor.subtext}
            </p>
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <div
          className="pointer-events-none fixed top-6 left-1/2 z-[60] h-[17rem] w-[min(92vw,34rem)] -translate-x-1/2"
          aria-live="polite"
        >
          {notifications.map((notification, index) => (
            <div
              key={notification.id}
              className="absolute top-0 left-0 w-full transition-transform duration-300 ease-out"
              style={{ transform: `translateY(${String(index * 4.25)}rem)` }}
            >
              <div
                role="status"
                className={cn(
                  "flex min-h-14 w-full items-center gap-2 rounded-xl border border-amber-500/40 bg-slate-900/95 px-5 py-2.5 text-sm font-semibold text-amber-200 shadow-xl backdrop-blur-md transition-all duration-300 ease-out",
                  notification.isExiting
                    ? "-translate-y-2 opacity-0"
                    : "animate-[notification-in_300ms_ease-out] translate-y-0 opacity-100",
                )}
              >
                <span className="text-base" aria-hidden="true">{notification.icon}</span>
                <span>{notification.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
