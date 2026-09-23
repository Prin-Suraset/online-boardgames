"""Contract tests for the You or me who more than? engine."""

import pytest

from app.engine.games.you_or_me import (
    YouOrMeAction,
    YouOrMeCard,
    YouOrMeEngine,
)

PLAYERS = ("p1", "p2", "p3", "p4")


def select_cards(state):
    for player in state.players:
        state = YouOrMeEngine.apply_action(
            state,
            player.player_id,
            YouOrMeAction(action_type="SELECT_CARD", card_id=player.hand[0].id),
        )
    return state


def test_deck_deal() -> None:
    state = YouOrMeEngine.init_game(PLAYERS, seed=7)

    assert sum(len(player.hand) for player in state.players) == 28
    assert len(state.draw_pile) == 24
    assert sum(len(player.hand) for player in state.players) + len(state.draw_pile) == 52
    assert all(len(player.hand) == 7 for player in state.players)
    assert all(player.coins == 30 for player in state.players)
    assert state.pot == 80
    assert state.phase == "SELECT_CARD"


def test_ante_deduction_and_all_in() -> None:
    state = YouOrMeEngine.init_game(PLAYERS[:2], seed=11)
    poor_players = tuple(
        player.model_copy(update={"coins": 7 if player.player_id == "p1" else 25})
        for player in state.players
    )
    restarted = YouOrMeEngine._begin_round(
        poor_players,
        state.draw_pile,
        round_number=1,
        round_history=(),
        seed=state.seed,
        event_log=(),
    )

    assert restarted.pot == 27
    assert [player.coins for player in restarted.players] == [0, 5]


def test_card_hierarchy() -> None:
    cards = [YouOrMeCard(id=f"card-{rank}", rank=rank) for rank in (1, 10, 11, 12, 13)]

    assert [card.rank for card in sorted(cards, key=lambda card: card.rank)] == [1, 10, 11, 12, 13]
    assert cards[2].label == "ROOSTER"
    assert cards[3].label == "BOAR"
    assert cards[4].label == "DRAGON"


def test_betting_flow() -> None:
    state = select_cards(YouOrMeEngine.init_game(PLAYERS, seed=13))

    state = YouOrMeEngine.apply_action(state, "p1", YouOrMeAction(action_type="CHECK"))
    state = YouOrMeEngine.apply_action(state, "p2", YouOrMeAction(action_type="BET", amount=8))
    state = YouOrMeEngine.apply_action(state, "p3", YouOrMeAction(action_type="CALL"))
    state = YouOrMeEngine.apply_action(state, "p4", YouOrMeAction(action_type="FOLD"))

    assert state.round_history
    assert state.round_history[-1].pot == 96
    assert state.round_history[-1].selected_cards["p4"] is None
    with pytest.raises(ValueError):
        YouOrMeAction(action_type="BET", amount=0)


def test_split_pot_on_tie() -> None:
    state = YouOrMeEngine.init_game(PLAYERS[:2], seed=17)
    dragon_one = YouOrMeCard(id="dragon-one", rank=13)
    dragon_two = YouOrMeCard(id="dragon-two", rank=13)
    players = tuple(
        player.model_copy(update={"selected_card": dragon_one if player.player_id == "p1" else dragon_two})
        for player in state.players
    )
    betting = state.model_copy(
        update={
            "players": players,
            "phase": "BETTING",
            "pot": 100,
            "round_number": 7,
            "current_player_id": "p1",
            "player_round_bets": {"p1": 0, "p2": 0},
        }
    )
    betting = YouOrMeEngine.apply_action(betting, "p1", YouOrMeAction(action_type="CHECK"))
    finished = YouOrMeEngine.apply_action(betting, "p2", YouOrMeAction(action_type="CHECK"))

    result = finished.round_history[-1]
    assert result.winner_ids == ("p1", "p2")
    assert result.payouts == {"p1": 50, "p2": 50}
    assert [player.coins for player in finished.players] == [80, 80]


def test_full_7_round_game() -> None:
    state = YouOrMeEngine.init_game(PLAYERS[:2], seed=23)

    for _ in range(7):
        state = select_cards(state)
        state = YouOrMeEngine.apply_action(state, "p1", YouOrMeAction(action_type="CHECK"))
        state = YouOrMeEngine.apply_action(state, "p2", YouOrMeAction(action_type="CHECK"))

    assert state.phase == "FINISHED"
    assert len(state.round_history) == 7
    wealthiest = max(player.coins for player in state.players)
    winner = next(player for player in state.players if player.player_id == state.winner_id)
    assert winner.coins == wealthiest


def test_player_view_hides_opponent_hand_and_card_rank() -> None:
    state = select_cards(YouOrMeEngine.init_game(PLAYERS[:2], seed=29))
    view = YouOrMeEngine.get_player_view(state, "p1")
    own = next(player for player in view.players if player.player_id == "p1")
    opponent = next(player for player in view.players if player.player_id == "p2")

    assert len(own.hand) == 6
    assert own.selected_card is not None and own.selected_card.rank is not None
    assert opponent.hand == ()
    assert opponent.hand_count == 6
    assert opponent.selected_card is not None and opponent.selected_card.rank is None
