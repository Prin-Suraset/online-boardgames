"""Built-in game plugins."""

from app.engine.games.tictactoe import (
    TicTacToeGame,
    TicTacToeMove,
    TicTacToeState,
    TicTacToeView,
)

__all__ = ["TicTacToeGame", "TicTacToeMove", "TicTacToeState", "TicTacToeView"]
from app.engine.games.what_number import WhatNumberEngine

__all__ = ["WhatNumberEngine"]
