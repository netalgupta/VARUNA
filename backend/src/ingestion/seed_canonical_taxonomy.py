"""
VARUNA - canonical_taxonomy table migration + seed
Creates the canonical_taxonomy table and seeds it from marine_biodiversity.scientific_name
and species_ecological_profiles. This is the ONLY authority for BIO-002/BIO-003 checks.

Run once against both DB shards:
  venv/Scripts/python src/ingestion/seed_canonical_taxonomy.py
"""
from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_BACKEND))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")



log = logging.getLogger("varuna.ingest.taxonomy")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

# ── DDL ───────────────────────────────────────────────────────────────────────

CREATE_TAXONOMY_TABLE = """
CREATE TABLE IF NOT EXISTS public.canonical_taxonomy (
    taxon_id            BIGSERIAL PRIMARY KEY,
    scientific_name     VARCHAR(255) NOT NULL,
    accepted_name       VARCHAR(255),
    kingdom             VARCHAR(100) DEFAULT 'Animalia',
    phylum              VARCHAR(100),
    class_name          VARCHAR(100),
    order_name          VARCHAR(100),
    family              VARCHAR(100),
    genus               VARCHAR(100),
    species             VARCHAR(100),
    authority           VARCHAR(255),
    taxonomic_status    VARCHAR(50)  DEFAULT 'accepted',
    valid_from          DATE,
    valid_to            DATE,
    created_at          TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(scientific_name)
);
"""

CREATE_INDEX = """
CREATE INDEX IF NOT EXISTS idx_canonical_taxonomy_scientific_name
    ON public.canonical_taxonomy (LOWER(scientific_name));
"""

# ── Seed from marine_biodiversity ────────────────────────────────────────────

SEED_FROM_BIODIVERSITY = """
INSERT INTO public.canonical_taxonomy
    (scientific_name, accepted_name, kingdom, phylum, class_name, order_name, family, genus, species, taxonomic_status)
SELECT DISTINCT ON (b.scientific_name)
    b.scientific_name,
    b.scientific_name                  AS accepted_name,
    COALESCE(b.kingdom, 'Animalia')   AS kingdom,
    b.phylum,
    b."class"                          AS class_name,
    b."order"                          AS order_name,
    b.family,
    b.genus,
    b.species,
    'accepted'                         AS taxonomic_status
FROM public.marine_biodiversity b
WHERE b.scientific_name IS NOT NULL
  AND b.scientific_name != ''
ORDER BY b.scientific_name, b.id DESC
ON CONFLICT (scientific_name) DO UPDATE
    SET
        family           = EXCLUDED.family,
        genus            = EXCLUDED.genus,
        species          = EXCLUDED.species,
        phylum           = EXCLUDED.phylum,
        class_name       = EXCLUDED.class_name,
        order_name       = EXCLUDED.order_name,
        accepted_name    = EXCLUDED.accepted_name,
        taxonomic_status = EXCLUDED.taxonomic_status;
"""

# ── Seed from species_ecological_profiles ────────────────────────────────────

SEED_FROM_PROFILES = """
INSERT INTO public.canonical_taxonomy
    (scientific_name, accepted_name, family, genus, taxonomic_status)
SELECT DISTINCT ON (s.scientific_name)
    s.scientific_name,
    s.scientific_name AS accepted_name,
    s.family,
    SPLIT_PART(s.scientific_name, ' ', 1) AS genus,
    'accepted' AS taxonomic_status
FROM public.species_ecological_profiles s
WHERE s.scientific_name IS NOT NULL
  AND s.scientific_name != ''
ORDER BY s.scientific_name
ON CONFLICT (scientific_name) DO UPDATE
    SET
        family = COALESCE(EXCLUDED.family, canonical_taxonomy.family),
        genus  = COALESCE(EXCLUDED.genus,  canonical_taxonomy.genus);
"""

VERIFY_QUERY = """
SELECT COUNT(*) AS total_taxa,
       COUNT(DISTINCT family) AS families,
       COUNT(DISTINCT genus) AS genera
FROM public.canonical_taxonomy;
"""


def _migrate_shard(conn_str: str, shard_name: str, primary_conn_str: Optional[str] = None) -> None:
    import psycopg
    import psycopg.rows
    log.info("Connecting to %s ...", shard_name)
    with psycopg.connect(conn_str, row_factory=psycopg.rows.dict_row) as conn:
        log.info("[%s] Creating canonical_taxonomy table ...", shard_name)
        conn.execute(CREATE_TAXONOMY_TABLE)
        conn.execute(CREATE_INDEX)

        # Check if marine_biodiversity exists
        has_bio = conn.execute(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marine_biodiversity')"
        ).fetchone()["exists"]

        if has_bio:
            log.info("[%s] Seeding from marine_biodiversity ...", shard_name)
            conn.execute(SEED_FROM_BIODIVERSITY)
        elif primary_conn_str:
            log.info("[%s] Copying canonical_taxonomy records from DB1 ...", shard_name)
            with psycopg.connect(primary_conn_str, row_factory=psycopg.rows.dict_row) as pconn:
                taxa_rows = pconn.execute("SELECT * FROM public.canonical_taxonomy").fetchall()
                if taxa_rows:
                    cols = [k for k in taxa_rows[0].keys() if k != "taxon_id"]
                    col_names = ", ".join(cols)
                    placeholders = ", ".join([f"%({c})s" for c in cols])
                    insert_sql = f"""
                    INSERT INTO public.canonical_taxonomy ({col_names})
                    VALUES ({placeholders})
                    ON CONFLICT (scientific_name) DO NOTHING;
                    """
                    for tr in taxa_rows:
                        conn.execute(insert_sql, tr)

        # Check if species_ecological_profiles exists
        has_eco = conn.execute(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'species_ecological_profiles')"
        ).fetchone()["exists"]
        if has_eco:
            log.info("[%s] Seeding from species_ecological_profiles ...", shard_name)
            conn.execute(SEED_FROM_PROFILES)

        row = conn.execute(VERIFY_QUERY).fetchone()
        log.info(
            "[%s] canonical_taxonomy: %d taxa | %d families | %d genera",
            shard_name, row["total_taxa"], row["families"], row["genera"]
        )
        conn.commit()


def main() -> None:
    from src.config import settings

    shards = [
        (settings.pg_dsn_db1, "DB1 (primary)", None),
        (settings.pg_dsn_db2, "DB2 (secondary)", settings.pg_dsn_db1),
    ]

    for conn_str, name, primary_conn in shards:
        try:
            _migrate_shard(conn_str, name, primary_conn_str=primary_conn)
        except Exception as e:
            log.error("[%s] Migration failed: %s", name, e)

    log.info("canonical_taxonomy migration complete.")


if __name__ == "__main__":
    main()
