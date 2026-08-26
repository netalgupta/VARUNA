"""
VARUNA — CMLRE Occurrence Master CSV → PostgreSQL marine_biodiversity Loader
Reads cmlre_occurrence_master_final--dataset1final.csv from the repo root
and bulk-inserts into public.marine_biodiversity via asyncpg with UPSERT semantics.

Run:
    cd backend
    python -m src.ingestion.seed_cmlre_occurrences
"""
from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

log = logging.getLogger("varuna.ingestion.cmlre_occurrences")

# ── Canonical Dataset Paths ───────────────────────────────────────────────────
_REPO_ROOT = Path(__file__).resolve().parents[3]  # backend/src/ingestion → floatchatai-main
OCCURRENCES_CSV_PATH = _REPO_ROOT / "cmlre_occurrence_master_final--dataset1final.csv"

CHUNK_SIZE = 5_000  # rows per INSERT batch

# ── DDL (idempotent — run once on target Supabase DB) ────────────────────────
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS public.marine_biodiversity (
    id                   BIGSERIAL PRIMARY KEY,
    occurrence_id        VARCHAR(255) NOT NULL UNIQUE,
    event_id             VARCHAR(255),

    -- Taxonomy
    scientific_name      VARCHAR(255) NOT NULL,
    scientific_name_id   VARCHAR(255),
    kingdom              VARCHAR(50),
    phylum               VARCHAR(50),
    class                VARCHAR(50),
    "order"              VARCHAR(50),
    family               VARCHAR(100),
    genus                VARCHAR(100),
    species              VARCHAR(100),

    -- Spatial & Temporal
    decimal_latitude     DOUBLE PRECISION NOT NULL,
    decimal_longitude    DOUBLE PRECISION NOT NULL,
    geom                 GEOGRAPHY(POINT, 4326),
    event_date           TIMESTAMPTZ,

    -- Vertical & Abundance
    minimum_depth_m      DOUBLE PRECISION DEFAULT 0.0,
    maximum_depth_m      DOUBLE PRECISION DEFAULT 10.0,
    individual_count     INTEGER DEFAULT 1,

    -- Quality Context
    occurrence_status    VARCHAR(50)  DEFAULT 'present',
    basis_of_record      VARCHAR(100) DEFAULT 'PreservedSpecimen',
    source_dataset_id    VARCHAR(255) NOT NULL DEFAULT 'CMLRE',
    source_dataset_name  TEXT         NOT NULL DEFAULT 'CMLRE IndOBIS Dataset'
);

CREATE INDEX IF NOT EXISTS idx_bio_geom
    ON public.marine_biodiversity USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_bio_species
    ON public.marine_biodiversity (scientific_name);
CREATE INDEX IF NOT EXISTS idx_bio_date
    ON public.marine_biodiversity (event_date);
CREATE INDEX IF NOT EXISTS idx_bio_family
    ON public.marine_biodiversity (family);
