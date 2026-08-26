"""
VARUNA — CMLRE Dataset 1 Species Analyzer & Prioritization Engine
Analyzes cmlre_occurrence_clean.csv to extract, evaluate, and rank all unique species
across multiple scientific and operational factors:
  - Total occurrences & specimen abundance
  - Temporal span & recency (e.g. active in 2024-2025)
  - Vertical depth range (shallow pelagic vs. deep benthic)
  - Spatial geographic spread across Indian Ocean basins
  - Multi-dataset presence (voucher, eDNA, fishery, marine mammal)
  - Ecological & commercial importance classification

Outputs:
  - cmlre_species_ranked_all.csv (All unique species with comprehensive metrics)
  - cmlre_top_50_species.csv (Top prioritized species for Dataset 2 knowledge base)
  - cmlre_top_50_template.json (JSON template ready for FishBase/literature enrichment)
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from collections import defaultdict
import math

INPUT_CSV = Path("cmlre_occurrence_clean.csv")
OUTPUT_ALL_CSV = Path("cmlre_species_ranked_all.csv")
OUTPUT_TOP50_CSV = Path("cmlre_top_50_species.csv")
OUTPUT_TOP50_JSON = Path("cmlre_top_50_template.json")


def analyze_species():
    print("=" * 80)
    print("VARUNA — CMLRE DATASET 1 SPECIES ANALYSIS & RANKING")
    print("=" * 80)

    if not INPUT_CSV.exists():
        # Fallback to processed dir if root file not present
        alt_path = Path("cmlre_dataset_1/processed/cmlre_dataset_1_final.csv")
        if alt_path.exists():
            input_file = alt_path
        else:
            print(f"ERROR: File {INPUT_CSV} does not exist!")
            return
    else:
        input_file = INPUT_CSV

    with open(input_file, mode="r", encoding="utf-8") as f:
        raw_reader = csv.DictReader(f)
        raw_rows = list(raw_reader)

    # Normalize and strip whitespace from all dictionary keys & values
    rows = []
    for r in raw_rows:
        cleaned_r = {
            (k.strip() if k else ""): (v.strip() if isinstance(v, str) else v)
            for k, v in r.items()
            if k
        }
        rows.append(cleaned_r)

    print(f"Loaded {len(rows):,} total occurrence records from {input_file}")

    # Group by scientific_name
    species_data = defaultdict(lambda: {
        "occurrences": 0,
        "total_individuals": 0,
        "families": set(),
        "genera": set(),
        "scientific_name_ids": set(),
        "dataset_types": set(),
        "source_datasets": set(),
        "years": set(),
        "min_depths": [],
        "max_depths": [],
        "lats": [],
        "lons": [],
        "sample_occurrence_ids": [],
    })

    for r in rows:
        name = r.get("scientific_name") or r.get("species") or ""
        if not name:
            continue

        sp = species_data[name]
        sp["occurrences"] += 1

        # Count individuals
        try:
            cnt_val = r.get("individual_count") or "1"
            cnt = int(float(cnt_val)) if cnt_val else 1
            sp["total_individuals"] += cnt
        except ValueError:
            sp["total_individuals"] += 1

        # Taxonomy & metadata
        if r.get("family"): sp["families"].add(r["family"])
        if r.get("genus"): sp["genera"].add(r["genus"])
        if r.get("scientific_name_id"): sp["scientific_name_ids"].add(r["scientific_name_id"])
        if r.get("dataset_type"): sp["dataset_types"].add(r["dataset_type"])
        if r.get("source_dataset_name"): sp["source_datasets"].add(r["source_dataset_name"])

        # Year extraction
        date_str = r.get("event_date") or ""
        if date_str and len(date_str) >= 4:
            try:
                yr = int(date_str[:4])
                sp["years"].add(yr)
            except ValueError:
                pass

        # Depths
        try:
            d_min_str = r.get("minimum_depth_m") or "0"
            d_max_str = r.get("maximum_depth_m") or d_min_str
            d_min = float(d_min_str) if d_min_str else 0.0
            d_max = float(d_max_str) if d_max_str else d_min
            sp["min_depths"].append(d_min)
            sp["max_depths"].append(d_max)
        except ValueError:
            pass

        # Coordinates
        try:
            lat_str = r.get("decimal_latitude") or r.get("latitude") or ""
            lon_str = r.get("decimal_longitude") or r.get("longitude") or ""
            if lat_str and lon_str:
                lat = float(lat_str)
                lon = float(lon_str)
                sp["lats"].append(lat)
                sp["lons"].append(lon)
        except ValueError:
            pass

        if len(sp["sample_occurrence_ids"]) < 3:
            occ_id = r.get("occurrence_id") or r.get("occurrenceID") or ""
            if occ_id:
                sp["sample_occurrence_ids"].append(occ_id)

    print(f"Extracted {len(species_data):,} unique species.")

    if not species_data:
        print("ERROR: No species could be parsed. Check column names in CSV!")
        return

    # ── CALCULATE FACTORS & SCORES ─────────────────────────────────────────────
    ranked_species = []

    for name, sp in species_data.items():
        occ = sp["occurrences"]
        ind = sp["total_individuals"]
        years = sorted(sp["years"])
        min_year = years[0] if years else None
        max_year = years[-1] if years else None
        year_span = (max_year - min_year + 1) if (min_year and max_year) else 1

        # Depths
        all_d_mins = sp["min_depths"]
        all_d_maxs = sp["max_depths"]
        depth_min = min(all_d_mins) if all_d_mins else 0.0
        depth_max = max(all_d_maxs) if all_d_maxs else 0.0

        # Coordinates
        lats = sp["lats"]
        lons = sp["lons"]
        lat_min = min(lats) if lats else 0.0
        lat_max = max(lats) if lats else 0.0
        lon_min = min(lons) if lons else 0.0
        lon_max = max(lons) if lons else 0.0
        lat_span = round(lat_max - lat_min, 2)
        lon_span = round(lon_max - lon_min, 2)
        spatial_extent_deg = round(math.sqrt(lat_span**2 + lon_span**2), 2)

        # Dataset diversity
        dtypes = sorted(sp["dataset_types"])
        multi_dataset_bonus = len(dtypes) * 5.0

        # Recency score (bonus if observed in recent surveys 2020-2025)
        recency_bonus = 0.0
        if max_year and max_year >= 2024:
            recency_bonus = 15.0
        elif max_year and max_year >= 2020:
            recency_bonus = 8.0

        # Taxonomic Category classification
        family_str = ", ".join(sp["families"])
        category = "marine_organism"
        if "marine_mammal" in dtypes or any(f in family_str for f in ["Delphinidae", "Balaenopteridae", "Dugongidae", "Physeteridae"]):
            category = "marine_mammal"
        elif "fishery" in dtypes or any(f in family_str for f in ["Scombridae", "Clupeidae", "Dorosomatidae", "Carangidae", "Gempylidae", "Lutjanidae", "Nemipteridae", "Trichiuridae", "Engraulidae", "Priacanthidae", "Acropomatidae"]):
            category = "commercial_or_fishery_fish"
        elif any(f in family_str for f in ["Pandalidae", "Portunidae", "Palaemonidae", "Palinuridae", "Penaeidae", "Scyllaridae", "Nephropidae", "Munididae", "Galatheidae", "Lithodidae"]):
            category = "crustacean"
        elif any(f in family_str for f in ["Sepiidae", "Loliginidae", "Ommastrephidae", "Octopodidae", "Ancistrocheiridae"]):
            category = "cephalopod"
        elif any(f in family_str for f in ["Acroporidae", "Poritidae", "Pocilloporidae", "Goniasteridae", "Cidaridae", "Ophiacanthidae"]):
            category = "coral_or_benthic_invertebrate"
        elif "edna" in dtypes:
            category = "edna_biodiversity"

        # Multi-factor Priority Ranking Formula
        priority_score = round(
            (occ * 2.0)
            + (min(ind, 50) * 0.3)
            + (spatial_extent_deg * 1.5)
            + recency_bonus
            + multi_dataset_bonus
            + (10.0 if category in ["commercial_or_fishery_fish", "marine_mammal", "crustacean"] else 0.0),
            2
        )

        ranked_species.append({
            "scientific_name": name,
            "category": category,
            "priority_score": priority_score,
            "total_occurrences": occ,
            "total_individuals": ind,
            "dataset_types": "; ".join(dtypes),
            "earliest_year": min_year,
            "latest_year": max_year,
            "year_span": year_span,
            "depth_min_m": depth_min,
            "depth_max_m": depth_max,
            "lat_min": round(lat_min, 3),
            "lat_max": round(lat_max, 3),
            "lon_min": round(lon_min, 3),
            "lon_max": round(lon_max, 3),
            "spatial_extent_deg": spatial_extent_deg,
            "family": family_str,
            "genus": ", ".join(sp["genera"]),
            "scientific_name_id": ", ".join(sp["scientific_name_ids"]),
            "sample_occurrence_ids": ", ".join(sp["sample_occurrence_ids"]),
        })

    # Sort descending by priority_score
    ranked_species.sort(key=lambda x: x["priority_score"], reverse=True)

    # ── EXPORT ALL RANKED SPECIES CSV ──────────────────────────────────────────
    fieldnames = list(ranked_species[0].keys())
    with open(OUTPUT_ALL_CSV, mode="w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(ranked_species)
    print(f"\n✅ Saved all {len(ranked_species):,} ranked species to: {OUTPUT_ALL_CSV}")

    # ── EXPORT TOP 50 BALANCED SPECIES ─────────────────────────────────────────
    # Ensure representation across all ecological categories
    top_50 = []
    seen_names = set()

    # Category buckets to guarantee balanced coverage
    categories_target = {
        "commercial_or_fishery_fish": 20,
        "crustacean": 10,
        "cephalopod": 5,
        "marine_mammal": 5,
        "coral_or_benthic_invertebrate": 5,
        "edna_biodiversity": 5,
    }

    # Pass 1: Bucket collection
    for cat, target in categories_target.items():
        count = 0
        for sp in ranked_species:
            if sp["category"] == cat and sp["scientific_name"] not in seen_names:
                top_50.append(sp)
                seen_names.add(sp["scientific_name"])
                count += 1
                if count >= target:
                    break

    # Pass 2: Fill remaining up to 50 with highest priority overall
    for sp in ranked_species:
        if len(top_50) >= 50:
            break
        if sp["scientific_name"] not in seen_names:
            top_50.append(sp)
            seen_names.add(sp["scientific_name"])

    # Re-sort top 50 by priority
    top_50.sort(key=lambda x: x["priority_score"], reverse=True)

    with open(OUTPUT_TOP50_CSV, mode="w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(top_50)
    print(f"✅ Saved Top 50 balanced species to: {OUTPUT_TOP50_CSV}")

    # ── EXPORT TOP 50 JSON TEMPLATE READY FOR DATASET 2 ENRICHMENT ─────────────
    json_template = []
    for idx, sp in enumerate(top_50, 1):
        s_id = sp["scientific_name"].upper().replace(" ", "_").replace("(", "").replace(")", "").replace("-", "_")
        json_template.append({
            "species_id": s_id,
            "scientific_name": sp["scientific_name"],
            "common_name": "",
            "category": sp["category"],
            "family": sp["family"],
            "genus": sp["genus"],
            "scientific_name_id": sp["scientific_name_id"],
            "dataset_occurrences_count": sp["total_occurrences"],
            "observed_depth_min_m": sp["depth_min_m"],
            "observed_depth_max_m": sp["depth_max_m"],
            "observed_years_span": f"{sp['earliest_year']} - {sp['latest_year']}",
            "geographic_coverage": {
                "lat_bounds": [sp["lat_min"], sp["lat_max"]],
                "lon_bounds": [sp["lon_min"], sp["lon_max"]],
                "spatial_extent_deg": sp["spatial_extent_deg"],
            },
            "temperature_tolerance": {
                "preferred_range_min_c": None,
                "preferred_range_max_c": None,
                "thermal_stress_threshold_c": None,
            },
            "dissolved_oxygen_tolerance": {
                "hypoxia_threshold_umol_kg": None,
                "lethal_threshold_umol_kg": None,
            },
            "ecological_response": {
                "thermal_stress_behavior": None,
                "hypoxia_behavior": None,
                "commercial_or_conservation_role": None,
            },
            "evidence": [
                {
                    "source": "CMLRE / IndOBIS Dataset 1 Occurrence Data",
                    "source_type": "occurrence_database",
                    "reference": f"Recorded {sp['total_occurrences']} times in CMLRE {sp['dataset_types']} surveys ({sp['earliest_year']}-{sp['latest_year']}).",
                    "claim": f"Documented depth range: {sp['depth_min_m']}m to {sp['depth_max_m']}m across coordinates ({sp['lat_min']}N-{sp['lat_max']}N, {sp['lon_min']}E-{sp['lon_max']}E)."
                }
            ]
        })

    with open(OUTPUT_TOP50_JSON, mode="w", encoding="utf-8") as f:
        json.dump(json_template, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved Top 50 JSON enrichment template to: {OUTPUT_TOP50_JSON}")

    # ── PRINT CONSOLE SUMMARY ──────────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("🏆 TOP 20 SPECIES IN CMLRE DATASET 1 (BY MULTI-FACTOR RANKING)")
    print("=" * 80)
    print(f"{'#':<3} {'Scientific Name':<32} {'Category':<25} {'Occ':<5} {'Years':<12} {'Depth (m)':<12} {'Score':<6}")
    print("-" * 100)
    for idx, sp in enumerate(top_50[:20], 1):
        depth_str = f"{int(sp['depth_min_m'])}-{int(sp['depth_max_m'])}"
        years_str = f"{sp['earliest_year']}-{sp['latest_year']}"
        print(f"{idx:<3} {sp['scientific_name'][:30]:<32} {sp['category'][:23]:<25} {sp['total_occurrences']:<5} {years_str:<12} {depth_str:<12} {sp['priority_score']:<6.1f}")

    print("\n" + "=" * 80)
    print("ECOLOGICAL CATEGORY BREAKDOWN IN TOP 50:")
    cat_counts = defaultdict(int)
    for sp in top_50:
        cat_counts[sp["category"]] += 1
    for cat, count in cat_counts.items():
        print(f"  • {cat:<32}: {count} species")
    print("=" * 80)


if __name__ == "__main__":
    analyze_species()
