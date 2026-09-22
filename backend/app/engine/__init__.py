"""Pure, deterministic game-engine contracts and plugins."""

from app.engine.base import BaseGame, GameRuleError, MoveErrorCode

__all__ = ["BaseGame", "GameRuleError", "MoveErrorCode"]
