"""Approved assisted profile: behavioral, deterministic and privacy regressions."""

from __future__ import annotations

from collections import Counter

import pytest
from pydantic import ValidationError

from app.engine.base import GameRuleError, MoveErrorCode
from app.engine.games.cardfight import (
    CardfightCardDefinition, CardfightAction, CardfightDeckDefinition, CardfightDeckSnapshot,
    CardfightEngine as Engine, CardfightState,
    _digest, _encode, _shuffle_order,
)


def snapshot(*, ride: bool = False, extra: bool = False, tokens: bool = False) -> CardfightDeckSnapshot:
    definitions = tuple(
        CardfightCardDefinition(card_id=i, catalog_version="fixture-v1", grade=(i - 1) % 4,
                               extra_deck=1 if i == 60 else 0, trigger_type=6 if i == 50 else None,
                               is_token=i in (61, 62))
        for i in (*range(1, 51), 60, 61, 62)
    )
    return CardfightDeckSnapshot(
        deck=CardfightDeckDefinition(catalog_version="fixture-v1", name="Fixture",
                                    main=tuple(range(1, 51)),
                                    ride=(1, 2, 3, 4) if ride else (),
                                    extra=(60,) if extra else (), tokens=(61,) if tokens else (), starter_index=None if ride else 0),
        definitions=definitions,
    )


def setup(*, ride: bool = False, extra: bool = False) -> CardfightState:
    return Engine.create_state(("alice", "bob"), (snapshot(ride=ride, extra=extra), snapshot()),
                               "cardfight-manual-v1", "alice", bytes(range(32)))


def test_token_section_is_a_private_supply_not_a_draw_or_g_zone() -> None:
    state = Engine.create_state(("alice", "bob"), (snapshot(tokens=True), snapshot()),
                                "cardfight-manual-v1", "alice", bytes(range(32)))
    owned_tokens = [card for card in state.cards if card.owner_id == "alice" and card.card_id == 61]
    assert len(owned_tokens) == 1 and owned_tokens[0].zone == "TOKEN"
    assert len([card for card in state.cards if card.owner_id == "alice" and card.zone == "DECK"]) == 44
    bob_view = Engine.get_player_view(state, "bob")
    bob_supply = next(zone for player in bob_view.players if player.player_id == "alice" for zone in player.zones if zone.zone == "TOKEN")
    assert bob_supply.count == 1 and bob_supply.cards[0].face == "DOWN"
    assert not hasattr(bob_supply.cards[0], "card_id")
    alice_view = Engine.get_player_view(state, "alice")
    alice_supply = next(zone for player in alice_view.players if player.player_id == "alice" for zone in player.zones if zone.zone == "TOKEN")
    assert not hasattr(alice_supply.cards[0], "card_id")
    assert alice_supply.cards[0].ref != bob_supply.cards[0].ref
    assert alice_view.self is not None
    private_token = next(card for card in alice_view.self.concealed_zone_cards if card.card_id == 61)
    assert private_token.ref == alice_supply.cards[0].ref
    assert not any(card.owner_id == "alice" and card.card_id == 61 and card.zone in ("DECK", "HAND") for card in state.cards)
    for who in ("alice", "bob"):
        state = act(state, who, "CF_KEEP_HAND")
        state = act(state, who, "CF_READY_TO_PLAY")
    state = act(state, "alice", "CF_NEXT_PHASE")
    state = inspect(state, "alice", "TOKEN")
    token_ref = inspection_refs(state, "alice")[0]
    state = move(state, "alice", token_ref, "HAND")
    assert sum(card.zone == "HAND" and card.card_id == 61 for card in state.cards) == 1
    reject(state, "alice", "CF_MOVE", card_ref=visible(state, "alice", "HAND")[-1], to_zone="DECK", slot=None, position=0, parent_ref=None)


