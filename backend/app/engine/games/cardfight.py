"""Pure assisted Cardfight table; no inferred tournament or card-text rules.

The adapter must create snapshots from a pinned, trusted server catalog. These
mechanical input records are deliberately separate from public catalog records.
All randomness is a pinned HMAC stream keyed by an explicit 32-byte match seed.
"""

from __future__ import annotations

import hashlib
import hmac
from typing import Literal, TypeAlias, TypeVar, cast

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.engine.base import BaseGame, GameRuleError, MoveErrorCode

Zone: TypeAlias = Literal["DECK", "HAND", "VANGUARD", "REAR", "GUARDIAN", "DAMAGE", "DROP", "SOUL", "BIND", "REMOVED", "G_ZONE", "RIDE", "CHECK", "TOKEN"]
Phase: TypeAlias = Literal["RIDE", "MAIN", "BATTLE", "END"]
Opening: TypeAlias = Literal["PENDING", "KEPT", "READY"]
Window: TypeAlias = Literal["NONE", "RESPONSE", "CHECK"]
ActionType: TypeAlias = Literal[
    "CF_DRAW", "CF_SHUFFLE", "CF_INSPECT", "CF_CLOSE_INSPECTION", "CF_MOVE", "CF_REORDER",
    "CF_ORIENT", "CF_SET_FACE", "CF_SET_MODIFIER", "CF_SET_COUNTER", "CF_MULLIGAN", "CF_KEEP_HAND",
    "CF_READY_TO_PLAY", "CF_NEXT_PHASE", "CF_END_TURN", "CF_DECLARE_ATTACK", "CF_OPEN_RESPONSE",
    "CF_PASS_RESPONSE", "CF_DRIVE_CHECK", "CF_DAMAGE_CHECK", "CF_RESOLVE_CHECK", "CF_CONCEDE",
    "CF_PROPOSE_RESULT", "CF_CONFIRM_RESULT", "CF_REJECT_RESULT",
]
ZONES: tuple[Zone, ...] = ("DECK", "HAND", "VANGUARD", "REAR", "GUARDIAN", "DAMAGE", "DROP", "SOUL", "BIND", "REMOVED", "G_ZONE", "RIDE", "CHECK", "TOKEN")
SLOTS = ("front-left", "front-right", "back-left", "back-center", "back-right")
FIELD = frozenset(("VANGUARD", "REAR", "GUARDIAN"))
INSPECTABLE = frozenset(("DECK", "HAND", "SOUL", "DROP", "BIND", "REMOVED", "G_ZONE", "RIDE", "TOKEN"))
NONFIELD = frozenset(("HAND", "DECK", "DROP", "SOUL", "BIND", "REMOVED", "G_ZONE", "RIDE", "TOKEN"))
T = TypeVar("T")


class Record(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)


class CardfightCardDefinition(Record):
    """Trusted resolved mechanics only; None retains unresolved source metadata."""

    card_id: int = Field(ge=1, le=2147483647)
    catalog_version: str = Field(min_length=1, max_length=64)
    grade: int | None = Field(default=None, ge=0, le=99)
    extra_deck: int | None = Field(default=None, ge=0, le=1)
    trigger_type: int | None = Field(default=None, ge=0, le=99)
    is_token: bool = False


class CardfightDeckDefinition(Record):
    game_id: Literal["cardfight"] = "cardfight"
    catalog_version: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=80)
    main: tuple[int, ...] = Field(min_length=1, max_length=256)
    ride: tuple[int, ...] = Field(max_length=16)
    extra: tuple[int, ...] = Field(max_length=64)
    tokens: tuple[int, ...] = Field(max_length=30)
    starter_index: int | None = Field(ge=0, le=255)

    @model_validator(mode="after")
    def validate_ids(self) -> CardfightDeckDefinition:
        if any(type(i) is not int or not 1 <= i <= 2147483647 for i in self.main + self.ride + self.extra + self.tokens):
            raise ValueError("deck IDs must be positive strict integers")
        if len(self.main + self.ride + self.extra + self.tokens) > 366 or len(self.model_dump_json().encode()) > 65536:
            raise ValueError("deck exceeds supported bounds")
        return self


class CardfightDeckSnapshot(Record):
    deck: CardfightDeckDefinition
    definitions: tuple[CardfightCardDefinition, ...]


_FIELDS: dict[str, tuple[str, ...]] = {
    "CF_DRAW": ("count", "edge"), "CF_SHUFFLE": ("zone",), "CF_INSPECT": ("zone", "count"),
    "CF_CLOSE_INSPECTION": ("inspection_id",), "CF_MOVE": ("card_ref", "to_zone", "slot", "position", "parent_ref"),
    "CF_REORDER": ("inspection_id", "ordered_refs"), "CF_ORIENT": ("card_ref", "orientation"),
    "CF_SET_FACE": ("card_ref", "face"), "CF_SET_MODIFIER": ("card_ref", "stat", "value"),
    "CF_SET_COUNTER": ("card_ref", "value"), "CF_MULLIGAN": ("card_refs",),
    "CF_DECLARE_ATTACK": ("attacker_ref", "target_ref", "target_player_id"),
    "CF_PROPOSE_RESULT": ("outcome", "winner_id"),
    "CF_CONFIRM_RESULT": ("proposal_revision",), "CF_REJECT_RESULT": ("proposal_revision",),
}


