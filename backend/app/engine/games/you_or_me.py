"""Pure rules engine for the "You or me who more than?" betting game."""

from __future__ import annotations

import hashlib
import random
from typing import Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.engine.base import BaseGame as BaseGameEngine, GameRuleError, MoveErrorCode

YouOrMePhase: TypeAlias = Literal["SELECT_CARD", "BETTING", "SHOWDOWN", "FINISHED"]
YouOrMeActionType: TypeAlias = Literal[
    "SELECT_CARD", "CHECK", "BET", "CALL", "FOLD", "SHOWDOWN_COMPLETE"
]
PlayerStatus: TypeAlias = Literal["ACTIVE", "ELIMINATED"]

RANK_LABELS: dict[int, str] = {
    11: "ROOSTER",
    12: "BOAR",
    13: "DRAGON",
}
RANK_KEYS: dict[int, str] = {
    **{rank: str(rank) for rank in range(1, 11)},
    11: "chicken",
    12: "pig",
    13: "dragon",
}


class YouOrMeCard(BaseModel):
    """A physical card; the rank is hidden by the player-view adapter."""

    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    id: str
    rank: int = Field(ge=1, le=13)
    card_key: str | None = None
    is_revealed: bool = False

    def model_post_init(self, __context: object) -> None:
        del __context
        expected = RANK_KEYS[self.rank]
        if self.card_key is not None and self.card_key != expected:
            raise ValueError("card key does not match card rank")
        if self.card_key is None:
            object.__setattr__(self, "card_key", expected)

    @property
    def value(self) -> int:
        """Compatibility alias for callers that call ranks card values."""
        return self.rank

    @property
    def label(self) -> str:
        return RANK_LABELS.get(self.rank, str(self.rank))


