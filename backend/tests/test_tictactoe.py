"""Unit tests for the pure Tic-Tac-Toe state machine."""

import pytest
from pydantic import ValidationError

from app.engine.base import GameRuleError, MoveErrorCode
from app.engine.games.tictactoe import (
    TicTacToeGame,
    TicTacToeMove,
    TicTacToeState,
)


PLAYERS = ("player-x", "player-o")


def play_moves(*positions: int) -> TicTacToeState:
    state = TicTacToeGame.initial_state(PLAYERS)
    for position in positions:
        state = TicTacToeGame.apply_action(
            state, state.current_player, TicTacToeMove(position=position)
        )
    return state


def test_initial_state_and_player_views() -> None:
    state = TicTacToeGame.initial_state(PLAYERS)

    assert state.board == (None,) * 9
    assert state.current_player == "player-x"
    assert state.status == "in_progress"
    assert TicTacToeGame.get_player_view(state, "player-x").your_mark == "X"
    assert TicTacToeGame.get_player_view(state, "player-o").your_mark == "O"


def test_legal_move_returns_new_state_and_advances_turn() -> None:
    original = TicTacToeGame.initial_state(PLAYERS)

    updated = TicTacToeGame.apply_action(
        original, "player-x", TicTacToeMove(position=4)
    )

    assert original.board[4] is None
    assert updated.board[4] == "X"
    assert updated.current_player == "player-o"


@pytest.mark.parametrize(
    ("player_id", "position", "expected_code"),
    [
        ("spectator", 0, MoveErrorCode.INVALID_PLAYER),
        ("player-o", 0, MoveErrorCode.NOT_YOUR_TURN),
    ],
)
def test_rejects_unauthorized_moves(
    player_id: str, position: int, expected_code: MoveErrorCode
) -> None:
    state = TicTacToeGame.initial_state(PLAYERS)

    with pytest.raises(GameRuleError) as error:
        TicTacToeGame.apply_action(state, player_id, TicTacToeMove(position=position))

    assert error.value.code == expected_code


def test_rejects_move_on_occupied_position() -> None:
    state = play_moves(0)

    with pytest.raises(GameRuleError) as error:
        TicTacToeGame.apply_action(state, "player-o", TicTacToeMove(position=0))

    assert error.value.code == MoveErrorCode.INVALID_ACTION


@pytest.mark.parametrize("position", [-1, 9])
def test_move_schema_rejects_out_of_range_positions(position: int) -> None:
    with pytest.raises(ValidationError):
        TicTacToeMove(position=position)


def test_move_schema_rejects_coerced_and_extra_fields() -> None:
    with pytest.raises(ValidationError):
        TicTacToeMove.model_validate({"position": "4"})
    with pytest.raises(ValidationError):
        TicTacToeMove.model_validate({"position": 4, "unexpected": True})


def test_detects_win_and_rejects_further_moves() -> None:
    state = play_moves(0, 3, 1, 4, 2)

    assert state.status == "won"
    assert state.winner == "player-x"
    assert state.board[:3] == ("X", "X", "X")

    with pytest.raises(GameRuleError) as error:
        TicTacToeGame.apply_action(state, "player-o", TicTacToeMove(position=5))

    assert error.value.code == MoveErrorCode.GAME_OVER


def test_detects_draw() -> None:
    state = play_moves(0, 1, 2, 4, 3, 5, 7, 6, 8)

    assert state.status == "draw"
    assert state.winner is None


def test_rejects_invalid_player_configuration() -> None:
    with pytest.raises(ValueError):
        TicTacToeGame.initial_state(("only-player",))
    with pytest.raises(ValidationError):
        TicTacToeGame.initial_state(("same-player", "same-player"))


def test_rejects_player_view_for_nonparticipant() -> None:
    state = TicTacToeGame.initial_state(PLAYERS)

    with pytest.raises(GameRuleError) as error:
        TicTacToeGame.get_player_view(state, "spectator")

    assert error.value.code == MoveErrorCode.INVALID_PLAYER
