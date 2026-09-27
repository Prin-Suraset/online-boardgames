"""Room role transitions and spectator-safe views."""

from __future__ import annotations

import pytest

from app.engine.games.top100 import Top100State
from app.engine.games.what_number import WhatNumberState
from app.engine.games.you_or_me import YouOrMeState
from app.rooms import RoomError, RoomManager
from app.schemas import GameType, PlayerInput


def person(index: int) -> PlayerInput:
    return PlayerInput(id=f"p{index}", name=f"Player {index}", avatar=str(index))


def ready_match(game_type: GameType, count: int) -> tuple[RoomManager, str]:
    rooms = RoomManager()
    room = rooms.create_room(person(1), game_type=game_type)
    for index in range(2, count + 1):
        rooms.join_room(room.code, person(index))
    for index in range(1, count + 1):
        rooms.toggle_ready(room.code, f"p{index}", True)
    rooms.start_game(room.code, "p1")
    return rooms, room.code


def test_full_room_defaults_to_spectator_and_seat_requires_capacity() -> None:
    rooms, code = ready_match("tictactoe", 2)
    rooms.join_room(code, person(3))
    view = rooms.player_view(code, "p3")
    assert [player.id for player in view.spectators] == ["p3"]
    assert view.is_active_player is False
    assert view.game is not None and view.game.your_mark is None
    with pytest.raises(RoomError, match="full"):
        rooms.switch_to_player(code, "p3")


def test_spectating_forfeits_tictactoe_and_new_seat_waits_for_next_game() -> None:
    rooms, code = ready_match("tictactoe", 2)
    rooms.switch_to_spectator(code, "p1")
    room = rooms.get_room(code)
    assert room.status == "FINISHED"
    assert room.game_state is not None and room.game_state.winner == "p2"
    assert room.host_id == "p2"
    rooms.switch_to_player(code, "p1")
    assert rooms.player_view(code, "p1").is_active_player is False


def test_poker_spectator_sees_no_hand_or_selected_card() -> None:
    rooms, code = ready_match("you_or_me", 2)
    room = rooms.get_room(code)
    assert isinstance(room.game_state, YouOrMeState)
    rooms.join_room(code, person(3), role="spectator")
    public = rooms.player_view(code, "p3")
    assert public.game is not None
    assert all(not player.hand for player in public.game.players)
    assert all(
        player.selected_card is None or player.selected_card.rank is None
        for player in public.game.players
    )
    rooms.switch_to_spectator(code, "p1")
    state = rooms.get_room(code).game_state
    assert isinstance(state, YouOrMeState)
    assert next(player for player in state.players if player.player_id == "p1").status == "ELIMINATED"
    assert "p1" in state.folded_players
    with pytest.raises(RoomError, match="Only active players"):
        rooms.apply_game_action(code, "p1", "BET", {"amount": 2})
    rooms.switch_to_player(code, "p1")
    rejoined = rooms.player_view(code, "p1")
    assert rejoined.is_active_player is False
    assert rejoined.game is not None
    assert all(not player.hand for player in rejoined.game.players)


def test_what_number_spectator_sees_only_revealed_numbers() -> None:
    rooms, code = ready_match("what_number", 3)
    rooms.join_room(code, person(4), role="spectator")
    view = rooms.player_view(code, "p4")
    assert view.game is not None
    assert view.game.private_insights == ()
    assert all(card.number is None or card.is_revealed for player in view.game.players for card in player.cards)
    assert all(not player.skills for player in view.game.players)
    rooms.switch_to_spectator(code, "p1")
    state = rooms.get_room(code).game_state
    assert isinstance(state, WhatNumberState)
    assert next(player for player in state.players if player.player_id == "p1").status == "ELIMINATED"


def test_what_number_finishes_when_only_one_player_remains() -> None:
    rooms, code = ready_match("what_number", 3)
    for player_id in ("p1", "p2", "p3"):
        if rooms.get_room(code).status == "PLAYING":
            rooms.switch_to_spectator(code, player_id)
    assert rooms.get_room(code).status == "FINISHED"


def test_poker_finishes_when_every_player_leaves_the_table() -> None:
    rooms, code = ready_match("you_or_me", 2)
    rooms.switch_to_spectator(code, "p1")
    rooms.switch_to_spectator(code, "p2")
    assert rooms.get_room(code).status == "FINISHED"


def test_top100_surrender_skips_remaining_turns() -> None:
    rooms, code = ready_match("top100", 2)
    rooms.join_room(code, person(3), role="spectator")
    public = rooms.player_view(code, "p3")
    assert public.game is not None
    assert public.game.my_score == 0
    assert public.game.other_player_scores is None
    assert all(item.rank is None and item.points is None for item in public.game.revealed_chronological_items)
    rooms.switch_to_spectator(code, "p1")
    state = rooms.get_room(code).game_state
    assert isinstance(state, Top100State)
    assert state.turn_player_id != "p1" or state.status == "FINISHED"
