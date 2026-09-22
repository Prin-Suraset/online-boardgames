"""Framework-independent contracts shared by all game plugins."""

from __future__ import annotations

from abc import ABC, abstractmethod
from enum import StrEnum
from typing import Generic, TypeVar

from pydantic import BaseModel


class MoveErrorCode(StrEnum):
    """Stable error codes returned when a game action is rejected."""

    INVALID_ACTION = "INVALID_ACTION"
    INVALID_PLAYER = "INVALID_PLAYER"
    NOT_YOUR_TURN = "NOT_YOUR_TURN"
    GAME_OVER = "GAME_OVER"


class GameRuleError(ValueError):
    """A rule violation safe for an adapter to serialize to a client."""

    def __init__(self, code: MoveErrorCode, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


StateT = TypeVar("StateT", bound=BaseModel)
ActionT = TypeVar("ActionT", bound=BaseModel)
ViewT = TypeVar("ViewT", bound=BaseModel)


class BaseGame(ABC, Generic[StateT, ActionT, ViewT]):
    """Stateless contract for deterministic game-state transitions.

    Plugins receive all state and input explicitly and return a new state.
    Engine modules therefore have no dependency on transports, persistence,
    clocks, randomness, or other I/O.
    """

    @classmethod
    @abstractmethod
    def initial_state(cls, player_ids: tuple[str, ...]) -> StateT:
        """Create a validated initial state for the supplied players."""

    @classmethod
    @abstractmethod
    def apply_action(
        cls, state: StateT, player_id: str, action: ActionT
    ) -> StateT:
        """Validate an action and return the resulting immutable state."""

    @classmethod
    @abstractmethod
    def get_player_view(cls, state: StateT, player_id: str) -> ViewT:
        """Return only state that the specified player is allowed to see."""