class YouOrMePlayer(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    player_id: str
    hand: tuple[YouOrMeCard, ...]
    selected_card: YouOrMeCard | None = None
    coins: int = Field(ge=0)
    status: PlayerStatus = "ACTIVE"

    @property
    def cards(self) -> tuple[YouOrMeCard, ...]:
        """Compatibility alias for engines that call a hand a card collection."""
        return self.hand


class YouOrMeRoundResult(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    round_number: int = Field(ge=1, le=7)
    pot: int = Field(ge=0)
    winner_ids: tuple[str, ...]
    winning_rank: int | None = Field(default=None, ge=1, le=13)
    payouts: dict[str, int]
    selected_cards: dict[str, int | None]


class YouOrMeState(BaseModel):
    """Complete engine state. Never serialize this object directly to clients."""

    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    players: tuple[YouOrMePlayer, ...]
    draw_pile: tuple[YouOrMeCard, ...]
    round_number: int = Field(ge=1, le=7)
    pot: int = Field(ge=0)
    phase: YouOrMePhase
    current_bet: int = Field(ge=0)
    current_player_id: str | None = None
    player_round_bets: dict[str, int]
    acted_players: tuple[str, ...] = ()
    raised_players: tuple[str, ...] = ()
    folded_players: tuple[str, ...] = ()
    round_history: tuple[YouOrMeRoundResult, ...] = ()
    winner_id: str | None = None
    seed: int
    event_log: tuple[str, ...] = ()

    @model_validator(mode="after")
    def validate_state(self) -> YouOrMeState:
        ids = tuple(player.player_id for player in self.players)
        if not 2 <= len(ids) <= 4:
            raise ValueError("You or me who more than? requires 2 to 4 players")
        if any(not player_id for player_id in ids) or len(set(ids)) != len(ids):
            raise ValueError("player IDs must be unique and non-empty")
        if set(self.player_round_bets) != set(ids):
            raise ValueError("player round bets must include every player")
        if any(amount < 0 for amount in self.player_round_bets.values()):
            raise ValueError("player round bets cannot be negative")
        if self.current_player_id is not None and self.current_player_id not in ids:
            raise ValueError("current player must be a participant")
        if not set(self.folded_players).issubset(ids):
            raise ValueError("folded players must be participants")
        return self

    @property
    def round_phase(self) -> YouOrMePhase:
        """Alias used by the product language for the current round phase."""
        return self.phase

    @property
    def deck(self) -> tuple[YouOrMeCard, ...]:
        """Compatibility alias for the undealt portion of the deck."""
        return self.draw_pile


class YouOrMeAction(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    action_type: YouOrMeActionType
    card_id: str | None = None
    amount: int | None = Field(default=None, ge=1)


class YouOrMeCardView(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    id: str
    rank: int | None
    card_key: str | None
    is_revealed: bool


class YouOrMePlayerView(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    player_id: str
    coins: int
    hand: tuple[YouOrMeCardView, ...]
    hand_count: int
    selected_card: YouOrMeCardView | None
    is_folded: bool
    status: PlayerStatus


class YouOrMeView(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)

    players: tuple[YouOrMePlayerView, ...]
    round_number: int
    total_rounds: int
    pot: int
    phase: YouOrMePhase
    current_bet: int
    current_player_id: str | None
    player_round_bets: dict[str, int]
    round_history: tuple[YouOrMeRoundResult, ...]
    winner_id: str | None
    event_log: tuple[str, ...]


class YouOrMeEngine(BaseGameEngine[YouOrMeState, YouOrMeAction, YouOrMeView]):
    """Deterministic 2–4 player, seven-round betting card game."""

    MIN_PLAYERS = 2
    MAX_PLAYERS = 4
    TOTAL_ROUNDS = 7
    STARTING_COINS = 50
    ANTE = 10

    @classmethod
    def initial_state(cls, player_ids: tuple[str, ...]) -> YouOrMeState:
        digest = hashlib.sha256("\x1f".join(player_ids).encode("utf-8")).digest()
        return cls.init_game(player_ids, seed=int.from_bytes(digest[:8], "big"))

    @classmethod
    def create_state(cls, player_ids: tuple[str, ...], *, seed: int) -> YouOrMeState:
        return cls.init_game(player_ids, seed=seed)

    @classmethod
    def init_game(
        cls, player_ids: tuple[str, ...], *, seed: int | None = None
    ) -> YouOrMeState:
        cls._validate_player_ids(player_ids)
        resolved_seed = seed if seed is not None else random.SystemRandom().getrandbits(64)
        rng = random.Random(resolved_seed)
        deck = cls._new_deck()
        rng.shuffle(deck)
        players = tuple(
            YouOrMePlayer(
                player_id=player_id,
                hand=tuple(deck[index * 7 : (index + 1) * 7]),
                coins=cls.STARTING_COINS,
            )
            for index, player_id in enumerate(player_ids)
        )
        return cls._begin_round(
            players,
            tuple(deck[len(player_ids) * 7 :]),
            round_number=1,
            round_history=(),
            seed=resolved_seed,
            event_log=("Game started. Ante collected.",),
        )

    @classmethod
    def apply_action(
        cls, state: YouOrMeState, player_id: str, action: YouOrMeAction
    ) -> YouOrMeState:
        cls._player(state, player_id)
        if action.action_type == "SHOWDOWN_COMPLETE":
            if state.phase == "SHOWDOWN":
                return cls._advance_showdown(state)
            if state.phase == "FINISHED":
                raise GameRuleError(MoveErrorCode.GAME_OVER, "the game is already over")
            return state
        if state.phase == "FINISHED":
            raise GameRuleError(MoveErrorCode.GAME_OVER, "the game is already over")
        if action.action_type == "SELECT_CARD":
            return cls._select_card(state, player_id, action)
        if state.phase != "BETTING":
            raise GameRuleError(
                MoveErrorCode.INVALID_ACTION,
                "betting actions are only available during the betting phase",
            )
        if state.current_player_id != player_id:
            raise GameRuleError(MoveErrorCode.NOT_YOUR_TURN, "it is not this player's turn")
        if player_id in state.acted_players:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "this player already acted")
        if action.action_type == "CHECK":
            return cls._betting_action(state, player_id, "CHECK")
        if action.action_type == "BET":
            return cls._bet(state, player_id, action.amount)
        if action.action_type == "CALL":
            return cls._call(state, player_id)
        if action.action_type == "FOLD":
            return cls._fold(state, player_id)
        raise GameRuleError(MoveErrorCode.INVALID_ACTION, "unsupported action")

    @classmethod
    def get_player_view(cls, state: YouOrMeState, player_id: str) -> YouOrMeView:
        cls._player(state, player_id)
        views: list[YouOrMePlayerView] = []
        for player in state.players:
            is_own = player.player_id == player_id
            selected = player.selected_card
            selected_view = None
            if selected is not None:
                is_folded = player.player_id in state.folded_players
                selected_view = cls._card_view(
                    selected,
                    visible=selected.is_revealed
                    or (is_own and not is_folded and state.phase not in {"SHOWDOWN", "FINISHED"}),
                )
            views.append(
                YouOrMePlayerView(
                    player_id=player.player_id,
                    coins=player.coins,
                    hand=tuple(cls._card_view(card, visible=True) for card in player.hand)
                    if is_own
                    else (),
                    hand_count=len(player.hand),
                    selected_card=selected_view,
                    is_folded=player.player_id in state.folded_players,
                    status=player.status,
                )
            )
        return YouOrMeView(
            players=tuple(views),
            round_number=state.round_number,
            total_rounds=cls.TOTAL_ROUNDS,
            pot=state.pot,
            phase=state.phase,
            current_bet=state.current_bet,
            current_player_id=state.current_player_id,
            player_round_bets=dict(state.player_round_bets),
            round_history=state.round_history,
            winner_id=state.winner_id,
            event_log=state.event_log,
        )

    @classmethod
    def _select_card(
        cls, state: YouOrMeState, player_id: str, action: YouOrMeAction
    ) -> YouOrMeState:
        if state.phase != "SELECT_CARD":
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "card selection is closed")
        if action.card_id is None:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "card_id is required")
        player = cls._player(state, player_id)
        if player.status != "ACTIVE":
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "eliminated players cannot select a card")
        if player.selected_card is not None:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "this player already selected a card")
        card = next((item for item in player.hand if item.id == action.card_id), None)
        if card is None:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "the selected card is not in your hand")
        updated_player = player.model_copy(
            update={"hand": tuple(item for item in player.hand if item.id != card.id), "selected_card": card}
        )
        players = cls._replace_player(state.players, updated_player)
        if all(
            item.selected_card is not None
            for item in players
            if item.status == "ACTIVE" and item.player_id not in state.folded_players
        ):
            first_player = next(
                item.player_id
                for item in players
                if item.status == "ACTIVE" and item.player_id not in state.folded_players
            )
            return state.model_copy(
                update={
                    "players": players,
                    "phase": "BETTING",
                    "current_player_id": first_player,
                    "current_bet": 0,
                    "player_round_bets": {item.player_id: 0 for item in players},
                    "acted_players": (),
                    "raised_players": (),
                    "event_log": state.event_log + ("All players selected a card.",),
                }
            )
        return state.model_copy(update={"players": players})

    @classmethod
    def _betting_action(
        cls, state: YouOrMeState, player_id: str, action_name: str
    ) -> YouOrMeState:
        if action_name == "CHECK" and state.current_bet != 0:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "check is only valid before a bet")
        return cls._finish_turn(state, player_id)

    @classmethod
    def _bet(cls, state: YouOrMeState, player_id: str, amount: int | None) -> YouOrMeState:
        if amount is None or amount <= state.current_bet:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "bet must exceed the current bet")
        if player_id in state.raised_players:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "a player may raise only once")
        player = cls._player(state, player_id)
        if amount > player.coins:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "you do not have enough coins for that bet")
        updated_player = player.model_copy(update={"coins": player.coins - amount})
        players = cls._replace_player(state.players, updated_player)
        bets = dict(state.player_round_bets)
        bets[player_id] = amount
        return cls._finish_turn(
            state.model_copy(
                update={
                    "players": players,
                    "pot": state.pot + amount,
                    "current_bet": amount,
                    "player_round_bets": bets,
                    "raised_players": state.raised_players + (player_id,),
                }
            ),
            player_id,
        )

    @classmethod
    def _call(cls, state: YouOrMeState, player_id: str) -> YouOrMeState:
        difference = state.current_bet - state.player_round_bets[player_id]
        if difference <= 0:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "there is no bet to call")
        player = cls._player(state, player_id)
        if difference > player.coins:
            raise GameRuleError(MoveErrorCode.INVALID_ACTION, "you do not have enough coins to call")
        updated_player = player.model_copy(update={"coins": player.coins - difference})
        players = cls._replace_player(state.players, updated_player)
        bets = dict(state.player_round_bets)
        bets[player_id] = state.current_bet
        return cls._finish_turn(
            state.model_copy(update={"players": players, "pot": state.pot + difference, "player_round_bets": bets}),
            player_id,
        )

    @classmethod
    def _fold(cls, state: YouOrMeState, player_id: str) -> YouOrMeState:
        player = cls._player(state, player_id)
        state_after = state.model_copy(
            update={
                "folded_players": state.folded_players + (player_id,),
            }
        )
        contenders = cls._contenders(state_after)
        if len(contenders) == 1:
            return cls._complete_round(state_after, (contenders[0],))
        return cls._finish_turn(state_after, player_id)

    @classmethod
    def _finish_turn(cls, state: YouOrMeState, player_id: str) -> YouOrMeState:
        acted = state.acted_players + (player_id,)
        state_after = state.model_copy(update={"acted_players": acted})
        if len(cls._contenders(state_after)) == 1:
            return cls._complete_round(state_after, tuple(cls._contenders(state_after)))
        eligible = [
            item.player_id
            for item in state_after.players
            if item.status == "ACTIVE"
            if item.player_id not in state_after.folded_players
            and item.player_id not in acted
        ]
        if not eligible:
            return cls._complete_round(state_after, tuple(cls._contenders(state_after)))
        return state_after.model_copy(update={"current_player_id": eligible[0]})

    @classmethod
    def _complete_round(
        cls, state: YouOrMeState, contender_ids: tuple[str, ...]
    ) -> YouOrMeState:
        selected = {
            player.player_id: player.selected_card.rank
            if player.selected_card is not None and player.player_id not in state.folded_players
            else None
            for player in state.players
        }
        ranks = [selected[player_id] for player_id in contender_ids if selected[player_id] is not None]
        winning_rank = max(ranks) if ranks else None
        winners = tuple(
            player_id
            for player_id in contender_ids
            if selected[player_id] == winning_rank
        )
        if not winners:
            winners = contender_ids[:1]
        base_payout = state.pot // len(winners)
        remainder = state.pot % len(winners)
        payouts = {
            player_id: base_payout + (1 if index < remainder else 0)
            for index, player_id in enumerate(winners)
        }
        players = tuple(
            player.model_copy(
                update={
                    "coins": player.coins + payouts.get(player.player_id, 0),
                    "status": "ELIMINATED"
                    if player.coins + payouts.get(player.player_id, 0) == 0
                    else player.status,
                    "selected_card": player.selected_card.model_copy(
                        update={"is_revealed": player.player_id not in state.folded_players}
                    )
                    if player.selected_card is not None
                    else None,
                }
            )
            for player in state.players
        )
        result = YouOrMeRoundResult(
            round_number=state.round_number,
            pot=state.pot,
            winner_ids=winners,
            winning_rank=winning_rank,
            payouts=payouts,
            selected_cards=selected,
        )
        active_players = tuple(player for player in players if player.status == "ACTIVE")
        is_game_over = state.round_number >= cls.TOTAL_ROUNDS or len(active_players) <= 1
        overall_winner = max(players, key=lambda player: player.coins).player_id if is_game_over else None
        return state.model_copy(
            update={
                "players": players,
                "phase": "SHOWDOWN",
                "current_bet": 0,
                "current_player_id": None,
                "round_history": state.round_history + (result,),
                "winner_id": overall_winner,
                "event_log": state.event_log
                + (f"Round {state.round_number} settled. Showdown revealed.",),
            }
        )

    @classmethod
    def _advance_showdown(cls, state: YouOrMeState) -> YouOrMeState:
        if state.winner_id is not None or state.round_number >= cls.TOTAL_ROUNDS:
            return state.model_copy(
                update={
                    "phase": "FINISHED",
                    "pot": 0,
                    "current_player_id": None,
                    "event_log": state.event_log + ("Game finished.",),
                }
            )
        cleared_players = tuple(
            player.model_copy(update={"selected_card": None}) for player in state.players
        )
        return cls._begin_round(
            cleared_players,
            state.draw_pile,
            round_number=state.round_number + 1,
            round_history=state.round_history,
            seed=state.seed,
            event_log=state.event_log,
        )

    @classmethod
    def _begin_round(
        cls,
        players: tuple[YouOrMePlayer, ...],
        draw_pile: tuple[YouOrMeCard, ...],
        *,
        round_number: int,
        round_history: tuple[YouOrMeRoundResult, ...],
        seed: int,
        event_log: tuple[str, ...],
    ) -> YouOrMeState:
        ante_total = sum(min(cls.ANTE, player.coins) for player in players)
        ante_players = tuple(
            player.model_copy(
                update={
                    "coins": player.coins - min(cls.ANTE, player.coins),
                    "status": "ELIMINATED"
                    if player.coins - min(cls.ANTE, player.coins) == 0
                    else player.status,
                }
            )
            for player in players
        )
        return YouOrMeState(
            players=ante_players,
            draw_pile=draw_pile,
            round_number=round_number,
            pot=ante_total,
            phase="SELECT_CARD",
            current_bet=0,
            current_player_id=None,
            player_round_bets={player.player_id: 0 for player in ante_players},
            round_history=round_history,
            seed=seed,
            event_log=event_log,
        )

    @staticmethod
    def _new_deck() -> list[YouOrMeCard]:
        return [
            YouOrMeCard(id=f"card-{rank}-{copy}", rank=rank)
            for rank in range(1, 14)
            for copy in range(1, 5)
        ]

    @classmethod
    def _validate_player_ids(cls, player_ids: tuple[str, ...]) -> None:
        if not cls.MIN_PLAYERS <= len(player_ids) <= cls.MAX_PLAYERS:
            raise ValueError("You or me who more than? requires 2 to 4 players")
        if any(not player_id for player_id in player_ids) or len(set(player_ids)) != len(player_ids):
            raise ValueError("player IDs must be unique and non-empty")

    @staticmethod
    def _player(state: YouOrMeState, player_id: str) -> YouOrMePlayer:
        player = next((item for item in state.players if item.player_id == player_id), None)
        if player is None:
            raise GameRuleError(MoveErrorCode.INVALID_PLAYER, "player is not a participant")
        return player

    @staticmethod
    def _replace_player(
        players: tuple[YouOrMePlayer, ...], updated: YouOrMePlayer
    ) -> tuple[YouOrMePlayer, ...]:
        return tuple(updated if player.player_id == updated.player_id else player for player in players)

    @staticmethod
    def _contenders(state: YouOrMeState) -> list[str]:
        return [
            player.player_id
            for player in state.players
            if player.status == "ACTIVE" and player.player_id not in state.folded_players
        ]

    @staticmethod
    def _card_view(card: YouOrMeCard, *, visible: bool) -> YouOrMeCardView:
        return YouOrMeCardView(
            id=card.id,
            rank=card.rank if visible else None,
            card_key=card.card_key if visible else None,
            is_revealed=visible,
        )
