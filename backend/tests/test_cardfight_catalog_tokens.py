from app.card_data.cardfight_catalog import CardfightCatalog, CatalogCard


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
