"""Pure Tic-Tac-Toe game plugin."""

from __future__ import annotations

from typing import Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.engine.base import BaseGame, GameRuleError, MoveErrorCode

Mark: TypeAlias = Literal["X", "O"]
Cell: TypeAlias = Mark | None
GameStatus: TypeAlias = Literal["in_progress", "won", "draw"]

_EMPTY_BOARD: tuple[Cell, ...] = (None,) * 9
_WINNING_LINES: tuple[tuple[int, int, int], ...] = (
    (0, 1, 2),
    (3, 4, 5),
    (6, 7, 8),
    (0, 3, 6),
    (1, 4, 7),
    (2, 5, 8),
    (0, 4, 8),
    (2, 4, 6),
)


class TicTacToeMove(BaseModel):
    """A request to claim one zero-based board position."""

    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    position: int = Field(ge=0, le=8)


class TicTacToeState(BaseModel):
    """Complete immutable engine state; adapters must not broadcast it."""

    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    players: tuple[str, str]
    board: tuple[Cell, ...] = _EMPTY_BOARD
    current_player: str
    status: GameStatus = "in_progress"
    winner: str | None = None

    @model_validator(mode="after")
    def validate_invariants(self) -> TicTacToeState:
        if len(self.board) != 9:
            raise ValueError("board must contain exactly nine cells")
        if not self.players[0] or not self.players[1]:
            raise ValueError("player IDs must not be empty")
        if self.players[0] == self.players[1]:
            raise ValueError("player IDs must be unique")
        if self.current_player not in self.players:
            raise ValueError("current player must be a participant")
        if self.winner is not None and self.winner not in self.players:
            raise ValueError("winner must be a participant")
        if self.status == "won" and self.winner is None:
            raise ValueError("won games must identify a winner")
        if self.status != "won" and self.winner is not None:
            raise ValueError("only won games may identify a winner")
        return self


class TicTacToeView(BaseModel):
    """Player-scoped view safe to expose outside the game engine."""

    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    board: tuple[Cell, ...]
    current_player: str
    status: GameStatus
    winner: str | None
    your_mark: Mark


class TicTacToeGame(BaseGame[TicTacToeState, TicTacToeMove, TicTacToeView]):
    """Deterministic rules for a two-player Tic-Tac-Toe match."""

    @classmethod
    def initial_state(cls, player_ids: tuple[str, ...]) -> TicTacToeState:
        if len(player_ids) != 2:
            raise ValueError("Tic-Tac-Toe requires exactly two players")
        players = (player_ids[0], player_ids[1])
        return TicTacToeState(players=players, current_player=players[0])

    @classmethod
    def apply_action(
        cls,
        state: TicTacToeState,
        player_id: str,
        action: TicTacToeMove,
    ) -> TicTacToeState:
        cls._validate_action(state, player_id, action)

        mark: Mark = "X" if player_id == state.players[0] else "O"
        board = list(state.board)
        board[action.position] = mark
        next_board = tuple(board)

        if cls._has_winning_line(next_board, mark):
            return state.model_copy(
                update={"board": next_board, "status": "won", "winner": player_id}
            )
        if all(cell is not None for cell in next_board):
            return state.model_copy(update={"board": next_board, "status": "draw"})

        next_player = (
            state.players[1] if player_id == state.players[0] else state.players[0]
        )
        return state.model_copy(
            update={"board": next_board, "current_player": next_player}
        )

    @classmethod
    def get_player_view(
        cls, state: TicTacToeState, player_id: str
    ) -> TicTacToeView:
        if player_id not in state.players:
            raise GameRuleError(
                MoveErrorCode.INVALID_PLAYER,
                "player is not a participant in this game",
            )
        mark: Mark = "X" if player_id == state.players[0] else "O"
        return TicTacToeView(
            board=state.board,
            current_player=state.current_player,
            status=state.status,
            winner=state.winner,
            your_mark=mark,
        )

    @classmethod
    def _validate_action(
        cls,
        state: TicTacToeState,
        player_id: str,
        action: TicTacToeMove,
    ) -> None:
        if player_id not in state.players:
            raise GameRuleError(
                MoveErrorCode.INVALID_PLAYER,
                "player is not a participant in this game",
            )
        if state.status != "in_progress":
            raise GameRuleError(MoveErrorCode.GAME_OVER, "the game is already over")
        if player_id != state.current_player:
            raise GameRuleError(
                MoveErrorCode.NOT_YOUR_TURN,
                "it is not this player's turn",
            )
        if state.board[action.position] is not None:
            raise GameRuleError(
                MoveErrorCode.INVALID_ACTION,
                "the selected board position is already occupied",
            )

    @staticmethod
    def _has_winning_line(board: tuple[Cell, ...], mark: Mark) -> bool:
        return any(all(board[position] == mark for position in line) for line in _WINNING_LINES)
