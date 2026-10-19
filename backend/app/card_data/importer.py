"""Normalize preserved recovery exports without evaluating legacy GML."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict
from pathlib import Path, PurePosixPath
from typing import Literal, cast

from app.card_data.models import (
    AreaGameId, Asset, CatalogImportResult, Diagnostic, ImportedCard, JsonValue, SourceRecord,
)

MAX_EXPORT_BYTES = 128 * 1024 * 1024
LiteralRole = Literal["full", "thumb"]
LiteralExtension = Literal["png", "jpg", "gif"]


def safe_path(root: Path, relative: str) -> Path:
    """Reject absolute paths, traversal, symlink escapes and Windows separators."""
    posix = PurePosixPath(relative)
    if posix.is_absolute() or ".." in posix.parts or "\\" in relative or ":" in relative:
        raise ValueError("Unsafe relative path")
    result = (root / relative).resolve()
    if not result.is_relative_to(root.resolve()):
        raise ValueError("Path leaves root")
    return result


def read_export(root: Path, name: str) -> list[dict[str, JsonValue]]:
    path = safe_path(root, name)
    if path.stat().st_size > MAX_EXPORT_BYTES:
        raise ValueError(f"Oversized export: {name}")
    value: object = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list) or not all(isinstance(row, dict) for row in value):
        raise ValueError(f"Expected export record list: {name}")
    return cast(list[dict[str, JsonValue]], value)


def _load_order(root: Path, game: AreaGameId, diagnostics: list[Diagnostic]) -> tuple[str, ...]:
    script = ("0024_s_x__5z.gml" if game == "buddyfight" else "0000_TextLoad.gml")
    source = "recovered-source/embedded/scripts/" + script
    text = safe_path(root, source).read_text(encoding="utf-8")
    # Only the default English path; Russian/language2 branches are not evaluated.
    if game == "cardfight":
        text = text.split("if global.langRu", 1)[0]
        order = re.findall(r"file_read_utf8\('([^']+)'\)", text)
        # Built-in factions are literal ordered config from NoUse, loaded before overrides.
        config = safe_path(root / "project", "Text/NoUse.txt")
        custom: list[str] = []
        if config.exists():
            cfg = config.read_text(encoding="utf-8")
            files = {int(i): filename for i, filename in re.findall(r"global\.CustomFactionFile\[(\d+)\]\s*=\s*['\"]([^'\"]+)['\"]", cfg)}
            enabled = {int(i) for i, value in re.findall(r"global\.CustomFaction(?:ClanId|NationId)\[(\d+)\]\s*=\s*(\d+)", cfg) if int(value) != 0}
            custom = ["Text/" + files[i] for i in sorted(files) if i in enabled]
        override = "Text/Custom Overrides.txt"
        order = [name for name in order if name != override] + custom + ([override] if override in order else [])
        diagnostics.append(Diagnostic("CONDITIONAL_LOADER", source, "Default UTF8 built-ins only; runtime user overrides/language and dynamic statements are not evaluated"))
    else:
        order = re.findall(r"execute_file(?:/\*.*?\*/)?\('([^']+)'\)", text)
    for name in order:
        if not safe_path(root / "project", name).is_file():
            diagnostics.append(Diagnostic("MISSING_SOURCE", name, "Referenced default loader input absent"))
    return tuple(dict.fromkeys(order))


def _assets(root: Path, game: AreaGameId, diagnostics: list[Diagnostic]) -> dict[tuple[int, str], Asset]:
    name = "recovered/asset-manifest.json" if game == "buddyfight" else "data/card-image-index.json"
    assets: dict[tuple[int, str], Asset] = {}
    for row in read_export(root, name):
        relative = str(row.get("path", ""))
        try:
            path = safe_path(root / "project", relative)
        except ValueError:
            diagnostics.append(Diagnostic("UNSAFE_ASSET_PATH", relative, "Rejected asset path"))
            continue
        match = re.fullmatch(r"(CardSprite|CardSpriteMini|CardSpriteMini2)/n(\d+)\.(png|jpg|jpeg|gif)", relative, re.I)
        if not match:
            continue
        folder, identifier, extension = match.groups()
        role = "full" if folder.lower() == "cardsprite" else "thumb"
        if not path.is_file():
            diagnostics.append(Diagnostic("MISSING_ART", relative, "Indexed image missing", int(identifier)))
            continue
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        expected = row.get("sha256")
        if expected and expected != digest:
            diagnostics.append(Diagnostic("ART_HASH_MISMATCH", relative, "Image differs from recovered manifest", int(identifier)))
            continue
        ext = "jpg" if extension.lower() in {"jpg", "jpeg"} else extension.lower()
        asset = Asset(relative, cast("LiteralRole", role), digest, len(raw), cast("LiteralExtension", ext))
        key = (int(identifier), role)
        if key in assets:
            diagnostics.append(Diagnostic("MULTIPLE_ART_CANDIDATES", relative, "Kept first manifest candidate", int(identifier)))
            continue
        assets[key] = asset
    return assets


def import_catalog(source_root: Path, game_id: AreaGameId) -> CatalogImportResult:
    if game_id not in {"buddyfight", "cardfight"}:
        raise ValueError("Unknown game namespace")
    diagnostics: list[Diagnostic] = []
    order = _load_order(source_root, game_id, diagnostics)
    rank = {name: i for i, name in enumerate(order)}
    source = "recovered/card-database.json" if game_id == "buddyfight" else "data/cards-by-source.json"
    records: list[SourceRecord] = []
    for row in read_export(source_root, source):
        raw_id = row.get("id" if game_id == "buddyfight" else "card_id")
        if type(raw_id) is not int or not 0 <= raw_id <= 2147483647:
            diagnostics.append(Diagnostic("INVALID_SOURCE_ID", source, str(raw_id)))
            continue
        origin = str(row.get("source" if game_id == "buddyfight" else "source_file"))
        fields = row.get("fields" if game_id == "buddyfight" else "properties")
        if not isinstance(fields, dict):
            raise ValueError("Invalid recovered field map")
        lines = row.get("source_lines") if game_id == "cardfight" else [row.get("line")]
        if not isinstance(lines, list) or not all(type(line) is int and line > 0 for line in lines):
            raise ValueError("Invalid source line map")
        expressions = row.get("expressions", {})
        if not isinstance(expressions, dict):
            raise ValueError("Invalid expression map")
        records.append(SourceRecord(raw_id, origin, tuple(cast(list[int], lines)), fields, {key: str(value) for key, value in expressions.items()}))
    assignments = tuple(read_export(source_root, "data/assignments.json")) if game_id == "cardfight" else ()
    records.sort(key=lambda row: (rank.get(row.source, len(rank)), row.source, row.lines, row.card_id))
    grouped: dict[int, list[SourceRecord]] = {}
    for record in records:
        if record.card_id == 0:
            diagnostics.append(Diagnostic("NON_CARD_RECORD", record.source, "Scalar/config index zero retained in provenance; not a playable card", 0))
            continue
        grouped.setdefault(record.card_id, []).append(record)
    assets = _assets(source_root, game_id, diagnostics)
    cards: list[ImportedCard] = []
    for card_id, definitions in sorted(grouped.items()):
        effective: dict[str, JsonValue] = {}
        unresolved: dict[str, str] = {}
        if game_id == "buddyfight" and len(definitions) > 1:
            diagnostics.append(Diagnostic("DUPLICATE_DEFINITION", source, "Resolved only ordered source assignments; all definitions retained", card_id))
        for record in definitions:
            if record.source not in rank:
                diagnostics.append(Diagnostic("UNKNOWN_LOAD_ORDER", record.source, "Retained source record; not merged into effective values", card_id))
                continue
            effective.update(record.fields)
            for key in record.fields:
                unresolved.pop(key, None)
            for key, expression in record.expressions.items():
                if key not in record.fields:
                    effective.pop(key, None)
                    unresolved[key] = expression
                    diagnostics.append(Diagnostic("UNRESOLVED_EXPRESSION", record.source, expression, card_id))
        full, thumb = assets.get((card_id, "full")), assets.get((card_id, "thumb"))
        if full is None or thumb is None:
            diagnostics.append(Diagnostic("MISSING_ART", source, "Accessible generated fallback required", card_id))
        cards.append(ImportedCard(card_id, effective, unresolved, tuple(row.source for row in definitions), full, thumb))
    for assignment in assignments:
        if assignment.get("literal_kind") not in {"string-literal", "numeric-literal"}:
            diagnostics.append(Diagnostic("UNRESOLVED_ASSIGNMENT", str(assignment.get("file")), str(assignment.get("raw_value")), assignment.get("card_id") if type(assignment.get("card_id")) is int else None))
    version = hashlib.sha256(json.dumps([game_id, order, [asdict(row) for row in records], [asdict(card) for card in cards]], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:20]
    return CatalogImportResult(game_id, version, tuple(cards), tuple(records), tuple(sorted(diagnostics, key=lambda d: (d.code, d.source, d.card_id or 0, d.detail))), order, assignments)
