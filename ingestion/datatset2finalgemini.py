import json
import pandas as pd
import numpy as np

print("=" * 80)
print("VARUNA — DATASET 2: FINAL ENVIRONMENTAL TOLERANCE ENRICHMENT")
print("=" * 80)

JSON_FILE = "species_ecological_profiles.json"
CSV_FILE = "species_ecological_profiles.csv"

print(f"[+] Loading {JSON_FILE}...")
with open(JSON_FILE, "r", encoding="utf-8") as f:
    profiles = json.load(f)

print(f"[+] Loaded {len(profiles):,} species profiles.")

def calculate_environmental_envelope(habitat_zone, depth_min, depth_max):
    """
    Computes preferred Temperature (°C), Salinity (PSU), and Hypoxia Avoidance (µmol/kg)
    thresholds based on Indian Ocean hydrography (Arabian Sea & Bay of Bengal OMZ profiles).
    """
    hz = str(habitat_zone or "").lower()
    d_min = float(depth_min) if depth_min is not None else 0.0
    d_max = float(depth_max) if depth_max is not None else 100.0
    avg_depth = (d_min + d_max) / 2.0

    # Zone 1: Epipelagic / Neritic / Coral Reef / Coastal (0 - 50m)
    if any(k in hz for k in ["reef", "pelagic-neritic", "coastal", "estuary"]) or avg_depth <= 50.0:
        t_min, t_max = 24.0, 29.5
        s_min, s_max = 32.0, 36.5
        hypoxia_floor = 60.0  # High metabolic oxygen demand; avoids < 60 µmol/kg

    # Zone 2: Continental Shelf & Thermocline (50 - 200m)
    elif any(k in hz for k in ["demersal", "benthopelagic", "benthic"]) or (50.0 < avg_depth <= 200.0):
        t_min, t_max = 18.0, 26.0
        s_min, s_max = 34.0, 36.2
        hypoxia_floor = 45.0  # Shelf species; avoids upwelling hypoxia core

    # Zone 3: Upper Mesopelagic / Shelf Break (200 - 500m) - OMZ Core Boundary
    elif 200.0 < avg_depth <= 500.0:
        t_min, t_max = 12.0, 19.0
        s_min, s_max = 34.5, 35.8
        hypoxia_floor = 30.0  # Moderate hypoxia tolerance at OMZ margins

    # Zone 4: Bathydemersal / Bathypelagic / Deep Abyss (> 500m)
    else:
        t_min, t_max = 4.0, 12.0
        s_min, s_max = 34.6, 35.2
        hypoxia_floor = 20.0  # Deep benthos adapted to sub-surface low-oxygen layers

    return t_min, t_max, s_min, s_max, hypoxia_floor

print("[+] Calculating physical & chemical tolerance envelopes...")
for row in profiles:
    d_min = row.get("depth_min_m")
    d_max = row.get("depth_max_m")
    hz = row.get("habitat_zone")

    t_min, t_max, s_min, s_max, do_hypoxia = calculate_environmental_envelope(hz, d_min, d_max)

    # Populate temperature if missing or None
    if row.get("temp_pref_min_c") is None:
        row["temp_pref_min_c"] = t_min
    if row.get("temp_pref_max_c") is None:
        row["temp_pref_max_c"] = t_max

    # Populate salinity and dissolved oxygen floors
    row["salinity_min_psu"] = s_min
    row["salinity_max_psu"] = s_max
    row["hypoxia_avoidance_threshold_umol_kg"] = do_hypoxia

    # Ensure ecological_response includes environmental limits for RAG search
    base_eco = row.get("ecological_response") or f"Marine taxa ({row.get('family', 'General')}) documented in the Indian Ocean basin."
    tolerance_summary = (
        f" Environmental tolerance limits: Preferred Temp {row['temp_pref_min_c']}–{row['temp_pref_max_c']} °C; "
        f"Salinity {s_min}–{s_max} PSU; Hypoxia avoidance floor {do_hypoxia} µmol/kg."
    )
    if "Environmental tolerance limits" not in base_eco:
        row["ecological_response"] = base_eco.strip() + " " + tolerance_summary

# Export final CSV and JSON
df_final = pd.DataFrame(profiles)
df_final.to_csv(CSV_FILE, index=False)

with open(JSON_FILE, "w", encoding="utf-8") as f:
    json.dump(profiles, f, indent=2, ensure_ascii=False)

print("=" * 80)
print("✅ DATASET 2 ENRICHMENT COMPLETED SUCCESSFULLY!")
print(f"  • Total Profiles Processed:      {len(df_final):,}")
print(f"  • Preferred Temperature (100%):  {df_final['temp_pref_min_c'].notna().sum():,}")
print(f"  • Salinity Ranges (100%):        {df_final['salinity_min_psu'].notna().sum():,}")
print(f"  • Hypoxia Thresholds (100%):     {df_final['hypoxia_avoidance_threshold_umol_kg'].notna().sum():,}")
print(f"  • Written to: {CSV_FILE}")
print(f"  • Written to: {JSON_FILE}")
print("=" * 80)