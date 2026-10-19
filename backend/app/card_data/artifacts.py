"""Explicit static catalog/art build; no copying of native recovery projects."""

from __future__ import annotations

import hashlib
import json
import shutil
from dataclasses import asdict
from pathlib import Path

from app.card_data.importer import safe_path
from app.card_data.models import Asset, CatalogImportResult, JsonValue

FALLBACK = b'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 347" role="img" aria-labelledby="title"><title id="title">Card artwork unavailable</title><rect width="250" height="347" fill="#161b26"/><rect x="12" y="12" width="226" height="323" rx="12" fill="none" stroke="#e5a93c"/><text x="125" y="170" text-anchor="middle" fill="#f1f5f9" font-family="sans-serif" font-size="16">Artwork unavailable</text></svg>'''


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")


def _content_type(raw: bytes, extension: str) -> str:
    if extension == "png" and raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if extension == "jpg" and raw.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if extension == "gif" and raw[:6] in {b"GIF87a", b"GIF89a"}:
        return "image/gif"
    raise ValueError("Indexed image content does not match supported format")


def build_artifact(result: CatalogImportResult, source_root: Path, output_root: Path) -> dict[str, JsonValue]:
    project = (source_root / "project").resolve()
    if output_root.resolve().is_relative_to(project) or source_root.resolve().is_relative_to(output_root.resolve()):
        raise ValueError("Output must not overwrite recovery inputs")
    game_dir = safe_path(output_root, result.game_id)
    fallback_path = safe_path(game_dir, "art/missing.svg")
    fallback_path.parent.mkdir(parents=True, exist_ok=True)
    fallback_path.write_bytes(FALLBACK)
    prefix = f"/area-games/{result.game_id}/"
    manifest: dict[str, dict[str, JsonValue]] = {
        prefix + "art/missing.svg": {"sha256": hashlib.sha256(FALLBACK).hexdigest(), "bytes": len(FALLBACK), "content_type": "image/svg+xml"}
    }
    cards: list[dict[str, JsonValue]] = []
    copied = 0
    for card in result.cards:
        urls: dict[str, str] = {}
        for name, asset in (("full_art", card.full_art), ("thumbnail_art", card.thumbnail_art)):
            if asset is None:
                urls[name] = prefix + "art/missing.svg"
                continue
            source = safe_path(project, asset.source)
            raw = source.read_bytes()
            if hashlib.sha256(raw).hexdigest() != asset.sha256:
                raise ValueError(f"Source changed after import: {asset.source}")
            content_type = _content_type(raw, asset.extension)
            relative = f"art/{asset.role}/n{card.card_id}.{asset.extension}"
            destination = safe_path(game_dir, relative)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, destination)
            url = prefix + relative
            urls[name] = url
            manifest[url] = {"sha256": asset.sha256, "bytes": asset.size, "content_type": content_type}
            copied += 1
        cards.append({"game_id": result.game_id, "card_id": card.card_id, "fields": card.fields,
                      "unresolved_fields": sorted(card.unresolved), "full_art": urls["full_art"],
                      "thumbnail_art": urls["thumbnail_art"]})
    write_json(safe_path(game_dir, "catalog.json"), {"game_id": result.game_id, "catalog_version": result.version, "cards": cards})
    write_json(safe_path(game_dir, "art-manifest.json"), manifest)
    # Verify every advertised art URL against the emitted bytes, not just copy success.
    for url, metadata in manifest.items():
        relative = url.removeprefix(prefix)
        emitted = safe_path(game_dir, relative).read_bytes()
        if hashlib.sha256(emitted).hexdigest() != metadata["sha256"] or len(emitted) != metadata["bytes"]:
            raise ValueError(f"Artifact verification failed: {url}")
    return {"game_id": result.game_id, "cards": len(cards), "source_records": len(result.records),
            "source_assignments": len(result.assignments), "copied_assets": copied,
            "artifact_bytes": sum(int(item["bytes"]) for item in manifest.values()),
            "diagnostics": len(result.diagnostics), "catalog_version": result.version}


def write_data(result: CatalogImportResult, data_root: Path) -> None:
    game_dir = safe_path(data_root, result.game_id)
    write_json(safe_path(game_dir, "catalog.json"), {"game_id": result.game_id, "catalog_version": result.version,
               "cards": [asdict(card) for card in result.cards]})
    write_json(safe_path(game_dir, "provenance.json"), {"load_order": result.load_order,
               "records": [asdict(record) for record in result.records]})
    write_json(safe_path(game_dir, "assignments.json"), result.assignments)
    write_json(safe_path(game_dir, "diagnostics.json"), [asdict(item) for item in result.diagnostics])