def test_token_supply_can_call_to_rear_only_during_main_phase() -> None:
    state = Engine.create_state(("alice", "bob"), (snapshot(tokens=True), snapshot()),
                                "cardfight-manual-v1", "alice", bytes(range(32)))
    token_id = next(card.instance_id for card in state.cards if card.owner_id == "alice" and card.zone == "TOKEN")
    private_ref = next(card.ref for card in Engine.get_player_view(state, "alice").self.concealed_zone_cards if card.card_id == 61)
    reject(state, "alice", "CF_MOVE", card_ref=private_ref, to_zone="REAR", slot="front-left", position=None, parent_ref=None)
    for who in ("alice", "bob"):
        state = act(state, who, "CF_KEEP_HAND")
        state = act(state, who, "CF_READY_TO_PLAY")
    state = act(state, "alice", "CF_NEXT_PHASE")
    state = move(state, "alice", private_ref, "REAR", slot="front-left")
    token = next(card for card in state.cards if card.instance_id == token_id)
    assert token.zone == "REAR" and token.slot == "front-left"
    bob_view = Engine.get_player_view(state, "bob")
    public_call = next(card for player in bob_view.players if player.player_id == "alice" for zone in player.zones
                       if zone.zone == "REAR" for card in zone.cards)
    assert public_call.card_id == 61


def test_token_ids_must_use_the_token_section() -> None:
    original = snapshot(tokens=True)
    invalid_decks = [
        original.deck.model_copy(update={"main": (61,) + original.deck.main[1:], "tokens": ()}),
        original.deck.model_copy(update={"ride": (61, 2, 3, 4), "tokens": (), "starter_index": None}),
    ]
    for invalid_deck in invalid_decks:
        invalid_snapshot = original.model_copy(update={"deck": invalid_deck})
        with pytest.raises(ValueError, match="token cards must be submitted"):
            Engine.create_state(("alice", "bob"), (invalid_snapshot, snapshot()),
                                "cardfight-manual-v1", "alice", bytes(range(32)))
    definitions = tuple(
        definition.model_copy(update={"extra_deck": 1}) if definition.card_id == 61 else definition
        for definition in original.definitions
    )
    invalid_extra = original.model_copy(update={"definitions": definitions,
        "deck": original.deck.model_copy(update={"extra": (61,), "tokens": ()})})
    with pytest.raises(ValueError, match="token cards must be submitted"):
        Engine.create_state(("alice", "bob"), (invalid_extra, snapshot()),
                            "cardfight-manual-v1", "alice", bytes(range(32)))


def test_token_section_rejects_non_tokens_and_caps_at_thirty() -> None:
    base = snapshot().deck
    with pytest.raises(ValidationError):
        CardfightDeckDefinition.model_validate({**base.model_dump(), "tokens": (1,) * 31})
    invalid = snapshot().model_copy(update={"deck": base.model_copy(update={"tokens": (2,)})})
    with pytest.raises(ValueError, match="unsupported token classification"):
        Engine.create_state(("alice", "bob"), (invalid, snapshot()),
                            "cardfight-manual-v1", "alice", bytes(range(32)))
    accepted = snapshot().model_copy(update={"deck": base.model_copy(update={"tokens": (61,) * 30})})
    state = Engine.create_state(("alice", "bob"), (accepted, snapshot()),
                                "cardfight-manual-v1", "alice", bytes(range(32)))
    token_ids = [card.card_id for card in state.cards if card.owner_id == "alice" and card.zone == "TOKEN"]
    assert token_ids == [61] * 30


def test_token_section_preserves_copy_order_and_duplicates() -> None:
    base = snapshot(tokens=True)
    deck = base.deck.model_copy(update={"tokens": (62, 61, 62)})
    token_snapshot = base.model_copy(update={"deck": deck})
    state = Engine.create_state(("alice", "bob"), (token_snapshot, snapshot()),
                                "cardfight-manual-v1", "alice", bytes(range(32)))
    tokens = [card for card in state.cards if card.owner_id == "alice" and card.zone == "TOKEN"]
    assert [card.card_id for card in tokens] == [62, 61, 62]
    assert len({card.instance_id for card in tokens}) == 3


def act(state: CardfightState, who: str, kind: str, **payload: object) -> CardfightState:
    return Engine.apply_action(state, who, CardfightAction.model_validate(
        {"action_type": kind, "expected_revision": state.revision, **payload}))


def playable(**options: bool) -> CardfightState:
    state = setup(**options)
    for who in ("alice", "bob"):
        state = act(state, who, "CF_KEEP_HAND")
        state = act(state, who, "CF_READY_TO_PLAY")
    return state


