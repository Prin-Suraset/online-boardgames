"""Cardfight adapter privacy, setup authority and lifecycle regressions."""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import JsonValue, ValidationError

from app.rooms import RoomError, RoomManager
from app.schemas import CreateRoomRequest, GameType, PlayerInput

VERSION = json.loads(Path("backend/data/area-games/cardfight/catalog.json").read_text())["catalog_version"]
MAIN = [5681,5729,5729,5729,5729,5679,5679,5679,5679,5680,5680,5680,5680,5730,5730,5730,5730,5712,5712,5712,5678,5678,5678,5678,5674,5674,5674,5675,5675,5675,5675,5700,5700,5700,5700,5677,5677,5677,5677,5711,5711,5711,5683,5683,5683,5683,5728,5728,5728,5728]


def person(index: int) -> PlayerInput:
    return PlayerInput(id=f"p{index}", name=f"Player {index}", avatar="A")


def deck() -> dict[str, JsonValue]:
    return {"game_id":"cardfight", "catalog_version":VERSION, "name":"Private choice", "main":MAIN.copy(), "ride":[], "extra":[], "starter_index":0}


def lobby() -> tuple[RoomManager, str]:
    rooms = RoomManager()
    room = rooms.create_room(person(1), "cardfight")
    rooms.join_room(room.code, person(2))
    rooms.join_room(room.code, person(3), role="spectator")
    return rooms, room.code


def setup(rooms: RoomManager, code: str) -> None:
    rooms.apply_game_action(code, "p1", "AREA_SELECT_PROFILE", {"profile_id":"cardfight-manual-v1", "first_player_id":"p1"})
    for pid in ("p1", "p2"):
        rooms.apply_game_action(code, pid, "CF_SUBMIT_DECK", {"deck":deck()})
        rooms.toggle_ready(code, pid, True)


def test_cardfight_creation_capacity_and_no_bots() -> None:
    assert CreateRoomRequest(game_type="cardfight", player=person(1)).game_type == "cardfight"
    rooms, code = lobby()
    assert rooms.summary(code).capacity == 2
    rooms.join_room(code, person(4))
    assert "p4" in rooms.get_room(code).spectators
    with pytest.raises(RoomError):
        rooms.add_test_bots(code, "p1", 1)


def test_setup_requires_profile_valid_deck_and_private_projection() -> None:
    rooms, code = lobby()
    with pytest.raises(RoomError) as error:
        rooms.toggle_ready(code, "p1", True)
    assert error.value.code == "SETUP_REQUIRED"
    setup(rooms, code)
    own = rooms.player_view(code, "p1").model_dump(mode="json")["game"]
    other = rooms.player_view(code, "p2").model_dump(mode="json")["game"]
    public = rooms.player_view(code, "p3").model_dump(mode="json")["game"]
    assert own["self_setup"]["deck"] == deck()
    assert all(set(seat) == {"player_id", "deck_valid"} for seat in other["seats"])
    assert public["self_setup"] is None and "Private choice" not in json.dumps(public)
    assert own["catalog_version"] == VERSION
    rooms.join_room(code, person(1))
    assert rooms.player_view(code, "p1").model_dump(mode="json")["game"] == own


