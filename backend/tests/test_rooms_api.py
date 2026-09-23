"""End-to-end ASGI tests for HTTP rooms and WebSocket gameplay."""

from __future__ import annotations

import asyncio
import json
import sqlite3
from pathlib import Path
from types import TracebackType
from typing import Literal, cast

import httpx
import pytest
from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, JsonValue, TypeAdapter
from starlette.types import Message, Scope

from app.main import create_app
from app.schemas import (
    CreateRoomResponse,
    GameOverResult,
    PlayerView,
    ProtocolError,
    RoomSummary,
)


HOST = {"id": "host-id", "name": "Host Player", "avatar": "X"}
OPPONENT = {"id": "opponent-id", "name": "Opponent", "avatar": "O"}
_json_object_adapter = TypeAdapter(dict[str, JsonValue])


class StateEnvelope(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    type: Literal["GAME_STATE_UPDATE"]
    payload: WireRoomState


class WireGameView(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    board: list[Literal["X", "O"] | None]
    current_player: str
    status: Literal["in_progress", "won", "draw"]
    winner: str | None
    your_mark: Literal["X", "O"]


class WireRoomState(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    room_code: str
    game_type: Literal["tictactoe"]
    status: Literal["LOBBY", "PLAYING", "FINISHED"]
    host_id: str
    players: list[PlayerView]
    game: WireGameView | None
    result: GameOverResult | None


class ErrorEnvelope(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    type: Literal["ERROR"]
    payload: ProtocolError


class ChatData(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    sender_id: str
    sender_name: str
    text: str
    timestamp: str


class ChatEnvelope(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    event: Literal["CHAT_MESSAGE"]
    data: ChatData


class ASGIWebSocket:
    """Minimal in-process WebSocket peer that drives the real ASGI app."""

    def __init__(self, app: FastAPI, path: str, *, token: str | None = None) -> None:
        self._app = app
        self._path = path
        self._query_string = b"" if token is None else f"token={token}".encode()
        self._incoming: asyncio.Queue[Message] = asyncio.Queue()
        self._outgoing: asyncio.Queue[Message] = asyncio.Queue()
        self._task: asyncio.Task[None] | None = None

    async def __aenter__(self) -> ASGIWebSocket:
        scope: Scope = {
            "type": "websocket",
            "asgi": {"version": "3.0", "spec_version": "2.4"},
            "http_version": "1.1",
            "scheme": "ws",
            "path": self._path,
            "raw_path": self._path.encode(),
            "query_string": self._query_string,
            "root_path": "",
            "headers": [],
            "client": ("testclient", 50000),
            "server": ("testserver", 80),
            "subprotocols": [],
            "state": {},
            "extensions": {},
        }
        await self._incoming.put({"type": "websocket.connect"})
        self._task = asyncio.create_task(
            self._app(scope, self._receive, self._send)
        )
        accepted = await asyncio.wait_for(self._outgoing.get(), timeout=2)
        assert accepted["type"] == "websocket.accept"
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        del exc_type, exc_value, traceback
        if self._task is None:
            return
        if not self._task.done():
            await self._incoming.put(
                {"type": "websocket.disconnect", "code": 1000, "reason": "test end"}
            )
        await asyncio.wait_for(self._task, timeout=2)

    async def send_json(self, payload: object) -> None:
        await self._incoming.put(
            {
                "type": "websocket.receive",
                "text": json.dumps(payload),
            }
        )

    async def send_text(self, payload: str) -> None:
        await self._incoming.put(
            {"type": "websocket.receive", "text": payload}
        )

    async def receive_json(self) -> object:
        message = await asyncio.wait_for(self._outgoing.get(), timeout=2)
        assert message["type"] == "websocket.send"
        assert "text" in message
        return cast(object, json.loads(message["text"]))

    async def _receive(self) -> Message:
        return await self._incoming.get()

    async def _send(self, message: Message) -> None:
        await self._outgoing.put(message)


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


async def create_room(client: httpx.AsyncClient) -> str:
    response = await client.post(
        "/api/rooms",
        json={"game_type": "tictactoe", "player": HOST},
    )
    assert response.status_code == 201
    return CreateRoomResponse.model_validate(response.json()).room_code


def join_message(player: dict[str, str]) -> dict[str, object]:
    return {
        "type": "JOIN_ROOM",
        "player_id": player["id"],
        "payload": {
            "player_name": player["name"],
            "avatar": player["avatar"],
        },
    }


def ready_message(player_id: str) -> dict[str, object]:
    return {
        "type": "TOGGLE_READY",
        "player_id": player_id,
        "payload": {"ready": True},
    }


def action_message(player_id: str, position: int | str) -> dict[str, object]:
    return {
        "type": "GAME_ACTION",
        "player_id": player_id,
        "payload": {
            "action_type": "MAKE_MOVE",
            "payload": {"position": position},
        },
    }


def room_action_message(player_id: str, action_type: str) -> dict[str, object]:
    return {
        "type": "GAME_ACTION",
        "player_id": player_id,
        "payload": {"action_type": action_type, "payload": {}},
    }


@pytest.mark.anyio
async def test_room_rest_endpoints_and_development_cors() -> None:
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        room_code = await create_room(client)

        room_response = await client.get(f"/api/rooms/{room_code.lower()}")
        assert room_response.status_code == 200
        summary = RoomSummary.model_validate(room_response.json())
        assert summary.room_code == room_code
        assert summary.status == "LOBBY"
        assert summary.player_count == 1

        cors_response = await client.options(
            "/api/rooms",
            headers={
                "Origin": "http://127.0.0.1:5173",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert cors_response.status_code == 200
        assert cors_response.headers["access-control-allow-origin"] == (
            "http://127.0.0.1:5173"
        )


@pytest.mark.anyio
async def test_missing_room_returns_structured_404() -> None:
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/rooms/ABC123")

    assert response.status_code == 404
    body = _json_object_adapter.validate_python(response.json())
    detail = body["detail"]
    assert isinstance(detail, dict)
    assert detail["code"] == "ROOM_NOT_FOUND"


@pytest.mark.anyio
async def test_room_chat_is_validated_and_broadcast_to_each_player() -> None:
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        room_code = await create_room(client)

    async with ASGIWebSocket(app, f"/ws/rooms/{room_code}") as host_socket:
        await host_socket.send_json(join_message(HOST))
        await host_socket.receive_json()
        async with ASGIWebSocket(app, f"/ws/rooms/{room_code}") as opponent_socket:
            await opponent_socket.send_json(join_message(OPPONENT))
            await host_socket.receive_json()
            await opponent_socket.receive_json()

            await host_socket.send_json(
                {"action": "SEND_CHAT", "payload": {"text": "   "}}
            )
            invalid = ErrorEnvelope.model_validate(await host_socket.receive_json())
            assert invalid.payload.code == "INVALID_CHAT"

            await host_socket.send_json(
                {"action": "SEND_CHAT", "payload": {"text": " Hello table "}}
            )
            host_chat = ChatEnvelope.model_validate(await host_socket.receive_json())
            opponent_chat = ChatEnvelope.model_validate(
                await opponent_socket.receive_json()
            )
            assert host_chat.data.sender_id == HOST["id"]
            assert host_chat.data.sender_name == HOST["name"]
            assert host_chat.data.text == "Hello table"
            assert opponent_chat == host_chat


@pytest.mark.anyio
async def test_two_player_websocket_game_reaches_player_scoped_win() -> None:
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        room_code = await create_room(client)

    async with ASGIWebSocket(app, f"/ws/rooms/{room_code}") as host_socket:
        await host_socket.send_json(join_message(HOST))
        host_lobby = StateEnvelope.model_validate(
            await host_socket.receive_json()
        ).payload
        assert host_lobby.players[0].is_host is True

        async with ASGIWebSocket(
            app, f"/ws/rooms/{room_code}"
        ) as opponent_socket:
            await opponent_socket.send_json(join_message(OPPONENT))
            await host_socket.receive_json()
            opponent_lobby = StateEnvelope.model_validate(
                await opponent_socket.receive_json()
            ).payload
            assert len(opponent_lobby.players) == 2

            await opponent_socket.send_text("{")
            malformed_error = ErrorEnvelope.model_validate(
                await opponent_socket.receive_json()
            )
            assert malformed_error.payload.code == "INVALID_MESSAGE"

            await host_socket.send_json(ready_message(HOST["id"]))
            await host_socket.receive_json()
            await opponent_socket.receive_json()
            await opponent_socket.send_json(ready_message(OPPONENT["id"]))
            await host_socket.receive_json()
            await opponent_socket.receive_json()

            await host_socket.send_json(
                {"type": "START_GAME", "player_id": HOST["id"], "payload": {}}
            )
            host_game = StateEnvelope.model_validate(
                await host_socket.receive_json()
            ).payload
            opponent_game = StateEnvelope.model_validate(
                await opponent_socket.receive_json()
            ).payload
            assert host_game.game is not None
            assert opponent_game.game is not None
            assert host_game.game.your_mark == "X"
            assert opponent_game.game.your_mark == "O"

            await opponent_socket.send_json(action_message(OPPONENT["id"], 0))
            turn_error = ErrorEnvelope.model_validate(
                await opponent_socket.receive_json()
            )
            assert turn_error.payload.code == "NOT_YOUR_TURN"

            await opponent_socket.send_json(action_message(OPPONENT["id"], "0"))
            payload_error = ErrorEnvelope.model_validate(
                await opponent_socket.receive_json()
            )
            assert payload_error.payload.code == "INVALID_ACTION"

            turns = [
                (host_socket, HOST["id"], 0),
                (opponent_socket, OPPONENT["id"], 3),
                (host_socket, HOST["id"], 1),
                (opponent_socket, OPPONENT["id"], 4),
                (host_socket, HOST["id"], 2),
            ]
            final_host_state: WireRoomState | None = None
            final_opponent_state: WireRoomState | None = None
            for acting_socket, player_id, position in turns:
                await acting_socket.send_json(action_message(player_id, position))
                final_host_state = StateEnvelope.model_validate(
                    await host_socket.receive_json()
                ).payload
                final_opponent_state = StateEnvelope.model_validate(
                    await opponent_socket.receive_json()
                ).payload

            assert final_host_state is not None
            assert final_opponent_state is not None
            assert final_host_state.status == "FINISHED"
            assert final_host_state.result is not None
            assert final_host_state.result.outcome == "WIN"
            assert final_host_state.result.winner_id == HOST["id"]
            assert final_opponent_state.game is not None
            assert final_opponent_state.game.your_mark == "O"


@pytest.mark.anyio
async def test_only_authenticated_admin_can_force_end_and_reset_game(
    tmp_path: Path,
) -> None:
    app = create_app(
        auth_database_path=tmp_path / "force-end.db",
        auth_secret="test-authentication-secret",
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        login_response = await client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        login_body = _json_object_adapter.validate_python(login_response.json())
        admin_token = login_body["token"]
        admin_user = login_body["user"]
        assert isinstance(admin_token, str)
        assert isinstance(admin_user, dict)
        admin_id = admin_user["id"]
        assert isinstance(admin_id, str)
        room_response = await client.post(
            "/api/rooms",
            json={
                "game_type": "tictactoe",
                "player": {"id": admin_id, "name": "Admin", "avatar": "A"},
            },
        )
        room_code = CreateRoomResponse.model_validate(
            room_response.json()
        ).room_code

    admin = {"id": admin_id, "name": "Admin", "avatar": "A"}
    async with ASGIWebSocket(
        app, f"/ws/rooms/{room_code}", token=admin_token
    ) as admin_socket:
        await admin_socket.send_json(join_message(admin))
        await admin_socket.receive_json()
        async with ASGIWebSocket(
            app, f"/ws/rooms/{room_code}"
        ) as opponent_socket:
            await opponent_socket.send_json(join_message(OPPONENT))
            await admin_socket.receive_json()
            await opponent_socket.receive_json()
            await admin_socket.send_json(ready_message(admin_id))
            await admin_socket.receive_json()
            await opponent_socket.receive_json()
            await opponent_socket.send_json(ready_message(OPPONENT["id"]))
            await admin_socket.receive_json()
            await opponent_socket.receive_json()
            await admin_socket.send_json(
                {"type": "START_GAME", "player_id": admin_id, "payload": {}}
            )
            await admin_socket.receive_json()
            await opponent_socket.receive_json()

            await opponent_socket.send_json(
                room_action_message(OPPONENT["id"], "FORCE_END_GAME")
            )
            forbidden = ErrorEnvelope.model_validate(
                await opponent_socket.receive_json()
            )
            assert forbidden.payload.code == "FORBIDDEN"
            assert forbidden.payload.message == "Only admin can force end the game"

            await admin_socket.send_json(
                room_action_message(admin_id, "FORCE_END_GAME")
            )
            admin_finished = StateEnvelope.model_validate(
                await admin_socket.receive_json()
            ).payload
            opponent_finished = StateEnvelope.model_validate(
                await opponent_socket.receive_json()
            ).payload
            assert admin_finished.status == "FINISHED"
            assert admin_finished.result is not None
            assert admin_finished.result.is_over is True
            assert admin_finished.result.outcome == "FORCED"
            assert admin_finished.result.winner_id is None
            assert admin_finished.result.details == {
                "forced": True,
                "by": "Admin",
            }
            assert opponent_finished.result == admin_finished.result

            await admin_socket.send_json(
                room_action_message(admin_id, "REMATCH")
            )
            admin_lobby = StateEnvelope.model_validate(
                await admin_socket.receive_json()
            ).payload
            opponent_lobby = StateEnvelope.model_validate(
                await opponent_socket.receive_json()
            ).payload
            assert admin_lobby.status == "LOBBY"
            assert admin_lobby.game is None
            assert admin_lobby.result is None
            assert opponent_lobby.status == "LOBBY"

    with sqlite3.connect(tmp_path / "force-end.db") as connection:
        row = connection.execute(
            "SELECT action_logs_json FROM match_history WHERE room_code = ?",
            (room_code,),
        ).fetchone()
    assert row is not None
    action_logs = json.loads(str(row[0]))
    assert isinstance(action_logs, list)
    assert [entry["action"] for entry in action_logs] == [
        "START_GAME",
        "FORCE_END_GAME",
    ]
