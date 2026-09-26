import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ChatMessage,
  ConnectionStatus,
  GameAction,
  GuestProfile,
  GameEvent,
  Player,
  RoomState,
  ServerEnvelope,
  TicTacToeView,
  Top100View,
  YouOrMePlayerView,
  YouOrMeView,
  WhatNumberPlayerView,
  WhatNumberView,
} from "../types";

interface UseRoomSocketResult {
  room: RoomState | null;
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  error: string | null;
  notification: string | null;
  chatMessages: readonly ChatMessage[];
  gameEvents: readonly GameEvent[];
  clearError: () => void;
  clearTransientState: () => void;
  sendAction: (actionType: string, payload: object) => void;
  sendChat: (text: string) => void;
  toggleReady: (ready: boolean) => void;
  startGame: () => void;
  leaveRoom: () => void;
}

interface ClientEnvelope {
  type: "JOIN_ROOM" | "GAME_ACTION" | "TOGGLE_READY" | "START_GAME" | "LEAVE_ROOM";
  player_id: string;
  payload: object;
}

function getWsBaseUrl(): string {
  let url =
    import.meta.env.VITE_WS_URL || "wss://boardgames-backend-pzln.onrender.com";

  if (url.startsWith("https://")) {
    url = url.replace("https://", "wss://");
  } else if (url.startsWith("http://")) {
    url = url.replace("http://", "ws://");
  } else if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
    url = `wss://${url}`;
  }

  return url.replace(/\/$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlayer(value: unknown): value is Player {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.avatar === "string" &&
    typeof value.is_ready === "boolean" &&
    typeof value.is_host === "boolean" &&
    typeof value.is_bot === "boolean"
  );
}

function isWhatNumberPlayer(value: unknown): value is WhatNumberPlayerView {
  return (
    isRecord(value) &&
    typeof value.player_id === "string" &&
    Array.isArray(value.cards) &&
    value.cards.length === 5 &&
    value.cards.every(
      (card) =>
        isRecord(card) &&
        typeof card.id === "string" &&
        (card.number === null || typeof card.number === "number") &&
        typeof card.is_revealed === "boolean",
    ) &&
    Array.isArray(value.skills) &&
    value.skills.every(
      (skill) =>
        isRecord(skill) &&
        typeof skill.id === "string" &&
        ["PEEK", "SHIELD", "RADAR", "SWAP", "SAFE_EXIT"].includes(
          typeof skill.skill_type === "string" ? skill.skill_type : "",
        ) &&
        typeof skill.description === "string",
    ) &&
    typeof value.skill_count === "number" &&
    (value.status === "ACTIVE" || value.status === "ELIMINATED") &&
    typeof value.shield_active === "boolean"
  );
}

function isWhatNumberView(value: unknown): value is WhatNumberView {
  return (
    isRecord(value) &&
    Array.isArray(value.players) &&
    value.players.every(isWhatNumberPlayer) &&
    Array.isArray(value.revealed_center_cards) &&
    value.revealed_center_cards.every((card) => typeof card === "number") &&
    typeof value.turn_counter === "number" &&
    typeof value.thinking_time_seconds === "number" &&
    ["THINKING", "ATTACK", "PENALTY", "FINISHED"].includes(
      typeof value.phase === "string" ? value.phase : "",
    ) &&
    (value.active_player_id === null || typeof value.active_player_id === "string") &&
    (value.pending_penalty_player_id === null ||
      typeof value.pending_penalty_player_id === "string") &&
    typeof value.successful_guess_chain === "boolean" &&
    (value.winner_id === null || typeof value.winner_id === "string") &&
    Array.isArray(value.event_log) &&
    value.event_log.every((entry) => typeof entry === "string") &&
    Array.isArray(value.private_insights) &&
    value.private_insights.every((entry) => typeof entry === "string")
  );
}

