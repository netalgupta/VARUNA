"""
VARUNA — CMLRE Dataset 1 Ingestion Pipeline
Downloads, normalizes, validates, and merges the 5 locked IndOBIS / CMLRE datasets:
  1. Indian Ocean Marine Fauna Voucher Specimens (2,527 records)
  2. eDNA-derived metagenomic biodiversity — NE Arabian Sea (1,876 records)
  3. Deep-Sea Fishery Resources — 2024-2025 (821 records)
  4. Voucher Specimen collections in CMLRE Referral Centre (126 records)
  5. Marine Mammal sightings from Northern Indian Ocean (41 records)

Total Expected: ~5,391 occurrences across the Indian Ocean basin.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
import time
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("cmlre_dataset_1")

API_BASE = "https://api.obis.org/v3"
OUTPUT_DIR = Path("cmlre_dataset_1")
RAW_DIR = OUTPUT_DIR / "raw"
PROCESSED_DIR = OUTPUT_DIR / "processed"
REPORT_DIR = OUTPUT_DIR / "reports"

for d in (RAW_DIR, PROCESSED_DIR, REPORT_DIR):
    d.mkdir(parents=True, exist_ok=True)

# ── 5 LOCKED DATASETS ──────────────────────────────────────────────────────────
DATASETS = [
    {
        "id": "31d93350-097e-456c-8e12-8af658c1107b",
        "name": "Indian Ocean Marine Fauna Voucher Specimens (CMLRE)",
        "type": "voucher",
    },
    {
        "id": "3a7c83db-92b2-4e83-8131-c19a7ebc7de7",
        "name": "eDNA-derived metagenomic biodiversity data from seamount sediments of the northeastern Arabian Sea, India",
        "type": "edna",
    },
    {
        "id": "ea854d0a-62f3-4fa7-b195-d2249a2ef210",
        "name": "Occurrence and Molecular Records of Deep-Sea Fishery Resources from Indian Fish Landing Centres (2024-2025)",
        "type": "fishery",
    },
    {
        "id": "2b08b0bb-2d3a-4b43-83d4-8d549783f905",
        "name": "Voucher Specimen collections in CMLRE Referral Centre",
        "type": "voucher_referral",
    },
    {
        "id": "7c29617b-d6e3-4c95-b252-96c688551bcb",
        "name": "Marine Mammal sightings from Northern Indian Ocean",
        "type": "marine_mammal",
    },
]

SESSION = requests.Session()
SESSION.headers.update({
    "Accept": "application/json",
    "User-Agent": "VARUNA-CMLRE-Ingestion/2.0",
})


def fetch_json(url: str, params: Optional[Dict[str, Any]] = None, max_retries: int = 5) -> Dict[str, Any]:
    """Fetch JSON from OBIS API with exponential backoff retries."""
    for attempt in range(1, max_retries + 1):
        try:
            resp = SESSION.get(url, params=params, timeout=90)
            resp.raise_for_status()
            return resp.json()
        except Exception as err:
            log.warning("HTTP error on attempt %d/%d for %s: %s", attempt, max_retries, url, err)
            if attempt == max_retries:
                raise
            time.sleep(2 * attempt)
    return {}


def download_dataset(dataset_meta: Dict[str, str]) -> Tuple[pd.DataFrame, int]:
    """Download full dataset using OBIS v3 cursor-based ('after') pagination."""
    d_id = dataset_meta["id"]
    d_name = dataset_meta["name"]
    log.info("Downloading: %s (%s)", d_name, d_id)

    # 1. Fetch metadata
    meta = fetch_json(f"{API_BASE}/dataset/{d_id}")
    with open(RAW_DIR / f"{d_id}_metadata.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)

    # 2. Get expected occurrence count
    count_data = fetch_json(f"{API_BASE}/occurrence", {"datasetid": d_id, "size": 1})
    expected = count_data.get("total", 0)
    log.info("  Expected occurrence count from OBIS: %s", f"{expected:,}")

    # 3. Cursor-based pagination
    all_records: List[Dict[str, Any]] = []
    after_id: Optional[str] = None
    page = 1
    page_size = 1000

    while True:
        params: Dict[str, Any] = {"datasetid": d_id, "size": page_size}
        if after_id:
            params["after"] = after_id

        payload = fetch_json(f"{API_BASE}/occurrence", params=params)
        results = payload.get("results", [])
        if not results:
            break

        all_records.extend(results)
        log.info("  Page %d: fetched %d records | Progress: %d / %d", page, len(results), len(all_records), expected)

        if len(results) < page_size:
            break

        after_id = results[-1]["id"]
        page += 1
        time.sleep(0.15)

    log.info("  Download complete: %d records fetched", len(all_records))

    # Save raw JSON
    with open(RAW_DIR / f"{d_id}_occurrences.json", "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False)

    return pd.DataFrame(all_records), expected


def normalize_dataset(df: pd.DataFrame, dataset_meta: Dict[str, str]) -> pd.DataFrame:
    """Normalize raw OBIS columns into Darwin Core standardized schema."""
    if df.empty:
        return pd.DataFrame()

    def get_col(candidates: List[str]) -> pd.Series:
        for col in candidates:
            if col in df.columns:
                return df[col]
        return pd.Series([None] * len(df), index=df.index)

    norm = pd.DataFrame(index=df.index)
    norm["occurrence_id"] = get_col(["occurrenceID", "id"]).astype("string").str.strip()
    norm["event_id"] = get_col(["eventID", "eventId"]).astype("string").str.strip()
    norm["scientific_name"] = get_col(["scientificName"]).astype("string").str.strip()
    norm["scientific_name_id"] = get_col(["scientificNameID", "taxonID"]).astype("string").str.strip()
    norm["family"] = get_col(["family"]).astype("string").str.strip()
    norm["genus"] = get_col(["genus"]).astype("string").str.strip()
    norm["species"] = get_col(["species"]).astype("string").str.strip()

    # Spatial coordinates
    norm["decimal_latitude"] = pd.to_numeric(get_col(["decimalLatitude"]), errors="coerce")
    norm["decimal_longitude"] = pd.to_numeric(get_col(["decimalLongitude"]), errors="coerce")

    # Event date UTC
    norm["event_date"] = pd.to_datetime(get_col(["eventDate"]), errors="coerce", utc=True)

    # Vertical depth & counts
    norm["minimum_depth_m"] = pd.to_numeric(get_col(["minimumDepthInMeters"]), errors="coerce").fillna(0.0)
    norm["maximum_depth_m"] = pd.to_numeric(get_col(["maximumDepthInMeters"]), errors="coerce").fillna(10.0)
    norm["individual_count"] = pd.to_numeric(get_col(["individualCount", "organismQuantity"]), errors="coerce").fillna(1).astype(int)

    # Context & Provenance
    norm["occurrence_status"] = get_col(["occurrenceStatus"]).fillna("present").astype("string").str.strip()
    norm["basis_of_record"] = get_col(["basisOfRecord"]).fillna("PreservedSpecimen").astype("string").str.strip()
    norm["source_dataset_id"] = dataset_meta["id"]
    norm["source_dataset_name"] = dataset_meta["name"]
    norm["dataset_type"] = dataset_meta["type"]

    return norm


def main():
    log.info("================================================================================")
    log.info("VARUNA — CMLRE DATASET 1 INGESTION ENGINE (5 LOCKED DATASETS)")
    log.info("================================================================================")

    all_dfs: List[pd.DataFrame] = []
    summary_report: List[Dict[str, Any]] = []

    for d in DATASETS:
        raw_df, expected_count = download_dataset(d)
        norm_df = normalize_dataset(raw_df, d)

        # Save individual dataset CSV
        ind_path = PROCESSED_DIR / f"{d['type']}_{d['id']}.csv"
        norm_df.to_csv(ind_path, index=False)

        all_dfs.append(norm_df)
        summary_report.append({
            "dataset_id": d["id"],
            "dataset_name": d["name"],
            "dataset_type": d["type"],
            "expected_records": expected_count,
            "downloaded_records": len(raw_df),
            "normalized_records": len(norm_df),
        })

    # Merge all datasets
    merged = pd.concat(all_dfs, ignore_index=True)
    raw_merged_count = len(merged)
    log.info("Total records before deduplication: %d", raw_merged_count)

    # ── CLEANING & DEDUPLICATION ──────────────────────────────────────────────
    # Drop rows without coordinates or scientific names
    merged = merged.dropna(subset=["decimal_latitude", "decimal_longitude", "scientific_name"])
    
    # Coordinate boundary filter (WGS84 valid bounds)
    valid_coords = (
        (merged["decimal_latitude"] >= -90) & (merged["decimal_latitude"] <= 90) &
        (merged["decimal_longitude"] >= -180) & (merged["decimal_longitude"] <= 180)
    )
    merged = merged[valid_coords]

    # Swap reversed depths if min > max
    swap_mask = (merged["minimum_depth_m"] > merged["maximum_depth_m"])
    if swap_mask.any():
        merged.loc[swap_mask, ["minimum_depth_m", "maximum_depth_m"]] = (
            merged.loc[swap_mask, ["maximum_depth_m", "minimum_depth_m"]].values
        )

    # Deduplicate on occurrence_id
    before_dedup = len(merged)
    merged = merged.drop_duplicates(subset=["occurrence_id"], keep="first").reset_index(drop=True)
    dedup_removed = before_dedup - len(merged)
    log.info("Deduplication removed: %d duplicate rows | Clean records: %d", dedup_removed, len(merged))

    # Sort deterministically
    merged = merged.sort_values(by=["event_date", "scientific_name"], na_position="last").reset_index(drop=True)

    # ── SAVE FINAL CSV & PARQUET ──────────────────────────────────────────────
    final_csv = PROCESSED_DIR / "cmlre_dataset_1_final.csv"
    final_parquet = PROCESSED_DIR / "cmlre_dataset_1_final.parquet"

    merged.to_csv(final_csv, index=False)
    merged.to_parquet(final_parquet, index=False)

    # Also save to root for easy app access
    merged.to_csv("cmlre_occurrence_clean.csv", index=False)
    merged.to_parquet("cmlre_occurrence_clean.parquet", index=False)

    # Save reports
    pd.DataFrame(summary_report).to_csv(REPORT_DIR / "download_summary.csv", index=False)

    metadata = {
        "dataset_name": "VARUNA Dataset 1 — CMLRE Marine Species Occurrences",
        "source": "IndOBIS / OBIS",
        "sources_merged": DATASETS,
        "total_records_ingested": len(merged),
        "unique_scientific_names": int(merged["scientific_name"].nunique()),
        "date_range": [
            str(merged["event_date"].dropna().min()),
            str(merged["event_date"].dropna().max()),
        ],
        "type_distribution": merged["dataset_type"].value_counts().to_dict(),
    }
    with open(REPORT_DIR / "dataset_1_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    log.info("================================================================================")
    log.info("✅ CMLRE DATASET 1 INGESTION COMPLETE!")
    log.info("  Total Clean Records: %d", len(merged))
    log.info("  Unique Species: %d", merged["scientific_name"].nunique())
    log.info("  Saved CSV:     %s", final_csv)
    log.info("  Saved Parquet: %s", final_parquet)
    log.info("  Root Mirrored: cmlre_occurrence_clean.csv")
    log.info("================================================================================")


if __name__ == "__main__":
    main()