def visible(state: CardfightState, who: str, zone: str) -> list[str]:
    view = Engine.get_player_view(state, who)
    if zone == "HAND":
        assert view.self is not None
        return [c.ref for c in view.self.hand]
    return [c.ref for p in view.players if p.player_id == who for z in p.zones
            if z.zone == zone for c in z.cards]


def inspect(state: CardfightState, who: str, zone: str, count: int | None = None) -> CardfightState:
    return act(state, who, "CF_INSPECT", zone=zone, count=count)


def inspection_refs(state: CardfightState, who: str) -> tuple[str, ...]:
    private = Engine.get_player_view(state, who).self
    assert private is not None and private.inspection is not None
    return tuple(card.ref for card in private.inspection.cards)


def move(state: CardfightState, who: str, ref: str, zone: str,
         *, slot: str | None = None, position: int | None = None,
         parent: str | None = None) -> CardfightState:
    return act(state, who, "CF_MOVE", card_ref=ref, to_zone=zone,
               slot=slot, position=position, parent_ref=parent)


def reject(state: CardfightState, who: str, kind: str,
           code: MoveErrorCode = MoveErrorCode.INVALID_ACTION, **payload: object) -> None:
    before = state.model_dump_json()
    with pytest.raises(GameRuleError) as exc:
        act(state, who, kind, **payload)
    assert exc.value.code == code
    assert state.model_dump_json() == before


def test_unconfigured_contract_cannot_start_with_default_deck() -> None:
    state = Engine.initial_state(("alice", "bob"))
    reject(state, "alice", "CF_KEEP_HAND")
    with pytest.raises(ValueError):
        Engine.initial_state(("alice", "alice"))


def test_setup_deals_distinct_physical_copies_and_hides_ride_starter() -> None:
    state = setup(ride=True, extra=True)
    counts = Counter((c.owner_id, c.zone) for c in state.cards)
    assert counts[("alice", "DECK")] == 45
    assert counts[("alice", "HAND")] == 5
    assert counts[("alice", "RIDE")] == 3
    assert counts[("bob", "DECK")] == 44
    assert len({c.instance_id for c in state.cards}) == 105
    assert Engine.get_player_view(state, "spectator").self is None
    starter = [c for p in Engine.get_player_view(state, "bob").players
               if p.player_id == "alice" for z in p.zones if z.zone == "VANGUARD" for c in z.cards][0]
    assert not hasattr(starter, "card_id")
    started = playable(ride=True)
    assert started.stage == "PLAYING" and started.phase == "RIDE" and started.turn == 1
    assert [c for c in started.cards if c.zone == "VANGUARD"][0].face == "UP"


@pytest.mark.parametrize("change", [
    {"main": tuple(range(1, 50))}, {"starter_index": 1}, {"ride": (1, 3, 2, 4), "starter_index": None},
    {"extra": (2,)}, {"main": tuple(range(1, 50)) + (99,)},
])
def test_setup_rejects_invalid_profile_sections(change: dict[str, object]) -> None:
    snap = snapshot()
    invalid = snap.model_copy(update={"deck": snap.deck.model_copy(update=change)})
    with pytest.raises(ValueError):
        Engine.create_state(("alice", "bob"), (invalid, snapshot()),
                            "cardfight-manual-v1", "alice", bytes(32))


def test_opening_mulligan_is_once_private_and_immutable() -> None:
    original = setup()
    before = original.model_dump_json()
    refs = visible(original, "alice", "HAND")
    reject(original, "alice", "CF_MULLIGAN", card_refs=(refs[0], refs[0]))
    reject(original, "alice", "CF_READY_TO_PLAY")
    state = act(original, "alice", "CF_MULLIGAN", card_refs=tuple(refs[:3]))
    assert len(visible(state, "alice", "HAND")) == 5
    assert original.model_dump_json() == before
    reject(state, "alice", "CF_MULLIGAN", card_refs=())
    reject(state, "alice", "CF_KEEP_HAND")
    state = act(state, "alice", "CF_READY_TO_PLAY")
    reject(state, "alice", "CF_READY_TO_PLAY")
    reject(state, "alice", "CF_DRAW", count=1, edge="TOP")
    assert len(state.cards) == len(original.cards)


