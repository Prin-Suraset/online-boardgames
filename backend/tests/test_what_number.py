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
    assert len(state.number_deck) == 15
    assert set(dealt).isdisjoint(state.number_deck)
    assert len(state.revealed_center_cards) == 5
    assert set(dealt).isdisjoint(state.revealed_center_cards)
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


def test_center_cards_initial_and_periodic() -> None:
    state = WhatNumberEngine.create_state(PLAYERS, seed=23)

    assert len(state.revealed_center_cards) == 5
    dealt = {card.number for player in state.players for card in player.cards}
    assert dealt.isdisjoint(state.revealed_center_cards)

    for _ in range(2):
        state = WhatNumberEngine.apply_action(
            state, "p1", WhatNumberAction(action_type="VOLUNTEER")
        )
        other_player = next(player for player in state.players if player.player_id == "p3")
        wrong_number = other_player.cards[0].number
        state = WhatNumberEngine.apply_action(
            state,
            "p1",
            WhatNumberAction(
                action_type="GUESS",
                target_player_id="p2",
                guessed_number=wrong_number,
            ),
        )
        own_card = next(card for card in state.players[0].cards if not card.is_revealed)
        state = WhatNumberEngine.apply_action(
            state, "p1", WhatNumberAction(action_type="REVEAL_OWN", card_id=own_card.id)
        )

    assert state.turn_counter == 3
    assert len(state.revealed_center_cards) == 6
    assert dealt.isdisjoint(state.revealed_center_cards)


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


def test_wrong_guess_center_reveal() -> None:
    state = WhatNumberEngine.create_state(PLAYERS, seed=29)
    center_number = state.number_deck[0]
    state = WhatNumberEngine.apply_action(
        state, "p1", WhatNumberAction(action_type="VOLUNTEER")
    )
    state = WhatNumberEngine.apply_action(
        state,
        "p1",
        WhatNumberAction(
            action_type="GUESS",
            target_player_id="p2",
            guessed_number=center_number,
        ),
    )

    assert state.phase == "PENALTY"
    assert center_number not in state.number_deck
    assert center_number in state.revealed_center_cards
    assert any(
        entry == f"CENTER_REVEALED_FROM_GUESS: {center_number}"
        for entry in state.event_log
    )

    held_state = WhatNumberEngine.create_state(PLAYERS, seed=29)
    held_number = next(
        card.number
        for card in next(player for player in held_state.players if player.player_id == "p3").cards
    )
    held_state = WhatNumberEngine.apply_action(
        held_state, "p1", WhatNumberAction(action_type="VOLUNTEER")
    )
    held_state = WhatNumberEngine.apply_action(
        held_state,
        "p1",
        WhatNumberAction(
            action_type="GUESS",
            target_player_id="p2",
            guessed_number=held_number,
        ),
    )

    p3_card = next(
        card
        for card in next(player for player in held_state.players if player.player_id == "p3").cards
        if card.number == held_number
    )
    assert held_state.phase == "PENALTY"
    assert held_number not in held_state.revealed_center_cards
    assert p3_card.is_revealed is False
    assert any(
        entry == f"GUESS_HELD_BY_ANOTHER: {held_number}"
        for entry in held_state.event_log
    )


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
    wrong_number = next(
        player for player in room.game_state.players if player.player_id == "p3"
    ).cards[0].number
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
        "GUESS_HELD_BY_ANOTHER",
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


def test_room_emits_center_reveal_from_wrong_guess() -> None:
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
    rooms.take_pending_events(room.code)
    rooms.apply_game_action(room.code, "p1", "VOLUNTEER", {})
    rooms.take_pending_events(room.code)

    assert isinstance(room.game_state, WhatNumberState)
    center_number = room.game_state.number_deck[0]
    rooms.apply_game_action(
        room.code,
        "p1",
        "GUESS",
        {"target_player_id": "p2", "guessed_number": center_number},
    )

    events = rooms.take_pending_events(room.code)
    assert [event.event_type for event in events] == [
        "ATTACK_GUESS",
        "GUESS_WRONG",
        "CENTER_REVEALED_FROM_GUESS",
    ]
    assert events[-1].value == str(center_number)


def test_room_emits_center_card_reveal_after_every_two_completed_turns() -> None:
    rooms = RoomManager()
    host = PlayerInput(id="p1", name="Player One", avatar="1")
    room = rooms.create_room(host, "what_number")
    for player_id in ("p2", "p3"):
        rooms.join_room(room.code, PlayerInput(id=player_id, name=player_id, avatar=player_id))
    for player_id in ("p1", "p2", "p3"):
        rooms.toggle_ready(room.code, player_id, True)
    rooms.start_game(room.code, "p1")
    rooms.take_pending_events(room.code)

    for completed_turn in range(2):
        rooms.apply_game_action(room.code, "p1", "VOLUNTEER", {})
        rooms.take_pending_events(room.code)
        assert isinstance(room.game_state, WhatNumberState)
        target = next(player for player in room.game_state.players if player.player_id == "p2")
        wrong_number = next(
            number
            for number in range(1, 41)
            if number not in {card.number for card in target.cards}
        )
        rooms.apply_game_action(
            room.code,
            "p1",
            "GUESS",
            {"target_player_id": "p2", "guessed_number": wrong_number},
        )
        rooms.take_pending_events(room.code)
        own_card = next(
            card
            for card in room.game_state.players[0].cards
            if not card.is_revealed
        )
        rooms.apply_game_action(
            room.code, "p1", "REVEAL_OWN", {"card_id": own_card.id}
        )
        events = rooms.take_pending_events(room.code)
        if completed_turn == 1:
            assert [event.event_type for event in events] == [
                "TURN_END",
                "CENTER_CARD_REVEALED",
                "TURN_START",
            ]
            assert events[1].value is not None
