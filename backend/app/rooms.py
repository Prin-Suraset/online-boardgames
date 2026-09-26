"""In-memory room lifecycle coordinating pure game-engine transitions."""

from __future__ import annotations

import secrets
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import ceil
from typing import Literal
from uuid import uuid4

from pydantic import JsonValue

from app.engine.games.tictactoe import TicTacToeGame, TicTacToeMove, TicTacToeState, TicTacToeView
from app.engine.games.top100 import Top100Action, Top100Engine, Top100State, Top100View, find_matching_item
from app.engine.games.what_number import (
    WhatNumberAction,
    WhatNumberEngine,
    WhatNumberState,
    WhatNumberView,
)
from app.engine.games.you_or_me import (
    YouOrMeAction,
    YouOrMeEngine,
    YouOrMeState,
    YouOrMeView,
)
from app.schemas import (
    GameEventData,
    GameOverResult,
    GameType,
    PlayerInput,
    PlayerView,
    RoomStateView,
    RoomSummary,
)

RoomStatus = Literal["LOBBY", "PLAYING", "FINISHED"]
GameState = TicTacToeState | WhatNumberState | YouOrMeState | Top100State
_ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_BOT_NAMES = ("Bot_Alpha", "Bot_Beta", "Bot_Gamma", "Bot_Delta", "Bot_Echo", "Bot_Foxtrot", "Bot_Golf")


