"""
Test live queries on public.species_ecological_profiles in Supabase DB1
"""
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_BACKEND_ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from src.database.postgres import run_sql

def test_supabase_species():
    print("=" * 80)
    print("🔬 TESTING LIVE SUPABASE SPECIES ECOLOGICAL PROFILES")
    print("=" * 80)

    # 1. Total count
    c = run_sql("SELECT COUNT(*) AS total_species FROM public.species_ecological_profiles;")
    print(f"Total Species Profiles in Supabase: {c[0]['total_species']:,}")

    # 2. Key Target Taxa
    sql2 = """
    SELECT scientific_name, family, habitat_zone, temp_pref_min_c, temp_pref_max_c,
           hypoxia_avoidance_threshold_umol_kg, depth_min_m, depth_max_m
    FROM public.species_ecological_profiles
    WHERE scientific_name ILIKE '%Sardinella longiceps%' 
       OR scientific_name ILIKE '%Thunnus albacares%'
       OR scientific_name ILIKE '%Acanthosepion pharaonis%';
    """
    res2 = run_sql(sql2)
    print("\nTarget Species Physiological Envelopes:")
    for r in res2:
        print(f"  • {r['scientific_name']} ({r['family']}) | Habitat: {r['habitat_zone']} | Temp: {r['temp_pref_min_c']}–{r['temp_pref_max_c']} °C | Hypoxia Floor: {r['hypoxia_avoidance_threshold_umol_kg']} µmol/kg")

    # 3. 3-Way Relational Join: marine_biodiversity x species_ecological_profiles x marine_data
    sql3 = """
    SELECT b.scientific_name, p.family, p.habitat_zone,
           p.temp_pref_min_c, p.temp_pref_max_c, p.hypoxia_avoidance_threshold_umol_kg,
           ROUND(m.temp::numeric, 2) AS in_situ_temp,
           ROUND(m.doxy::numeric, 1) AS in_situ_doxy,
           ROUND((ST_Distance(b.geom::geography, m.geom::geography)/1000.0)::numeric, 1) AS dist_km
    FROM public.marine_biodiversity b
    JOIN public.species_ecological_profiles p
      ON b.scientific_name = p.scientific_name
    JOIN public.marine_data m
      ON ST_DWithin(b.geom::geography, m.geom::geography, 50000)
    WHERE m.doxy IS NOT NULL AND m.pres <= 100
    LIMIT 5;
    """
    res3 = run_sql(sql3)
    print(f"\n3-Way Relational PostGIS Join (CMLRE Occurrences ⋈ Physiological Profiles ⋈ ARGO In-Situ Casts):")
    for r in res3:
        print(f"  • {r['scientific_name']} | Float DO: {r['in_situ_doxy']} µmol/kg | Species Hypoxia Floor: {r['hypoxia_avoidance_threshold_umol_kg']} µmol/kg | Float Temp: {r['in_situ_temp']} °C | Distance: {r['dist_km']} km")

if __name__ == "__main__":
    test_supabase_species()