function isYouOrMePlayer(value: unknown): value is YouOrMePlayerView {
  return (
    isRecord(value) &&
    typeof value.player_id === "string" &&
    typeof value.coins === "number" &&
    Array.isArray(value.hand) &&
    value.hand.every(
      (card) =>
        isRecord(card) &&
        typeof card.id === "string" &&
        (card.rank === null || typeof card.rank === "number") &&
        (card.card_key === null || typeof card.card_key === "string") &&
        typeof card.is_revealed === "boolean",
    ) &&
    typeof value.hand_count === "number" &&
    (value.selected_card === null ||
      (isRecord(value.selected_card) &&
        typeof value.selected_card.id === "string" &&
        (value.selected_card.rank === null || typeof value.selected_card.rank === "number") &&
        (value.selected_card.card_key === null || typeof value.selected_card.card_key === "string") &&
        typeof value.selected_card.is_revealed === "boolean")) &&
    typeof value.is_folded === "boolean" &&
    (value.status === "ACTIVE" || value.status === "ELIMINATED")
  );
}

function isYouOrMeView(value: unknown): value is YouOrMeView {
  return (
    isRecord(value) &&
    Array.isArray(value.players) &&
    value.players.every(isYouOrMePlayer) &&
    typeof value.round_number === "number" &&
    typeof value.total_rounds === "number" &&
    typeof value.pot === "number" &&
    ["SELECT_CARD", "BETTING", "SHOWDOWN", "FINISHED"].includes(
      typeof value.phase === "string" ? value.phase : "",
    ) &&
    typeof value.current_bet === "number" &&
    (value.current_player_id === null || typeof value.current_player_id === "string") &&
    isRecord(value.player_round_bets) &&
    Array.isArray(value.round_history) &&
    (value.winner_id === null || typeof value.winner_id === "string") &&
    Array.isArray(value.event_log) &&
    value.event_log.every((entry) => typeof entry === "string")
  );
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((score) => typeof score === "number");
}

function isTop100View(value: unknown): value is Top100View {
  if (!isRecord(value)) return false;
  const isPlaying = value.status === "PLAYING";
  if (!isPlaying && value.status !== "FINISHED") return false;
  return (
    typeof value.topic_title === "string" &&
    typeof value.is_my_turn === "boolean" &&
    isNullableString(value.turn_player_id) &&
    typeof value.turn_timer === "number" &&
    typeof value.round_number === "number" &&
    typeof value.my_score === "number" &&
    (value.other_player_scores === null || isNumberRecord(value.other_player_scores)) &&
    Array.isArray(value.revealed_chronological_items) &&
    value.revealed_chronological_items.every((item) => (
      isRecord(item) && typeof item.name === "string" &&
      (item.rank === null || typeof item.rank === "number") &&
      (item.points === null || typeof item.points === "number") &&
      typeof item.is_mine === "boolean" && isNullableString(item.by) &&
      (!isPlaying || item.is_mine || (item.rank === null && item.points === null))
    )) &&
    (value.winner_ids === null ||
      (Array.isArray(value.winner_ids) && value.winner_ids.every((id) => typeof id === "string"))) &&
    (value.final_rankings === null ||
      (Array.isArray(value.final_rankings) && value.final_rankings.every((ranking) => (
        isRecord(ranking) && typeof ranking.position === "number" &&
        typeof ranking.player_id === "string" && typeof ranking.player_name === "string" &&
        typeof ranking.score === "number"
      )))) &&
    (value.answer_sheet === null ||
      (Array.isArray(value.answer_sheet) && value.answer_sheet.length === 100 &&
        value.answer_sheet.every((answer) => (
          isRecord(answer) && typeof answer.rank === "number" &&
          typeof answer.name === "string" && Array.isArray(answer.aliases) &&
          answer.aliases.every((alias) => typeof alias === "string")
        )))) &&
    (isPlaying
      ? value.other_player_scores === null && value.winner_ids === null &&
        value.final_rankings === null && value.answer_sheet === null
      : isNumberRecord(value.other_player_scores) && Array.isArray(value.winner_ids) &&
        Array.isArray(value.final_rankings) && Array.isArray(value.answer_sheet))
  );
}