class RoomError(ValueError):
    """Expected room lifecycle failure safe to expose to a client."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(slots=True)
class PlayerRecord:
    id: str
    name: str
    avatar: str
    is_ready: bool = False
    is_host: bool = False
    is_bot: bool = False
    is_admin: bool = False

    def view(self) -> PlayerView:
        return PlayerView(
            id=self.id, name=self.name, avatar=self.avatar,
            is_ready=self.is_ready, is_host=self.is_host, is_bot=self.is_bot,
        )


@dataclass(slots=True)
class Room:
    code: str
    host_id: str
    game_type: GameType
    players: dict[str, PlayerRecord] = field(default_factory=dict)
    status: RoomStatus = "LOBBY"
    game_state: GameState | None = None
    game_over_result: GameOverResult | None = None
    action_logs: list[dict[str, JsonValue]] = field(default_factory=list)
    pending_events: list[GameEventData] = field(default_factory=list)
    match_id: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    history_saved: bool = False
    turn_deadline: float | None = None

    def force_end_game(self, requested_by_player_id: str) -> bool:
        """Immediately finish an active game when requested by an admin."""
        player = self.players.get(requested_by_player_id)
        if player is None or not player.is_admin:
            raise RoomError("FORBIDDEN", "Only admin can force end the game")
        if self.status != "PLAYING":
            raise RoomError("GAME_NOT_ACTIVE", "The game is not currently active.")
        self.status = "FINISHED"
        self.game_over_result = GameOverResult(
            is_over=True,
            outcome="FORCED",
            winner_id=None,
            details={"forced": True, "by": "Admin"},
        )
        self.finished_at = _utc_now()
        self.turn_deadline = None
        self.action_logs.append(
            {
                "timestamp": self.finished_at,
                "action": "FORCE_END_GAME",
                "actor_id": requested_by_player_id,
                "actor_name": player.name,
                "result": "FORCED",
            }
        )
        return True

    def reset_for_rematch(self, requested_by_player_id: str) -> bool:
        """Destroy the finished match state and return the room to the lobby."""
        player = self.players.get(requested_by_player_id)
        if player is None or (
            requested_by_player_id != self.host_id and not player.is_admin
        ):
            raise RoomError("FORBIDDEN", "Only the host or an admin can play again.")
        if self.status != "FINISHED":
            raise RoomError("INVALID_ROOM_STATE", "Only a finished game can be reset.")
        self.status = "LOBBY"
        self.game_state = None
        self.game_over_result = None
        self.action_logs.clear()
        self.pending_events.clear()
        self.match_id = None
        self.started_at = None
        self.finished_at = None
        self.history_saved = False
        self.turn_deadline = None
        for room_player in self.players.values():
            room_player.is_ready = room_player.is_bot
        return True

    def reset_to_lobby(self, requested_by_player_id: str) -> bool:
        """Backward-compatible alias for the rematch reset action."""
        return self.reset_for_rematch(requested_by_player_id)

    @property
    def min_players(self) -> int:
        if self.game_type == "tictactoe":
            return 2
        if self.game_type == "what_number":
            return 3
        return 2

    @property
    def max_players(self) -> int:
        if self.game_type == "tictactoe":
            return 2
        if self.game_type == "what_number":
            return 8
        if self.game_type == "top100":
            return 8
        return 4

    def add_test_bots(self, count: int) -> None:
        """Add ready development bots without coupling bots to game rules."""
        if self.game_type not in {"what_number", "you_or_me", "top100"}:
            raise RoomError("INVALID_ACTION", "Test bots are only available for supported games.")
        if self.status != "LOBBY":
            raise RoomError("INVALID_ROOM_STATE", "Bots can only join in the lobby.")
        if count < 1:
            raise RoomError("INVALID_ACTION", "Bot count must be positive.")
        if len(self.players) + count > self.max_players:
            raise RoomError("ROOM_FULL", "The requested bots would exceed room capacity.")
        used_names = {player.name for player in self.players.values()}
        available_names = (name for name in _BOT_NAMES if name not in used_names)
        for _ in range(count):
            name = next(available_names, f"Bot_{len(self.players) + 1}")
            bot_id = f"bot-{secrets.token_hex(8)}"
            self.players[bot_id] = PlayerRecord(
                id=bot_id, name=name, avatar="🤖", is_ready=True, is_bot=True,
            )


class RoomManager:
    """Synchronous in-memory room store for a single development process."""

    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}

    def create_room(self, player: PlayerInput, game_type: GameType = "tictactoe") -> Room:
        code = self._new_code()
        host = PlayerRecord(id=player.id, name=player.name, avatar=player.avatar, is_host=True)
        room = Room(code=code, host_id=player.id, game_type=game_type, players={player.id: host})
        self._rooms[code] = room
        return room

    def get_room(self, room_code: str) -> Room:
        code = room_code.strip().upper()
        room = self._rooms.get(code)
        if room is None:
            raise RoomError("ROOM_NOT_FOUND", "The requested room does not exist.")
        return room

    def summary(self, room_code: str) -> RoomSummary:
        room = self.get_room(room_code)
        return RoomSummary(
            room_code=room.code, game_type=room.game_type, status=room.status,
            player_count=len(room.players), capacity=room.max_players,
        )

    def join_room(
        self, room_code: str, player: PlayerInput, *, is_admin: bool = False,
    ) -> Room:
        room = self.get_room(room_code)
        existing = room.players.get(player.id)
        if existing is not None:
            existing.name = player.name
            existing.avatar = player.avatar
            existing.is_admin = existing.is_admin or is_admin
            return room
        if room.status != "LOBBY":
            raise RoomError("GAME_ALREADY_STARTED", "This game has already started.")
        if len(room.players) >= room.max_players:
            raise RoomError("ROOM_FULL", "This room is already full.")
        room.players[player.id] = PlayerRecord(
            id=player.id, name=player.name, avatar=player.avatar, is_admin=is_admin,
        )
        return room

    def toggle_ready(self, room_code: str, player_id: str, ready: bool) -> Room:
        room = self.get_room(room_code)
        self._require_lobby(room)
        self._require_player(room, player_id).is_ready = ready
        return room

    def add_test_bots(self, room_code: str, player_id: str, count: int) -> Room:
        room = self.get_room(room_code)
        if player_id != room.host_id:
            raise RoomError("HOST_ONLY", "Only the host can add test bots.")
        room.add_test_bots(count)
        return room

    def start_game(self, room_code: str, player_id: str) -> Room:
        room = self.get_room(room_code)
        self._require_lobby(room)
        if player_id != room.host_id:
            raise RoomError("HOST_ONLY", "Only the host can start the game.")
        if not room.min_players <= len(room.players) <= room.max_players or not all(
            player.is_ready for player in room.players.values()
        ):
            raise RoomError("PLAYERS_NOT_READY", f"{room.min_players}-{room.max_players} ready players are required.")
        player_ids = tuple(room.players)
        if room.game_type == "tictactoe":
            room.game_state = TicTacToeGame.initial_state(player_ids)
        elif room.game_type == "what_number":
            room.game_state = WhatNumberEngine.create_state(player_ids, seed=secrets.randbits(64))
        elif room.game_type == "you_or_me":
            room.game_state = YouOrMeEngine.init_game(player_ids, seed=secrets.randbits(64))
        else:
            room.game_state = Top100Engine.init_game(
                player_ids,
                {player.id: player.name for player in room.players.values()},
                seed=secrets.randbits(64),
            )
        room.status = "PLAYING"
        room.game_over_result = None
        room.action_logs.clear()
        room.pending_events.clear()
        room.match_id = str(uuid4())
        room.started_at = _utc_now()
        room.finished_at = None
        room.history_saved = False
        self._log_action(room, "START_GAME", actor_id=player_id)
        if room.game_type == "what_number":
            self._emit_event(room, "TURN_START", value=1)
        elif room.game_type == "you_or_me":
            self._run_bot_actions(room)
            if isinstance(room.game_state, YouOrMeState) and room.game_state.phase == "FINISHED":
                room.status = "FINISHED"
                room.finished_at = _utc_now()
        elif room.game_type == "top100":
            self._run_bot_actions(room)
            self._reset_top100_deadline(room, opening_delay=5)
        return room

    def make_move(self, room_code: str, player_id: str, move: TicTacToeMove) -> Room:
        room = self.get_room(room_code)
        if room.game_type != "tictactoe" or not isinstance(room.game_state, TicTacToeState):
            raise RoomError("GAME_NOT_ACTIVE", "Tic-Tac-Toe is not active.")
        room.game_state = TicTacToeGame.apply_action(room.game_state, player_id, move)
        self._log_action(
            room,
            "MAKE_MOVE",
            actor_id=player_id,
            value=move.position,
            result=room.game_state.status,
        )
        if room.game_state.status != "in_progress":
            room.status = "FINISHED"
            room.finished_at = _utc_now()
        return room

    def apply_game_action(
        self, room_code: str, player_id: str, action_type: str,
        payload: dict[str, JsonValue],
    ) -> Room:
        room = self.get_room(room_code)
        if room.status != "PLAYING" or room.game_state is None:
            raise RoomError("GAME_NOT_ACTIVE", "The game is not currently active.")
        if room.game_type == "tictactoe":
            if action_type != "MAKE_MOVE":
                raise RoomError("INVALID_ACTION", "This game does not support that action.")
            return self.make_move(room_code, player_id, TicTacToeMove.model_validate(payload))
        if isinstance(room.game_state, WhatNumberState):
            action = WhatNumberAction.model_validate({"action_type": action_type, **payload})
            previous_state = room.game_state
            room.game_state = WhatNumberEngine.apply_action(previous_state, player_id, action)
            self._record_what_number_action(room, player_id, action, previous_state, room.game_state)
            self._run_bot_actions(room)
        elif isinstance(room.game_state, YouOrMeState):
            action = YouOrMeAction.model_validate({"action_type": action_type, **payload})
            previous_state = room.game_state
            room.game_state = YouOrMeEngine.apply_action(previous_state, player_id, action)
            self._record_you_or_me_transition(room, previous_state, room.game_state)
            self._run_bot_actions(room)
        elif isinstance(room.game_state, Top100State):
            if action_type not in {"SUBMIT_GUESS", "PASS_TURN"}:
                raise RoomError("INVALID_ACTION", "Only a guess or pass can be submitted.")
            if room.turn_deadline is not None and time.monotonic() >= room.turn_deadline:
                raise RoomError("TURN_EXPIRED", "This turn has expired.")
            action = Top100Action.model_validate({"action_type": action_type, **payload})
            previous_state = room.game_state
            room.game_state = Top100Engine.apply_action(previous_state, player_id, action)
            self._log_action(room, action_type, actor_id=player_id, value=action.guess)
            if action.action_type == "PASS_TURN":
                self._emit_event(room, "TURN_PASSED", actor_id=player_id)
            else:
                self._record_top100_guess(room, player_id, action.guess, previous_state, room.game_state)
            self._run_bot_actions(room)
            self._reset_top100_deadline(room)
        else:
            raise RoomError("GAME_NOT_ACTIVE", "The selected game is not active.")
        if (
            isinstance(room.game_state, (WhatNumberState, YouOrMeState))
            and room.game_state.phase == "FINISHED"
        ) or (isinstance(room.game_state, Top100State) and room.game_state.status == "FINISHED"):
            room.status = "FINISHED"
            room.finished_at = room.finished_at or _utc_now()
        return room

    def expire_top100_turn(self, room_code: str) -> bool:
        """Advance one expired turn; safe for concurrent timer wakeups."""
        room = self.get_room(room_code)
        state = room.game_state
        if (
            room.status != "PLAYING" or not isinstance(state, Top100State)
            or state.turn_player_id is None or room.turn_deadline is None
            or time.monotonic() < room.turn_deadline
        ):
            return False
        actor_id = state.turn_player_id
        room.game_state = Top100Engine.apply_action(
            state, actor_id, Top100Action(action_type="TURN_TIMEOUT")
        )
        self._log_action(room, "TURN_TIMEOUT", actor_id=actor_id)
        self._run_bot_actions(room)
        self._reset_top100_deadline(room)
        if isinstance(room.game_state, Top100State) and room.game_state.status == "FINISHED":
            room.status = "FINISHED"
            room.finished_at = _utc_now()
        return True

    @staticmethod
    def _reset_top100_deadline(room: Room, *, opening_delay: int = 0) -> None:
        state = room.game_state
        room.turn_deadline = (
            time.monotonic() + state.timer + opening_delay
            if isinstance(state, Top100State) and state.status == "PLAYING" else None
        )

    def _record_top100_guess(
        self, room: Room, actor_id: str, guess: str | None,
        before: Top100State, after: Top100State,
    ) -> None:
        """Broadcast only the outcome and claim position; private views hold scores."""
        claim_index = len(before.guessed_items)
        if len(after.guessed_items) > claim_index:
            outcome = "CORRECT"
            public_index: int | None = claim_index
        else:
            claimed_ranks = {item.rank for item in before.guessed_items}
            matched = find_matching_item(before.topic, guess or "")
            already_claimed = matched is not None and matched.rank in claimed_ranks
            outcome = "ALREADY_CLAIMED" if already_claimed else "MISS"
            public_index = None
        self._emit_event(
            room, "TOP100_GUESS_RESULT", actor_id=actor_id,
            value={"outcome": outcome, "claim_index": public_index},
            is_correct=outcome == "CORRECT",
        )

    def take_pending_events(self, room_code: str) -> tuple[GameEventData, ...]:
        room = self.get_room(room_code)
        events = tuple(room.pending_events)
        room.pending_events.clear()
        return events

    def leave_lobby(self, room_code: str, player_id: str) -> Room | None:
        room = self.get_room(room_code)
        if room.status != "LOBBY":
            return room
        self._require_player(room, player_id)
        del room.players[player_id]
        if not room.players:
            del self._rooms[room.code]
            return None
        if player_id == room.host_id:
            new_host = next(iter(room.players.values()))
            new_host.is_host = True
            room.host_id = new_host.id
        return room

    def player_view(self, room_code: str, player_id: str) -> RoomStateView:
        room = self.get_room(room_code)
        self._require_player(room, player_id)
        game_view: TicTacToeView | WhatNumberView | YouOrMeView | Top100View | None = None
        result = room.game_over_result
        if isinstance(room.game_state, TicTacToeState):
            game_view = TicTacToeGame.get_player_view(room.game_state, player_id)
            if room.status == "FINISHED" and result is None:
                result = GameOverResult(
                    outcome="DRAW" if room.game_state.status == "draw" else "WIN",
                    winner_id=room.game_state.winner,
                )
        elif isinstance(room.game_state, WhatNumberState):
            game_view = WhatNumberEngine.get_player_view(
                room.game_state,
                player_id,
                display_names={
                    player.id: player.name
                    for player in room.players.values()
                },
            )
            if room.status == "FINISHED" and result is None:
                result = GameOverResult(outcome="WIN", winner_id=room.game_state.winner_id)
        elif isinstance(room.game_state, YouOrMeState):
            game_view = YouOrMeEngine.get_player_view(room.game_state, player_id)
            if room.status == "FINISHED" and result is None:
                result = GameOverResult(outcome="WIN", winner_id=room.game_state.winner_id)
        elif isinstance(room.game_state, Top100State):
            game_view = Top100Engine.get_player_view(room.game_state, player_id)
            if room.status == "PLAYING" and room.turn_deadline is not None:
                game_view = game_view.model_copy(update={
                    "turn_timer": min(room.game_state.timer, max(0, ceil(room.turn_deadline - time.monotonic())))
                })
            if room.status == "FINISHED" and result is None:
                winners = room.game_state.winner_ids
                result = GameOverResult(
                    outcome="DRAW" if len(winners) > 1 else "WIN",
                    winner_id=winners[0] if len(winners) == 1 else None,
                )
        return RoomStateView(
            room_code=room.code, game_type=room.game_type, status=room.status,
            host_id=room.host_id,
            players=tuple(player.view() for player in room.players.values()),
            game=game_view, result=result,
        )

    def _run_bot_actions(self, room: Room) -> None:
        """Resolve active bot attacks and penalties with a bounded heuristic."""
        for _ in range(64):
            state = room.game_state
            if isinstance(state, YouOrMeState):
                self._run_you_or_me_bot_action(room, state)
                if room.game_state is state:
                    return
                continue
            if isinstance(state, Top100State):
                if state.status == "FINISHED" or state.turn_player_id is None:
                    return
                actor = room.players.get(state.turn_player_id)
                if actor is None or not actor.is_bot:
                    return
                available = [
                    item for item in state.topic.items
                    if all(guess.rank != item.rank for guess in state.guessed_items)
                ]
                guess = (
                    secrets.choice(available).name
                    if available and secrets.randbelow(4) != 0 else "ไม่ทราบคำตอบ"
                )
                room.game_state = Top100Engine.apply_action(
                    state, actor.id, Top100Action(action_type="SUBMIT_GUESS", guess=guess)
                )
                self._log_action(room, "SUBMIT_GUESS", actor_id=actor.id, value=guess)
                self._record_top100_guess(room, actor.id, guess, state, room.game_state)
                continue
            if not isinstance(state, WhatNumberState) or state.phase == "FINISHED":
                return
            actor_id = state.pending_penalty_player_id if state.phase == "PENALTY" else state.active_player_id
            actor = room.players.get(actor_id or "")
            if actor is None or not actor.is_bot:
                return
            if state.phase == "PENALTY":
                engine_player = next(player for player in state.players if player.player_id == actor.id)
                card = next(card for card in engine_player.cards if not card.is_revealed)
                action = WhatNumberAction(action_type="REVEAL_OWN", card_id=card.id)
            elif state.phase == "ATTACK":
                target = next(
                    player for player in state.players
                    if player.player_id != actor.id and player.status == "ACTIVE"
                )
                guessed_number = ((state.turn_counter * 7 + len(state.event_log) * 11) % 40) + 1
                action = WhatNumberAction(
                    action_type="GUESS", target_player_id=target.player_id,
                    guessed_number=guessed_number,
                )
            else:
                return
            next_state = WhatNumberEngine.apply_action(state, actor.id, action)
            room.game_state = next_state
            self._record_what_number_action(room, actor.id, action, state, next_state)
        raise RoomError("BOT_ACTION_LIMIT", "Bot action safety limit was reached.")

    def _run_you_or_me_bot_action(self, room: Room, state: YouOrMeState) -> None:
        if state.phase == "FINISHED":
            return
        if state.phase == "SELECT_CARD":
            bot = next(
                (
                    player
                    for player in room.players.values()
                    if player.is_bot
                    and next(item for item in state.players if item.player_id == player.id).selected_card is None
                ),
                None,
            )
            if bot is None:
                return
            engine_player = next(item for item in state.players if item.player_id == bot.id)
            card = secrets.choice(engine_player.hand)
            next_state = YouOrMeEngine.apply_action(
                state, bot.id, YouOrMeAction(action_type="SELECT_CARD", card_id=card.id)
            )
            room.game_state = next_state
            self._record_you_or_me_transition(room, state, next_state)
            return
        if state.phase != "BETTING" or state.current_player_id is None:
            return
        actor = room.players.get(state.current_player_id)
        if actor is None or not actor.is_bot:
            return
        if state.current_bet == 0:
            engine_player = next(item for item in state.players if item.player_id == actor.id)
            selected_rank = engine_player.selected_card.rank if engine_player.selected_card else 1
            action = (
                YouOrMeAction(action_type="BET", amount=min(5, engine_player.coins))
                if selected_rank >= 10 and engine_player.coins >= 5
                else YouOrMeAction(action_type="CHECK")
            )
        else:
            engine_player = next(item for item in state.players if item.player_id == actor.id)
            difference = state.current_bet - state.player_round_bets[actor.id]
            action = (
                YouOrMeAction(action_type="CALL")
                if difference <= 10 and difference <= engine_player.coins
                else YouOrMeAction(action_type="FOLD")
            )
        next_state = YouOrMeEngine.apply_action(state, actor.id, action)
        room.game_state = next_state
        self._record_you_or_me_transition(room, state, next_state)

    def _record_you_or_me_transition(
        self,
        room: Room,
        before: YouOrMeState,
        after: YouOrMeState,
    ) -> None:
        if (
            after.phase != "SHOWDOWN"
            or len(after.round_history) <= len(before.round_history)
        ):
            return
        result = after.round_history[-1]
        before_players = {player.player_id: player for player in before.players}
        winners = [
            {
                "id": player_id,
                "name": room.players[player_id].name,
                "won_amount": result.payouts.get(player_id, 0),
            }
            for player_id in result.winner_ids
        ]
        eliminated_players = [
            {"id": player.player_id, "name": room.players[player.player_id].name}
            for player in after.players
            if player.status == "ELIMINATED"
            and before_players[player.player_id].status != "ELIMINATED"
        ]
        is_game_over = (
            after.winner_id is not None
            or after.round_number >= YouOrMeEngine.TOTAL_ROUNDS
        )
        overall_winner = None
        if is_game_over and after.winner_id is not None:
            winner = next(
                player for player in after.players if player.player_id == after.winner_id
            )
            overall_winner = {
                "id": winner.player_id,
                "name": room.players[winner.player_id].name,
                "total_coins": winner.coins,
            }
        self._emit_event(
            room,
            "ROUND_RESULT",
            value={
                "round_number": result.round_number,
                "winners": winners,
                "is_tie": len(winners) > 1,
                "eliminated_players": eliminated_players,
                "is_game_over": is_game_over,
                "overall_winner": overall_winner,
            },
        )

    def _record_what_number_action(
        self,
        room: Room,
        actor_id: str,
        action: WhatNumberAction,
        before: WhatNumberState,
        after: WhatNumberState,
    ) -> None:
        if action.action_type == "VOLUNTEER":
            self._emit_event(room, "VOLUNTEER", actor_id=actor_id)
        elif action.action_type == "TIMER_EXPIRED":
            self._emit_event(room, "TIMEOUT_PICK", actor_id=after.active_player_id)
        elif action.action_type == "GUESS":
            target_id = action.target_player_id
            guessed_number = action.guessed_number
            target_before = next(
                (player for player in before.players if player.player_id == target_id),
                None,
            )
            is_correct = bool(
                target_before is not None
                and guessed_number is not None
                and any(
                    not card.is_revealed and card.number == guessed_number
                    for card in target_before.cards
                )
            )
            self._emit_event(
                room,
                "ATTACK_GUESS",
                actor_id=actor_id,
                target_id=target_id,
                value=guessed_number,
                is_correct=is_correct,
            )
            self._emit_event(
                room,
                "GUESS_CORRECT" if is_correct else "GUESS_WRONG",
                actor_id=actor_id,
                target_id=target_id,
                value=guessed_number,
                is_correct=is_correct,
            )
            if not is_correct and guessed_number is not None:
                reveal_event = (
                    "CENTER_REVEALED_FROM_GUESS"
                    if guessed_number in before.number_deck
                    and guessed_number not in after.number_deck
                    else "GUESS_HELD_BY_ANOTHER"
                )
                self._emit_event(
                    room,
                    reveal_event,
                    actor_id=actor_id,
                    target_id=target_id,
                    value=str(guessed_number),
                )
        elif action.action_type == "USE_SKILL":
            actor_before = next(
                player for player in before.players if player.player_id == actor_id
            )
            skill = next(
                item for item in actor_before.skills if item.id == action.skill_id
            )
            self._emit_event(
                room,
                "SKILL_USED",
                actor_id=actor_id,
                target_id=action.target_player_id,
                value=skill.skill_type,
            )
        else:
            self._log_action(
                room,
                action.action_type,
                actor_id=actor_id,
                value=action.card_id,
                result=after.phase,
            )

        if after.turn_counter > before.turn_counter:
            self._emit_event(room, "TURN_END", actor_id=actor_id)
            if len(after.revealed_center_cards) > len(before.revealed_center_cards):
                revealed_number = after.revealed_center_cards[-1]
                self._emit_event(
                    room,
                    "CENTER_CARD_REVEALED",
                    value=str(revealed_number),
                )
            self._emit_event(room, "TURN_START", value=after.turn_counter)

    def _emit_event(
        self,
        room: Room,
        event_type: Literal[
            "VOLUNTEER", "TIMEOUT_PICK", "ATTACK_GUESS", "GUESS_CORRECT",
            "GUESS_WRONG", "TURN_END", "TURN_START", "SKILL_USED",
            "CENTER_CARD_REVEALED", "CENTER_REVEALED_FROM_GUESS",
            "GUESS_HELD_BY_ANOTHER", "ROUND_RESULT",
            "TOP100_GUESS_RESULT", "TURN_PASSED",
        ],
        *,
        actor_id: str | None = None,
        target_id: str | None = None,
        value: JsonValue = None,
        is_correct: bool | None = None,
    ) -> None:
        actor = room.players.get(actor_id or "")
        target = room.players.get(target_id or "")
        event = GameEventData(
            event_type=event_type,
            actor_id=actor_id,
            actor_name=actor.name if actor is not None else None,
            player_id=actor_id if event_type == "TURN_PASSED" else None,
            player_name=actor.name if actor is not None and event_type == "TURN_PASSED" else None,
            target_id=target_id,
            target_name=target.name if target is not None else None,
            value=value,
            is_correct=is_correct,
        )
        room.pending_events.append(event)
        self._log_action(
            room,
            event_type,
            actor_id=actor_id,
            target_id=target_id,
            value=value,
            result=is_correct,
        )

    @staticmethod
    def _log_action(
        room: Room,
        action: str,
        *,
        actor_id: str | None = None,
        target_id: str | None = None,
        value: JsonValue = None,
        result: JsonValue = None,
    ) -> None:
        actor = room.players.get(actor_id or "")
        target = room.players.get(target_id or "")
        room.action_logs.append(
            {
                "timestamp": _utc_now(),
                "action": action,
                "actor_id": actor_id,
                "actor_name": actor.name if actor is not None else None,
                "target_id": target_id,
                "target_name": target.name if target is not None else None,
                "value": value,
                "result": result,
            }
        )

    def _new_code(self) -> str:
        while True:
            code = "".join(secrets.choice(_ROOM_ALPHABET) for _ in range(6))
            if code not in self._rooms:
                return code

    @staticmethod
    def _require_lobby(room: Room) -> None:
        if room.status != "LOBBY":
            raise RoomError("INVALID_ROOM_STATE", "The room is no longer in the lobby.")

    @staticmethod
    def _require_player(room: Room, player_id: str) -> PlayerRecord:
        player = room.players.get(player_id)
        if player is None:
            raise RoomError("INVALID_PLAYER", "The player is not in this room.")
        return player


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
