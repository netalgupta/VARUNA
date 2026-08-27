import json
import duckdb
import pandas as pd

print("=" * 80)
print("VARUNA — DATASET 2: RECOVERY & ENRICHMENT PIPELINE (PHASE 2)")
print("=" * 80)

# 1. Load current Dataset 2
print("[+] Loading current Dataset 2 profiles...")
with open("species_ecological_profiles.json", "r", encoding="utf-8") as f:
    profiles = json.load(f)

df = pd.DataFrame(profiles)
unmatched_mask = df["habitat_zone"].isna() & df["ecological_response"].isna()
unmatched_df = df[unmatched_mask].copy()
print(f"[+] Total species in catalog: {len(df):,}")
print(f"[+] Already enriched: {len(df) - len(unmatched_df):,}")
print(f"[+] Targeted for recovery: {len(unmatched_df):,}")

# 2. Query FishBase/SeaLifeBase Synonyms via DuckDB
FB_SYN_URL = "https://data.source.coop/cboettig/fishbase/fb/v24.07/parquet/synonyms.parquet"
SLB_SYN_URL = "https://data.source.coop/cboettig/fishbase/slb/v24.07/parquet/synonyms.parquet"
FB_SP_URL = "https://data.source.coop/cboettig/fishbase/fb/v24.07/parquet/species.parquet"
SLB_SP_URL = "https://data.source.coop/cboettig/fishbase/slb/v24.07/parquet/species.parquet"

con = duckdb.connect()

print("[+] Loading Synonyms and Species tables from DuckDB...")
synonyms_query = f"""
    WITH combined_syn AS (
        SELECT SynGenus AS genus, SynSpecies AS species, SpecCode, 'FishBase' as src 
        FROM read_parquet('{FB_SYN_URL}')
        UNION ALL
        SELECT SynGenus AS genus, SynSpecies AS species, SpecCode, 'SeaLifeBase' as src 
        FROM read_parquet('{SLB_SYN_URL}')
    ),
    combined_sp AS (
        SELECT SpecCode, Genus, Species, FBname, DemersPelag, DepthRangeShallow, DepthRangeDeep, Comments, 'FishBase' as src 
        FROM read_parquet('{FB_SP_URL}')
        UNION ALL
        SELECT SpecCode, Genus, Species, FBname, DemersPelag, DepthRangeShallow, DepthRangeDeep, Comments, 'SeaLifeBase' as src 
        FROM read_parquet('{SLB_SP_URL}')
    )
    SELECT 
        TRIM(s.genus) || ' ' || TRIM(s.species) AS input_name,
        sp.FBname,
        sp.DemersPelag,
        sp.DepthRangeShallow,
        sp.DepthRangeDeep,
        sp.Comments,
        sp.src
    FROM combined_syn s
    JOIN combined_sp sp ON s.SpecCode = sp.SpecCode AND s.src = sp.src
    WHERE sp.DemersPelag IS NOT NULL OR sp.Comments IS NOT NULL
"""
syn_matches = con.execute(synonyms_query).fetchdf()
syn_matches = syn_matches.drop_duplicates(subset=["input_name"]).reset_index(drop=True)

# 3. Match unmatched by Synonym
merged_syn = pd.merge(
    unmatched_df[["scientific_name"]],
    syn_matches,
    left_on="scientific_name",
    right_on="input_name",
    how="inner"
)
print(f"[+] Recovered {len(merged_syn):,} species via Synonym resolution.")

# 4. Compute Genus-Level Fallbacks for the remainder
print("[+] Computing Genus-level median depths and dominant habitat zones...")
genus_stats = con.execute(f"""
    WITH combined_sp AS (
        SELECT Genus, DemersPelag, DepthRangeShallow, DepthRangeDeep, Comments
        FROM read_parquet('{FB_SP_URL}')
        UNION ALL
        SELECT Genus, DemersPelag, DepthRangeShallow, DepthRangeDeep, Comments
        FROM read_parquet('{SLB_SP_URL}')
    )
    SELECT 
        TRIM(Genus) as genus,
        MODE(DemersPelag) as genus_habitat_zone,
        AVG(DepthRangeShallow) as genus_depth_min,
        AVG(DepthRangeDeep) as genus_depth_max
    FROM combined_sp
    WHERE DemersPelag IS NOT NULL
    GROUP BY TRIM(Genus)
""").fetchdf()

# 5. Apply Updates to Master List
syn_lookup = merged_syn.set_index("scientific_name").to_dict(orient="index")
genus_lookup = genus_stats.set_index("genus").to_dict(orient="index")

recovered_syn_count = 0
recovered_genus_count = 0

for row in profiles:
    s_name = row["scientific_name"]
    genus = row.get("genus")
    
    # Check if empty
    if not row.get("habitat_zone") and not row.get("ecological_response"):
        # Attempt 1: Synonym Lookup
        if s_name in syn_lookup:
            m = syn_lookup[s_name]
            row["common_name"] = row.get("common_name") or m.get("FBname")
            row["habitat_zone"] = m.get("DemersPelag")
            row["depth_min_m"] = float(m["DepthRangeShallow"]) if pd.notna(m.get("DepthRangeShallow")) else row.get("depth_min_m")
            row["depth_max_m"] = float(m["DepthRangeDeep"]) if pd.notna(m.get("DepthRangeDeep")) else row.get("depth_max_m")
            
            comments = str(m.get("Comments") or "").strip()
            hz = m.get("DemersPelag")
            if comments and hz:
                row["ecological_response"] = f"Habitat zone: {hz}. Biology & Ecological Notes: {comments}"
            elif comments:
                row["ecological_response"] = f"Biology & Ecological Notes: {comments}"
            elif hz:
                row["ecological_response"] = f"Marine organism residing in {hz} zone across the Indian Ocean basin."
            
            row["evidence_source"] = f"{m.get('src')}_Synonym"
            recovered_syn_count += 1
            
        # Attempt 2: Genus Fallback
        elif genus and genus in genus_lookup:
            g = genus_lookup[genus]
            hz = g.get("genus_habitat_zone")
            row["habitat_zone"] = hz
            if pd.notna(g.get("genus_depth_min")) and row.get("depth_min_m") is None:
                row["depth_min_m"] = round(float(g["genus_depth_min"]), 1)
            if pd.notna(g.get("genus_depth_max")) and row.get("depth_max_m") is None:
                row["depth_max_m"] = round(float(g["genus_depth_max"]), 1)
            
            row["ecological_response"] = (
                f"Genus-level ecological classification: Predominantly {hz} marine taxa within family {row.get('family')}."
            )
            row["evidence_source"] = "FishBase/SeaLifeBase_Genus_Inference"
            recovered_genus_count += 1

# Save Final
df_final = pd.DataFrame(profiles)
df_final.to_csv("species_ecological_profiles.csv", index=False)
with open("species_ecological_profiles.json", "w", encoding="utf-8") as f:
    json.dump(profiles, f, indent=2, ensure_ascii=False)

total_matched = df_final["habitat_zone"].notna().sum()
print("=" * 80)
print("✅ RECOVERY PIPELINE COMPLETE")
print(f"  • Recovered via Synonyms: {recovered_syn_count:,}")
print(f"  • Recovered via Genus Inference: {recovered_genus_count:,}")
print(f"  • Final Enriched Coverage: {total_matched:,} / {len(df_final):,} ({total_matched/len(df_final)*100:.1f}%)")
print("  • Saved final: species_ecological_profiles.csv & species_ecological_profiles.json")
print("=" * 80)