function isTicTacToeView(value: unknown): value is TicTacToeView {
  return (
    isRecord(value) &&
    Array.isArray(value.board) &&
    value.board.length === 9 &&
    value.board.every((cell) => cell === null || cell === "X" || cell === "O") &&
    typeof value.current_player === "string" &&
    (value.status === "in_progress" || value.status === "won" || value.status === "draw") &&
    (value.winner === null || typeof value.winner === "string") &&
    (value.your_mark === "X" || value.your_mark === "O")
  );
}

function isGameOverResult(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.is_over === "boolean" &&
    (value.outcome === "WIN" || value.outcome === "DRAW" || value.outcome === "FORCED") &&
    (value.winner_id === null || typeof value.winner_id === "string") &&
    isRecord(value.details)
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    isRecord(value) &&
    typeof value.sender_id === "string" &&
    typeof value.sender_name === "string" &&
    typeof value.text === "string" &&
    typeof value.timestamp === "string"
  );
}

function isGameEvent(value: unknown): value is GameEvent {
  const eventTypes = [
    "VOLUNTEER",
    "TIMEOUT_PICK",
    "ATTACK_GUESS",
    "GUESS_CORRECT",
    "GUESS_WRONG",
    "TURN_END",
    "TURN_START",
    "SKILL_USED",
    "CENTER_CARD_REVEALED",
    "CENTER_REVEALED_FROM_GUESS",
    "GUESS_HELD_BY_ANOTHER",
    "ROUND_RESULT",
    "TOP100_GUESS_RESULT",
    "TURN_PASSED",
  ];
  return (
    isRecord(value) &&
    eventTypes.includes(typeof value.event_type === "string" ? value.event_type : "") &&
    isNullableString(value.actor_id) &&
    isNullableString(value.actor_name) &&
    (value.player_id === undefined || isNullableString(value.player_id)) &&
    (value.player_name === undefined || isNullableString(value.player_name)) &&
    isNullableString(value.target_id) &&
    isNullableString(value.target_name) &&
    (value.is_correct === null || typeof value.is_correct === "boolean")
  );
}

function isRoomState(value: unknown): value is RoomState {
  return (
    isRecord(value) &&
    typeof value.room_code === "string" &&
    (value.game_type === "tictactoe" || value.game_type === "what_number" || value.game_type === "you_or_me" || value.game_type === "top100") &&
    (value.status === "LOBBY" || value.status === "PLAYING" || value.status === "FINISHED") &&
    typeof value.host_id === "string" &&
    Array.isArray(value.players) &&
    value.players.every(isPlayer) &&
    (value.game === null ||
      (value.game_type === "tictactoe"
        ? isTicTacToeView(value.game)
        : value.game_type === "what_number"
          ? isWhatNumberView(value.game)
          : value.game_type === "you_or_me"
            ? isYouOrMeView(value.game)
            : isTop100View(value.game))) &&
    (value.result === null || isGameOverResult(value.result))
  );
}

function parseServerEnvelope(raw: string): ServerEnvelope | null {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }
  if (value.type === "GAME_STATE_UPDATE" && isRoomState(value.payload)) {
    return { type: value.type, payload: value.payload };
  }
  if (
    value.type === "ERROR" &&
    isRecord(value.payload) &&
    typeof value.payload.code === "string" &&
    typeof value.payload.message === "string"
  ) {
    return {
      type: value.type,
      payload: { code: value.payload.code, message: value.payload.message },
    };
  }
  if (value.event === "CHAT_MESSAGE" && isChatMessage(value.data)) {
    return { event: value.event, data: value.data };
  }
  if (value.event === "GAME_EVENT" && isGameEvent(value.data)) {
    return { event: value.event, data: value.data };
  }
  return null;
}