def test_setup_authority_invalid_submission_atomic_and_profile_invalidation() -> None:
    rooms, code = lobby()
    setup(rooms, code)
    before = rooms.player_view(code, "p1").model_dump_json()
    for pid, kind, payload, expected in [
        ("p2", "AREA_SELECT_PROFILE", {"profile_id":"cardfight-manual-v1", "first_player_id":"p2"}, "HOST_ONLY"),
        ("p3", "CF_SUBMIT_DECK", {"deck":deck()}, "INVALID_PLAYER"),
        ("p1", "AREA_SELECT_PROFILE", {"profile_id":"standard", "first_player_id":"p1"}, "UNSUPPORTED_FORMAT"),
        ("p1", "CF_SUBMIT_DECK", {"deck":{**deck(), "catalog_version":"stale"}}, "CATALOG_MISMATCH"),
        ("p1", "CF_SUBMIT_DECK", {"deck":{**deck(), "main":[999999]*50}}, "DECK_INVALID"),
        ("p1", "CF_SUBMIT_DECK", {"deck":{**deck(), "ride":[5681]*3}}, "DECK_INVALID"),
    ]:
        with pytest.raises(RoomError) as error:
            rooms.apply_game_action(code, pid, kind, payload)
        assert error.value.code == expected
        assert rooms.player_view(code, "p1").model_dump_json() == before
    with pytest.raises((RoomError, ValidationError)):
        rooms.apply_game_action(code, "p1", "CF_SUBMIT_DECK", {"deck":{**deck(), "main":[1.5]*50, "seed":"no"}})
    rooms.apply_game_action(code, "p1", "CF_SUBMIT_DECK", {"deck":deck()})
    assert not rooms.get_room(code).players["p1"].is_ready
    assert rooms.get_room(code).players["p2"].is_ready
    rooms.apply_game_action(code, "p1", "AREA_SELECT_PROFILE", {"profile_id":"cardfight-manual-v1", "first_player_id":"p2"})
    view = rooms.player_view(code, "p1").model_dump(mode="json")
    assert not any(p["is_ready"] for p in view["players"])
    assert not any(s["deck_valid"] for s in view["game"]["seats"])


def test_start_dispatch_revision_concession_rematch_and_history_redaction() -> None:
    rooms, code = lobby()
    setup(rooms, code)
    rooms.start_game(code, "p1")
    room = rooms.get_room(code)
    assert room.game_state.game_type == "cardfight" and room.game_state.configured
    private = rooms.player_view(code, "p1").model_dump(mode="json")["game"]
    assert len(private["self"]["hand"]) == 5
    assert rooms.player_view(code, "p3").model_dump(mode="json")["game"]["self"] is None
    with pytest.raises(RoomError) as error:
        rooms.apply_game_action(code, "p1", "CF_KEEP_HAND", {"expected_revision":90})
    assert error.value.code == "STALE_ACTION"
    rooms.apply_game_action(code, "p1", "CF_MULLIGAN", {"expected_revision":0,"card_refs":[private["self"]["hand"][0]["ref"]]})
    rooms.apply_game_action(code, "p2", "CF_CONCEDE", {"expected_revision":1})
    assert room.status == "FINISHED"
    assert rooms.player_view(code, "p3").result.winner_id == "p1"
    logs = json.dumps(room.action_logs)
    assert "card_ref" not in logs and "Private choice" not in logs and "5681" not in logs
    room.reset_for_rematch("p1")
    view = rooms.player_view(code, "p1").model_dump(mode="json")["game"]
    assert view["profile_id"] is None and view["self_setup"]["deck"] is None
    assert not any(seat["deck_valid"] for seat in view["seats"])
    with pytest.raises(RoomError):
        rooms.start_game(code, "p1")


def test_role_switch_clears_setup_and_concedes_active_match_without_private_reentry() -> None:
    rooms, code = lobby()
    setup(rooms, code)
    rooms.switch_to_spectator(code, "p2")
    rooms.switch_to_player(code, "p2")
    assert rooms.player_view(code, "p2").model_dump(mode="json")["game"]["self_setup"]["deck"] is None
    rooms.apply_game_action(code, "p2", "CF_SUBMIT_DECK", {"deck":deck()})
    rooms.toggle_ready(code, "p2", True)
    rooms.start_game(code, "p1")
    rooms.switch_to_spectator(code, "p1")
    assert rooms.get_room(code).status == "FINISHED"
    assert rooms.player_view(code, "p1").result.winner_id == "p2"
    rooms.switch_to_player(code, "p3")
    assert rooms.player_view(code, "p3").model_dump(mode="json")["game"]["self"] is None
    assert rooms.player_view(code, "p1").model_dump(mode="json")["game"]["self"] is None


