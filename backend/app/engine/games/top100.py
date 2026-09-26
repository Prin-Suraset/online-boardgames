"""Pure, deterministic rules for Top 1-100 by ChatGPT."""

from __future__ import annotations

import random
import re
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, model_validator

from app.engine.base import BaseGame as BaseGameEngine, GameRuleError, MoveErrorCode


class TopicItem(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    rank: int = Field(ge=1, le=100)
    name: str = Field(min_length=1)
    aliases: tuple[str, ...]


class Top100Topic(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    id: str
    title: str
    items: tuple[TopicItem, ...]

    @model_validator(mode="after")
    def validate_items(self) -> Top100Topic:
        if tuple(item.rank for item in self.items) != tuple(range(1, 101)):
            raise ValueError("a topic must contain ranks 1 through 100 in order")
        names = [normalize_string(value) for item in self.items for value in (item.name, *item.aliases)]
        if len(names) != len(set(names)) or any(not name for name in names):
            raise ValueError("topic names and aliases must be unique and non-empty")
        return self


class GuessedItem(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    rank: int = Field(ge=1, le=100)
    name: str
    by_id: str
    by_name: str


class FinalRanking(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    position: int
    player_id: str
    player_name: str
    score: int


class Top100State(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    topic: Top100Topic
    player_ids: tuple[str, ...]
    player_names: dict[str, str]
    round_number: int = Field(ge=1, le=10)
    turn_player_id: str | None
    timer: int = 30
    guessed_items: tuple[GuessedItem, ...]
    player_scores: dict[str, int]
    status: Literal["PLAYING", "FINISHED"]
    winner_ids: tuple[str, ...] = ()
    final_rankings: tuple[FinalRanking, ...] = ()


class Top100Action(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    action_type: Literal["SUBMIT_GUESS", "TURN_TIMEOUT"]
    guess: str | None = Field(default=None, max_length=200)


class RevealedItemView(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    name: str
    rank: int | None
    points: int | None
    is_mine: bool
    by: str | None = None


class Top100View(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    topic_title: str
    is_my_turn: bool
    turn_player_id: str | None
    turn_timer: int
    round_number: int
    my_score: int
    other_player_scores: dict[str, int] | None
    revealed_chronological_items: tuple[RevealedItemView, ...]
    status: Literal["PLAYING", "FINISHED"]
    winner_ids: tuple[str, ...] | None
    final_rankings: tuple[FinalRanking, ...] | None
    answer_sheet: tuple[TopicItem, ...] | None


def normalize_string(text: str) -> str:
    """Use one comparison form for guesses, answer names, and aliases."""
    if not text:
        return ""
    normalized = text.strip().lower()
    return re.sub(r"""[\s\-_.:'"!?,/]+""", " ", normalized).strip()


# Keep the existing helper name available to room adapters and callers.
normalize = normalize_string


@lru_cache(maxsize=1)
def load_topic_bank() -> tuple[Top100Topic, ...]:
    """Validate the shipped topic bank once, before any match transitions."""
    path = Path(__file__).parent / "data" / "top100_topics.json"
    topics = TypeAdapter(tuple[Top100Topic, ...]).validate_json(path.read_text(encoding="utf-8"))
    if not topics or len({topic.id for topic in topics}) != len(topics):
        raise ValueError("topic bank must have unique topics")
    return topics


class Top100Engine(BaseGameEngine[Top100State, Top100Action, Top100View]):
    MIN_PLAYERS = 2
    MAX_PLAYERS = 8
    TOTAL_ROUNDS = 10
    TURN_SECONDS = 30

    @classmethod
    def initial_state(cls, player_ids: tuple[str, ...]) -> Top100State:
        return cls.init_game(player_ids, {player_id: player_id for player_id in player_ids}, seed=0)

    @classmethod
    def init_game(
        cls, player_ids: tuple[str, ...], player_names: dict[str, str], *, seed: int
    ) -> Top100State:
        """Choose one seeded random topic, then create a deterministic match."""
        topic = random.Random(seed).choice(load_topic_bank())
        return cls.create_state(player_ids, player_names, topic)

    @classmethod
    def create_state(
        cls, player_ids: tuple[str, ...], player_names: dict[str, str], topic: Top100Topic
    ) -> Top100State:
        if not cls.MIN_PLAYERS <= len(player_ids) <= cls.MAX_PLAYERS:
            raise ValueError("Top 1-100 requires 2 to 8 players")
        if len(set(player_ids)) != len(player_ids) or any(not player_id for player_id in player_ids):
            raise ValueError("player IDs must be unique and non-empty")
        if set(player_names) != set(player_ids) or any(not name.strip() for name in player_names.values()):
            raise ValueError("display names are required for every player")
        return Top100State(
            topic=topic, player_ids=player_ids, player_names=dict(player_names),
            round_number=1, turn_player_id=player_ids[0], timer=cls.TURN_SECONDS,
            guessed_items=(), player_scores={player_id: 0 for player_id in player_ids},
            status="PLAYING",
        )

    @classmethod
    def apply_action(cls, state: Top100State, player_id: str, action: Top100Action) -> Top100State:
        if player_id not in state.player_ids:
            raise GameRuleError(MoveErrorCode.INVALID_PLAYER, "player is not in this game")
        if state.status == "FINISHED":
            raise GameRuleError(MoveErrorCode.GAME_OVER, "the game is already over")
        if state.turn_player_id != player_id:
            raise GameRuleError(MoveErrorCode.NOT_YOUR_TURN, "it is not this player's turn")
        if action.action_type == "SUBMIT_GUESS":
            if action.guess is None or not normalize_string(action.guess):
                raise GameRuleError(MoveErrorCode.INVALID_ACTION, "a non-empty guess is required")
        elif action.guess is not None:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "timeout does not accept a guess")

        guesses = state.guessed_items
        scores = dict(state.player_scores)
        if action.action_type == "SUBMIT_GUESS" and action.guess is not None:
            guess = normalize_string(action.guess)
            item = next(
                (item for item in state.topic.items
                 if guess in (normalize_string(value) for value in (item.name, *item.aliases))),
                None,
            )
            if item is not None and all(prior.rank != item.rank for prior in guesses):
                scores[player_id] += 101 - item.rank
                guesses += (GuessedItem(
                    rank=item.rank, name=item.name, by_id=player_id,
                    by_name=state.player_names[player_id],
                ),)

        index = state.player_ids.index(player_id)
        last_turn = state.round_number == cls.TOTAL_ROUNDS and index == len(state.player_ids) - 1
        if last_turn:
            highest = max(scores.values())
            ordered = sorted(state.player_ids, key=lambda pid: -scores[pid])
            rankings = tuple(
                FinalRanking(
                    position=1 + sum(scores[other] > scores[pid] for other in state.player_ids),
                    player_id=pid, player_name=state.player_names[pid], score=scores[pid],
                ) for pid in ordered
            )
            return state.model_copy(update={
                "guessed_items": guesses, "player_scores": scores, "status": "FINISHED",
                "turn_player_id": None,
                "winner_ids": tuple(pid for pid in state.player_ids if scores[pid] == highest),
                "final_rankings": rankings,
            })
        return state.model_copy(update={
            "guessed_items": guesses, "player_scores": scores,
            "round_number": state.round_number + (1 if index == len(state.player_ids) - 1 else 0),
            "turn_player_id": state.player_ids[(index + 1) % len(state.player_ids)],
        })

    @classmethod
    def get_player_view(cls, state: Top100State, player_id: str) -> Top100View:
        if player_id not in state.player_ids:
            raise GameRuleError(MoveErrorCode.INVALID_PLAYER, "player is not in this game")
        finished = state.status == "FINISHED"
        return Top100View(
            topic_title=state.topic.title,
            is_my_turn=not finished and state.turn_player_id == player_id,
            turn_player_id=state.turn_player_id,
            turn_timer=state.timer,
            round_number=state.round_number,
            my_score=state.player_scores[player_id],
            other_player_scores=dict(state.player_scores) if finished else None,
            revealed_chronological_items=tuple(
                RevealedItemView(
                    name=item.name,
                    rank=item.rank if finished or item.by_id == player_id else None,
                    points=101 - item.rank if finished or item.by_id == player_id else None,
                    is_mine=item.by_id == player_id,
                    by=None if item.by_id == player_id else item.by_name,
                ) for item in state.guessed_items
            ),
            status=state.status,
            winner_ids=state.winner_ids if finished else None,
            final_rankings=state.final_rankings if finished else None,
            answer_sheet=state.topic.items if finished else None,
        )
