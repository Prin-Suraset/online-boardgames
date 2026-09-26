"""Typed HTTP and WebSocket contracts for room adapters."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, JsonValue

from app.engine.games.tictactoe import TicTacToeView
from app.engine.games.top100 import Top100View
from app.engine.games.you_or_me import YouOrMeView
from app.engine.games.what_number import WhatNumberView

GameType = Literal["tictactoe", "what_number", "you_or_me", "top100"]
GameEventType = Literal[
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
]


class StrictModel(BaseModel):
    """Base model that rejects coercion and unknown protocol fields."""

    model_config = ConfigDict(strict=True, extra="forbid")


class PlayerInput(StrictModel):
    id: str = Field(min_length=1, max_length=128)
    name: str = Field(min_length=2, max_length=24)
    avatar: str = Field(min_length=1, max_length=8)


class PlayerView(StrictModel):
    id: str
    name: str
    avatar: str
    is_ready: bool
    is_host: bool
    is_bot: bool = False


class CreateRoomRequest(StrictModel):
    game_type: GameType
    player: PlayerInput


class CreateRoomResponse(StrictModel):
    room_code: str


class RoomSummary(StrictModel):
    room_code: str
    game_type: GameType
    status: Literal["LOBBY", "PLAYING", "FINISHED"]
    player_count: int
    capacity: int = Field(ge=2, le=8)


class GameOverResult(StrictModel):
    is_over: bool = True
    outcome: Literal["WIN", "DRAW", "FORCED"]
    winner_id: str | None
    details: dict[str, JsonValue] = Field(default_factory=dict)


class RoomStateView(StrictModel):
    room_code: str
    game_type: GameType
    status: Literal["LOBBY", "PLAYING", "FINISHED"]
    host_id: str
    players: tuple[PlayerView, ...]
    game: TicTacToeView | WhatNumberView | YouOrMeView | Top100View | None
    result: GameOverResult | None


class JoinRoomPayload(StrictModel):
    player_name: str = Field(min_length=2, max_length=24)
    avatar: str = Field(min_length=1, max_length=8)


class ToggleReadyPayload(StrictModel):
    ready: bool


class GameActionPayload(StrictModel):
    action_type: str = Field(min_length=1, max_length=64)
    payload: dict[str, JsonValue]


class EmptyPayload(StrictModel):
    pass


class ChatPayload(StrictModel):
    text: str = Field(min_length=1, max_length=200)


class SendChatMessage(StrictModel):
    action: Literal["SEND_CHAT"]
    payload: ChatPayload


class ChatMessageData(StrictModel):
    sender_id: str
    sender_name: str
    text: str
    timestamp: str


class GameEventData(StrictModel):
    event_type: GameEventType
    actor_id: str | None = None
    actor_name: str | None = None
    target_id: str | None = None
    target_name: str | None = None
    value: JsonValue = None
    is_correct: bool | None = None


class JoinRoomMessage(StrictModel):
    type: Literal["JOIN_ROOM"]
    player_id: str = Field(min_length=1, max_length=128)
    payload: JoinRoomPayload


class ToggleReadyMessage(StrictModel):
    type: Literal["TOGGLE_READY"]
    player_id: str = Field(min_length=1, max_length=128)
    payload: ToggleReadyPayload


class StartGameMessage(StrictModel):
    type: Literal["START_GAME"]
    player_id: str = Field(min_length=1, max_length=128)
    payload: EmptyPayload


class GameActionMessage(StrictModel):
    type: Literal["GAME_ACTION"]
    player_id: str = Field(min_length=1, max_length=128)
    payload: GameActionPayload


class LeaveRoomMessage(StrictModel):
    type: Literal["LEAVE_ROOM"]
    player_id: str = Field(min_length=1, max_length=128)
    payload: EmptyPayload


ClientMessage = Annotated[
    JoinRoomMessage
    | ToggleReadyMessage
    | StartGameMessage
    | GameActionMessage
    | LeaveRoomMessage,
    Field(discriminator="type"),
]


class ProtocolError(StrictModel):
    code: str
    message: str
