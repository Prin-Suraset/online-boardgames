from app.card_data.cardfight_catalog import CardfightCatalog, CatalogCard
from app.engine.games.cardfight import CardfightDeckDefinition


def test_token_ids_use_explicit_flags_and_reference_fields_only() -> None:
    cards = (
        CatalogCard(card_id=1, fields={"TokenSummoner": 10, "TokenSummoner2": 11,
                                     "TokenSummonerRodeUponNumber": 12,
                                     "TokenSummonRodeUponNumber": 13}),
        CatalogCard(card_id=2, fields={"TokenInHand": 1}),
        CatalogCard(card_id=3, fields={"TokenInHand": 2}),
        CatalogCard(card_id=4, fields={"TokenSummoner2Button1": 14}),
        CatalogCard(card_id=10, fields={"CardName": "Plant"}),
        CatalogCard(card_id=11, fields={"CardName": "Plant (strong)"}),
        CatalogCard(card_id=12, fields={"CardName": "Rode-upon token"}),
        CatalogCard(card_id=13, fields={"CardName": "Summoned-on-ride token"}),
        CatalogCard(card_id=14, fields={"CardName": "Unreferenced"}),
    )
    catalog = CardfightCatalog(game_id="cardfight", catalog_version="test", cards=cards)
    assert catalog.token_ids() == frozenset({2, 10, 11, 12, 13})


def test_snapshot_marks_confirmed_token_cards_in_separate_section() -> None:
    catalog = CardfightCatalog(game_id="cardfight", catalog_version="test", cards=(
        CatalogCard(card_id=1, fields={"UnitGrade": 0, "TokenSummoner": 10}),
        CatalogCard(card_id=10, fields={"CardName": "Plant"}),
    ))
    deck = CardfightDeckDefinition(catalog_version="test", name="Token example", main=(1,), ride=(), extra=(),
                                   tokens=(10,), starter_index=0)
    snapshot = catalog.snapshot(deck)
    definitions = {definition.card_id: definition for definition in snapshot.definitions}
    assert definitions[1].is_token is False
    assert definitions[10].is_token is True