def test_phase_sequence_priority_and_no_implicit_turn_helpers() -> None:
    state = playable()
    reject(state, "bob", "CF_NEXT_PHASE", MoveErrorCode.NOT_YOUR_TURN)
    reject(state, "alice", "CF_END_TURN")
    hand = visible(state, "alice", "HAND")
    for phase in ("MAIN", "BATTLE", "END"):
        state = act(state, "alice", "CF_NEXT_PHASE")
        assert state.phase == phase
    reject(state, "alice", "CF_NEXT_PHASE")
    state = act(state, "alice", "CF_END_TURN")
    assert (state.active_player_id, state.priority.holder_id, state.turn, state.phase) == ("bob", "bob", 2, "RIDE")
    assert visible(state, "alice", "HAND") == hand


def test_draw_top_bottom_empty_deck_and_card_conservation() -> None:
    state = playable()
    original = Counter(c.card_id for c in state.cards)
    deck = sorted((c for c in state.cards if c.owner_id == "alice" and c.zone == "DECK"), key=lambda c: c.position)
    state = act(state, "alice", "CF_DRAW", count=1, edge="TOP")
    assert Engine.get_player_view(state, "alice").self.hand[-1].card_id == deck[0].card_id
    state = act(state, "alice", "CF_DRAW", count=1, edge="BOTTOM")
    assert Engine.get_player_view(state, "alice").self.hand[-1].card_id == deck[-1].card_id
    state = act(state, "alice", "CF_DRAW", count=42, edge="TOP")
    reject(state, "alice", "CF_DRAW", count=1, edge="TOP")
    assert state.stage == "PLAYING" and Counter(c.card_id for c in state.cards) == original


def test_ride_requires_empty_vanguard_and_soul_has_explicit_parent() -> None:
    state = playable(ride=True)
    state = inspect(state, "alice", "RIDE")
    ride_ref = inspection_refs(state, "alice")[0]
    reject(state, "alice", "CF_MOVE", card_ref=ride_ref, to_zone="VANGUARD", slot=None, position=None, parent_ref=None)
    vanguard = visible(state, "alice", "VANGUARD")[0]
    state = move(state, "alice", vanguard, "SOUL", parent=vanguard)
    state = inspect(state, "alice", "RIDE")
    state = move(state, "alice", inspection_refs(state, "alice")[0], "VANGUARD")
    assert len(visible(state, "alice", "SOUL")) == 1
    assert len(visible(state, "alice", "VANGUARD")) == 1


def test_calls_guard_responses_attack_and_ownership() -> None:
    state = act(playable(), "alice", "CF_NEXT_PHASE")
    state = move(state, "alice", visible(state, "alice", "HAND")[0], "REAR", slot="front-left")
    ref = visible(state, "alice", "REAR")[0]
    reject(state, "alice", "CF_MOVE", card_ref=visible(state, "alice", "HAND")[0], to_zone="REAR", slot="front-left", position=None, parent_ref=None)
    reject(state, "bob", "CF_ORIENT", MoveErrorCode.NOT_YOUR_TURN, card_ref=ref, orientation="REST")
    state = act(state, "alice", "CF_NEXT_PHASE")
    state = act(state, "alice", "CF_DECLARE_ATTACK", attacker_ref=ref, target_ref=None, target_player_id="bob")
    assert state.priority.holder_id == "bob" and state.priority.window == "RESPONSE"
    reject(state, "alice", "CF_NEXT_PHASE", MoveErrorCode.NOT_YOUR_TURN)
    reject(state, "bob", "CF_ORIENT", card_ref=ref, orientation="STAND")
    state = move(state, "bob", visible(state, "bob", "HAND")[0], "GUARDIAN")
    state = move(state, "bob", visible(state, "bob", "GUARDIAN")[0], "DROP")
    state = act(state, "bob", "CF_PASS_RESPONSE")
    assert state.priority.holder_id == "alice" and state.priority.window == "NONE"
    reject(state, "alice", "CF_DECLARE_ATTACK", attacker_ref=ref, target_ref=None, target_player_id="bob")


