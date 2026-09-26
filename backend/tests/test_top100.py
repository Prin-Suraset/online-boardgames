"""Top 1-100 scoring, privacy, lifecycle, and room integration."""

from __future__ import annotations

import time

import pytest

from app.engine.base import GameRuleError, MoveErrorCode
from app.engine.games.top100 import (
    Top100Action,
    Top100Engine,
    Top100State,
    clean_base_string,
    is_answer_match,
    load_topic_bank,
    normalize_string,
    normalize_thai_phonetics,
)
from app.rooms import RoomManager
from app.schemas import PlayerInput


PLAYERS = ("p1", "p2")
NAMES = {"p1": "Alpha", "p2": "Beta"}
TOPIC = next(topic for topic in load_topic_bank() if topic.id == "thai_food")
ANIME_TOPIC = next(topic for topic in load_topic_bank() if topic.id == "anime_characters")


def start() -> Top100State:
    return Top100Engine.create_state(PLAYERS, NAMES, TOPIC)


def guess(state: Top100State, value: str) -> Top100State:
    assert state.turn_player_id is not None
    return Top100Engine.apply_action(
        state, state.turn_player_id, Top100Action(action_type="SUBMIT_GUESS", guess=value)
    )


@pytest.mark.parametrize(("raw", "expected"), [
    ("", ""),
    ("  PAD-THAI  ", "pad thai"),
    ("  MONKEY.D_LUFFY!  ", "monkey d luffy"),
    ("  Jack's:\"Sparrow\" / Captain?  ", "jack s sparrow captain"),
    ("พี่มาก..พระโขนง", "พี่มาก พระโขนง"),
])
def test_normalize_string(raw: str, expected: str) -> None:
    assert normalize_string(raw) == expected


def test_punctuation_tolerant_scoring_and_duplicate_claim() -> None:
    state = Top100Engine.create_state(PLAYERS, NAMES, ANIME_TOPIC)
    state = guess(state, "  MONKEY-D_LUFFY!  ")
    assert state.player_scores == {"p1": 100, "p2": 0}
    state = guess(state, "monkey.d.luffy")
    assert state.player_scores == {"p1": 100, "p2": 0}
    assert [item.rank for item in state.guessed_items] == [1]


def test_five_matching_tiers_and_thai_phonetics() -> None:
    assert clean_base_string('  Grand-Theft_Auto (GTA)!  ') == "grand theft auto gta"
    assert normalize_thai_phonetics("แมคโดนัลด์") == normalize_thai_phonetics("แมคโดนัล")
    assert normalize_thai_phonetics("ผัดกระเพรา") == normalize_thai_phonetics("ผัดกะเพรา")
    assert normalize_thai_phonetics("ผัดไท") == normalize_thai_phonetics("ผัดไทย")
    assert normalize_thai_phonetics("ช็อคโกแลต") == normalize_thai_phonetics("ช็อกโกแลต")
    assert normalize_thai_phonetics("แอพ") == normalize_thai_phonetics("แอป")
    assert normalize_thai_phonetics("พี่มาก") == normalize_thai_phonetics("พีมาก")
    assert is_answer_match("PAD-THAI", "Pad Thai", [])  # clean
    assert is_answer_match("แมคโดนัล", "McDonald's", ["แมคโดนัลด์"])  # Thai alias
    assert is_answer_match("GTA", "Grand Theft Auto V", [])  # acronym
    assert is_answer_match("GTA", "Grand Theft Auto (GTA)", [])  # parenthesized acronym
    assert is_answer_match("Cola", "Coca-Cola", [])  # substring
    assert is_answer_match("Minecraf", "Minecraft", [])  # fuzzy
    assert is_answer_match("เฟสบุ๊ก", "Facebook", ["เฟซบุ๊ก"])
    assert not is_answer_match("", "Minecraft", [])
    assert not is_answer_match("", "Minecraft", None)
    assert not is_answer_match("wrong answer", "Minecraft", [])


@pytest.mark.parametrize(("topic_id", "answer"), [
    ("thai_food", "ผัดไท"),
    ("thai_games", "GTA"),
    ("thai_games", "Minecraf"),
    ("global_brands", "แมคโดนัล"),
    ("global_brands", "Coca"),
])
def test_matching_tiers_award_points_in_game(topic_id: str, answer: str) -> None:
    topic = next(topic for topic in load_topic_bank() if topic.id == topic_id)
    state = guess(Top100Engine.create_state(PLAYERS, NAMES, topic), answer)
    assert len(state.guessed_items) == 1
    assert state.player_scores["p1"] == 101 - state.guessed_items[0].rank


