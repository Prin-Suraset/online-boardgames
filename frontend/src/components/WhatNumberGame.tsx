import { useEffect, useRef, useState } from "react";

import { WhatNumberBoard } from "./game/WhatNumberBoard";
import { TargetSelectionModal } from "./game/TargetSelectionModal";
import type { ChatMessage, Player, SkillCardView, WhatNumberView } from "../types";

interface WhatNumberGameProps {
  game: WhatNumberView;
  players: readonly Player[];
  playerId: string;
  isTimerAuthority: boolean;
  sendAction: (actionType: string, payload: object) => void;
  notify: (message: string) => void;
  chatMessages: readonly ChatMessage[];
  sendChat: (text: string) => void;
}

export function WhatNumberGame({
  game,
  players,
  playerId,
  isTimerAuthority,
  sendAction,
  notify,
  chatMessages,
  sendChat,
}: WhatNumberGameProps) {
  const [timerState, setTimerState] = useState({
    turn: game.turn_counter,
    secondsLeft: game.thinking_time_seconds,
  });
  const [targetSelection, setTargetSelection] = useState({
    turn: game.turn_counter,
    playerId: "",
  });
  const [guessedNumber, setGuessedNumber] = useState<string>("");
  const [selectedSkill, setSelectedSkill] = useState<SkillCardView | null>(null);
  const [radarRange, setRadarRange] = useState<"LOW" | "HIGH">("LOW");
  const expiredTurnRef = useRef<number | null>(null);

  const ownView = game.players.find((player) => player.player_id === playerId);
  const activeOpponents = game.players.filter(
    (player) => player.player_id !== playerId && player.status === "ACTIVE",
  );
  const secondsLeft = timerState.turn === game.turn_counter
    ? timerState.secondsLeft
    : game.thinking_time_seconds;
  const turnTargetId = targetSelection.turn === game.turn_counter
    ? targetSelection.playerId
    : "";
  const selectedTargetId = activeOpponents.some((player) => player.player_id === turnTargetId)
    ? turnTargetId
    : "";
  const skillTargetId = selectedTargetId || activeOpponents[0]?.player_id || "";
  const isAttacker = game.phase === "ATTACK" && game.active_player_id === playerId;
  const hasPenalty = game.phase === "PENALTY" && game.pending_penalty_player_id === playerId;

  useEffect(() => {
    if (game.phase !== "THINKING") {
      return;
    }
    const timer = window.setInterval(() => {
      setTimerState((current) => {
        const currentSeconds = current.turn === game.turn_counter
          ? current.secondsLeft
          : game.thinking_time_seconds;
        const next = Math.max(0, currentSeconds - 1);
        if (next === 0 && isTimerAuthority && expiredTurnRef.current !== game.turn_counter) {
          expiredTurnRef.current = game.turn_counter;
          sendAction("TIMER_EXPIRED", {});
        }
        return { turn: game.turn_counter, secondsLeft: next };
      });
    }, 1000);
    return () => { window.clearInterval(timer); };
  }, [
    game.phase,
    game.thinking_time_seconds,
    game.turn_counter,
    isTimerAuthority,
    sendAction,
  ]);

  const selectTarget = (playerId: string): void => {
    setTargetSelection({ turn: game.turn_counter, playerId });
  };

  const submitGuess = (): void => {
    if (!isAttacker || selectedTargetId === "") {
      notify("Wait until you are the active attacker.");
      return;
    }
    const normalizedGuess = guessedNumber.trim();
    const parsedGuess = Number(normalizedGuess);
    if (
      normalizedGuess === "" ||
      !Number.isInteger(parsedGuess) ||
      parsedGuess < 1 ||
      parsedGuess > 40
    ) {
      notify("Enter a whole number from 1 to 40.");
      return;
    }
    sendAction("GUESS", {
      target_player_id: selectedTargetId,
      guessed_number: parsedGuess,
    });
    setGuessedNumber("");
  };

  const activateSkill = (): void => {
    if (selectedSkill === null || ownView === undefined) {
      return;
    }
    const base = { skill_id: selectedSkill.id };
    if (selectedSkill.skill_type === "SHIELD" || selectedSkill.skill_type === "SAFE_EXIT") {
      sendAction("USE_SKILL", base);
    } else if (selectedSkill.skill_type === "SWAP") {
      const card = ownView.cards.find((item) => !item.is_revealed);
      if (card === undefined) {
        notify("You have no face-down card to swap.");
        return;
      }
      sendAction("USE_SKILL", { ...base, payload: { card_id: card.id } });
    } else {
      const target = activeOpponents.find((item) => item.player_id === skillTargetId);
      if (target === undefined) {
        notify("Choose an active opponent first.");
        return;
      }
      if (selectedSkill.skill_type === "PEEK") {
        const card = target.cards.find((item) => !item.is_revealed);
        if (card === undefined) {
          notify("That player has no face-down card to peek at.");
          return;
        }
        sendAction("USE_SKILL", {
          ...base,
          target_player_id: target.player_id,
          payload: { card_id: card.id },
        });
      } else {
        sendAction("USE_SKILL", {
          ...base,
          target_player_id: target.player_id,
          payload: { range: radarRange },
        });
      }
    }
    setSelectedSkill(null);
  };

  return (
    <>
      <WhatNumberBoard
        game={game}
        players={players}
        playerId={playerId}
        secondsLeft={secondsLeft}
        selectedTargetId={selectedTargetId}
        guessedNumber={guessedNumber}
        isAttacker={isAttacker}
        hasPenalty={hasPenalty}
        onVolunteer={() => { sendAction("VOLUNTEER", {}); }}
        onRevealCard={(cardId) => { sendAction("REVEAL_OWN", { card_id: cardId }); }}
        onTargetChange={selectTarget}
        onGuessChange={setGuessedNumber}
        onSubmitGuess={submitGuess}
        onSelectSkill={setSelectedSkill}
        chatMessages={chatMessages}
        onSendChat={sendChat}
      />

      {isAttacker && selectedTargetId === "" && activeOpponents.length > 0 && (
        <TargetSelectionModal
          opponents={activeOpponents}
          players={players}
          onSelect={selectTarget}
        />
      )}

      {selectedSkill !== null && (
        <div className="fixed inset-0 z-50 grid animate-[fade-in_180ms_ease-out_both] place-items-center bg-slate-950/80 p-5 backdrop-blur-sm">
          <div className="panel w-full max-w-md animate-[modal-pop_240ms_ease-out_both] p-6">
            <p className="eyebrow">Activate skill</p>
            <h3 className="mt-2 text-2xl font-black text-white">
              {selectedSkill.skill_type.replace("_", " ")}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{selectedSkill.description}</p>
            {!(["SHIELD", "SAFE_EXIT", "SWAP"] as const).some(
              (skillType) => skillType === selectedSkill.skill_type,
            ) && (
              <select
                className="text-input mt-5 w-full"
                value={skillTargetId}
                onChange={(event) => { selectTarget(event.target.value); }}
              >
                {activeOpponents.map((player) => (
                  <option key={player.player_id} value={player.player_id}>
                    {players.find((item) => item.id === player.player_id)?.name ?? player.player_id}
                  </option>
                ))}
              </select>
            )}
            {selectedSkill.skill_type === "RADAR" && (
              <select
                className="text-input mt-3 w-full"
                value={radarRange}
                onChange={(event) => { setRadarRange(event.target.value === "HIGH" ? "HIGH" : "LOW"); }}
              >
                <option value="LOW">Low range · 1–20</option>
                <option value="HIGH">High range · 21–40</option>
              </select>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => { setSelectedSkill(null); }}
                className="secondary-button flex-1"
              >
                Cancel
              </button>
              <button type="button" onClick={activateSkill} className="primary-button flex-1">
                Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
