#!/usr/bin/env python3
"""Build deterministic catalogs and deployable art from preserved recovery exports."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import cast

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.card_data.artifacts import build_artifact, write_data, write_json
from app.card_data.deck_codec import import_deck_fixtures
from app.card_data.importer import import_catalog
from app.card_data.models import AreaGameId, JsonValue


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game", choices=["both", "buddyfight", "cardfight"], default="both")
    parser.add_argument("--source-root", type=Path, default=Path("Reverse Engineered"))
    parser.add_argument("--output-dir", type=Path, default=Path("frontend/public/area-games"))
    parser.add_argument("--data-dir", type=Path, default=Path("backend/data/area-games"))
    args = parser.parse_args()
    names = {"buddyfight": "Buddyfight Area 1.38", "cardfight": "Cardfight Area 4.16"}
    games = list(names) if args.game == "both" else [args.game]
    reports: list[dict[str, JsonValue]] = []
    try:
        for game in games:
            source = args.source_root / names[game] if args.game == "both" else args.source_root
            result = import_catalog(source, cast(AreaGameId, game))
            report = build_artifact(result, source, args.output_dir)
            write_data(result, args.data_dir)
            decks = import_deck_fixtures(source, cast(AreaGameId, game), frozenset(card.card_id for card in result.cards))
            write_json(args.data_dir / game / "legacy-decks.json", decks)
            report["deck_fixtures"] = len(decks)
            report["decks_with_unknown_ids"] = sum(bool(deck["unknown_ids"]) for deck in decks)
            reports.append(report)
        write_json(args.data_dir / "import-report.json", reports)
    except (ValueError, OSError, KeyError, TypeError) as exc:
        print(f"Area import failed: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(reports, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
