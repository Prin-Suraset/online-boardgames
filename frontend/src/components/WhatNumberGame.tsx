import { useEffect, useRef, useState } from "react";

import { WhatNumberBoard, type PeekGhost } from "./game/WhatNumberBoard";
import { SkillConfirmModal } from "./game/SkillConfirmModal";
import { TargetSelectionModal } from "./game/TargetSelectionModal";
import type { ChatMessage, Player, SkillCardView, WhatNumberView } from "../types";

interface WhatNumberGameProps {
  game: WhatNumberView;
  players: readonly Player[];
  playerId: string;
  isTimerAuthority: boolean;
  onTimerChange: (secondsLeft: number) => void;
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
  onTimerChange,
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
  const [skillTargetSelection, setSkillTargetSelection] = useState("");
  const [radarRange, setRadarRange] = useState<"LOW" | "HIGH">("LOW");
  const [peekRequest, setPeekRequest] = useState<{
    targetPlayerId: string;
    cardId: string;
    insightCount: number;
  } | null>(null);
  const [peekGhost, setPeekGhost] = useState<PeekGhost | null>(null);
  const peekTimeoutRef = useRef<number | null>(null);
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
  const skillTargetId = activeOpponents.some(
    (player) => player.player_id === skillTargetSelection,
  )
    ? skillTargetSelection
    : activeOpponents[0]?.player_id || "";
  const isAttacker = game.phase === "ATTACK" && game.active_player_id === playerId;
  const hasPenalty = game.phase === "PENALTY" && game.pending_penalty_player_id === playerId;

  useEffect(() => {
    onTimerChange(secondsLeft);
  }, [onTimerChange, secondsLeft]);

  useEffect(() => {
    if (game.phase !== "THINKING" || game.turn_counter !== 1) {
      return;
    }
    const resetTimer = window.setTimeout(() => {
      setTimerState({ turn: 1, secondsLeft: game.thinking_time_seconds });
      setTargetSelection({ turn: 1, playerId: "" });
      setGuessedNumber("");
      setSelectedSkill(null);
      setSkillTargetSelection("");
      setPeekRequest(null);
      setPeekGhost(null);
      if (peekTimeoutRef.current !== null) {
        window.clearTimeout(peekTimeoutRef.current);
        peekTimeoutRef.current = null;
      }
      expiredTurnRef.current = null;
    }, 0);
    return () => { window.clearTimeout(resetTimer); };
  }, [game.phase, game.thinking_time_seconds, game.turn_counter]);

  useEffect(() => () => {
    if (peekTimeoutRef.current !== null) {
      window.clearTimeout(peekTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (
      peekRequest === null
      || game.private_insights.length <= peekRequest.insightCount
    ) {
      return;
    }
    const latestInsight = game.private_insights.at(-1) ?? "";
    const numbers = latestInsight.match(/\d+/g);
    const peekedNumber = Number(numbers?.at(-1));
    if (!Number.isInteger(peekedNumber)) {
      const clearRequest = window.setTimeout(() => {
        setPeekRequest(null);
      }, 0);
      return () => { window.clearTimeout(clearRequest); };
    }
    const updateGhost = window.setTimeout(() => {
      setPeekGhost({
        targetPlayerId: peekRequest.targetPlayerId,
        cardId: peekRequest.cardId,
        number: peekedNumber,
      });
      setPeekRequest(null);
      if (peekTimeoutRef.current !== null) {
        window.clearTimeout(peekTimeoutRef.current);
      }
      peekTimeoutRef.current = window.setTimeout(() => {
        setPeekGhost(null);
        peekTimeoutRef.current = null;
      }, 7500);
    }, 0);
    return () => { window.clearTimeout(updateGhost); };
  }, [game.private_insights, peekRequest]);

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
      const target = activeOpponents.find((item) => item.player_id === skillTargetId);
      const card = target?.cards.find((item) => !item.is_revealed);
      if (target === undefined || card === undefined) {
        notify("The target has no face-down card to swap.");
        return;
      }
      sendAction("USE_SKILL", {
        ...base,
        target_player_id: target.player_id,
      });
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
        setPeekRequest({
          targetPlayerId: target.player_id,
          cardId: card.id,
          insightCount: game.private_insights.length,
        });
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
    setSkillTargetSelection("");
  };

  const selectSkill = (skill: SkillCardView): void => {
    setSelectedSkill(skill);
    setSkillTargetSelection(activeOpponents[0]?.player_id ?? "");
  };

  return (
    <>
      <WhatNumberBoard
        game={game}
        players={players}
        playerId={playerId}
        peekGhost={peekGhost}
        selectedTargetId={selectedTargetId}
        guessedNumber={guessedNumber}
        isAttacker={isAttacker}
        hasPenalty={hasPenalty}
        onRevealCard={(cardId) => { sendAction("REVEAL_OWN", { card_id: cardId }); }}
        onTargetChange={selectTarget}
        onGuessChange={setGuessedNumber}
        onSubmitGuess={submitGuess}
        onSelectSkill={selectSkill}
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
        <SkillConfirmModal
          skill={selectedSkill}
          opponents={activeOpponents}
          players={players}
          targetPlayerId={skillTargetId}
          radarRange={radarRange}
          hasFaceDownCard={selectedSkill.skill_type === "SWAP"
            ? activeOpponents.some(
              (opponent) => opponent.player_id === skillTargetId
                && opponent.cards.some((card) => !card.is_revealed),
            )
            : ownView?.cards.some((card) => !card.is_revealed) ?? false}
          onTargetChange={setSkillTargetSelection}
          onRadarRangeChange={setRadarRange}
          onCancel={() => {
            setSelectedSkill(null);
            setSkillTargetSelection("");
          }}
          onConfirm={activateSkill}
        />
      )}
    </>
  );
}
