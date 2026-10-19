"""Bounded numeric GameMaker301 codec; no format-legality inference."""

from __future__ import annotations

import math
import struct

from app.card_data.models import AreaGameId, LegacyDeck

MAX_FILE_BYTES = 256 * 1024
MAX_ENTRIES = 4096


def decode_legacy_deck(raw: bytes, game_id: AreaGameId) -> LegacyDeck:
    if game_id not in {"buddyfight", "cardfight"}:
        raise ValueError("Unknown game namespace")
    if len(raw) > MAX_FILE_BYTES:
        raise ValueError("Legacy file exceeds 256KiB")
    try:
        payload = bytes.fromhex(raw.decode("ascii"))
    except (ValueError, UnicodeError) as exc:
        raise ValueError("Legacy deck must be ASCII hexadecimal") from exc
    if len(payload) < 8:
        raise ValueError("Truncated legacy header")
    version, count = struct.unpack_from("<II", payload)
    if version != 301 or count > MAX_ENTRIES or len(payload) != 8 + count * 16:
        raise ValueError("Unsupported version/count or inconsistent record length")
    values: list[int] = []
    for index in range(count):
        tag, value, reserved = struct.unpack_from("<IdI", payload, 8 + index * 16)
        if tag != 0 or reserved != 0:
            raise ValueError("Unsupported legacy numeric variant")
        if not math.isfinite(value) or not value.is_integer() or not 1 <= value <= 2147483647:
            raise ValueError("Card ID must be a finite positive int32")
        values.append(int(value))
    return LegacyDeck(game_id, tuple(values), raw)


def encode_legacy_deck(deck: LegacyDeck) -> bytes:
    if any(type(value) is not int or not 1 <= value <= 2147483647 for value in deck.entries):
        raise ValueError("Invalid card ID")
    if len(deck.entries) > MAX_ENTRIES:
        raise ValueError("Too many entries")
    if deck.original:
        original = decode_legacy_deck(deck.original, deck.game_id)
        if original.entries == deck.entries:
            return deck.original
    payload = struct.pack("<II", 301, len(deck.entries))
    payload += b"".join(struct.pack("<IdI", 0, value, 0) for value in deck.entries)
    return payload.hex().encode("ascii")


def validate_deck_ids(deck: LegacyDeck, known_ids: frozenset[int]) -> None:
    unknown = sorted(set(deck.entries) - known_ids)
    if unknown:
        raise ValueError(f"Unknown {deck.game_id} card IDs: {unknown}")
