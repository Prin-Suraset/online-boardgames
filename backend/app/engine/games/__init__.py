"""Built-in game plugins."""

from app.engine.games.tictactoe import (
    TicTacToeGame,
    TicTacToeMove,
    TicTacToeState,
    TicTacToeView,
)

__all__ = ["TicTacToeGame", "TicTacToeMove", "TicTacToeState", "TicTacToeView"]
from app.engine.games.what_number import WhatNumberEngine
from app.engine.games.you_or_me import YouOrMeEngine

__all__ = ["WhatNumberEngine", "YouOrMeEngine"]
