"""Contract tests for the What number I have? engine."""

import pytest

from app.engine.games.what_number import (
    WhatNumberAction,
    WhatNumberEngine,
    WhatNumberState,
    WhatNumberView,
)
from app.rooms import RoomManager
from app.schemas import PlayerInput

PLAYERS = ("p1", "p2", "p3", "p4")


def test_accepts_three_players_and_rejects_two() -> None:
    state = WhatNumberEngine.create_state(PLAYERS[:3], seed=5)

    assert len(state.players) == 3
    with pytest.raises(ValueError, match="requires 3 to 8 players"):
        WhatNumberEngine.create_state(PLAYERS[:2], seed=5)


def test_deck_distribution() -> None:
    state = WhatNumberEngine.create_state(PLAYERS, seed=7)

    dealt = [card.number for player in state.players for card in player.cards]
    assert all(len(player.cards) == 5 for player in state.players)
    assert all(len(player.skills) == 2 for player in state.players)
    assert len(dealt) == len(set(dealt)) == 20
    assert len(state.number_deck) == 20
    assert set(dealt).isdisjoint(state.number_deck)
    all_skills = [
        skill.skill_type
        for player in state.players
        for skill in player.skills
    ] + [skill.skill_type for skill in state.skill_deck]
    assert len(all_skills) == 20
    assert all(all_skills.count(skill_type) == 4 for skill_type in set(all_skills))


def test_anti_cheat_player_view() -> None:
    state = WhatNumberEngine.create_state(PLAYERS, seed=11)
    view = WhatNumberEngine.get_player_view(state, "p1")

    own = next(player for player in view.players if player.player_id == "p1")
    opponent = next(player for player in view.players if player.player_id == "p2")
    assert all(card.number is not None for card in own.cards)
    assert len(own.skills) == 2
    assert all(card.number is None for card in opponent.cards)
    assert opponent.skills == ()
    assert opponent.skill_count == 2


def test_correct_guess_chain() -> None:
    state = WhatNumberEngine.create_state(PLAYERS, seed=13)
    state = WhatNumberEngine.apply_action(
        state, "p1", WhatNumberAction(action_type="VOLUNTEER")
    )
    target_number = state.players[1].cards[0].number

    state = WhatNumberEngine.apply_action(
        state,
        "p1",
        WhatNumberAction(
            action_type="GUESS",
            target_player_id="p2",
            guessed_number=target_number,
        ),
    )

    assert state.phase == "ATTACK"
    assert state.active_player_id == "p1"
    assert state.successful_guess_chain is True
    assert state.players[1].cards[0].is_revealed is True


def test_wrong_guess_penalty() -> None:
    state = WhatNumberEngine.create_state(PLAYERS, seed=17)
    state = WhatNumberEngine.apply_action(
        state, "p1", WhatNumberAction(action_type="VOLUNTEER")
    )
    target_numbers = {card.number for card in state.players[1].cards}
    wrong_number = next(number for number in range(1, 41) if number not in target_numbers)
    state = WhatNumberEngine.apply_action(
        state,
        "p1",
        WhatNumberAction(
            action_type="GUESS",
            target_player_id="p2",
            guessed_number=wrong_number,
        ),
    )
    assert state.phase == "PENALTY"

    own_card = state.players[0].cards[0]
    state = WhatNumberEngine.apply_action(
        state,
        "p1",
        WhatNumberAction(action_type="REVEAL_OWN", card_id=own_card.id),
    )
    assert state.players[0].cards[0].is_revealed is True
    assert state.phase == "THINKING"
    assert state.turn_counter == 2


def test_timer_reduction() -> None:
    assert WhatNumberEngine.thinking_time_for_turn(1) == 120
    assert WhatNumberEngine.thinking_time_for_turn(6) == 100
    assert WhatNumberEngine.thinking_time_for_turn(11) == 80
    assert WhatNumberEngine.thinking_time_for_turn(99) == 20


