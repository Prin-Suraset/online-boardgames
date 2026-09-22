import { cn } from "../../lib/styles";
import type {
  Player,
  SkillCardView,
  SkillType,
  WhatNumberPlayerView,
} from "../../types";

interface SkillConfirmModalProps {
  skill: SkillCardView;
  opponents: readonly WhatNumberPlayerView[];
  players: readonly Player[];
  targetPlayerId: string;
  radarRange: "LOW" | "HIGH";
  hasFaceDownCard: boolean;
  onTargetChange: (playerId: string) => void;
  onRadarRangeChange: (range: "LOW" | "HIGH") => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const SKILL_DETAILS: Record<SkillType, {
  icon: string;
  title: string;
  description: string;
}> = {
  PEEK: {
    icon: "👁️",
    title: "PEEK / สอดแนม",
    description: "เลือกผู้เล่นหนึ่งคนเพื่อดูเลขของการ์ดที่ยังคว่ำอยู่หนึ่งใบแบบส่วนตัว",
  },
  SHIELD: {
    icon: "🛡️",
    title: "SHIELD / โล่ป้องกัน",
    description: "เปิดโล่เพื่อบล็อกการทายถูกครั้งถัดไปที่พุ่งเป้ามายังคุณ",
  },
  RADAR: {
    icon: "📡",
    title: "RADAR / เรดาร์",
    description: "ตรวจสอบแบบส่วนตัวว่าผู้เล่นที่เลือกมีการ์ดคว่ำอยู่ในช่วงเลขที่กำหนดหรือไม่",
  },
  SWAP: {
    icon: "🔄",
    title: "SWAP / สลับการ์ด",
    description: "เปลี่ยนการ์ดของคุณที่ยังคว่ำอยู่หนึ่งใบเป็นเลขใหม่จากกองกลาง",
  },
  SAFE_EXIT: {
    icon: "🛑",
    title: "SAFE EXIT / หยุดพัก",
    description: "จบเทิร์นของคุณทันทีอย่างปลอดภัย หลังจากทายถูกอย่างน้อยหนึ่งครั้ง",
  },
};

function needsTarget(skillType: SkillType): boolean {
  return skillType === "PEEK" || skillType === "RADAR";
}

export function SkillConfirmModal({
  skill,
  opponents,
  players,
  targetPlayerId,
  radarRange,
  hasFaceDownCard,
  onTargetChange,
  onRadarRangeChange,
  onCancel,
  onConfirm,
}: SkillConfirmModalProps) {
  const detail = SKILL_DETAILS[skill.skill_type];
  const canConfirm = (!needsTarget(skill.skill_type) || targetPlayerId !== "")
    && (skill.skill_type !== "SWAP" || hasFaceDownCard);

  return (
    <div
      className="fixed inset-0 z-50 grid animate-[fade-in_180ms_ease-out_both] place-items-center bg-slate-950/80 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-confirm-title"
    >
      <section className="panel w-full max-w-lg animate-[modal-pop_240ms_ease-out_both] border-violet-300/25 bg-slate-950/95 p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-violet-300/30 bg-violet-400/15 text-3xl">
            {detail.icon}
          </span>
          <div>
            <p className="eyebrow">Confirm skill card</p>
            <h2 id="skill-confirm-title" className="mt-1 text-2xl font-black text-white">
              {detail.title}
            </h2>
          </div>
        </div>

        <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-slate-300">
          {detail.description}
        </p>

        {needsTarget(skill.skill_type) && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-black text-amber-200">เลือกผู้เล่นเป้าหมาย</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {opponents.map((opponent) => {
                const player = players.find((item) => item.id === opponent.player_id);
                const isSelected = opponent.player_id === targetPlayerId;
                return (
                  <button
                    key={opponent.player_id}
                    type="button"
                    onClick={() => { onTargetChange(opponent.player_id); }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                      isSelected
                        ? "border-amber-300 bg-amber-400/15 text-amber-100"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-violet-300/60",
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-950 font-black text-amber-100">
                      {player?.avatar ?? "?"}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-bold">
                      {player?.name ?? opponent.player_id}
                    </span>
                    {isSelected && <span aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {skill.skill_type === "RADAR" && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-black text-amber-200">ช่วงเลขที่ต้องการตรวจ</p>
            <div className="grid grid-cols-2 gap-2">
              {(["LOW", "HIGH"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => { onRadarRangeChange(range); }}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-bold transition",
                    radarRange === range
                      ? "border-cyan-300 bg-cyan-400/15 text-cyan-100"
                      : "border-slate-700 bg-slate-900 text-slate-400 hover:border-cyan-300/60",
                  )}
                >
                  {range === "LOW" ? "LOW · 1–20" : "HIGH · 21–40"}
                </button>
              ))}
            </div>
          </div>
        )}

        {!hasFaceDownCard && skill.skill_type === "SWAP" && (
          <p className="mt-4 text-sm font-bold text-rose-300">คุณไม่มีการ์ดคว่ำให้สลับแล้ว</p>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" onClick={onCancel} className="secondary-button flex-1">
            ❌ ยกเลิก (Cancel)
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="primary-button flex-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✅ ยืนยันใช้การ์ด (Confirm)
          </button>
        </div>
      </section>
    </div>
  );
}