class CardfightAction(Record):
    """Strict per-discriminator payload; irrelevant and missing fields rejected."""

    action_type: ActionType
    expected_revision: int = Field(ge=0)
    count: int | None = Field(default=None, ge=1, le=256)
    edge: Literal["TOP", "BOTTOM"] | None = None
    zone: Zone | None = None
    inspection_id: str | None = Field(default=None, min_length=1, max_length=64)
    card_ref: str | None = Field(default=None, min_length=1, max_length=64)
    to_zone: Zone | None = None
    slot: str | None = Field(default=None, min_length=1, max_length=32)
    position: int | None = Field(default=None, ge=0, le=335)
    parent_ref: str | None = Field(default=None, min_length=1, max_length=64)
    ordered_refs: tuple[str, ...] | None = Field(default=None, min_length=1, max_length=256)
    orientation: Literal["STAND", "REST"] | None = None
    face: Literal["UP", "DOWN"] | None = None
    stat: Literal["POWER", "SHIELD", "DEFENSE", "CRITICAL"] | None = None
    value: int | None = Field(default=None, ge=-999999, le=999999)
    card_refs: tuple[str, ...] | None = Field(default=None, max_length=5)
    attacker_ref: str | None = Field(default=None, min_length=1, max_length=64)
    target_ref: str | None = Field(default=None, min_length=1, max_length=64)
    target_player_id: str | None = Field(default=None, min_length=1, max_length=128)
    outcome: Literal["WIN", "DRAW"] | None = None
    winner_id: str | None = Field(default=None, min_length=1, max_length=128)
    proposal_revision: int | None = Field(default=None, ge=0)

    @model_validator(mode="before")
    @classmethod
    def check_payload(cls, value: object) -> object:
        if not isinstance(value, dict):
            return value
        kind = value.get("action_type")
        if not isinstance(kind, str):
            return value
        allowed = {"action_type", "expected_revision", *_FIELDS.get(kind, ())}
        if set(value) != allowed:
            raise ValueError("action fields do not match discriminator")
        nullable = {"slot", "position", "parent_ref", "target_ref", "target_player_id", "winner_id"}
        if kind == "CF_INSPECT":
            nullable.add("count")
        if any(value.get(key) is None for key in allowed - nullable):
            raise ValueError("required action field is null")
        return value

    @model_validator(mode="after")
    def check_ranges(self) -> CardfightAction:
        refs = (self.card_refs or ()) + (self.ordered_refs or ())
        if any(not 1 <= len(ref) <= 64 for ref in refs):
            raise ValueError("invalid reference length")
        if self.action_type == "CF_SHUFFLE" and self.zone != "DECK":
            raise ValueError("only deck shuffle is supported")
        if self.action_type == "CF_SET_COUNTER" and (self.value is None or not 0 <= self.value <= 999):
            raise ValueError("counter out of range")
        if self.stat == "CRITICAL" and (self.value is None or not -999 <= self.value <= 999):
            raise ValueError("critical modifier out of range")
        return self


class Modifiers(Record):
    power: int = Field(default=0, ge=-999999, le=999999)
    shield: int = Field(default=0, ge=-999999, le=999999)
    defense: int = Field(default=0, ge=-999999, le=999999)
    critical: int = Field(default=0, ge=-999, le=999)


class CardInstance(Record):
    instance_id: str
    card_id: int
    owner_id: str
    controller_id: str
    zone: Zone
    slot: str | None = None
    position: int = Field(ge=0)
    orientation: Literal["STAND", "REST"] = "STAND"
    face: Literal["UP", "DOWN"] = "UP"
    visibility_epoch: int = Field(default=0, ge=0)
    modifiers: Modifiers = Modifiers()
    counters: int = Field(default=0, ge=0, le=999)
    parent_id: str | None = None


class AttackDeclaration(Record):
    attacker_ref: str
    target_ref: str | None
    target_player_id: str | None


class CheckState(Record):
    checker_id: str
    kind: Literal["DRIVE", "DAMAGE"]
    instance_id: str
    previous_holder_id: str
    previous_window: Literal["NONE", "RESPONSE"]


class PriorityState(Record):
    holder_id: str
    window: Window = "NONE"
    return_to_id: str | None = None
    pending_attack: AttackDeclaration | None = None
    pending_check: CheckState | None = None


class ResultProposal(Record):
    proposer_id: str
    proposal_revision: int = Field(ge=0)
    outcome: Literal["WIN", "DRAW"]
    winner_id: str | None


class GameOverResult(Record):
    outcome: Literal["WIN", "DRAW"]
    winner_id: str | None
    reason: Literal["CONCESSION", "AGREEMENT"]


class Inspection(Record):
    player_id: str
    inspection_id: str
    zone: Zone
    instance_ids: tuple[str, ...]


class OpeningState(Record):
    player_id: str
    status: Opening = "PENDING"


class HistoryEntry(Record):
    sequence: int = Field(ge=1)
    actor_id: str
    action_type: ActionType
    public_refs: tuple[str, ...] = ()
    count: int | None = None


class CardfightState(Record):
    game_type: Literal["cardfight"] = "cardfight"
    profile_id: str = "cardfight-manual-v1"
    catalog_version: str = "unconfigured"
    configured: bool = False
    revision: int = Field(default=0, ge=0)
    players: tuple[str, str]
    stage: Literal["OPENING", "PLAYING", "FINISHED"] = "OPENING"
    turn: int = Field(default=1, ge=1)
    phase: Phase = "RIDE"
    active_player_id: str
    priority: PriorityState
    cards: tuple[CardInstance, ...] = ()
    definitions: tuple[CardfightCardDefinition, ...] = ()
    ride_instances: tuple[str, ...] = ()
    extra_instances: tuple[str, ...] = ()
    seed: bytes = b""
    generation: int = Field(default=0, ge=0, le=18446744073709551615)
    shuffle_ordinals: tuple[int, int] = (0, 0)
    opening: tuple[OpeningState, ...]
    inspections: tuple[Inspection, ...] = ()
    result: ResultProposal | None = None
    game_over: GameOverResult | None = None
    winner_id: str | None = None
    history: tuple[HistoryEntry, ...] = ()
    diagnostics: tuple[str, ...] = ("MANUAL_ABILITIES", "UNVALIDATED_TOURNAMENT_LEGALITY", "UNKNOWN_TRIGGERS_MANUAL", "EXTENDED_HELPERS_UNSUPPORTED")