def test_exact_answer_precedes_partial_match_and_ambiguous_guess_is_miss() -> None:
    topic = next(topic for topic in load_topic_bank() if topic.id == "thai_movies")
    exact = next(item for item in topic.items if item.name == "ไทบ้านเดอะซีรีส์ 2.1")
    state = Top100Engine.create_state(PLAYERS, NAMES, topic)
    state = guess(state, exact.name)
    assert [item.rank for item in state.guessed_items] == [exact.rank]
    assert state.player_scores["p1"] == 101 - exact.rank
    state = guess(state, "ไทบ้าน")
    assert [item.rank for item in state.guessed_items] == [exact.rank]
    assert state.player_scores["p2"] == 0


def test_topic_bank_and_seeded_selection() -> None:
    topics = load_topic_bank()
    expected = {
        "thai_food", "thai_movies", "thai_games", "anime_characters", "movie_characters",
        "global_foods", "thai_travel", "world_travel", "global_brands", "popular_apps",
    }
    assert {topic.id for topic in topics} == expected
    assert all(len(topic.items) == 100 for topic in topics)
    assert all(tuple(item.rank for item in topic.items) == tuple(range(1, 101)) for topic in topics)
    first = Top100Engine.init_game(PLAYERS, NAMES, seed=7)
    second = Top100Engine.init_game(PLAYERS, NAMES, seed=7)
    assert first == second
    assert {Top100Engine.init_game(PLAYERS, NAMES, seed=seed).topic.id for seed in range(100)} == expected


def test_public_guess_result_has_no_secret_score_or_rank() -> None:
    rooms = RoomManager()
    room = rooms.create_room(PlayerInput(id="p1", name="Alpha", avatar="A"), "top100")
    rooms.join_room(room.code, PlayerInput(id="p2", name="Beta", avatar="B"))
    rooms.toggle_ready(room.code, "p1", True)
    rooms.toggle_ready(room.code, "p2", True)
    rooms.start_game(room.code, "p1")
    assert isinstance(room.game_state, Top100State)
    assert room.turn_deadline is not None
    assert 34 <= room.turn_deadline - time.monotonic() <= 35
    assert rooms.player_view(room.code, "p1").game.turn_timer == 30
    first_answer = next(
        value for item in room.game_state.topic.items for value in (item.name, *item.aliases)
        if " " in value or "." in value
    )
    assert rooms.player_view(room.code, "p1").game is not None
    rooms.apply_game_action(room.code, "p1", "SUBMIT_GUESS", {"guess": first_answer})
    assert room.turn_deadline is not None
    assert 29 <= room.turn_deadline - time.monotonic() <= 30
    events = rooms.take_pending_events(room.code)
    assert len(events) == 1
    assert events[0].event_type == "TOP100_GUESS_RESULT"
    assert events[0].value == {"outcome": "CORRECT", "claim_index": 0}
    assert "rank" not in events[0].model_dump_json()
    assert "points" not in events[0].model_dump_json()
    opponent = rooms.player_view(room.code, "p2").game
    assert opponent is not None
    assert opponent.revealed_chronological_items[0].rank is None
    assert opponent.revealed_chronological_items[0].points is None
    rooms.apply_game_action(room.code, "p2", "SUBMIT_GUESS", {
        "guess": first_answer.replace(" ", "-").replace(".", "_")
    })
    assert rooms.take_pending_events(room.code)[0].value == {"outcome": "ALREADY_CLAIMED", "claim_index": None}
    rooms.apply_game_action(room.code, "p1", "SUBMIT_GUESS", {"guess": "not a real answer"})
    assert rooms.take_pending_events(room.code)[0].value == {"outcome": "MISS", "claim_index": None}


def test_scoring() -> None:
    state = start()
    state = guess(state, "  PAD THAI  ")  # rank 1, English alias
    assert state.player_scores == {"p1": 100, "p2": 0}
    state = guess(state, TOPIC.items[49].name)  # rank 50
    assert state.player_scores == {"p1": 100, "p2": 51}
    state = guess(state, "not a Thai dish")
    assert state.player_scores == {"p1": 100, "p2": 51}
    state = guess(state, "  ผัดไทย ")  # already claimed
    assert state.player_scores == {"p1": 100, "p2": 51}
    state = guess(state, TOPIC.items[99].aliases[0])  # rank 100
    assert state.player_scores == {"p1": 101, "p2": 51}
    assert [item.rank for item in state.guessed_items] == [1, 50, 100]


def test_chronological_order() -> None:
    state = start()
    for rank in (100, 1, 50):
        state = guess(state, TOPIC.items[rank - 1].name)
    assert [item.rank for item in state.guessed_items] == [100, 1, 50]
    assert [item.by_id for item in state.guessed_items] == ["p1", "p2", "p1"]
    assert [item.by_name for item in state.guessed_items] == ["Alpha", "Beta", "Alpha"]