@pytest.mark.parametrize(("game_type", "capacity", "count"), [("tictactoe",2,2),("what_number",8,3),("you_or_me",4,2),("top100",8,2)])
def test_existing_games_still_start_explicitly(game_type: GameType, capacity: int, count: int) -> None:
    rooms = RoomManager()
    room = rooms.create_room(person(1), game_type)
    for i in range(2, count+1):
        rooms.join_room(room.code, person(i))
    for pid in room.players:
        rooms.toggle_ready(room.code, pid, True)
    rooms.start_game(room.code,"p1")
    assert room.max_players == capacity and room.status == "PLAYING"
    assert rooms.player_view(room.code,"p1").game is not None


def test_trusted_catalog_preserves_unknown_mechanics_and_source_markers() -> None:
    from app.card_data.cardfight_catalog import CardfightCatalog, load_cardfight_catalog
    from app.engine.games.cardfight import CardfightDeckDefinition
    catalog = CardfightCatalog.model_validate_json(json.dumps({
        "game_id":"cardfight", "catalog_version":"fixture", "cards":[
            {"card_id":1,"fields":{"UnitGrade":4}},
            {"card_id":2,"fields":{"UnitGrade":0,"ExtraDeck":1,"TriggerUnit":6}},
        ],
    }))
    definition = CardfightDeckDefinition.model_validate_json(json.dumps({**deck(),"catalog_version":"fixture","main":[1,2]}))
    mapped = catalog.snapshot(definition).definitions
    assert mapped[0].grade == 4 and mapped[0].extra_deck is None and mapped[0].trigger_type is None
    assert mapped[1].grade == 0 and mapped[1].extra_deck == 1 and mapped[1].trigger_type == 6
    actual = load_cardfight_catalog().snapshot(CardfightDeckDefinition.model_validate_json(json.dumps(deck())))
    assert next(card for card in actual.definitions if card.card_id == 5681).grade == 0


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_socket_malformed_then_valid_private_reconnect_and_agreed_result(tmp_path: Path) -> None:
    import sqlite3
    from contextlib import AsyncExitStack
    import httpx
    from app.main import create_app
    from backend.tests.test_rooms_api import ASGIWebSocket
    app = create_app(auth_database_path=tmp_path / "area.db", auth_secret="test-cardfight-secret")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.post("/api/rooms", json={"game_type":"cardfight", "player":person(1).model_dump()})
        assert response.status_code == 201
        code = response.json()["room_code"]
    async with AsyncExitStack() as stack:
        peers: list[ASGIWebSocket] = []
        for index in (1,2,3):
            peer = await stack.enter_async_context(ASGIWebSocket(app, f"/ws/rooms/{code}"))
            peers.append(peer)
            await peer.send_json({"type":"JOIN_ROOM","player_id":f"p{index}","payload":{"player_name":f"Player {index}","avatar":"A","role":"spectator" if index == 3 else "player"}})
            for connected in peers:
                await connected.receive_json()

        async def action(index: int, kind: str, payload: object) -> list[dict[str, JsonValue]]:
            await peers[index-1].send_json({"type":"GAME_ACTION","player_id":f"p{index}","payload":{"action_type":kind,"payload":payload}})
            return [await peer.receive_json() for peer in peers]

        async def error(index: int, kind: str, payload: object, expected: str) -> None:
            await peers[index-1].send_json({"type":"GAME_ACTION","player_id":f"p{index}","payload":{"action_type":kind,"payload":payload}})
            result = await peers[index-1].receive_json()
            assert result["type"] == "ERROR" and result["payload"]["code"] == expected

        await peers[0].send_text("{")
        assert (await peers[0].receive_json())["payload"]["code"] == "INVALID_MESSAGE"
        await action(1,"AREA_SELECT_PROFILE",{"profile_id":"cardfight-manual-v1","first_player_id":"p1"})
        await error(1,"CF_SUBMIT_DECK",{"deck":{**deck(),"main":[True]*50}},"DECK_INVALID")
        for index in (1,2):
            views = await action(index,"CF_SUBMIT_DECK",{"deck":deck()})
            assert views[2]["payload"]["game"]["self_setup"] is None
            await peers[index-1].send_json({"type":"TOGGLE_READY","player_id":f"p{index}","payload":{"ready":True}})
            for peer in peers:
                await peer.receive_json()
        await peers[0].send_json({"type":"START_GAME","player_id":"p1","payload":{}})
        initial = [await peer.receive_json() for peer in peers]
        assert initial[2]["payload"]["game"]["self"] is None
        hand = initial[0]["payload"]["game"]["self"]["hand"]
        await error(1,"CF_MULLIGAN",{"expected_revision":0,"card_refs":"bad"},"INVALID_ACTION")
        await error(1,"CF_MULLIGAN",{"expected_revision":0,"card_refs":[42]},"INVALID_ACTION")
        await error(1,"CF_MULLIGAN",{"expected_revision":0,"card_refs":["ทดสอบ"]},"INVALID_ACTION")
        await error(1,"CF_KEEP_HAND",{"expected_revision":0,"action_type":"CF_CONCEDE"},"INVALID_ACTION")
        valid = await action(1,"CF_MULLIGAN",{"expected_revision":0,"card_refs":[hand[0]["ref"]]})
        assert valid[0]["payload"]["game"]["revision"] == 1
        await peers[0].__aexit__(None,None,None)
        reconnect = await stack.enter_async_context(ASGIWebSocket(app,f"/ws/rooms/{code}"))
        await reconnect.send_json({"type":"JOIN_ROOM","player_id":"p1","payload":{"player_name":"Player 1","avatar":"A"}})
        for peer in peers[1:]:
            await peer.receive_json()
        restored = await reconnect.receive_json()
        assert restored["payload"]["game"]["self"] == valid[0]["payload"]["game"]["self"]
        peers[0] = reconnect
        proposed = await action(1,"CF_PROPOSE_RESULT",{"expected_revision":1,"outcome":"DRAW","winner_id":None})
        revision = proposed[1]["payload"]["game"]["pending_result"]["proposal_revision"]
        finished = await action(2,"CF_CONFIRM_RESULT",{"expected_revision":2,"proposal_revision":revision})
        assert all(view["payload"]["status"] == "FINISHED" for view in finished)
        assert finished[2]["payload"]["game"]["self"] is None
        assert finished[2]["payload"]["result"]["outcome"] == "DRAW"
        # Give the endpoint its continuation after the last broadcast (history persistence).
        await error(2,"CF_KEEP_HAND",{"expected_revision":3},"GAME_NOT_ACTIVE")
    with sqlite3.connect(tmp_path / "area.db") as database:
        row = database.execute("SELECT action_logs_json FROM match_history WHERE room_code=?",(code,)).fetchone()
    assert row is not None
    logs = str(row[0])
    assert "card_refs" not in logs and "Private choice" not in logs and hand[0]["ref"] not in logs


@pytest.mark.parametrize("departure", ["switch", "leave"])
def test_departed_first_seat_invalidates_lobby_setup_before_reseating(departure: str) -> None:
    rooms, code = lobby()
    setup(rooms, code)
    if departure == "switch":
        rooms.switch_to_spectator(code, "p1")
    else:
        rooms.leave_lobby(code, "p1")
    room = rooms.get_room(code)
    assert room.area_first_player is None
    assert not room.area_decks
    assert not room.players["p2"].is_ready
    rooms.switch_to_player(code, "p3")
    with pytest.raises(RoomError) as error:
        rooms.toggle_ready(code, "p2", True)
    assert error.value.code == "SETUP_REQUIRED"
    rooms.apply_game_action(code, "p2", "AREA_SELECT_PROFILE", {"profile_id":"cardfight-manual-v1", "first_player_id":"p3"})
    for pid in ("p2", "p3"):
        rooms.apply_game_action(code, pid, "CF_SUBMIT_DECK", {"deck":deck()})
        rooms.toggle_ready(code, pid, True)
    rooms.start_game(code, "p2")
    assert rooms.player_view(code, "p3").model_dump(mode="json")["game"]["active_player_id"] == "p3"
