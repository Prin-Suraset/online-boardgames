"""Trusted pinned Cardfight mechanics loaded outside the pure game engine."""
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, ConfigDict, JsonValue

from app.engine.games.cardfight import CardfightCardDefinition, CardfightDeckDefinition, CardfightDeckSnapshot


class CatalogCard(BaseModel):
    model_config = ConfigDict(strict=True, extra="ignore", frozen=True)
    card_id: int
    fields: dict[str, JsonValue]


class CardfightCatalog(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)
    game_id: str
    catalog_version: str
    cards: tuple[CatalogCard, ...]

    def token_ids(self) -> frozenset[int]:
        known_ids = {card.card_id for card in self.cards}
        token_ids: set[int] = set()
        for card in self.cards:
            if type(card.fields.get("TokenInHand")) is int and card.fields.get("TokenInHand") == 1:
                token_ids.add(card.card_id)
            for field, value in card.fields.items():
                if (re.fullmatch(r"TokenSummoner\d*|TokenSummonerRodeUponNumber|TokenSummonRodeUponNumber", field)
                        and type(value) is int and value in known_ids):
                    token_ids.add(value)
        return frozenset(token_ids)

    def snapshot(self, deck: CardfightDeckDefinition) -> CardfightDeckSnapshot:
        lookup = {card.card_id: card for card in self.cards}
        definitions: list[CardfightCardDefinition] = []
        for card_id in sorted(set(deck.main + deck.ride + deck.extra)):
            card = lookup.get(card_id)
            if card is None:
                raise ValueError("Unknown card")
            def resolved(key: str, maximum: int) -> int | None:
                value = card.fields.get(key)
                return value if type(value) is int and 0 <= value <= maximum else None
            definitions.append(CardfightCardDefinition(
                card_id=card_id, catalog_version=self.catalog_version,
                grade=resolved("UnitGrade", 99), extra_deck=resolved("ExtraDeck", 1),
                trigger_type=resolved("TriggerUnit", 99),
            ))
        return CardfightDeckSnapshot(deck=deck, definitions=tuple(definitions))


@lru_cache(maxsize=1)
def load_cardfight_catalog() -> CardfightCatalog:
    path = Path(__file__).resolve().parents[2] / "data/area-games/cardfight/catalog.json"
    catalog = CardfightCatalog.model_validate_json(path.read_bytes())
    if catalog.game_id != "cardfight" or len({c.card_id for c in catalog.cards}) != len(catalog.cards):
        raise ValueError("Invalid server Cardfight catalog")
    return catalog