def test_anti_cheat_view() -> None:
    state = guess(start(), TOPIC.items[0].name)
    state = guess(state, TOPIC.items[49].name)
    own = Top100Engine.get_player_view(state, "p1")
    opponent = Top100Engine.get_player_view(state, "p2")
    assert own.my_score == 100
    assert opponent.my_score == 51
    assert own.other_player_scores is None
    assert opponent.other_player_scores is None
    assert own.answer_sheet is None and opponent.answer_sheet is None
    assert own.winner_ids is None and own.final_rankings is None
    assert own.revealed_chronological_items[0].model_dump(exclude_none=True) == {
        "name": TOPIC.items[0].name, "rank": 1, "points": 100, "is_mine": True,
    }
    assert own.revealed_chronological_items[1].model_dump() == {
        "name": TOPIC.items[49].name, "rank": None, "points": None,
        "is_mine": False, "by": "Beta",
    }
    assert opponent.revealed_chronological_items[0].rank is None
    assert opponent.revealed_chronological_items[0].points is None


def test_invalid_actions_leave_state_unchanged() -> None:
    state = start()
    with pytest.raises(GameRuleError) as wrong_turn:
        Top100Engine.apply_action(state, "p2", Top100Action(action_type="SUBMIT_GUESS", guess="x"))
    assert wrong_turn.value.code == MoveErrorCode.NOT_YOUR_TURN
    with pytest.raises(GameRuleError) as blank:
        Top100Engine.apply_action(state, "p1", Top100Action(action_type="SUBMIT_GUESS", guess="   "))
    assert blank.value.code == MoveErrorCode.INVALID_ACTION
    with pytest.raises(GameRuleError) as punctuation_only:
        Top100Engine.apply_action(state, "p1", Top100Action(action_type="SUBMIT_GUESS", guess="...?!"))
    assert punctuation_only.value.code == MoveErrorCode.INVALID_ACTION
    with pytest.raises(GameRuleError) as stranger:
        Top100Engine.apply_action(state, "outsider", Top100Action(action_type="TURN_TIMEOUT"))
    assert stranger.value.code == MoveErrorCode.INVALID_PLAYER
    assert state == start()
    with pytest.raises(ValueError):
        Top100Engine.create_state(("only-one",), {"only-one": "Solo"}, TOPIC)
    with pytest.raises(ValueError):
        Top100Engine.create_state(tuple(str(i) for i in range(9)), {str(i): str(i) for i in range(9)}, TOPIC)


def test_10_rounds_completion() -> None:
    state = start()
    state = guess(state, TOPIC.items[99].name)  # Alpha scores 1
    state = guess(state, TOPIC.items[0].name)  # Beta scores 100
    for turn in range(2, 20):
        assert state.round_number == turn // 2 + 1
        assert state.status == "PLAYING"
        assert state.turn_player_id == PLAYERS[turn % 2]
        state = Top100Engine.apply_action(
            state, state.turn_player_id, Top100Action(action_type="TURN_TIMEOUT")
        )
    assert state.status == "FINISHED"
    assert state.round_number == 10
    assert state.turn_player_id is None
    assert state.winner_ids == ("p2",)
    assert [(entry.position, entry.player_id, entry.score) for entry in state.final_rankings] == [
        (1, "p2", 100), (2, "p1", 1)
    ]
    finished_view = Top100Engine.get_player_view(state, "p1")
    assert finished_view.other_player_scores == {"p1": 1, "p2": 100}
    assert finished_view.answer_sheet == TOPIC.items
    assert finished_view.revealed_chronological_items[1].rank == 1
    with pytest.raises(GameRuleError) as game_over:
        Top100Engine.apply_action(state, "p1", Top100Action(action_type="SUBMIT_GUESS", guess="anything"))
    assert game_over.value.code == MoveErrorCode.GAME_OVER


def test_tied_final_rankings() -> None:
    state = start()
    for _ in range(20):
        assert state.turn_player_id is not None
        state = Top100Engine.apply_action(
            state, state.turn_player_id, Top100Action(action_type="TURN_TIMEOUT")
        )
    assert state.winner_ids == PLAYERS
    assert [(entry.position, entry.score) for entry in state.final_rankings] == [(1, 0), (1, 0)]


def test_room_registration_bots_and_expiry() -> None:
    rooms = RoomManager()
    room = rooms.create_room(PlayerInput(id="p1", name="Human", avatar="H"), "top100")
    assert (room.min_players, room.max_players) == (2, 8)
    rooms.add_test_bots(room.code, "p1", 1)
    rooms.toggle_ready(room.code, "p1", True)
    rooms.start_game(room.code, "p1")
    assert isinstance(room.game_state, Top100State)
    assert room.turn_deadline is not None
    wire = rooms.player_view(room.code, "p1").model_dump(mode="json")
    assert wire["game"]["answer_sheet"] is None
    assert wire["game"]["other_player_scores"] is None
    assert rooms.expire_top100_turn(room.code) is False
    room.turn_deadline = 0
    assert rooms.expire_top100_turn(room.code) is True
    assert isinstance(room.game_state, Top100State)
    assert room.game_state.round_number == 2  # bot completed its turn
    assert room.game_state.turn_player_id == "p1"
    assert room.turn_deadline is not None
    assert rooms.player_view(room.code, "p1").game is not None
