"""WebSocket connection fan-out with player-specific state filtering."""

from __future__ import annotations

from fastapi import WebSocket

from app.rooms import RoomError, RoomManager
from app.schemas import ChatMessageData, GameEventData, ProtocolError


class RoomConnectionHub:
    def __init__(self, rooms: RoomManager) -> None:
        self._rooms = rooms
        self._connections: dict[str, dict[str, WebSocket]] = {}

    def register(self, room_code: str, player_id: str, socket: WebSocket) -> None:
        connections = self._connections.setdefault(room_code, {})
        connections[player_id] = socket

    def unregister(self, room_code: str, player_id: str, socket: WebSocket) -> None:
        connections = self._connections.get(room_code)
        if connections is None or connections.get(player_id) is not socket:
            return
        del connections[player_id]
        if not connections:
            del self._connections[room_code]

    async def send_error(
        self,
        socket: WebSocket,
        code: str,
        message: str,
    ) -> None:
        payload = ProtocolError(code=code, message=message)
        await socket.send_json(
            {"type": "ERROR", "payload": payload.model_dump(mode="json")}
        )

    async def broadcast(self, room_code: str) -> None:
        connections = list(self._connections.get(room_code, {}).items())
        for player_id, socket in connections:
            try:
                view = self._rooms.player_view(room_code, player_id)
                await socket.send_json(
                    {
                        "type": "GAME_STATE_UPDATE",
                        "payload": view.model_dump(mode="json"),
                    }
                )
            except RoomError:
                self.unregister(room_code, player_id, socket)
            except RuntimeError:
                self.unregister(room_code, player_id, socket)

    async def broadcast_chat(
        self, room_code: str, message: ChatMessageData
    ) -> None:
        await self._broadcast_event(
            room_code,
            "CHAT_MESSAGE",
            message.model_dump(mode="json"),
        )

    async def broadcast_game_event(
        self, room_code: str, event: GameEventData
    ) -> None:
        await self._broadcast_event(
            room_code,
            "GAME_EVENT",
            event.model_dump(mode="json"),
        )

    async def _broadcast_event(
        self,
        room_code: str,
        event_name: str,
        data: dict[str, object],
    ) -> None:
        connections = list(self._connections.get(room_code, {}).items())
        for player_id, socket in connections:
            try:
                await socket.send_json({"event": event_name, "data": data})
            except RuntimeError:
                self.unregister(room_code, player_id, socket)