def test_public_modifiers_counter_face_and_manual_soul_operations() -> None:
    state = playable(extra=True)
    ref = visible(state, "alice", "VANGUARD")[0]
    state = act(state, "alice", "CF_ORIENT", card_ref=ref, orientation="REST")
    state = act(state, "alice", "CF_ORIENT", card_ref=ref, orientation="STAND")
    state = act(state, "alice", "CF_SET_MODIFIER", card_ref=ref, stat="POWER", value=10000)
    state = act(state, "alice", "CF_SET_COUNTER", card_ref=ref, value=2)
    reject(state, "alice", "CF_SET_FACE", card_ref=ref, face="DOWN")
    reject(state, "alice", "CF_SET_MODIFIER", card_ref=ref, stat="DEFENSE", value=1)
    state = inspect(state, "alice", "DECK", 1)
    state = move(state, "alice", inspection_refs(state, "alice")[0], "SOUL", parent=ref)
    state = move(state, "alice", visible(state, "alice", "SOUL")[0], "DROP")
    state = move(state, "alice", visible(state, "alice", "DROP")[0], "BIND")
    bound = visible(state, "alice", "BIND")[0]
    state = act(state, "alice", "CF_SET_FACE", card_ref=bound, face="DOWN")
    assert Engine.get_player_view(state, "alice").self.concealed_zone_cards
    other = Engine.get_player_view(state, "bob")
    assert all(not hasattr(c, "card_id") for p in other.players if p.player_id == "alice"
               for z in p.zones if z.zone == "BIND" for c in z.cards)
    state = move(state, "alice", bound, "REMOVED")
    card = next(c for c in state.cards if c.zone == "VANGUARD" and c.owner_id == "alice")
    assert card.modifiers.power == 10000 and card.counters == 2


@pytest.mark.parametrize("kind,checker,destination", [("CF_DRIVE_CHECK", "alice", "HAND"), ("CF_DAMAGE_CHECK", "bob", "DAMAGE")])
def test_check_reveal_resolve_and_priority_restore(kind: str, checker: str, destination: str) -> None:
    state = act(act(playable(), "alice", "CF_NEXT_PHASE"), "alice", "CF_NEXT_PHASE")
    if checker == "bob":
        state = act(state, "alice", "CF_OPEN_RESPONSE")
    state = act(state, checker, kind)
    assert state.priority.window == "CHECK"
    assert len(visible(state, checker, "CHECK")) == 1
    reject(state, checker, "CF_DRAW", count=1, edge="TOP")
    state = act(state, checker, "CF_RESOLVE_CHECK")
    assert state.priority.window == ("RESPONSE" if checker == "bob" else "NONE")
    assert len(visible(state, checker, destination)) == (6 if destination == "HAND" else 1)
    if destination == "DAMAGE":
        ref = visible(state, "bob", "DAMAGE")[0]
        state = act(state, "bob", "CF_SET_FACE", card_ref=ref, face="DOWN")
        state = move(state, "bob", ref, "DROP")
        assert len(visible(state, "bob", "DROP")) == 1


def test_inspection_shuffle_reorder_rotate_refs_and_never_leak_secrets() -> None:
    state = inspect(playable(extra=True), "alice", "DECK", 3)
    old = inspection_refs(state, "alice")
    private = Engine.get_player_view(state, "alice").self
    assert private is not None and private.inspection is not None
    ident = private.inspection.inspection_id
    reject(state, "alice", "CF_REORDER", inspection_id=ident, ordered_refs=(old[0], old[0], old[2]))
    state = act(state, "alice", "CF_REORDER", inspection_id=ident, ordered_refs=tuple(reversed(old)))
    assert Engine.get_player_view(state, "alice").self.inspection is None
    reject(state, "alice", "CF_MOVE", card_ref=old[0], to_zone="HAND", slot=None, position=None, parent_ref=None)
    state = inspect(state, "alice", "DECK")
    pre_shuffle = inspection_refs(state, "alice")
    state = act(state, "alice", "CF_SHUFFLE", zone="DECK")
    assert Engine.get_player_view(state, "alice").self.inspection is None
    state = inspect(state, "alice", "DECK")
    assert set(pre_shuffle).isdisjoint(inspection_refs(state, "alice"))
    for who in ("bob", "spectator"):
        view = Engine.get_player_view(state, who)
        serialized = view.model_dump_json()
        assert all(ref not in serialized for ref in inspection_refs(state, "alice"))
        assert "instance_id" not in serialized and "seed" not in serialized
        assert "definitions" not in serialized and "catalog_version" not in serialized
        assert view.self is None or view.self.inspection is None
        public = next(p for p in view.players if p.player_id == "alice")
        assert public.hand_count == 5 and public.deck_count == 44
        assert all(not z.cards for z in public.zones if z.zone in {"HAND", "DECK"})
    assert Engine.get_player_view(state, "alice").players == Engine.get_player_view(state, "spectator").players


