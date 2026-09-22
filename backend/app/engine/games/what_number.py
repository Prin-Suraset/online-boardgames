"""Pure deterministic engine for the "What number I have?" deduction game."""

from __future__ import annotations

import hashlib
import random
from typing import Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field, JsonValue, model_validator

from app.engine.base import BaseGame, GameRuleError, MoveErrorCode

Phase: TypeAlias = Literal["THINKING", "ATTACK", "PENALTY", "FINISHED"]
PlayerStatus: TypeAlias = Literal["ACTIVE", "ELIMINATED"]
SkillType: TypeAlias = Literal["PEEK", "SHIELD", "RADAR", "SWAP", "SAFE_EXIT"]
ActionType: TypeAlias = Literal[
    "VOLUNTEER", "TIMER_EXPIRED", "GUESS", "REVEAL_OWN", "USE_SKILL"
]

SKILL_DESCRIPTIONS: dict[SkillType, str] = {
    "PEEK": "Privately look at one face-down card belonging to another player.",
    "SHIELD": "Block the next correct guess that targets you.",
    "RADAR": "Check whether a player has an unrevealed number in a selected range.",
    "SWAP": "Return one face-down card and draw an unused number.",
    "SAFE_EXIT": "End your turn safely after at least one successful guess.",
}


class NumberCard(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    id: str
    number: int = Field(ge=1, le=40)
    is_revealed: bool = False


class SkillCard(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    id: str
    skill_type: SkillType


class WhatNumberPlayer(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    player_id: str
    cards: tuple[NumberCard, ...]
    skills: tuple[SkillCard, ...]
    status: PlayerStatus = "ACTIVE"
    shield_active: bool = False

    @model_validator(mode="after")
    def validate_cards(self) -> WhatNumberPlayer:
        if len(self.cards) != 5:
            raise ValueError("each player must have exactly five number cards")
        return self


class PrivateInsight(BaseModel):
    """A skill result exposed only to the player who earned it."""

    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    player_id: str
    message: str
    turn: int


class WhatNumberState(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    players: tuple[WhatNumberPlayer, ...]
    number_deck: tuple[int, ...]
    skill_deck: tuple[SkillCard, ...]
    turn_counter: int = Field(ge=1)
    thinking_time_seconds: int = Field(ge=20, le=120)
    phase: Phase = "THINKING"
    active_player_id: str | None = None
    pending_penalty_player_id: str | None = None
    successful_guess_chain: bool = False
    winner_id: str | None = None
    seed: int
    event_log: tuple[str, ...] = ()
    private_insights: tuple[PrivateInsight, ...] = ()


class WhatNumberAction(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    action_type: ActionType
    target_player_id: str | None = None
    guessed_number: int | None = Field(default=None, ge=1, le=40)
    card_id: str | None = None
    skill_id: str | None = None
    payload: dict[str, JsonValue] = Field(default_factory=dict)


class NumberCardView(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    id: str
    number: int | None
    is_revealed: bool


class SkillCardView(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    id: str
    skill_type: SkillType
    description: str


class WhatNumberPlayerView(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    player_id: str
    cards: tuple[NumberCardView, ...]
    skills: tuple[SkillCardView, ...]
    skill_count: int
    status: PlayerStatus
    shield_active: bool


class WhatNumberView(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    players: tuple[WhatNumberPlayerView, ...]
    turn_counter: int
    thinking_time_seconds: int
    phase: Phase
    active_player_id: str | None
    pending_penalty_player_id: str | None
    successful_guess_chain: bool
    winner_id: str | None
    event_log: tuple[str, ...]
    private_insights: tuple[str, ...]


class WhatNumberEngine(BaseGame[WhatNumberState, WhatNumberAction, WhatNumberView]):
    """Rules engine whose transitions depend only on state and action inputs."""

    MIN_PLAYERS = 3
    MAX_PLAYERS = 8

    @classmethod
    def initial_state(cls, player_ids: tuple[str, ...]) -> WhatNumberState:
        digest = hashlib.sha256("\x1f".join(player_ids).encode("utf-8")).digest()
        return cls.create_state(player_ids, seed=int.from_bytes(digest[:8], "big"))

    @classmethod
    def create_state(
        cls, player_ids: tuple[str, ...], *, seed: int
    ) -> WhatNumberState:
        if not cls.MIN_PLAYERS <= len(player_ids) <= cls.MAX_PLAYERS:
            raise ValueError("What number I have? requires 3 to 8 players")
        if any(not player_id for player_id in player_ids):
            raise ValueError("player IDs must not be empty")
        if len(set(player_ids)) != len(player_ids):
            raise ValueError("player IDs must be unique")

        rng = random.Random(seed)
        numbers = list(range(1, 41))
        rng.shuffle(numbers)
        skill_types: list[SkillType] = [
            skill_type
            for skill_type in SKILL_DESCRIPTIONS
            for _ in range(4)
        ]
        rng.shuffle(skill_types)
        skill_cards = tuple(
            SkillCard(id=f"skill-{index + 1}", skill_type=skill_type)
            for index, skill_type in enumerate(skill_types)
        )

        players: list[WhatNumberPlayer] = []
        number_index = 0
        skill_index = 0
        for player_index, player_id in enumerate(player_ids):
            cards = tuple(
                NumberCard(
                    id=f"number-{player_index + 1}-{card_index + 1}",
                    number=numbers[number_index + card_index],
                )
                for card_index in range(5)
            )
            skills = skill_cards[skill_index : skill_index + 2]
            players.append(
                WhatNumberPlayer(player_id=player_id, cards=cards, skills=skills)
            )
            number_index += 5
            skill_index += 2

        return WhatNumberState(
            players=tuple(players),
            number_deck=tuple(numbers[number_index:]),
            skill_deck=skill_cards[skill_index:],
            turn_counter=1,
            thinking_time_seconds=cls.thinking_time_for_turn(1),
            seed=seed,
            event_log=("Game started. Waiting for a volunteer.",),
        )

    @staticmethod
    def thinking_time_for_turn(turn_counter: int) -> int:
        if turn_counter < 1:
            raise ValueError("turn counter must be positive")
        return max(20, 120 - ((turn_counter - 1) // 5) * 20)

    @classmethod
    def apply_action(
        cls,
        state: WhatNumberState,
        player_id: str,
        action: WhatNumberAction,
    ) -> WhatNumberState:
        player = cls._player(state, player_id)
        if state.phase == "FINISHED":
            raise GameRuleError(MoveErrorCode.GAME_OVER, "the game is already over")
        if player.status != "ACTIVE":
            raise GameRuleError(MoveErrorCode.INVALID_PLAYER, "player is eliminated")

        if action.action_type == "VOLUNTEER":
            return cls._volunteer(state, player_id)
        if action.action_type == "TIMER_EXPIRED":
            return cls._timer_expired(state)
        if action.action_type == "GUESS":
            return cls._guess(state, player_id, action)
        if action.action_type == "REVEAL_OWN":
            return cls._reveal_own(state, player_id, action)
        if action.action_type == "USE_SKILL":
            return cls._use_skill(state, player_id, action)
        raise GameRuleError(MoveErrorCode.INVALID_ACTION, "unsupported action")

    @classmethod
    def get_player_view(
        cls,
        state: WhatNumberState,
        player_id: str,
        is_admin: bool = False,
    ) -> WhatNumberView:
        cls._player(state, player_id)
        player_views: list[WhatNumberPlayerView] = []
        for game_player in state.players:
            can_see_all = is_admin or game_player.player_id == player_id
            player_views.append(
                WhatNumberPlayerView(
                    player_id=game_player.player_id,
                    cards=tuple(
                        NumberCardView(
                            id=card.id,
                            number=card.number
                            if can_see_all or card.is_revealed
                            else None,
                            is_revealed=card.is_revealed,
                        )
                        for card in game_player.cards
                    ),
                    skills=tuple(
                        SkillCardView(
                            id=skill.id,
                            skill_type=skill.skill_type,
                            description=SKILL_DESCRIPTIONS[skill.skill_type],
                        )
                        for skill in game_player.skills
                    )
                    if can_see_all
                    else (),
                    skill_count=len(game_player.skills),
                    status=game_player.status,
                    shield_active=game_player.shield_active,
                )
            )
        return WhatNumberView(
            players=tuple(player_views),
            turn_counter=state.turn_counter,
            thinking_time_seconds=state.thinking_time_seconds,
            phase=state.phase,
            active_player_id=state.active_player_id,
            pending_penalty_player_id=state.pending_penalty_player_id,
            successful_guess_chain=state.successful_guess_chain,
            winner_id=state.winner_id,
            event_log=state.event_log,
            private_insights=tuple(
                insight.message
                for insight in state.private_insights
                if insight.player_id == player_id
            ),
        )

    @classmethod
    def _volunteer(cls, state: WhatNumberState, player_id: str) -> WhatNumberState:
        if state.phase != "THINKING":
            raise GameRuleError(
                MoveErrorCode.INVALID_ACTION, "volunteering is only allowed while thinking"
            )
        return state.model_copy(
            update={
                "phase": "ATTACK",
                "active_player_id": player_id,
                "event_log": state.event_log + (f"{player_id} volunteered to attack.",),
            }
        )

    @classmethod
    def _timer_expired(cls, state: WhatNumberState) -> WhatNumberState:
        if state.phase != "THINKING":
            raise GameRuleError(
                MoveErrorCode.INVALID_ACTION, "the thinking timer is not active"
            )
        active = tuple(
            player.player_id for player in state.players if player.status == "ACTIVE"
        )
        rng = random.Random(state.seed + state.turn_counter * 104_729)
        selected = active[rng.randrange(len(active))]
        return state.model_copy(
            update={
                "phase": "ATTACK",
                "active_player_id": selected,
                "event_log": state.event_log
                + (f"Thinking time expired; {selected} was selected.",),
            }
        )

    @classmethod
    def _guess(
        cls, state: WhatNumberState, player_id: str, action: WhatNumberAction
    ) -> WhatNumberState:
        if state.phase != "ATTACK" or state.active_player_id != player_id:
            raise GameRuleError(MoveErrorCode.NOT_YOUR_TURN, "you are not the attacker")
        if action.target_player_id is None or action.guessed_number is None:
            raise GameRuleError(
                MoveErrorCode.INVALID_ACTION, "a guess requires a target and number"
            )
        if action.target_player_id == player_id:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "you cannot target yourself")
        target = cls._player(state, action.target_player_id)
        if target.status != "ACTIVE":
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "target is eliminated")

        matching = next(
            (
                card
                for card in target.cards
                if not card.is_revealed and card.number == action.guessed_number
            ),
            None,
        )
        if matching is None:
            return state.model_copy(
                update={
                    "phase": "PENALTY",
                    "pending_penalty_player_id": player_id,
                    "event_log": state.event_log
                    + (
                        f"{player_id} guessed {action.guessed_number} against "
                        f"{target.player_id} and missed.",
                    ),
                }
            )

        if target.shield_active:
            updated_target = target.model_copy(update={"shield_active": False})
            return cls._replace_player(state, updated_target).model_copy(
                update={
                    "event_log": state.event_log
                    + (f"{target.player_id}'s shield blocked the guess.",),
                }
            )

        cards = tuple(
            card.model_copy(update={"is_revealed": True})
            if card.id == matching.id
            else card
            for card in target.cards
        )
        eliminated = all(card.is_revealed for card in cards)
        updated_target = target.model_copy(
            update={"cards": cards, "status": "ELIMINATED" if eliminated else "ACTIVE"}
        )
        next_state = cls._replace_player(state, updated_target)
        log = state.event_log + (
            f"{player_id} correctly guessed {action.guessed_number} on {target.player_id}.",
        )
        if eliminated:
            log += (f"{target.player_id} was eliminated.",)
        next_state = next_state.model_copy(
            update={"successful_guess_chain": True, "event_log": log}
        )
        return cls._finish_if_one_remains(next_state)

    @classmethod
    def _reveal_own(
        cls, state: WhatNumberState, player_id: str, action: WhatNumberAction
    ) -> WhatNumberState:
        if (
            state.phase != "PENALTY"
            or state.pending_penalty_player_id != player_id
        ):
            raise GameRuleError(
                MoveErrorCode.NOT_YOUR_TURN, "you do not have a reveal penalty"
            )
        if action.card_id is None:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "card_id is required")
        player = cls._player(state, player_id)
        selected = next((card for card in player.cards if card.id == action.card_id), None)
        if selected is None or selected.is_revealed:
            raise GameRuleError(
                MoveErrorCode.INVALID_ACTION, "select an unrevealed card you own"
            )
        cards = tuple(
            card.model_copy(update={"is_revealed": True})
            if card.id == selected.id
            else card
            for card in player.cards
        )
        eliminated = all(card.is_revealed for card in cards)
        updated = player.model_copy(
            update={"cards": cards, "status": "ELIMINATED" if eliminated else "ACTIVE"}
        )
        next_state = cls._replace_player(state, updated).model_copy(
            update={
                "event_log": state.event_log
                + (f"{player_id} revealed their own {selected.number} as a penalty.",),
            }
        )
        next_state = cls._finish_if_one_remains(next_state)
        return next_state if next_state.phase == "FINISHED" else cls._next_turn(next_state)

    @classmethod
    def _use_skill(
        cls, state: WhatNumberState, player_id: str, action: WhatNumberAction
    ) -> WhatNumberState:
        if action.skill_id is None:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "skill_id is required")
        player = cls._player(state, player_id)
        skill = next((item for item in player.skills if item.id == action.skill_id), None)
        if skill is None:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "skill card is unavailable")

        if skill.skill_type == "SHIELD":
            updated = player.model_copy(update={"shield_active": True})
            next_state = cls._replace_player(state, updated)
            message = f"{player_id} activated a shield."
        elif skill.skill_type == "SAFE_EXIT":
            if (
                state.phase != "ATTACK"
                or state.active_player_id != player_id
                or not state.successful_guess_chain
            ):
                raise GameRuleError(
                    MoveErrorCode.INVALID_ACTION,
                    "Safe Exit requires a successful guess during your attack",
                )
            updated = player
            next_state = state
            message = f"{player_id} used Safe Exit."
        elif skill.skill_type == "SWAP":
            card_id = cls._payload_string(action.payload, "card_id")
            selected = next(
                (card for card in player.cards if card.id == card_id), None
            )
            if selected is None or selected.is_revealed or not state.number_deck:
                raise GameRuleError(
                    MoveErrorCode.INVALID_ACTION,
                    "Swap requires an unrevealed own card and a non-empty deck",
                )
            replacement = selected.model_copy(update={"number": state.number_deck[0]})
            updated = player.model_copy(
                update={
                    "cards": tuple(
                        replacement if card.id == selected.id else card
                        for card in player.cards
                    )
                }
            )
            next_state = cls._replace_player(state, updated).model_copy(
                update={"number_deck": state.number_deck[1:] + (selected.number,)}
            )
            message = f"{player_id} swapped a face-down card."
        else:
            if action.target_player_id is None or action.target_player_id == player_id:
                raise GameRuleError(
                    MoveErrorCode.INVALID_ACTION, "this skill requires another player"
                )
            target = cls._player(state, action.target_player_id)
            if target.status != "ACTIVE":
                raise GameRuleError(MoveErrorCode.INVALID_ACTION, "target is eliminated")
            if skill.skill_type == "PEEK":
                card_id = cls._payload_string(action.payload, "card_id")
                card = next((item for item in target.cards if item.id == card_id), None)
                if card is None or card.is_revealed:
                    raise GameRuleError(
                        MoveErrorCode.INVALID_ACTION,
                        "Peek requires a face-down target card",
                    )
                insight = f"Peek: {target.player_id}'s selected card is {card.number}."
            else:
                selected_range = cls._payload_string(action.payload, "range")
                if selected_range not in {"LOW", "HIGH"}:
                    raise GameRuleError(
                        MoveErrorCode.INVALID_ACTION, "Radar range must be LOW or HIGH"
                    )
                low, high = (1, 20) if selected_range == "LOW" else (21, 40)
                found = any(
                    not card.is_revealed and low <= card.number <= high
                    for card in target.cards
                )
                insight = (
                    f"Radar: {target.player_id} "
                    f"{'has' if found else 'does not have'} a face-down {low}-{high} card."
                )
            next_state = state.model_copy(
                update={
                    "private_insights": state.private_insights
                    + (PrivateInsight(player_id=player_id, message=insight, turn=state.turn_counter),)
                }
            )
            updated = player
            message = f"{player_id} used {skill.skill_type}."

        updated = updated.model_copy(
            update={"skills": tuple(item for item in updated.skills if item.id != skill.id)}
        )
        next_state = cls._replace_player(next_state, updated).model_copy(
            update={"event_log": next_state.event_log + (message,)}
        )
        if skill.skill_type == "SAFE_EXIT":
            return cls._next_turn(next_state)
        return next_state

    @staticmethod
    def _payload_string(payload: dict[str, JsonValue], key: str) -> str:
        value = payload.get(key)
        if not isinstance(value, str) or not value:
            raise GameRuleError(
                MoveErrorCode.INVALID_ACTION, f"payload.{key} must be a string"
            )
        return value

    @classmethod
    def _next_turn(cls, state: WhatNumberState) -> WhatNumberState:
        turn = state.turn_counter + 1
        return state.model_copy(
            update={
                "turn_counter": turn,
                "thinking_time_seconds": cls.thinking_time_for_turn(turn),
                "phase": "THINKING",
                "active_player_id": None,
                "pending_penalty_player_id": None,
                "successful_guess_chain": False,
                "private_insights": tuple(
                    item for item in state.private_insights if item.turn >= turn - 1
                ),
                "event_log": state.event_log + (f"Turn {turn} began.",),
            }
        )

    @classmethod
    def _finish_if_one_remains(cls, state: WhatNumberState) -> WhatNumberState:
        active = [player.player_id for player in state.players if player.status == "ACTIVE"]
        if len(active) != 1:
            return state
        return state.model_copy(
            update={
                "phase": "FINISHED",
                "winner_id": active[0],
                "active_player_id": None,
                "pending_penalty_player_id": None,
                "event_log": state.event_log + (f"{active[0]} won the game.",),
            }
        )

    @staticmethod
    def _player(state: WhatNumberState, player_id: str) -> WhatNumberPlayer:
        player = next(
            (item for item in state.players if item.player_id == player_id), None
        )
        if player is None:
            raise GameRuleError(
                MoveErrorCode.INVALID_PLAYER, "player is not a participant"
            )
        return player

    @staticmethod
    def _replace_player(
        state: WhatNumberState, updated_player: WhatNumberPlayer
    ) -> WhatNumberState:
        return state.model_copy(
            update={
                "players": tuple(
                    updated_player
                    if player.player_id == updated_player.player_id
                    else player
                    for player in state.players
                )
            }
        )
