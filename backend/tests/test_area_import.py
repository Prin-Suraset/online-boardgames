"""Behavioral fixtures for non-executing recovery import and legacy decks.

Synthetic exports mirror the recovery schemas; no original card art is embedded.
The two Buddyfight conflict IDs are taken from REPORT.md, values are test data.
"""

from __future__ import annotations

import base64
import json
import struct
import tempfile
import unittest
from pathlib import Path

from app.card_data.deck_codec import decode_legacy_deck, encode_legacy_deck, validate_deck_ids
from app.card_data.importer import import_catalog


class DeckCodecTests(unittest.TestCase):
    def raw(self, values: tuple[float, ...], tag: int = 0) -> bytes:
        payload = struct.pack("<II", 301, len(values))
        payload += b"".join(struct.pack("<IdI", tag, value, 0) for value in values)
        return payload.hex().upper().encode() + b"\r\n"

    def test_preserves_duplicate_order_buddy_and_original_hex_bytes(self) -> None:
        raw = self.raw((7.0, 4.0, 4.0, 2.0))
        deck = decode_legacy_deck(raw, "buddyfight")
        self.assertEqual(deck.entries, (7, 4, 4, 2))
        self.assertEqual(deck.buddy_id, 7)
        self.assertEqual(encode_legacy_deck(deck), raw)
        self.assertIsNone(decode_legacy_deck(raw, "cardfight").buddy_id)

    def test_rejects_corrupt_oversized_and_non_numeric_variants(self) -> None:
        invalid = [b"00", b"zz", self.raw((float("nan"),)), self.raw((float("inf"),)),
                   self.raw((1.5,)), self.raw((0.0,)), self.raw((1.0,), tag=1),
                   struct.pack("<II", 301, 5000).hex().encode(), b" " * 262145,
                   self.raw((1.0,)) + b"00"]
        for raw in invalid:
            with self.subTest(raw=raw[:40]), self.assertRaises(ValueError):
                decode_legacy_deck(raw, "buddyfight")

    def test_unknown_ids_are_rejected_by_explicit_catalog_validation(self) -> None:
        deck = decode_legacy_deck(self.raw((7.0, 4.0)), "cardfight")
        validate_deck_ids(deck, frozenset({4, 7}))
        with self.assertRaisesRegex(ValueError, "7"):
            validate_deck_ids(deck, frozenset({4}))


class CatalogImportTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def write(self, name: str, data: object) -> None:
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data), encoding="utf-8")

    def bf(self) -> None:
        path = self.root / "recovered-source/embedded/scripts/0024_s_x__5z.gml"
        path.parent.mkdir(parents=True)
        path.write_text("if global.languige=1{execute_file('Text/Z.txt')execute_file('Text/A.txt')}if global.languige=2{}")
        self.write("recovered/card-database.json", [
            {"id": 3251, "source": "Text/A.txt", "line": 1, "fields": {"CardName": "Final", "Power": 9}, "expressions": {}},
            {"id": 3251, "source": "Text/Z.txt", "line": 1, "fields": {"CardName": "Old", "Power": 1}, "expressions": {}},
            {"id": 5450, "source": "Text/A.txt", "line": 2, "fields": {"CardName": "Same"}, "expressions": {"Mystery": "__import__('os').system('touch PWNED')"}},
            {"id": 5450, "source": "Text/Z.txt", "line": 2, "fields": {"CardName": "Prior"}, "expressions": {}},
            {"id": 9, "source": "Text/A.txt", "line": 3, "fields": {"CardName": "Same", "CardText": "ไทย café"}, "expressions": {}},
        ])
        self.write("recovered/asset-manifest.json", [])

    def test_loader_order_not_export_order_resolves_conflicts_with_provenance(self) -> None:
        self.bf()
        result = import_catalog(self.root, "buddyfight")
        cards = {card.card_id: card for card in result.cards}
        self.assertEqual(cards[3251].fields["CardName"], "Final")
        self.assertEqual(len(result.records), 5)
        self.assertEqual(len(cards), 3)
        self.assertEqual(cards[9].fields["CardText"], "ไทย café")
        self.assertEqual(cards[5450].unresolved["Mystery"], "__import__('os').system('touch PWNED')")
        self.assertEqual({d.card_id for d in result.diagnostics if d.code == "DUPLICATE_DEFINITION"}, {3251, 5450})
        self.assertFalse((self.root / "PWNED").exists())
        self.assertEqual(result, import_catalog(self.root, "buddyfight"))

    def test_cardfight_missing_trigger_and_unknown_loader_sources_remain_diagnostics(self) -> None:
        loader = self.root / "recovered-source/embedded/scripts/0000_TextLoad.gml"
        loader.parent.mkdir(parents=True)
        loader.write_text("execute_string(file_read_utf8('Text/Triggers.txt'))\nexecute_string(file_read_utf8('Text/A.txt'))")
        self.write("data/cards-by-source.json", [
            {"card_id": 9, "source_file": "Text/A.txt", "properties": {"CardName": "Known"}, "source_lines": [2]},
            {"card_id": 10, "source_file": "Text/Dynamic.txt", "properties": {"CardName": "Unknown order"}, "source_lines": [2]},
        ])
        self.write("data/assignments.json", [])
        self.write("data/card-image-index.json", [])
        result = import_catalog(self.root, "cardfight")
        self.assertEqual(result.game_id, "cardfight")
        self.assertEqual({d.code for d in result.diagnostics} & {"MISSING_SOURCE", "UNKNOWN_LOAD_ORDER"}, {"MISSING_SOURCE", "UNKNOWN_LOAD_ORDER"})
        card = next(c for c in result.cards if c.card_id == 10)
        self.assertEqual(card.fields, {})
        self.assertEqual(len(result.records), 2)

    def test_missing_art_falls_back_and_manifest_traversal_is_rejected(self) -> None:
        self.bf()
        self.write("recovered/asset-manifest.json", [{"path": "../outside.png", "format": "PNG"}])
        result = import_catalog(self.root, "buddyfight")
        self.assertTrue(all(c.full_art is None for c in result.cards))
        self.assertIn("UNSAFE_ASSET_PATH", {d.code for d in result.diagnostics})


if __name__ == "__main__":
    unittest.main()