def test_private_ref_reentry_and_canonical_id_guess_are_rejected() -> None:
    state = playable()
    old = visible(state, "alice", "HAND")[0]
    state = move(state, "alice", old, "DECK", position=0)
    state = act(state, "alice", "CF_DRAW", count=1, edge="TOP")
    assert old not in visible(state, "alice", "HAND")
    canonical = next(c.instance_id for c in state.cards if c.owner_id == "alice" and c.zone == "HAND")
    reject(state, "alice", "CF_MOVE", card_ref=canonical, to_zone="DROP", slot=None, position=None, parent_ref=None)
    reject(state, "spectator", "CF_CONCEDE", MoveErrorCode.INVALID_PLAYER)


def test_result_freezes_moves_requires_other_confirmation_and_preserves_privacy() -> None:
    state = playable()
    proposed = act(state, "bob", "CF_PROPOSE_RESULT", outcome="WIN", winner_id="alice")
    assert proposed.result is not None
    revision = proposed.result.proposal_revision
    reject(proposed, "alice", "CF_DRAW", count=1, edge="TOP")
    reject(proposed, "bob", "CF_CONFIRM_RESULT", proposal_revision=revision)
    reject(proposed, "alice", "CF_CONFIRM_RESULT", proposal_revision=revision + 1)
    state = act(proposed, "alice", "CF_REJECT_RESULT", proposal_revision=revision)
    assert state.priority == proposed.priority and state.result is None
    state = act(state, "bob", "CF_PROPOSE_RESULT", outcome="DRAW", winner_id=None)
    assert state.result is not None
    state = act(state, "alice", "CF_CONFIRM_RESULT", proposal_revision=state.result.proposal_revision)
    assert state.stage == "FINISHED" and Engine.get_player_view(state, "spectator").result.outcome == "DRAW"
    reject(state, "alice", "CF_CONCEDE", MoveErrorCode.GAME_OVER)
    assert Engine.get_player_view(state, "spectator").self is None
    assert Engine.get_player_view(state, "alice").legal_actions == ()
    assert act(setup(), "bob", "CF_CONCEDE").winner_id == "alice"


def test_fixed_seed_sequence_determinism_stale_rejection_and_strict_payloads() -> None:
    first = playable()
    second = playable()
    for kind, payload in (("CF_SHUFFLE", {"zone": "DECK"}), ("CF_DRAW", {"count": 2, "edge": "TOP"})):
        first = act(first, "alice", kind, **payload)
        second = act(second, "alice", kind, **payload)
    assert first == second
    with pytest.raises(GameRuleError):
        Engine.apply_action(first, "alice", CardfightAction.model_validate(
            {"action_type": "CF_DRAW", "expected_revision": 0, "count": 1, "edge": "TOP"}))
    for payload in ({"count": True, "edge": "TOP"}, {"count": 1.0, "edge": "TOP"},
                    {"count": 1, "edge": "TOP", "extra": 1}, {"count": 1}):
        with pytest.raises(ValidationError):
            CardfightAction.model_validate({"action_type": "CF_DRAW", "expected_revision": 0, **payload})


def test_independently_reviewed_hmac_encoding_and_shuffle_vectors() -> None:
    # Independent stdlib vector, reviewed by investigator; never derived by this engine.
    assert _encode("ab", "c").hex() == "0000000261620000000163"
    assert _encode("a", "bc").hex() == "0000000161000000026263"
    assert _encode("ทดสอบ", "é").hex() == "0000000fe0b897e0b894e0b8aae0b8ade0b89a00000002c3a9"
    assert _digest(bytes(range(32)), "shuffle", "cardfight", "0", "alice", "DECK", "0", "0").hex() == (
        "f20841f9fc1b2dc24a98e455e45e54c82c5192ece4562a5f9612de3ca60c5b65")
    assert _shuffle_order(bytes(range(32)), 0, "alice", "DECK", 0, 10) == (9, 1, 7, 2, 6, 3, 8, 4, 0, 5)
    with pytest.raises(ValueError):
        _encode("x" * 4097)
    for seed in (b"", bytes(31), bytes(33)):
        with pytest.raises(ValueError):
            Engine.create_state(("alice", "bob"), (snapshot(), snapshot()), "cardfight-manual-v1", "alice", seed)