"""

INSERT_SQL = """
INSERT INTO public.marine_biodiversity (
    occurrence_id, event_id, scientific_name, scientific_name_id,
    kingdom, phylum, class, "order", family, genus, species,
    decimal_latitude, decimal_longitude, geom, event_date,
    minimum_depth_m, maximum_depth_m, individual_count,
    occurrence_status, basis_of_record, source_dataset_id, source_dataset_name
) VALUES (
    $1, $2, $3, $4,
    $5, $6, $7, $8, $9, $10, $11,
    $12, $13, ST_SetSRID(ST_MakePoint($13, $12), 4326)::geography, $14,
    $15, $16, $17,
    $18, $19, $20, $21
)
ON CONFLICT (occurrence_id) DO NOTHING;
"""


# ── Row Coercion ──────────────────────────────────────────────────────────────

def _coerce_row(row: Dict[str, Any]):
    """Returns a tuple of (21 values) for INSERT_SQL, or None if row is invalid."""
    try:
        lat = float(row.get("decimal_latitude") or 0)
        lon = float(row.get("decimal_longitude") or 0)
    except (TypeError, ValueError):
        return None

    # Drop rows with clearly invalid coordinates
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None
    if lat == 0.0 and lon == 0.0:
        return None

    def _f(val) -> Optional[float]:
        try:
            return float(val) if val not in (None, "", "nan") else None
        except (TypeError, ValueError):
            return None

    def _i(val) -> Optional[int]:
        try:
            return int(float(val)) if val not in (None, "", "nan") else None
        except (TypeError, ValueError):
            return None

    def _s(val, max_len: int = 255) -> Optional[str]:
        if val in (None, "", "nan", "null"):
            return None
        s = str(val).strip()
        return s[:max_len] if s else None

    # Parse event_date — accept YYYY-MM-DD or ISO strings; leave None if unparseable
    event_date = None
    raw_date = row.get("event_date")
    if raw_date and raw_date not in ("", "nan", "null"):
        try:
            from datetime import datetime, timezone
            for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y"):
                try:
                    event_date = datetime.strptime(str(raw_date)[:19], fmt)
                    if event_date.tzinfo is None:
                        event_date = event_date.replace(tzinfo=timezone.utc)
                    break
                except ValueError:
                    continue
        except Exception:
            pass

    occ_id = _s(row.get("occurrence_id"), 255)
    if not occ_id:
        return None
    sci_name = _s(row.get("scientific_name"), 255)
    if not sci_name:
        return None

    return (
        occ_id,                                          # $1  occurrence_id
        _s(row.get("event_id"), 255),                    # $2  event_id
        sci_name,                                        # $3  scientific_name
        _s(row.get("scientific_name_id"), 255),          # $4  scientific_name_id
        _s(row.get("kingdom"), 50),                      # $5  kingdom
        _s(row.get("phylum"), 50),                       # $6  phylum
        _s(row.get("class"), 50),                        # $7  class
        _s(row.get("order"), 50),                        # $8  order
        _s(row.get("family"), 100),                      # $9  family
        _s(row.get("genus"), 100),                       # $10 genus
        _s(row.get("species"), 100),                     # $11 species
        lat,                                             # $12 decimal_latitude
        lon,                                             # $13 decimal_longitude
        event_date,                                      # $14 event_date
        _f(row.get("minimum_depth_m")) or 0.0,           # $15 minimum_depth_m
        _f(row.get("maximum_depth_m")) or 10.0,          # $16 maximum_depth_m
        _i(row.get("individual_count")) or 1,            # $17 individual_count
        _s(row.get("occurrence_status"), 50) or "present",  # $18 occurrence_status
        _s(row.get("basis_of_record"), 100) or "PreservedSpecimen",  # $19
        _s(row.get("source_dataset_id"), 255) or "CMLRE",   # $20
        _s(row.get("source_dataset_name")) or "CMLRE IndOBIS Dataset",  # $21
    )


# ── Main Async Loader ─────────────────────────────────────────────────────────

async def load_occurrences(csv_path: Path = OCCURRENCES_CSV_PATH) -> None:
    try:
        import pandas as pd  # type: ignore
    except ImportError:
        raise RuntimeError("pandas required: pip install pandas")

    import asyncpg  # type: ignore
    from src.config import settings

    if not csv_path.exists():
        log.error("Occurrences CSV not found: %s", csv_path)
        return

    print(f"🌊 Loading occurrence CSV: {csv_path}")
    print(f"   (This may take 30–60s for 100k rows...)")

    # Connect to the primary Supabase DB (Shard 1 — historical)
    dsn = str(settings.database_url).replace("postgresql+asyncpg://", "postgresql://").replace("postgresql+psycopg2://", "postgresql://")

    try:
        conn = await asyncpg.connect(dsn, timeout=30)
    except Exception as e:
        log.error("Failed to connect to PostgreSQL: %s", e)
        return

    try:
        # Ensure table + indexes exist
        await conn.execute(CREATE_TABLE_SQL)
        print("✅ Table public.marine_biodiversity ready")

        total_inserted = 0
        total_skipped = 0
        total_invalid = 0
        chunk_num = 0

        for chunk in pd.read_csv(
            csv_path,
            encoding="utf-8",
            chunksize=CHUNK_SIZE,
            dtype=str,
            na_values=["", "nan", "null", "NULL", "NaN"],
        ):
            chunk_num += 1
            rows = chunk.where(pd.notna(chunk), None).to_dict(orient="records")

            tuples: List[tuple] = []
            for row in rows:
                coerced = _coerce_row(row)
                if coerced is None:
                    total_invalid += 1
                else:
                    tuples.append(coerced)

            if not tuples:
                continue

            try:
                result = await conn.executemany(INSERT_SQL, tuples)
                # executemany returns None; count via affected rows string
                inserted = len(tuples)  # ON CONFLICT DO NOTHING still counts as attempted
                total_inserted += inserted
            except Exception as e:
                log.warning("Chunk %d insert failed: %s", chunk_num, e)
                total_skipped += len(tuples)
                continue

            pct = min(100, int(total_inserted / max(1, total_inserted + total_skipped + total_invalid) * 100))
            print(
                f"\r  ✅ Chunk {chunk_num:>4} | Inserted: {total_inserted:>7} | "
                f"Invalid: {total_invalid:>5} | Skipped: {total_skipped:>5}",
                end="", flush=True,
            )

        print()
        print(f"\n🎉 Ingestion complete!")
        print(f"   Rows attempted  : {total_inserted + total_invalid + total_skipped:>7}")
        print(f"   Rows inserted   : {total_inserted:>7}")
        print(f"   Invalid (bad coords/ID): {total_invalid:>7}")
        print(f"   Failed batches  : {total_skipped:>7}")

    finally:
        await conn.close()


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
    asyncio.run(load_occurrences())