class VisibleCard(Record):
    ref: str
    card_id: int
    orientation: Literal["STAND", "REST"]
    face: Literal["UP", "DOWN"]
    slot: str | None
    position: int
    modifiers: Modifiers
    counters: int


class ConcealedCard(Record):
    ref: str
    orientation: Literal["STAND", "REST"]
    face: Literal["DOWN"] = "DOWN"
    slot: str | None
    position: int


class ZoneView(Record):
    zone: Zone
    count: int
    cards: tuple[VisibleCard | ConcealedCard, ...]


class PublicPlayerTable(Record):
    player_id: str
    hand_count: int
    deck_count: int
    zones: tuple[ZoneView, ...]
    resources: dict[str, int] = Field(default_factory=dict)


class InspectionView(Record):
    inspection_id: str
    zone: Zone
    cards: tuple[VisibleCard, ...]
    reorder_allowed: bool


class PrivatePlayerTable(Record):
    hand: tuple[VisibleCard, ...]
    opening_status: Opening
    inspection: InspectionView | None
    concealed_zone_cards: tuple[VisibleCard, ...]


class ActionDescriptor(Record):
    action_type: ActionType


class CardfightView(Record):
    stage: Literal["OPENING", "PLAYING", "FINISHED"]
    game_type: Literal["cardfight"] = "cardfight"
    profile_id: str
    revision: int
    turn: int
    phase: Phase
    active_player_id: str
    priority_holder_id: str
    response_window: Window
    players: tuple[PublicPlayerTable, PublicPlayerTable]
    self: PrivatePlayerTable | None
    pending_result: ResultProposal | None
    result: GameOverResult | None
    history: tuple[HistoryEntry, ...]
    legal_actions: tuple[ActionDescriptor, ...]


def _encode(*parts: str | bytes) -> bytes:
    encoded = tuple(part.encode("utf-8") if isinstance(part, str) else part for part in parts)
    if any(len(part) > 4096 for part in encoded):
        raise ValueError("stream component too long")
    return b"".join(len(part).to_bytes(4, "big") + part for part in encoded)


def _decimal(value: int) -> str:
    if type(value) is not int or not 0 <= value <= 18446744073709551615:
        raise ValueError("stream ordinal outside uint64")
    return str(value)


def _digest(seed: bytes, *parts: str | bytes) -> bytes:
    if type(seed) is not bytes or len(seed) != 32:
        raise ValueError("match seed must be exactly 32 bytes")
    return hmac.new(seed, _encode(*parts), hashlib.sha256).digest()


def _shuffle_order(seed: bytes, generation: int, player_id: str, zone: str, ordinal: int, length: int) -> tuple[int, ...]:
    order = list(range(length))
    counter = 0
    for index in range(length - 1, 0, -1):
        modulus = index + 1
        limit = (1 << 256) // modulus * modulus
        while True:
            block = _digest(seed, "shuffle", "cardfight", _decimal(generation), player_id, zone,
                            _decimal(ordinal), _decimal(counter))
            counter += 1
            value = int.from_bytes(block, "big")
            if value < limit:
                chosen = value % modulus
                break
        order[index], order[chosen] = order[chosen], order[index]
    return tuple(order)


def _invalid() -> None:
    raise GameRuleError(MoveErrorCode.INVALID_ACTION, "action is not permitted in the current state")


def _required(value: T | None) -> T:
    if value is None:
        _invalid()
    return cast(T, value)