def test_inspect_while_check_or_outside_priority_and_close_without_priority() -> None:
    state = inspect(playable(), "alice", "DECK", 2)
    private = Engine.get_player_view(state, "alice").self
    assert private is not None and private.inspection is not None
    ident = private.inspection.inspection_id
    # A valid response changes revision, so an old inspection expires.
    state = act(state, "alice", "CF_OPEN_RESPONSE")
    reject(state, "alice", "CF_CLOSE_INSPECTION", inspection_id=ident)
    reject(state, "alice", "CF_INSPECT", MoveErrorCode.NOT_YOUR_TURN, zone="DECK", count=None)
    state = inspect(state, "bob", "HAND")
    ident = Engine.get_player_view(state, "bob").self.inspection.inspection_id
    state = act(state, "bob", "CF_CLOSE_INSPECTION", inspection_id=ident)
    assert Engine.get_player_view(state, "bob").self.inspection is None
    reject(state, "bob", "CF_INSPECT", zone="CHECK", count=None)
    reject(state, "bob", "CF_INSPECT", zone="HAND", count=6)


def test_return_to_ride_and_g_zone_requires_original_physical_section() -> None:
    state = playable(ride=True, extra=True)
    state = inspect(state, "alice", "G_ZONE")
    state = move(state, "alice", inspection_refs(state, "alice")[0], "HAND")
    g_ref = Engine.get_player_view(state, "alice").self.hand[-1].ref
    state = move(state, "alice", g_ref, "G_ZONE")
    state = inspect(state, "alice", "RIDE")
    state = move(state, "alice", inspection_refs(state, "alice")[0], "HAND")
    ride_ref = Engine.get_player_view(state, "alice").self.hand[-1].ref
    state = move(state, "alice", ride_ref, "RIDE")
    reject(state, "alice", "CF_MOVE", card_ref=visible(state, "alice", "HAND")[0], to_zone="RIDE", slot=None, position=None, parent_ref=None)


def test_trigger_six_redirects_only_explicit_literal_and_six_damage_stays_manual() -> None:
    state = act(act(playable(), "alice", "CF_NEXT_PHASE"), "alice", "CF_NEXT_PHASE")
    state = inspect(state, "alice", "DECK")
    private = Engine.get_player_view(state, "alice").self
    assert private is not None and private.inspection is not None
    card = next(c for c in private.inspection.cards if c.card_id == 50)
    # Pull the source-confirmed type6 into hand, then put it exactly on top.
    state = move(state, "alice", card.ref, "HAND")
    hand = Engine.get_player_view(state, "alice").self.hand
    state = move(state, "alice", next(c.ref for c in hand if c.card_id == 50), "DECK", position=0)
    state = act(state, "alice", "CF_DRIVE_CHECK")
    state = act(state, "alice", "CF_RESOLVE_CHECK")
    removed = [c for c in state.cards if c.zone == "REMOVED"]
    assert len(removed) == 1 and removed[0].card_id == 50
    state = act(state, "alice", "CF_OPEN_RESPONSE")
    for _ in range(6):
        state = act(state, "bob", "CF_DAMAGE_CHECK")
        state = act(state, "bob", "CF_RESOLVE_CHECK")
    assert state.stage == "PLAYING" and len(visible(state, "bob", "DAMAGE")) == 6


def test_all_normal_actions_rejected_after_finish_and_history_is_bounded_public() -> None:
    state = playable()
    original = state.model_dump_json()
    for _ in range(205):
        state = act(state, "alice", "CF_SHUFFLE", zone="DECK")
    assert len(state.history) == 200 and state.history[-1].sequence == state.revision
    assert all(entry.public_refs == () for entry in state.history)
    assert original != state.model_dump_json()
    state = act(state, "alice", "CF_CONCEDE")
    payloads: tuple[tuple[str, dict[str, object]], ...] = (
        ("CF_DRAW", {"count": 1, "edge": "TOP"}), ("CF_SHUFFLE", {"zone": "DECK"}),
        ("CF_INSPECT", {"zone": "HAND", "count": None}), ("CF_NEXT_PHASE", {}),
        ("CF_END_TURN", {}), ("CF_OPEN_RESPONSE", {}), ("CF_PASS_RESPONSE", {}),
        ("CF_DRIVE_CHECK", {}), ("CF_DAMAGE_CHECK", {}), ("CF_RESOLVE_CHECK", {}),
        ("CF_KEEP_HAND", {}), ("CF_READY_TO_PLAY", {}), ("CF_MULLIGAN", {"card_refs": ()}),
        ("CF_PROPOSE_RESULT", {"outcome": "DRAW", "winner_id": None}),
    )
    for kind, payload in payloads:
        reject(state, "alice", kind, MoveErrorCode.GAME_OVER, **payload)


