"""FastAPI transport adapters for rooms and real-time gameplay."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import TypeAdapter, ValidationError

from app.api.auth import create_auth_router
from app.auth import AuthError, AuthService, AuthStore, AuthUser
from app.engine.base import GameRuleError
from app.realtime import RoomConnectionHub
from app.rooms import RoomError, RoomManager
from app.schemas import (
    ClientMessage,
    ChatMessageData,
    CreateRoomRequest,
    CreateRoomResponse,
    GameActionMessage,
    JoinRoomMessage,
    LeaveRoomMessage,
    PlayerInput,
    RoomSummary,
    SendChatMessage,
    StartGameMessage,
    ToggleReadyMessage,
)

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

_client_message_adapter: TypeAdapter[ClientMessage] = TypeAdapter(ClientMessage)
_chat_message_adapter: TypeAdapter[SendChatMessage] = TypeAdapter(SendChatMessage)


def create_app(
    *,
    auth_database_path: Path | None = None,
    auth_secret: str | None = None,
) -> FastAPI:
    application = FastAPI(title="Online Board Game Platform")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    rooms = RoomManager()
    hub = RoomConnectionHub(rooms)
    database_path = auth_database_path or Path(
        os.environ.get("BOARDGAME_DATABASE_PATH", "data/boardgame.db")
    )
    secret = (
        auth_secret
        or os.environ.get("BOARDGAME_AUTH_SECRET")
        or "development-only-secret-change-me"
    )
    auth = AuthService(AuthStore(database_path), secret)
    application.state.rooms = rooms
    application.state.hub = hub
    application.state.auth = auth
    application.include_router(create_auth_router(auth))

    @application.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @application.post(
        "/api/rooms",
        response_model=CreateRoomResponse,
        status_code=status.HTTP_201_CREATED,
    )
    async def create_room(request: CreateRoomRequest) -> CreateRoomResponse:
        room = rooms.create_room(request.player, request.game_type)
        return CreateRoomResponse(room_code=room.code)

    @application.get("/api/rooms/{room_code}", response_model=RoomSummary)
    async def get_room(room_code: str) -> RoomSummary:
        try:
            return rooms.summary(room_code)
        except RoomError as error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": error.code, "message": error.message},
            ) from error

    @application.websocket("/ws/rooms/{room_code}")
    async def room_socket(websocket: WebSocket, room_code: str) -> None:
        code = room_code.strip().upper()
        authenticated_user: AuthUser | None = None
        token = websocket.query_params.get("token")
        if token is not None:
            try:
                authenticated_user = auth.current_user(token)
            except AuthError:
                authenticated_user = None
        await websocket.accept()
        try:
            rooms.get_room(code)
        except RoomError as error:
            await hub.send_error(websocket, error.code, error.message)
            await websocket.close(code=4404)
            return

        joined_player_id: str | None = None
        try:
            while True:
                try:
                    raw_message = await websocket.receive_json()
                except ValueError:
                    await hub.send_error(
                        websocket,
                        "INVALID_MESSAGE",
                        "The WebSocket frame must contain valid JSON.",
                    )
                    continue

                if isinstance(raw_message, dict) and raw_message.get("action") == "SEND_CHAT":
                    try:
                        chat_message = _chat_message_adapter.validate_python(raw_message)
                    except ValidationError:
                        await hub.send_error(
                            websocket,
                            "INVALID_CHAT",
                            "Chat messages must contain 1 to 200 characters.",
                        )
                        continue
                    if joined_player_id is None:
                        await hub.send_error(
                            websocket,
                            "INVALID_PLAYER",
                            "Join the room before sending room actions.",
                        )
                        continue
                    text = chat_message.payload.text.strip()
                    if not text:
                        await hub.send_error(
                            websocket,
                            "INVALID_CHAT",
                            "Chat messages cannot be empty.",
                        )
                        continue
                    player = rooms.get_room(code).players[joined_player_id]
                    await hub.broadcast_chat(
                        code,
                        ChatMessageData(
                            sender_id=player.id,
                            sender_name=player.name,
                            text=text,
                            timestamp=datetime.now(timezone.utc).isoformat(),
                        ),
                    )
                    continue
                try:
                    message = _client_message_adapter.validate_python(raw_message)
                except ValidationError:
                    await hub.send_error(
                        websocket,
                        "INVALID_MESSAGE",
                        "The WebSocket message does not match the room protocol.",
                    )
                    continue

                if isinstance(message, JoinRoomMessage):
                    if (
                        joined_player_id is not None
                        and joined_player_id != message.player_id
                    ):
                        await hub.send_error(
                            websocket,
                            "INVALID_PLAYER",
                            "This connection is already bound to another player.",
                        )
                        continue
                    try:
                        rooms.join_room(
                            code,
                            PlayerInput(
                                id=message.player_id,
                                name=message.payload.player_name,
                                avatar=message.payload.avatar,
                            ),
                            is_admin=(
                                authenticated_user is not None
                                and authenticated_user.id == message.player_id
                                and authenticated_user.is_admin
                            ),
                        )
                    except RoomError as error:
                        await hub.send_error(websocket, error.code, error.message)
                        continue
                    joined_player_id = message.player_id
                    hub.register(code, message.player_id, websocket)
                    await hub.broadcast(code)
                    continue

                if joined_player_id is None or joined_player_id != message.player_id:
                    await hub.send_error(
                        websocket,
                        "INVALID_PLAYER",
                        "Join the room before sending room actions.",
                    )
                    continue

                try:
                    if isinstance(message, ToggleReadyMessage):
                        rooms.toggle_ready(
                            code,
                            message.player_id,
                            message.payload.ready,
                        )
                    elif isinstance(message, StartGameMessage):
                        rooms.start_game(code, message.player_id)
                    elif isinstance(message, GameActionMessage):
                        if message.payload.action_type == "ADD_TEST_BOTS":
                            count = message.payload.payload.get("count")
                            if not isinstance(count, int) or isinstance(count, bool):
                                raise RoomError(
                                    "INVALID_ACTION", "Bot count must be an integer."
                                )
                            rooms.add_test_bots(code, message.player_id, count)
                        elif message.payload.action_type == "FORCE_END_GAME":
                            if (
                                authenticated_user is None
                                or authenticated_user.id != message.player_id
                                or not authenticated_user.is_admin
                            ):
                                raise RoomError(
                                    "FORBIDDEN",
                                    "Only admin can force end the game",
                                )
                            rooms.get_room(code).force_end_game(message.player_id)
                        elif message.payload.action_type == "RESET_ROOM":
                            if (
                                authenticated_user is None
                                or authenticated_user.id != message.player_id
                            ):
                                raise RoomError(
                                    "FORBIDDEN",
                                    "Sign in as the host or an admin to play again.",
                                )
                            rooms.get_room(code).reset_to_lobby(message.player_id)
                        else:
                            try:
                                rooms.apply_game_action(
                                    code,
                                    message.player_id,
                                    message.payload.action_type,
                                    message.payload.payload,
                                )
                            except ValidationError as error:
                                raise RoomError(
                                    "INVALID_ACTION",
                                    "The game action payload is invalid.",
                                ) from error
                    elif isinstance(message, LeaveRoomMessage):
                        remaining_room = rooms.leave_lobby(code, message.player_id)
                        hub.unregister(code, message.player_id, websocket)
                        if remaining_room is not None:
                            await hub.broadcast(code)
                        await websocket.close(code=1000)
                        return
                    await hub.broadcast(code)
                    for game_event in rooms.take_pending_events(code):
                        await hub.broadcast_game_event(code, game_event)
                    completed_room = rooms.get_room(code)
                    if (
                        completed_room.status == "FINISHED"
                        and not completed_room.history_saved
                        and completed_room.match_id is not None
                        and completed_room.started_at is not None
                    ):
                        auth.save_match_history(
                            match_id=completed_room.match_id,
                            room_code=completed_room.code,
                            game_type=completed_room.game_type,
                            started_at=completed_room.started_at,
                            finished_at=completed_room.finished_at
                            or datetime.now(timezone.utc).isoformat(),
                            action_logs=completed_room.action_logs,
                        )
                        completed_room.history_saved = True
                except RoomError as error:
                    await hub.send_error(websocket, error.code, error.message)
                except GameRuleError as error:
                    await hub.send_error(
                        websocket,
                        error.code.value,
                        error.message,
                    )
        except WebSocketDisconnect:
            pass
        finally:
            if joined_player_id is not None:
                hub.unregister(code, joined_player_id, websocket)

    return application


app = create_app()