export function useRoomSocket(
  roomCode: string,
  profile: GuestProfile,
  authToken: string,
): UseRoomSocketResult {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("CONNECTING");
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<readonly ChatMessage[]>([]);
  const [gameEvents, setGameEvents] = useState<readonly GameEvent[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  const send = useCallback(
    (envelope: ClientEnvelope): void => {
      const socket = socketRef.current;
      if (socket?.readyState !== WebSocket.OPEN) {
        setError("ยังเชื่อมต่อห้องไม่สำเร็จ รออีกนิดแล้วลองใหม่นะ");
        return;
      }
      socket.send(JSON.stringify(envelope));
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;
    const normalizedRoomCode = roomCode.trim().toUpperCase();
    const websocketUrl = new URL(
      `/ws/rooms/${encodeURIComponent(normalizedRoomCode)}`,
      `${getWsBaseUrl()}/`,
    );
    websocketUrl.searchParams.set("token", authToken);
    const socket = new WebSocket(websocketUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      if (!isMounted) {
        return;
      }
      setConnectionStatus("CONNECTED");
      setError(null);
      const envelope: ClientEnvelope = {
        type: "JOIN_ROOM",
        player_id: profile.playerId,
        payload: {
          player_name: profile.playerName,
          avatar: profile.avatar,
        },
      };
      socket.send(JSON.stringify(envelope));
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      if (!isMounted) {
        return;
      }
      const envelope = parseServerEnvelope(event.data);
      if (envelope === null) {
        setNotification("ห้องส่งข้อมูลที่เราอ่านไม่ได้ ลองเข้าใหม่อีกทีนะ");
      } else if ("type" in envelope && envelope.type === "GAME_STATE_UPDATE") {
        if (envelope.payload.status === "LOBBY") {
          setError(null);
          setNotification(null);
          setGameEvents([]);
        }
        setRoom(envelope.payload);
      } else if ("type" in envelope) {
        setNotification(`${envelope.payload.code}: ${envelope.payload.message}`);
      } else if ("event" in envelope && envelope.event === "CHAT_MESSAGE") {
        setChatMessages((current) => [...current.slice(-199), envelope.data]);
      } else {
        setGameEvents((current) => [...current, envelope.data]);
      }
    };
    socket.onerror = () => {
      if (!isMounted) {
        return;
      }
      setConnectionStatus("ERROR");
      setError("เข้าห้องเกมไม่สำเร็จ ลองเชื่อมต่อใหม่อีกทีนะ");
    };
    socket.onclose = (event: CloseEvent) => {
      if (!isMounted || event.code === 1000) {
        return;
      }
      setConnectionStatus((current) =>
        current === "ERROR" ? current : "DISCONNECTED",
      );
    };

    return () => {
      isMounted = false;
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      if (
        socket.readyState === WebSocket.CONNECTING ||
        socket.readyState === WebSocket.OPEN
      ) {
        socket.close(1000, "room page closed");
      }
    };
  }, [authToken, profile.avatar, profile.playerId, profile.playerName, roomCode]);

  const sendAction = useCallback(
    (actionType: string, payload: object): void => {
      const action: GameAction = { action_type: actionType, payload };
      send({ type: "GAME_ACTION", player_id: profile.playerId, payload: action });
    },
    [profile.playerId, send],
  );

  const sendChat = useCallback((text: string): void => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) {
      setError("ยังเชื่อมต่อห้องไม่สำเร็จ รออีกนิดแล้วลองใหม่นะ");
      return;
    }
    socket.send(JSON.stringify({ action: "SEND_CHAT", payload: { text } }));
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
    setNotification(null);
  }, []);

  const clearTransientState = useCallback((): void => {
    setError(null);
    setNotification(null);
    setGameEvents([]);
  }, []);

  const toggleReady = useCallback(
    (ready: boolean): void => {
      send({
        type: "TOGGLE_READY",
        player_id: profile.playerId,
        payload: { ready },
      });
    },
    [profile.playerId, send],
  );

  const startGame = useCallback((): void => {
    send({ type: "START_GAME", player_id: profile.playerId, payload: {} });
  }, [profile.playerId, send]);

  const leaveRoom = useCallback((): void => {
    send({ type: "LEAVE_ROOM", player_id: profile.playerId, payload: {} });
  }, [profile.playerId, send]);

  return {
    room,
    connectionStatus,
    isConnected: connectionStatus === "CONNECTED",
    error,
    notification,
    chatMessages,
    gameEvents,
    clearError,
    clearTransientState,
    sendAction,
    sendChat,
    toggleReady,
    startGame,
    leaveRoom,
  };
}