class CardfightEngine(BaseGame[CardfightState, CardfightAction, CardfightView]):
    """Immutable deterministic transitions for cardfight-manual-v1 only."""

    @classmethod
    def initial_state(cls, player_ids: tuple[str, ...]) -> CardfightState:
        if (len(player_ids) != 2 or len(set(player_ids)) != 2
                or any(type(p) is not str or not 1 <= len(p) <= 128 for p in player_ids)):
            raise ValueError("Cardfight requires two distinct player IDs")
        players = cast(tuple[str, str], player_ids)
        return CardfightState(players=players, active_player_id=players[0],
                              priority=PriorityState(holder_id=players[0]),
                              opening=tuple(OpeningState(player_id=p) for p in players))

    @classmethod
    def create_state(cls, player_ids: tuple[str, ...], decks: tuple[CardfightDeckSnapshot, CardfightDeckSnapshot],
                     profile: str, first_player_id: str, seed: bytes) -> CardfightState:
        state = cls.initial_state(player_ids)
        _digest(seed, "validation")
        if profile != "cardfight-manual-v1" or first_player_id not in state.players or len(decks) != 2:
            raise ValueError("unsupported Cardfight setup")
        versions = {snapshot.deck.catalog_version for snapshot in decks}
        if len(versions) != 1:
            raise ValueError("catalog versions must match")
        definitions: dict[int, CardfightCardDefinition] = {}
        cards: list[CardInstance] = []
        ride_instances: list[str] = []
        extra_instances: list[str] = []
        for player_id, snapshot in zip(state.players, decks, strict=True):
            # Revalidate snapshots so model_copy cannot bypass the trusted boundary.
            snapshot = CardfightDeckSnapshot.model_validate(snapshot.model_dump())
            deck = snapshot.deck
            lookup = {d.card_id: d for d in snapshot.definitions}
            if len(lookup) != len(snapshot.definitions) or any(d.catalog_version != deck.catalog_version for d in snapshot.definitions):
                raise ValueError("invalid mechanical catalog snapshot")
            submitted = deck.main + deck.ride + deck.extra + deck.tokens
            if any(card_id not in lookup for card_id in submitted):
                raise ValueError("missing card definition")
            if len(deck.main) != 50 or len(deck.ride) not in (0, 4) or len(deck.extra) > 16 or len(deck.tokens) > 30:
                raise ValueError("unsupported section counts")
            if deck.ride:
                if deck.starter_index is not None or tuple(lookup[i].grade for i in deck.ride) != (0, 1, 2, 3):
                    raise ValueError("unsupported ride deck")
            elif deck.starter_index is None or deck.starter_index >= 50 or lookup[deck.main[deck.starter_index]].grade != 0:
                raise ValueError("starter requires a known grade-zero main copy")
            if any(lookup[i].extra_deck != 1 for i in deck.extra):
                raise ValueError("unsupported extra-deck classification")
            if any(lookup[i].is_token for i in deck.main + deck.ride + deck.extra):
                raise ValueError("token cards must be submitted in the token section")
            if any(not lookup[i].is_token for i in deck.tokens):
                raise ValueError("unsupported token classification")
            for definition in snapshot.definitions:
                if definition.card_id in definitions and definitions[definition.card_id] != definition:
                    raise ValueError("conflicting mechanical definitions")
                definitions[definition.card_id] = definition
            for ordinal, card_id in enumerate(submitted):
                zone: Zone
                face: Literal["UP", "DOWN"] = "UP"
                if ordinal < 50:
                    zone = "VANGUARD" if not deck.ride and ordinal == deck.starter_index else "DECK"
                elif ordinal < 50 + len(deck.ride):
                    zone = "VANGUARD" if ordinal == 50 else "RIDE"
                    face = "DOWN"
                elif ordinal < 50 + len(deck.ride) + len(deck.extra):
                    zone, face = "G_ZONE", "DOWN"
                else:
                    zone, face = "TOKEN", "DOWN"
                instance_id = _digest(seed, "instance", "cardfight", "0", player_id, _decimal(ordinal)).hex()[:48]
                if 50 <= ordinal < 50 + len(deck.ride):
                    ride_instances.append(instance_id)
                elif 50 + len(deck.ride) <= ordinal < 50 + len(deck.ride) + len(deck.extra):
                    extra_instances.append(instance_id)
                cards.append(CardInstance(instance_id=instance_id, card_id=card_id, owner_id=player_id,
                                          controller_id=player_id, zone=zone, position=ordinal, face=face))
        state = state.model_copy(update={"configured": True, "profile_id": profile,
            "catalog_version": next(iter(versions)), "active_player_id": first_player_id,
            "priority": PriorityState(holder_id=first_player_id), "seed": seed,
            "ride_instances": tuple(ride_instances), "extra_instances": tuple(extra_instances),
            "cards": tuple(cards), "definitions": tuple(definitions[i] for i in sorted(definitions))})
        for player_id in state.players:
            for zone in ZONES:
                state = cls._zone_order(state, player_id, zone, tuple(c.instance_id for c in cls._zone(state, player_id, zone)))
            state = cls._shuffle(state, player_id)
            state = cls._draw(state, player_id, 5, "TOP")
        return state

    @staticmethod
    def _zone(state: CardfightState, player_id: str, zone: str) -> tuple[CardInstance, ...]:
        return tuple(sorted((c for c in state.cards if c.owner_id == player_id and c.zone == zone), key=lambda c: c.position))

    @staticmethod
    def _replace(state: CardfightState, updated: CardInstance) -> CardfightState:
        return state.model_copy(update={"cards": tuple(updated if c.instance_id == updated.instance_id else c for c in state.cards)})

    @staticmethod
    def _zone_order(state: CardfightState, player_id: str, zone: Zone, ids: tuple[str, ...]) -> CardfightState:
        positions = {instance_id: position for position, instance_id in enumerate(ids)}
        return state.model_copy(update={"cards": tuple(c.model_copy(update={"position": positions[c.instance_id]})
            if c.owner_id == player_id and c.zone == zone else c for c in state.cards)})

    @staticmethod
    def _public(card: CardInstance) -> bool:
        return card.zone not in ("DECK", "HAND", "TOKEN") and not (
            card.face == "DOWN" and card.zone in ("BIND", "G_ZONE", "RIDE", "VANGUARD"))

    @classmethod
    def _ref(cls, state: CardfightState, card: CardInstance, viewer: str) -> str:
        # Table slots share public refs; hands, token supplies and inspected decks are viewer-private.
        audience = "public" if card.zone not in ("DECK", "HAND", "TOKEN") else viewer
        return _digest(state.seed, "viewer-ref", "cardfight", _decimal(state.generation), audience,
                       card.instance_id, _decimal(card.visibility_epoch)).hex()[:48]

    @classmethod
    def _resolve(cls, state: CardfightState, actor: str, ref: str, *, foreign: bool = False) -> CardInstance:
        if not ref.isascii():
            _invalid()
        inspection_ids = {i for item in state.inspections if item.player_id == actor for i in item.instance_ids}
        for card in state.cards:
            owned = card.owner_id == actor and card.controller_id == actor
            accessible = (owned and (card.zone != "DECK" or card.instance_id in inspection_ids)) or (foreign and cls._public(card))
            if accessible and hmac.compare_digest(cls._ref(state, card, actor), ref):
                return card
        _invalid()
        raise AssertionError("unreachable")

    @classmethod
    def _relocate(cls, state: CardfightState, card: CardInstance, zone: Zone, *, position: int | None = None,
                  slot: str | None = None, parent_id: str | None = None) -> CardfightState:
        remaining = tuple(c.instance_id for c in cls._zone(state, card.owner_id, card.zone) if c.instance_id != card.instance_id)
        destination = [c.instance_id for c in cls._zone(state, card.owner_id, zone) if c.instance_id != card.instance_id]
        insert = len(destination) if position is None else position
        if insert > len(destination):
            _invalid()
        destination.insert(insert, card.instance_id)
        face: Literal["UP", "DOWN"] = "DOWN" if zone in ("G_ZONE", "RIDE") else "UP"
        updated = card.model_copy(update={"zone": zone, "position": insert, "slot": slot, "parent_id": parent_id,
            "face": face, "visibility_epoch": card.visibility_epoch + 1})
        state = cls._replace(state, updated)
        if card.zone != zone:
            state = cls._zone_order(state, card.owner_id, card.zone, remaining)
        state = cls._zone_order(state, card.owner_id, zone, tuple(destination))
        if zone == "DECK":
            state = cls._rotate_deck(state, card.owner_id)
        if zone == "VANGUARD":
            state = state.model_copy(update={"cards": tuple(c.model_copy(update={"parent_id": card.instance_id})
                if c.owner_id == card.owner_id and c.zone == "SOUL" else c for c in state.cards)})
        return state

    @staticmethod
    def _rotate_deck(state: CardfightState, player_id: str) -> CardfightState:
        return state.model_copy(update={"cards": tuple(c.model_copy(update={"visibility_epoch": c.visibility_epoch + 1})
            if c.owner_id == player_id and c.zone == "DECK" else c for c in state.cards),
            "inspections": tuple(i for i in state.inspections if i.player_id != player_id)})

    @classmethod
    def _shuffle(cls, state: CardfightState, player_id: str) -> CardfightState:
        index = state.players.index(player_id)
        ordinal = state.shuffle_ordinals[index]
        deck = cls._zone(state, player_id, "DECK")
        order = _shuffle_order(state.seed, state.generation, player_id, "DECK", ordinal, len(deck))
        state = cls._zone_order(state, player_id, "DECK", tuple(deck[i].instance_id for i in order))
        ordinals = list(state.shuffle_ordinals)
        ordinals[index] += 1
        _decimal(ordinals[index])
        return cls._rotate_deck(state, player_id).model_copy(update={"shuffle_ordinals": tuple(ordinals)})

    @classmethod
    def _draw(cls, state: CardfightState, actor: str, count: int, edge: str) -> CardfightState:
        deck = cls._zone(state, actor, "DECK")
        if len(deck) < count:
            _invalid()
        selected = deck[:count] if edge == "TOP" else tuple(reversed(deck[-count:]))
        for card in selected:
            state = cls._relocate(state, card, "HAND")
        return state

    @classmethod
    def apply_action(cls, state: CardfightState, player_id: str, action: CardfightAction) -> CardfightState:
        if player_id not in state.players:
            raise GameRuleError(MoveErrorCode.INVALID_PLAYER, "player is not a participant")
        if state.stage == "FINISHED":
            raise GameRuleError(MoveErrorCode.GAME_OVER, "game has finished")
        if not state.configured or action.expected_revision != state.revision:
            _invalid()  # Adapter maps revision mismatch to STALE_ACTION, without state details.
        # Validate copied model inputs as well as normal parsed action instances.
        action = CardfightAction.model_validate(action.model_dump(include=action.model_fields_set))
        kind = action.action_type
        if state.result is not None and kind not in ("CF_CONFIRM_RESULT", "CF_REJECT_RESULT", "CF_CONCEDE"):
            _invalid()
        if kind in ("CF_CONCEDE", "CF_PROPOSE_RESULT", "CF_CONFIRM_RESULT", "CF_REJECT_RESULT"):
            updated = cls._result_action(state, player_id, action)
        elif kind in ("CF_MULLIGAN", "CF_KEEP_HAND", "CF_READY_TO_PLAY"):
            updated = cls._opening_action(state, player_id, action)
        elif kind == "CF_CLOSE_INSPECTION":
            if not any(i.player_id == player_id and i.inspection_id == action.inspection_id for i in state.inspections):
                _invalid()
            updated = state.model_copy(update={"inspections": tuple(i for i in state.inspections if i.player_id != player_id)})
        else:
            if state.stage != "PLAYING":
                _invalid()
            if state.priority.holder_id != player_id:
                raise GameRuleError(MoveErrorCode.NOT_YOUR_TURN, "player does not hold priority")
            if state.priority.window == "CHECK" and kind != "CF_RESOLVE_CHECK":
                _invalid()
            updated = cls._table_action(state, player_id, action)
        # Search selections expire at every later revision; no stale references survive.
        if kind != "CF_INSPECT":
            deck_searchers = {i.player_id for i in state.inspections if i.zone == "DECK"}
            for actor in deck_searchers:
                updated = cls._rotate_deck(updated, actor)
            updated = updated.model_copy(update={"inspections": ()})
        history = state.history + (HistoryEntry(sequence=state.revision + 1, actor_id=player_id,
            action_type=kind, count=action.count if kind == "CF_DRAW" else None),)
        return updated.model_copy(update={"revision": state.revision + 1, "history": history[-200:]})

    @classmethod
    def _opening_action(cls, state: CardfightState, actor: str, action: CardfightAction) -> CardfightState:
        if state.stage != "OPENING":
            _invalid()
        status = next(i.status for i in state.opening if i.player_id == actor)
        if action.action_type == "CF_READY_TO_PLAY":
            if status != "KEPT":
                _invalid()
            next_status: Opening = "READY"
        else:
            if status != "PENDING":
                _invalid()
            next_status = "KEPT"
            if action.action_type == "CF_MULLIGAN":
                refs = _required(action.card_refs)
                if len(set(refs)) != len(refs):
                    _invalid()
                selected = tuple(cls._resolve(state, actor, ref) for ref in refs)
                if any(card.zone != "HAND" for card in selected):
                    _invalid()
                for card in selected:
                    state = cls._relocate(state, card, "DECK")
                state = cls._shuffle(state, actor)
                state = cls._draw(state, actor, len(selected), "TOP")
        opening = tuple(i.model_copy(update={"status": next_status}) if i.player_id == actor else i for i in state.opening)
        state = state.model_copy(update={"opening": opening})
        if all(i.status == "READY" for i in opening):
            state = state.model_copy(update={"stage": "PLAYING", "cards": tuple(c.model_copy(update={"face": "UP"})
                if c.zone == "VANGUARD" else c for c in state.cards)})
        return state

    @classmethod
    def _result_action(cls, state: CardfightState, actor: str, action: CardfightAction) -> CardfightState:
        if action.action_type == "CF_CONCEDE":
            winner = next(p for p in state.players if p != actor)
            return state.model_copy(update={"stage": "FINISHED", "result": None, "winner_id": winner,
                "game_over": GameOverResult(outcome="WIN", winner_id=winner, reason="CONCESSION")})
        if action.action_type == "CF_PROPOSE_RESULT":
            if (state.result is not None or (action.outcome == "WIN" and action.winner_id not in state.players)
                    or (action.outcome == "DRAW" and action.winner_id is not None)):
                _invalid()
            return state.model_copy(update={"result": ResultProposal(proposer_id=actor, proposal_revision=state.revision + 1,
                outcome=_required(action.outcome), winner_id=action.winner_id)})
        proposal = state.result
        if proposal is None or proposal.proposer_id == actor or proposal.proposal_revision != action.proposal_revision:
            _invalid()
        proposal = _required(proposal)
        if action.action_type == "CF_REJECT_RESULT":
            return state.model_copy(update={"result": None})
        return state.model_copy(update={"stage": "FINISHED", "result": None, "winner_id": proposal.winner_id,
            "game_over": GameOverResult(outcome=proposal.outcome, winner_id=proposal.winner_id, reason="AGREEMENT")})

    @classmethod
    def _table_action(cls, state: CardfightState, actor: str, action: CardfightAction) -> CardfightState:
        kind = action.action_type
        if kind in ("CF_NEXT_PHASE", "CF_END_TURN", "CF_OPEN_RESPONSE", "CF_PASS_RESPONSE", "CF_DECLARE_ATTACK"):
            return cls._flow_action(state, actor, action)
        if kind in ("CF_DRIVE_CHECK", "CF_DAMAGE_CHECK", "CF_RESOLVE_CHECK"):
            return cls._check_action(state, actor, action)
        if kind == "CF_DRAW":
            return cls._draw(state, actor, _required(action.count), _required(action.edge))
        if kind == "CF_SHUFFLE":
            return cls._shuffle(state, actor)
        if kind == "CF_INSPECT":
            zone = _required(action.zone)
            if zone not in INSPECTABLE:
                _invalid()
            # Replacement inspection invalidates any previous deck selection.
            if any(i.player_id == actor and i.zone == "DECK" for i in state.inspections):
                state = cls._rotate_deck(state, actor)
            cards = cls._zone(state, actor, zone)
            if action.count is not None:
                if action.count > len(cards):
                    _invalid()
                cards = cards[:action.count]
            ident = _digest(state.seed, "inspection", "cardfight", _decimal(state.generation), actor,
                            _decimal(state.revision + 1)).hex()[:48]
            inspection = Inspection(player_id=actor, inspection_id=ident, zone=zone,
                                    instance_ids=tuple(c.instance_id for c in cards))
            return state.model_copy(update={"inspections": tuple(i for i in state.inspections if i.player_id != actor) + (inspection,)})
        if kind == "CF_REORDER":
            inspection = next((i for i in state.inspections if i.player_id == actor and i.inspection_id == action.inspection_id), None)
            if inspection is None:
                _invalid()
            inspection = _required(inspection)
            refs = _required(action.ordered_refs)
            cards = tuple(cls._resolve(state, actor, ref) for ref in refs)
            if len(set(refs)) != len(refs) or {c.instance_id for c in cards} != set(inspection.instance_ids) or len(cards) != len(inspection.instance_ids):
                _invalid()
            zone_cards = cls._zone(state, actor, inspection.zone)
            selected = set(inspection.instance_ids)
            order = tuple(c.instance_id for c in cards) + tuple(c.instance_id for c in zone_cards if c.instance_id not in selected)
            return cls._zone_order(state, actor, inspection.zone, order)
        card = cls._resolve(state, actor, _required(action.card_ref))
        if kind == "CF_MOVE":
            return cls._move_action(state, actor, card, action)
        if kind == "CF_ORIENT":
            if card.zone not in FIELD:
                _invalid()
            return cls._replace(state, card.model_copy(update={"orientation": action.orientation}))
        if kind == "CF_SET_FACE":
            if card.zone not in ("DAMAGE", "BIND", "G_ZONE"):
                _invalid()
            return cls._replace(state, card.model_copy(update={"face": action.face}))
        if kind in ("CF_SET_MODIFIER", "CF_SET_COUNTER"):
            if card.zone not in FIELD or not cls._public(card):
                _invalid()
            if kind == "CF_SET_COUNTER":
                return cls._replace(state, card.model_copy(update={"counters": action.value}))
            if action.stat == "DEFENSE":
                _invalid()  # Buddyfight-only stat; no generic escape hatch.
            modifiers = card.modifiers.model_copy(update={_required(action.stat).lower(): action.value})
            return cls._replace(state, card.model_copy(update={"modifiers": modifiers}))
        _invalid()
        raise AssertionError("unreachable")

    @classmethod
    def _move_action(cls, state: CardfightState, actor: str, card: CardInstance, action: CardfightAction) -> CardfightState:
        destination = _required(action.to_zone)
        own_turn = actor == state.active_player_id and state.priority.window == "NONE"
        definition = next(d for d in state.definitions if d.card_id == card.card_id)
        if definition.is_token and destination in ("DECK", "RIDE", "G_ZONE"):
            _invalid()
        if card.zone == "TOKEN" and (not own_turn or state.phase != "MAIN" or destination not in ("HAND", "REAR")):
            _invalid()
        if destination == "DECK":
            if action.position is None:
                _invalid()
        elif action.position is not None:
            if action.position > len(cls._zone(state, actor, destination)):
                _invalid()
        if destination != "REAR" and action.slot is not None:
            _invalid()
        parent_id: str | None = None
        if destination == "SOUL":
            parent = cls._resolve(state, actor, _required(action.parent_ref))
            if parent.zone != "VANGUARD":
                _invalid()
            parent_id = parent.instance_id
        elif action.parent_ref is not None:
            _invalid()
        if card.zone == "CHECK":
            _invalid()
        if destination == "VANGUARD":
            if not own_turn or state.phase != "RIDE" or card.zone not in ("HAND", "RIDE") or cls._zone(state, actor, "VANGUARD"):
                _invalid()
        elif destination == "REAR":
            if (not own_turn or state.phase != "MAIN" or card.zone not in NONFIELD
                    or action.slot not in SLOTS or any(c.slot == action.slot for c in cls._zone(state, actor, "REAR"))):
                _invalid()
        elif destination == "GUARDIAN":
            if state.phase != "BATTLE" or card.zone != "HAND":
                _invalid()
        elif destination in ("G_ZONE", "RIDE"):
            definition = next(d for d in state.definitions if d.card_id == card.card_id)
            # Return only physical copies submitted in the appropriate section.
            eligible = cls._section_member(state, card, destination)
            if card.zone not in NONFIELD or not eligible or (destination == "G_ZONE" and definition.extra_deck != 1):
                _invalid()
        elif destination in ("HAND", "DECK", "DROP", "SOUL", "BIND", "REMOVED"):
            if card.zone == "DAMAGE":
                if destination not in ("DROP", "SOUL"):
                    _invalid()
            elif card.zone in FIELD:
                if destination not in ("DROP", "SOUL", "BIND", "REMOVED"):
                    _invalid()
            elif card.zone not in NONFIELD:
                _invalid()
        else:
            _invalid()
        return cls._relocate(state, card, destination, position=action.position, slot=action.slot, parent_id=parent_id)

    @staticmethod
    def _section_member(state: CardfightState, card: CardInstance, destination: Zone) -> bool:
        return (destination == "RIDE" and card.instance_id in state.ride_instances) or (
            destination == "G_ZONE" and card.instance_id in state.extra_instances)

    @classmethod
    def _flow_action(cls, state: CardfightState, actor: str, action: CardfightAction) -> CardfightState:
        kind = action.action_type
        if kind == "CF_PASS_RESPONSE":
            if state.priority.window != "RESPONSE" or actor == state.active_player_id:
                _invalid()
            return state.model_copy(update={"priority": PriorityState(holder_id=state.active_player_id)})
        if actor != state.active_player_id or state.priority.window != "NONE":
            _invalid()
        if kind == "CF_NEXT_PHASE":
            phases: tuple[Phase, ...] = ("RIDE", "MAIN", "BATTLE", "END")
            if state.phase == "END":
                _invalid()
            return state.model_copy(update={"phase": phases[phases.index(state.phase) + 1]})
        if kind == "CF_END_TURN":
            if state.phase != "END":
                _invalid()
            opponent = next(p for p in state.players if p != actor)
            return state.model_copy(update={"active_player_id": opponent, "priority": PriorityState(holder_id=opponent),
                "phase": "RIDE", "turn": state.turn + 1})
        attack: AttackDeclaration | None = None
        if kind == "CF_DECLARE_ATTACK":
            attacker = cls._resolve(state, actor, _required(action.attacker_ref))
            if state.phase != "BATTLE" or attacker.zone not in ("VANGUARD", "REAR") or attacker.orientation != "STAND":
                _invalid()
            if (action.target_ref is None) == (action.target_player_id is None):
                _invalid()
            opponent = next(p for p in state.players if p != actor)
            if action.target_ref is not None:
                target = cls._resolve(state, actor, action.target_ref, foreign=True)
                if target.owner_id != opponent or target.zone not in ("VANGUARD", "REAR") or not cls._public(target):
                    _invalid()
            elif action.target_player_id != opponent:
                _invalid()
            attack = AttackDeclaration(attacker_ref=_required(action.attacker_ref), target_ref=action.target_ref,
                                       target_player_id=action.target_player_id)
            state = cls._replace(state, attacker.model_copy(update={"orientation": "REST"}))
        opponent = next(p for p in state.players if p != actor)
        return state.model_copy(update={"priority": PriorityState(holder_id=opponent, window="RESPONSE",
            return_to_id=actor, pending_attack=attack)})

    @classmethod
    def _check_action(cls, state: CardfightState, actor: str, action: CardfightAction) -> CardfightState:
        if action.action_type == "CF_RESOLVE_CHECK":
            check = state.priority.pending_check
            if state.priority.window != "CHECK" or check is None or check.checker_id != actor:
                _invalid()
            check = _required(check)
            card = next(c for c in state.cards if c.instance_id == check.instance_id)
            definition = next(d for d in state.definitions if d.card_id == card.card_id)
            destination: Zone = "REMOVED" if definition.trigger_type == 6 else ("HAND" if check.kind == "DRIVE" else "DAMAGE")
            state = cls._relocate(state, card, destination)
            return state.model_copy(update={"priority": state.priority.model_copy(update={"holder_id": check.previous_holder_id,
                "window": check.previous_window, "pending_check": None})})
        drive = action.action_type == "CF_DRIVE_CHECK"
        if state.phase != "BATTLE" or state.priority.window == "CHECK":
            _invalid()
        if drive:
            if actor != state.active_player_id or state.priority.window != "NONE":
                _invalid()
        elif actor == state.active_player_id or state.priority.window != "RESPONSE":
            _invalid()
        deck = cls._zone(state, actor, "DECK")
        if not deck:
            _invalid()
        card = deck[0]
        previous = state.priority
        state = cls._relocate(state, card, "CHECK")
        check = CheckState(checker_id=actor, kind="DRIVE" if drive else "DAMAGE", instance_id=card.instance_id,
            previous_holder_id=previous.holder_id, previous_window=cast(Literal["NONE", "RESPONSE"], previous.window))
        return state.model_copy(update={"priority": previous.model_copy(update={"window": "CHECK", "pending_check": check})})

    @classmethod
    def _visible(cls, state: CardfightState, card: CardInstance, viewer: str) -> VisibleCard:
        return VisibleCard(ref=cls._ref(state, card, viewer), card_id=card.card_id, orientation=card.orientation,
            face=card.face, slot=card.slot, position=card.position, modifiers=card.modifiers, counters=card.counters)

    @classmethod
    def get_player_view(cls, state: CardfightState, player_id: str) -> CardfightView:
        tables: list[PublicPlayerTable] = []
        for owner in state.players:
            zones: list[ZoneView] = []
            for zone in ZONES:
                cards = cls._zone(state, owner, zone)
                visible: list[VisibleCard | ConcealedCard] = []
                if zone not in ("HAND", "DECK"):
                    for card in cards:
                        if cls._public(card):
                            visible.append(cls._visible(state, card, "public"))
                        else:
                            visible.append(ConcealedCard(ref=cls._ref(state, card, "public"),
                                orientation=card.orientation, slot=card.slot, position=card.position))
                            if zone == "TOKEN" and owner == player_id:
                                visible[-1] = ConcealedCard(ref=cls._ref(state, card, player_id),
                                    orientation=card.orientation, slot=card.slot, position=card.position)
                zones.append(ZoneView(zone=zone, count=len(cards), cards=tuple(visible)))
            tables.append(PublicPlayerTable(player_id=owner, hand_count=len(cls._zone(state, owner, "HAND")),
                deck_count=len(cls._zone(state, owner, "DECK")), zones=tuple(zones)))
        private: PrivatePlayerTable | None = None
        if player_id in state.players:
            inspection = next((i for i in state.inspections if i.player_id == player_id), None)
            inspection_view: InspectionView | None = None
            if inspection is not None:
                lookup = {c.instance_id: c for c in state.cards}
                inspection_view = InspectionView(inspection_id=inspection.inspection_id, zone=inspection.zone,
                    cards=tuple(cls._visible(state, lookup[i], player_id) for i in inspection.instance_ids),
                    reorder_allowed=state.stage == "PLAYING" and state.result is None and state.priority.holder_id == player_id
                        and state.priority.window != "CHECK")
            private = PrivatePlayerTable(hand=tuple(cls._visible(state, c, player_id) for c in cls._zone(state, player_id, "HAND")),
                opening_status=next(i.status for i in state.opening if i.player_id == player_id), inspection=inspection_view,
                concealed_zone_cards=tuple(cls._visible(state, c, player_id) for c in state.cards
                    if c.owner_id == player_id and c.zone not in ("DECK", "HAND") and not cls._public(c)))
        return CardfightView(stage=state.stage, profile_id=state.profile_id, revision=state.revision, turn=state.turn,
            phase=state.phase, active_player_id=state.active_player_id, priority_holder_id=state.priority.holder_id,
            response_window=state.priority.window, players=cast(tuple[PublicPlayerTable, PublicPlayerTable], tuple(tables)),
            self=private, pending_result=state.result, result=state.game_over, history=state.history,
            legal_actions=cls._legal_actions(state, player_id))

    @classmethod
    def _legal_actions(cls, state: CardfightState, actor: str) -> tuple[ActionDescriptor, ...]:
        if actor not in state.players or not state.configured or state.stage == "FINISHED":
            return ()
        kinds: list[ActionType] = ["CF_CONCEDE"]
        if state.result is not None:
            if state.result.proposer_id != actor:
                kinds += ["CF_CONFIRM_RESULT", "CF_REJECT_RESULT"]
            return tuple(ActionDescriptor(action_type=k) for k in kinds)
        kinds.append("CF_PROPOSE_RESULT")
        if state.stage == "OPENING":
            status = next(i.status for i in state.opening if i.player_id == actor)
            if status == "PENDING":
                kinds += ["CF_MULLIGAN", "CF_KEEP_HAND"]
            elif status == "KEPT":
                kinds.append("CF_READY_TO_PLAY")
            return tuple(ActionDescriptor(action_type=k) for k in kinds)
        if any(i.player_id == actor for i in state.inspections):
            kinds.append("CF_CLOSE_INSPECTION")
        if state.priority.holder_id != actor:
            return tuple(ActionDescriptor(action_type=k) for k in kinds)
        if state.priority.window == "CHECK":
            kinds.append("CF_RESOLVE_CHECK")
            return tuple(ActionDescriptor(action_type=k) for k in kinds)
        kinds += ["CF_SHUFFLE", "CF_INSPECT"]
        if cls._zone(state, actor, "DECK"):
            kinds.append("CF_DRAW")
        if any(i.player_id == actor and i.instance_ids for i in state.inspections):
            kinds.append("CF_REORDER")
        if any(c.owner_id == actor and c.zone != "CHECK" for c in state.cards):
            kinds.append("CF_MOVE")
        if any(c.owner_id == actor and c.zone in FIELD for c in state.cards):
            kinds += ["CF_ORIENT", "CF_SET_MODIFIER", "CF_SET_COUNTER"]
        if any(c.owner_id == actor and c.zone in ("DAMAGE", "BIND", "G_ZONE") for c in state.cards):
            kinds.append("CF_SET_FACE")
        if state.priority.window == "RESPONSE":
            kinds.append("CF_PASS_RESPONSE")
            if state.phase == "BATTLE" and cls._zone(state, actor, "DECK"):
                kinds.append("CF_DAMAGE_CHECK")
        else:
            kinds += ["CF_OPEN_RESPONSE", "CF_END_TURN" if state.phase == "END" else "CF_NEXT_PHASE"]
            if state.phase == "BATTLE":
                if cls._zone(state, actor, "DECK"):
                    kinds.append("CF_DRIVE_CHECK")
                if any(c.owner_id == actor and c.zone in ("VANGUARD", "REAR") and c.orientation == "STAND" for c in state.cards):
                    kinds.append("CF_DECLARE_ATTACK")
        return tuple(ActionDescriptor(action_type=k) for k in kinds)
