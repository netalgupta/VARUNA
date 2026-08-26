"""
VARUNA — Seed Species Ecological Profiles into Supabase PostgreSQL
Ingests all 20,468 species physiological profiles into `public.species_ecological_profiles` on Supabase DB1.
"""
from __future__ import annotations

import os
import sys
import time
import math
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.rows import dict_row
import pandas as pd

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_BACKEND_ROOT))

from src.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("varuna.ingestion.species_profiles")

_REPO_ROOT = _BACKEND_ROOT.parent
_CSV_PATH = _REPO_ROOT / "data" / "species_ecological_profiles_master.csv"

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS public.species_ecological_profiles (
    id                                  BIGSERIAL PRIMARY KEY,
    species_id                          VARCHAR(255) NOT NULL UNIQUE,
    scientific_name                     VARCHAR(255) NOT NULL,
    aphia_id_lsid                       VARCHAR(255),
    family                              VARCHAR(100),
    genus                               VARCHAR(100),
    common_name                         VARCHAR(255),
    habitat_zone                        VARCHAR(100),
    depth_min_m                         DOUBLE PRECISION,
    depth_max_m                         DOUBLE PRECISION,
    ecological_response                 TEXT,
    evidence_source                     VARCHAR(100),
    temp_pref_min_c                     DOUBLE PRECISION,
    temp_pref_max_c                     DOUBLE PRECISION,
    salinity_min_psu                    DOUBLE PRECISION,
    salinity_max_psu                    DOUBLE PRECISION,
    hypoxia_avoidance_threshold_umol_kg DOUBLE PRECISION,
    created_at                          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_species_eco_scientific_name 
    ON public.species_ecological_profiles (scientific_name);
CREATE INDEX IF NOT EXISTS idx_species_eco_family 
    ON public.species_ecological_profiles (family);
CREATE INDEX IF NOT EXISTS idx_species_eco_genus 
    ON public.species_ecological_profiles (genus);
CREATE INDEX IF NOT EXISTS idx_species_eco_habitat_zone 
    ON public.species_ecological_profiles (habitat_zone);
CREATE INDEX IF NOT EXISTS idx_species_eco_temp_max 
    ON public.species_ecological_profiles (temp_pref_max_c);
CREATE INDEX IF NOT EXISTS idx_species_eco_hypoxia 
    ON public.species_ecological_profiles (hypoxia_avoidance_threshold_umol_kg);
"""


def _sanitize(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    if isinstance(val, str):
        v = val.strip()
        return v if v else None
    return val


def seed_species_profiles():
    if not _CSV_PATH.exists():
        log.error("CSV file not found at: %s", _CSV_PATH)
        return

    log.info("Loading species dataset from: %s", _CSV_PATH)
    df = pd.read_csv(_CSV_PATH)
    total_rows = len(df)
    log.info("Found %d species profile records in master CSV", total_rows)

    db_url = settings.pg_dsn_db1 or settings.pg_dsn
    if not db_url:
        log.error("Missing PG_DSN_DB1 in environment")
        return

    log.info("Connecting to Supabase DB1...")
    with psycopg.connect(db_url, autocommit=True) as conn:
        with conn.cursor() as cur:
            log.info("Creating public.species_ecological_profiles table and indices...")
            cur.execute(CREATE_TABLE_SQL)
            log.info("Table and indices ready.")

        # Batch insert
        batch_size = 2000
        rows_inserted = 0
        t0 = time.perf_counter()

        insert_sql = """
        INSERT INTO public.species_ecological_profiles (
            species_id, scientific_name, aphia_id_lsid, family, genus, common_name,
            habitat_zone, depth_min_m, depth_max_m, ecological_response, evidence_source,
            temp_pref_min_c, temp_pref_max_c, salinity_min_psu, salinity_max_psu,
            hypoxia_avoidance_threshold_umol_kg
        ) VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s
        )
        ON CONFLICT (species_id) DO UPDATE SET
            scientific_name = EXCLUDED.scientific_name,
            aphia_id_lsid = EXCLUDED.aphia_id_lsid,
            family = EXCLUDED.family,
            genus = EXCLUDED.genus,
            common_name = EXCLUDED.common_name,
            habitat_zone = EXCLUDED.habitat_zone,
            depth_min_m = EXCLUDED.depth_min_m,
            depth_max_m = EXCLUDED.depth_max_m,
            ecological_response = EXCLUDED.ecological_response,
            evidence_source = EXCLUDED.evidence_source,
            temp_pref_min_c = EXCLUDED.temp_pref_min_c,
            temp_pref_max_c = EXCLUDED.temp_pref_max_c,
            salinity_min_psu = EXCLUDED.salinity_min_psu,
            salinity_max_psu = EXCLUDED.salinity_max_psu,
            hypoxia_avoidance_threshold_umol_kg = EXCLUDED.hypoxia_avoidance_threshold_umol_kg;
        """

        records = []
        for _, row in df.iterrows():
            rec = (
                _sanitize(row.get("species_id")),
                _sanitize(row.get("scientific_name")),
                _sanitize(row.get("aphia_id_lsid")),
                _sanitize(row.get("family")),
                _sanitize(row.get("genus")),
                _sanitize(row.get("common_name")),
                _sanitize(row.get("habitat_zone")),
                _sanitize(row.get("depth_min_m")),
                _sanitize(row.get("depth_max_m")),
                _sanitize(row.get("ecological_response")),
                _sanitize(row.get("evidence_source")),
                _sanitize(row.get("temp_pref_min_c")),
                _sanitize(row.get("temp_pref_max_c")),
                _sanitize(row.get("salinity_min_psu")),
                _sanitize(row.get("salinity_max_psu")),
                _sanitize(row.get("hypoxia_avoidance_threshold_umol_kg")),
            )
            records.append(rec)

        with conn.cursor() as cur:
            for i in range(0, len(records), batch_size):
                chunk = records[i : i + batch_size]
                cur.executemany(insert_sql, chunk)
                rows_inserted += len(chunk)
                log.info("Progress: %d / %d rows inserted (%.1f%%)", rows_inserted, total_rows, (rows_inserted / total_rows) * 100)

        t_elapsed = round(time.perf_counter() - t0, 2)
        log.info("✅ Successfully ingested all %d species ecological profiles into Supabase DB1 in %.2f s!", rows_inserted, t_elapsed)

        # Verification count
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT COUNT(*) AS total_count FROM public.species_ecological_profiles;")
            res = cur.fetchone()
            log.info("Verification row count on Supabase: %s", res)


if __name__ == "__main__":
    seed_species_profiles()