def test_elimination_and_win() -> None:
    state = WhatNumberEngine.create_state(PLAYERS, seed=19)
    state = WhatNumberEngine.apply_action(
        state, "p1", WhatNumberAction(action_type="VOLUNTEER")
    )

    for target_id in PLAYERS[1:]:
        target = next(player for player in state.players if player.player_id == target_id)
        for card in target.cards:
            state = WhatNumberEngine.apply_action(
                state,
                "p1",
                WhatNumberAction(
                    action_type="GUESS",
                    target_player_id=target_id,
                    guessed_number=card.number,
                ),
            )

    assert state.phase == "FINISHED"
    assert state.winner_id == "p1"
    assert all(player.status == "ELIMINATED" for player in state.players[1:])


def test_room_adds_ready_bots_and_preserves_scoped_views() -> None:
    rooms = RoomManager()
    host = PlayerInput(id="host", name="Host Player", avatar="H")
    room = rooms.create_room(host, "what_number")
    rooms.toggle_ready(room.code, host.id, True)
    rooms.add_test_bots(room.code, host.id, 2)

    assert len(room.players) == 3
    assert all(player.is_ready for player in room.players.values())
    assert sum(player.is_bot for player in room.players.values()) == 2

    rooms.start_game(room.code, host.id)
    view = rooms.player_view(room.code, host.id)
    assert isinstance(view.game, WhatNumberView)
    own = next(player for player in view.game.players if player.player_id == host.id)
    opponents = [player for player in view.game.players if player.player_id != host.id]
    assert all(card.number is not None for card in own.cards)
    assert all(card.number is None for player in opponents for card in player.cards)


def test_room_auto_resolves_a_selected_bot_turn() -> None:
    rooms = RoomManager()
    host = PlayerInput(id="host", name="Host Player", avatar="H")
    room = rooms.create_room(host, "what_number")
    rooms.toggle_ready(room.code, host.id, True)
    rooms.add_test_bots(room.code, host.id, 3)
    rooms.start_game(room.code, host.id)
    assert isinstance(room.game_state, WhatNumberState)
    room.game_state = room.game_state.model_copy(update={"seed": 0})

    rooms.apply_game_action(room.code, host.id, "TIMER_EXPIRED", {})

    assert isinstance(room.game_state, WhatNumberState)
    assert room.game_state.phase in {"THINKING", "FINISHED"}
    assert any("was selected" in entry for entry in room.game_state.event_log)


def test_room_emits_ordered_game_events_and_records_actions() -> None:
    rooms = RoomManager()
    players = [
        PlayerInput(id="p1", name="Player One", avatar="1"),
        PlayerInput(id="p2", name="Player Two", avatar="2"),
        PlayerInput(id="p3", name="Player Three", avatar="3"),
    ]
    room = rooms.create_room(players[0], "what_number")
    rooms.join_room(room.code, players[1])
    rooms.join_room(room.code, players[2])
    for player in players:
        rooms.toggle_ready(room.code, player.id, True)
    rooms.start_game(room.code, players[0].id)

    assert [event.event_type for event in rooms.take_pending_events(room.code)] == [
        "TURN_START"
    ]
    rooms.apply_game_action(room.code, "p1", "VOLUNTEER", {})
    volunteer = rooms.take_pending_events(room.code)
    assert volunteer[0].event_type == "VOLUNTEER"
    assert volunteer[0].actor_name == "Player One"

    assert isinstance(room.game_state, WhatNumberState)
    target = next(player for player in room.game_state.players if player.player_id == "p2")
    target_numbers = {card.number for card in target.cards}
    wrong_number = next(number for number in range(1, 41) if number not in target_numbers)
    rooms.apply_game_action(
        room.code,
        "p1",
        "GUESS",
        {"target_player_id": "p2", "guessed_number": wrong_number},
    )
    guess_events = rooms.take_pending_events(room.code)
    assert [event.event_type for event in guess_events] == [
        "ATTACK_GUESS",
        "GUESS_WRONG",
    ]
    assert guess_events[0].target_name == "Player Two"
    assert guess_events[0].value == wrong_number
    assert guess_events[1].is_correct is False

    assert isinstance(room.game_state, WhatNumberState)
    own_card = next(
        player for player in room.game_state.players if player.player_id == "p1"
    ).cards[0]
    rooms.apply_game_action(room.code, "p1", "REVEAL_OWN", {"card_id": own_card.id})
    assert [event.event_type for event in rooms.take_pending_events(room.code)] == [
        "TURN_END",
        "TURN_START",
    ]
    assert all("timestamp" in entry for entry in room.action_logs)