def test_unknown_mechanical_metadata_is_not_defaulted_or_coerced() -> None:
    snap = snapshot(extra=True)
    definitions = tuple(d.model_copy(update={"extra_deck": None}) if d.card_id == 60 else d for d in snap.definitions)
    with pytest.raises(ValueError):
        Engine.create_state(("alice", "bob"), (snap.model_copy(update={"definitions": definitions}), snapshot()),
                            "cardfight-manual-v1", "alice", bytes(32))
    with pytest.raises(ValidationError):
        CardfightCardDefinition(card_id=1, catalog_version="fixture", extra_deck=True)


def test_hidden_card_metadata_and_event_history_remain_private_after_game_end() -> None:
    state = inspect(playable(ride=True, extra=True), "alice", "DECK", 4)
    private_refs = inspection_refs(state, "alice") + tuple(visible(state, "alice", "HAND"))
    state = act(state, "alice", "CF_CONCEDE")
    for who in ("bob", "spectator"):
        view = Engine.get_player_view(state, who)
        text = view.model_dump_json()
        assert all(ref not in text for ref in private_refs)
        assert "seed" not in text and "instance_id" not in text and "definitions" not in text
        public_alice = next(p for p in view.players if p.player_id == "alice")
        assert public_alice.hand_count == 5
        for zone in public_alice.zones:
            if zone.zone in ("G_ZONE", "RIDE"):
                assert all(not hasattr(c, "card_id") for c in zone.cards)


def test_legal_actions_omit_expired_empty_or_unauthorized_operations() -> None:
    state = playable()
    assert "CF_NEXT_PHASE" not in {a.action_type for a in Engine.get_player_view(state, "bob").legal_actions}
    state = act(state, "alice", "CF_DRAW", count=44, edge="TOP")
    assert "CF_DRAW" not in {a.action_type for a in Engine.get_player_view(state, "alice").legal_actions}
    state = act(state, "alice", "CF_OPEN_RESPONSE")
    assert "CF_PASS_RESPONSE" in {a.action_type for a in Engine.get_player_view(state, "bob").legal_actions}
    assert "CF_DRIVE_CHECK" not in {a.action_type for a in Engine.get_player_view(state, "bob").legal_actions}


@pytest.mark.parametrize("kind", ["CF_MOVE", "CF_MULLIGAN", "CF_REORDER"])
def test_unicode_references_reject_without_mutation_and_allow_next_valid_action(kind: str) -> None:
    state = setup() if kind == "CF_MULLIGAN" else playable()
    if kind == "CF_REORDER":
        state = inspect(state, "alice", "DECK", 1)
        private = Engine.get_player_view(state, "alice").self
        assert private is not None and private.inspection is not None
        payload: dict[str, object] = {"inspection_id": private.inspection.inspection_id,
                                      "ordered_refs": ("ทดสอบ",)}
    elif kind == "CF_MULLIGAN":
        payload = {"card_refs": ("ทดสอบ",)}
    else:
        payload = {"card_ref": "ทดสอบ", "to_zone": "DROP", "slot": None,
                   "position": None, "parent_ref": None}
    # Serialization includes revision, all epochs, shuffle ordinals and seed.
    reject(state, "alice", kind, **payload)
    if kind == "CF_MULLIGAN":
        accepted = act(state, "alice", "CF_KEEP_HAND")
        assert Engine.get_player_view(accepted, "alice").self.opening_status == "KEPT"
    else:
        accepted = act(state, "alice", "CF_DRAW", count=1, edge="TOP")
        assert len(visible(accepted, "alice", "HAND")) == 6
    assert accepted.revision == state.revision + 1
