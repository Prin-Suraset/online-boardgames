# Recovered Area game data

This offline tool reads preserved recovery JSON and literal loader/config references. It does not execute GML, native binaries, updater tools or legacy network requests. It is independent of game/room contracts and does not validate tournament legality.

From repository root, generate the complete deployment artifact before the frontend build:

```bash
rtk python3 backend/scripts/import_area_games.py
rtk npm --prefix frontend run build
```

Defaults read the two subdirectories of `Reverse Engineered/`, write versioned metadata under `backend/data/area-games/{buddyfight,cardfight}/`, and emit browser catalogs and indexed full/mini art under `frontend/public/area-games/{buddyfight,cardfight}/`. Catalog versions are content digests in the manifest, not extra path segments. To build one recovery root explicitly:

```bash
rtk python3 backend/scripts/import_area_games.py --game buddyfight --source-root 'Reverse Engineered/Buddyfight Area 1.38' --output-dir frontend/public/area-games --data-dir backend/data/area-games
```

Public URLs start `/area-games/<game>/`. Art bytes are copied unchanged; there is no image resizing, reinterpretation or executable content. Source hashes and content signatures are checked; every emitted art URL is read back and hash/size verified. Missing artwork uses the generated accessible SVG. Source paths are limited to backend provenance. Frontend catalog fields are source data, so render card names/text as escaped text.

Generated image binaries and fallback files are ignored by Git. **A checkout of Git alone does not contain the complete art artifact.** A deployment must receive the recovery inputs and run generation, or receive an artifact generated from those inputs, before Vite builds/copies `public/`. Do not advertise the games playable until room/engine/UI work and browser asset checks are complete. The full artifact is approximately 1.9 GB; deployment hosting size limits must be checked before publishing. This task does not publish it.

Backend outputs preserve all valid source records, loader order, effective field maps, unresolved expressions and original Cardfight assignment rows. Index-zero configuration records remain provenance and never become card zero. Buddyfight duplicate IDs are diagnosed with every definition retained; later source-file/line values win only when the recovered default loader proves their order. Unknown source order remains unmerged. Missing Cardfight `Text/Triggers.txt` and unexecuted dynamic/language/custom override behavior remain diagnostics. No default trigger behavior is invented.

`legacy-decks.json` preserves the original ASCII and ordered entries for loose and already-extracted archived examples; each is decoded and re-encoded byte-for-byte. The bounded codec accepts only the observed GameMaker version301 numeric records, with 4096-entry/256KiB caps and finite positive integral IDs. Semantic known-ID checking is separate and reported per fixture. The codec does not guess ride/extra boundaries or enforce a 50-card rule. Buddyfight main list position zero is the separate buddy in the recovered format; `.prflEx` is extra, and both remain intact without removing repeated ordinary copies. No ZIP extraction is performed.

Headless focused checks:

```bash
rtk env PYTHONPATH=backend python3 -m pytest backend/tests/test_area_import.py -v
```

Tests also use stdlib unittest, useful when pytest is unavailable. Deployment asset serving still needs the real-browser check in Task 4; filesystem validation does not substitute for it.
