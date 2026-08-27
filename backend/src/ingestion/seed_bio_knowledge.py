"""
VARUNA — CMLRE Species Ecological Profiles → Qdrant bio_knowledge Seeder
Reads species_ecological_profiles_master----dataset2final.csv from the repo root
and batch-upserts all ~20k species as dense vector embeddings into the
Qdrant `bio_knowledge` collection.

Run:
    cd backend
    python -m src.ingestion.seed_bio_knowledge
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

log = logging.getLogger("varuna.ingestion.bio_knowledge")

# ── Canonical Dataset Paths ──────────────────────────────────────────────────
_REPO_ROOT = Path(__file__).resolve().parents[3]  # backend/src/ingestion → floatchatai-main
_DATA_DIR = _REPO_ROOT / "data"
SPECIES_CSV_PATH = (
    _DATA_DIR / "species_ecological_profiles_master.csv"
    if (_DATA_DIR / "species_ecological_profiles_master.csv").exists()
    else _REPO_ROOT / "species_ecological_profiles_master----dataset2final.csv"
)
SPECIES_JSON_PATH = _DATA_DIR / "species_ecological_profiles.json"

QDRANT_COLLECTION = "bio_knowledge"
EMBED_BATCH_SIZE = 64    # rows per embedding call
UPSERT_BATCH_SIZE = 100  # smaller batches to avoid Qdrant Cloud write timeouts


# ── Text Chunk Formatter ──────────────────────────────────────────────────────

def _format_species_chunk(row: Dict[str, Any]) -> str:
    """Convert one species profile dict into the canonical RAG embedding chunk."""
    name = row.get("scientific_name", "Unknown species")
    common = row.get("common_name") or ""
    family = row.get("family") or "Unknown family"
    genus = row.get("genus") or ""
    habitat = row.get("habitat_zone") or "marine"
    d_min = row.get("depth_min_m")
    d_max = row.get("depth_max_m")
    depth_str = (
        f"{d_min}m – {d_max}m"
        if d_min is not None and d_max is not None
        else "unknown depth range"
    )
    t_min = row.get("temp_pref_min_c", "?")
    t_max = row.get("temp_pref_max_c", "?")
    s_min = row.get("salinity_min_psu", "?")
    s_max = row.get("salinity_max_psu", "?")
    doxy = row.get("hypoxia_avoidance_threshold_umol_kg", "?")
    eco = row.get("ecological_response") or ""
    evidence = row.get("evidence_source") or "FishBase/SeaLifeBase"

    # Clean up mojibake from the CSV encoding issue (°C, µmol show up garbled)
    eco = (
        eco.replace("A\uFFFD\uFFFDC", "°C")
           .replace("A\u00B0C", "°C")
           .replace("A\u00B5mol", "µmol")
           .replace("°\uFFFD", "°C")
    )

    common_str = f" ({common})" if common else ""
    return (
        f"Species: {name}{common_str}\n"
        f"Taxonomy: Family {family}, Genus {genus}\n"
        f"Habitat: {habitat} (Depth: {depth_str})\n"
        f"Environmental Tolerances: Preferred Temp {t_min}–{t_max}°C | "
        f"Salinity {s_min}–{s_max} PSU | "
        f"Hypoxia Avoidance Floor {doxy} µmol/kg\n"
        f"Ecological Description: {eco}\n"
        f"Evidence: {evidence}"
    )


def _stable_int_id(species_id: str) -> int:
    """Convert species_id string to a stable positive integer for Qdrant point ID."""
    return int(hashlib.md5(species_id.encode()).hexdigest()[:12], 16) % (2**53)


# ── Data Loaders ─────────────────────────────────────────────────────────────

def _load_from_json(path: Path) -> List[Dict[str, Any]]:
    log.info("Loading species profiles from JSON: %s", path)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    log.info("Loaded %d species from JSON", len(data))
    return data


def _load_from_csv(path: Path) -> List[Dict[str, Any]]:
    try:
        import pandas as pd  # type: ignore
    except ImportError:
        raise RuntimeError("pandas required for CSV loading: pip install pandas")

    log.info("Loading species profiles from CSV: %s", path)
    df = pd.read_csv(path, encoding="utf-8", dtype=str, na_values=["", "nan", "null", "NULL"])

    # Coerce numeric columns
    numeric_cols = [
        "depth_min_m", "depth_max_m",
        "temp_pref_min_c", "temp_pref_max_c",
        "salinity_min_psu", "salinity_max_psu",
        "hypoxia_avoidance_threshold_umol_kg",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    records = df.where(pd.notna(df), None).to_dict(orient="records")
    log.info("Loaded %d species from CSV", len(records))
    return records


def _load_species_profiles() -> List[Dict[str, Any]]:
    """Load full species master profiles (20,514 species), preferring master CSV."""
    if SPECIES_CSV_PATH.exists():
        return _load_from_csv(SPECIES_CSV_PATH)
    if SPECIES_JSON_PATH.exists():
        return _load_from_json(SPECIES_JSON_PATH)
    raise FileNotFoundError(
        f"No species profiles file found.\n"
        f"Expected one of:\n  {SPECIES_CSV_PATH}\n  {SPECIES_JSON_PATH}"
    )


# ── Qdrant Batch Upsert ───────────────────────────────────────────────────────

def seed_bio_knowledge_sync(dry_run: bool = False) -> int:
    """
    Synchronous seeder — loads all species profiles, embeds in batches,
    upserts into Qdrant `bio_knowledge`. Returns number of points upserted.
    """
    # Late imports so module loads fine even if deps are missing at import time
    from src.llm.embedder import embed_texts
    from src.database.qdrant import _get_client

    try:
        from qdrant_client.http import models as qmodels  # type: ignore
    except ImportError:
        log.error("qdrant-client not installed. Run: pip install qdrant-client")
        return 0

    profiles = _load_species_profiles()
    total = len(profiles)
    log.info("Total species profiles to embed: %d", total)

    client = _get_client()
    if client is None:
        log.error("Qdrant client unavailable — cannot seed bio_knowledge")
        return 0

    # Ensure collection exists with 768-dim vectors
    try:
        client.get_collection(QDRANT_COLLECTION)
        log.info("Collection '%s' already exists", QDRANT_COLLECTION)
    except Exception:
        client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=qmodels.VectorParams(size=768, distance=qmodels.Distance.COSINE),
        )
        log.info("Created Qdrant collection: %s", QDRANT_COLLECTION)

    upserted = 0
    # Process in EMBED_BATCH_SIZE chunks
    for batch_start in range(0, total, EMBED_BATCH_SIZE):
        batch = profiles[batch_start : batch_start + EMBED_BATCH_SIZE]
        texts = [_format_species_chunk(row) for row in batch]

        try:
            vectors = embed_texts(texts)
        except Exception as e:
            log.warning("Embedding failed for batch %d–%d: %s", batch_start, batch_start + len(batch), e)
            continue

        points = []
        for i, (row, vector) in enumerate(zip(batch, vectors)):
            species_id = str(row.get("species_id") or row.get("scientific_name", f"species_{batch_start + i}"))
            point_id = _stable_int_id(species_id)

            payload: Dict[str, Any] = {
                "text": texts[i],
                "species_id": species_id,
                "scientific_name": row.get("scientific_name"),
                "common_name": row.get("common_name"),
                "family": row.get("family"),
                "genus": row.get("genus"),
                "habitat_zone": row.get("habitat_zone"),
                "depth_min_m": row.get("depth_min_m"),
                "depth_max_m": row.get("depth_max_m"),
                "temp_pref_min_c": row.get("temp_pref_min_c"),
                "temp_pref_max_c": row.get("temp_pref_max_c"),
                "salinity_min_psu": row.get("salinity_min_psu"),
                "salinity_max_psu": row.get("salinity_max_psu"),
                "hypoxia_avoidance_threshold_umol_kg": row.get("hypoxia_avoidance_threshold_umol_kg"),
                "evidence_source": row.get("evidence_source"),
                "source": "CMLRE",
            }
            points.append(qmodels.PointStruct(id=point_id, vector=vector, payload=payload))

        if dry_run:
            log.info("[DRY RUN] Would upsert %d points (batch %d–%d)", len(points), batch_start, batch_start + len(batch))
            upserted += len(points)
            continue

        # Upsert in sub-batches with retry
        for sub_start in range(0, len(points), UPSERT_BATCH_SIZE):
            sub_batch = points[sub_start : sub_start + UPSERT_BATCH_SIZE]
            success = False
            for attempt in range(3):
                try:
                    client.upsert(collection_name=QDRANT_COLLECTION, points=sub_batch)
                    upserted += len(sub_batch)
                    success = True
                    break
                except Exception as e:
                    if attempt < 2:
                        import time
                        time.sleep(1.5 * (attempt + 1))
                    else:
                        log.warning("Upsert failed for sub-batch after 3 attempts: %s", e)

        pct = min(100, int((batch_start + len(batch)) / total * 100))
        print(f"\r  ⬆  {upserted:>6} / {total} upserted ({pct}%)  ", end="", flush=True)

    print()  # newline after progress
    log.info("bio_knowledge seeding complete. %d / %d points upserted.", upserted, total)
    return upserted


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    dry = "--dry-run" in sys.argv
    print(f"🌊 VARUNA — CMLRE Species Profiles → Qdrant bio_knowledge Seeder")
    print(f"   Source JSON : {SPECIES_JSON_PATH}")
    print(f"   Source CSV  : {SPECIES_CSV_PATH}")
    print(f"   Collection  : {QDRANT_COLLECTION}")
    print(f"   Dry run     : {dry}")
    print()

    n = seed_bio_knowledge_sync(dry_run=dry)
    print(f"\n✅ Done — {n} species profiles seeded into Qdrant '{QDRANT_COLLECTION}'.")
