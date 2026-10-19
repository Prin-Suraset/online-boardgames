"""Typed import records; these are independent of room/game contracts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, TypeAlias

AreaGameId: TypeAlias = Literal["buddyfight", "cardfight"]
JsonValue: TypeAlias = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]


@dataclass(frozen=True)
class Diagnostic:
    code: str
    source: str
    detail: str
    card_id: int | None = None


@dataclass(frozen=True)
class SourceRecord:
    card_id: int
    source: str
    lines: tuple[int, ...]
    fields: dict[str, JsonValue]
    expressions: dict[str, str]


@dataclass(frozen=True)
class Asset:
    source: str
    role: Literal["full", "thumb"]
    sha256: str
    size: int
    extension: Literal["png", "jpg", "gif"]


@dataclass(frozen=True)
class ImportedCard:
    card_id: int
    fields: dict[str, JsonValue]
    unresolved: dict[str, str]
    sources: tuple[str, ...]
    full_art: Asset | None
    thumbnail_art: Asset | None


@dataclass(frozen=True)
class CatalogImportResult:
    game_id: AreaGameId
    version: str
    cards: tuple[ImportedCard, ...]
    records: tuple[SourceRecord, ...]
    diagnostics: tuple[Diagnostic, ...]
    load_order: tuple[str, ...]
    assignments: tuple[dict[str, JsonValue], ...]


@dataclass(frozen=True)
class LegacyDeck:
    game_id: AreaGameId
    entries: tuple[int, ...]
    original: bytes
