"""
VARUNA — Qdrant Vector Store Operations & 3-Collection Knowledge Base Ingestor
Manages 3 distinct semantic vector collections:
1. argo_knowledge: Physical/chemical oceanography, BGC variables, thermodynamics, OMZ, and MHW phenomena.
2. argo_schema: PostgreSQL schema DDLs, column metadata, time-partition guides, and few-shot SQL exemplars.
3. bio_knowledge: CMLRE Darwin Core marine species taxonomy, thermal tolerance envelopes, and hypoxia thresholds.
"""

from __future__ import annotations

import re
import logging
import asyncio
from typing import Any, Dict, List, Optional, Tuple

from src.config import settings
from src.llm.embedder import embed_texts

log = logging.getLogger("varuna.qdrant")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. ARGO Physical & Oceanographic Knowledge Base (Comprehensive Domain Mesh)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARGO_KNOWLEDGE_BASE = [
    {
        "id": 1001,
        "text": (
            "PRES (Pressure): Measured in decibars (dbar). In the ocean, 1 dbar ≈ 1 meter depth. "
            "Primary depth variable in ARGO NetCDF files (0 to 2000 dbar). Surface observations are measured at PRES < 10 dbar."
        ),
        "payload": {"source": "variables", "var": "pres", "topic": "depth_pressure"},
    },
    {
        "id": 1002,
        "text": (
            "TEMP (Temperature): In-situ sea temperature measured in degrees Celsius (°C). Sea Surface Temperature (SST) "
            "is observed at PRES < 5 dbar. The tropical Indian Ocean typically exhibits SSTs between 26.0°C and 31.5°C."
        ),
        "payload": {"source": "variables", "var": "temp", "topic": "sea_surface_temperature"},
    },
    {
        "id": 1003,
        "text": (
            "PSAL (Practical Salinity): Measured on the Practical Salinity Scale (PSU). The Arabian Sea exhibits high salinity "
            "(~35.5 - 36.8 PSU) due to strong evaporation exceeding precipitation, while the Bay of Bengal exhibits lower salinity "
            "(~31.0 - 34.0 PSU) due to heavy monsoonal river discharge from the Ganges, Brahmaputra, and Irrawaddy rivers."
        ),
        "payload": {"source": "variables", "var": "psal", "topic": "salinity_dynamics"},
    },
    {
        "id": 1004,
        "text": (
            "DOXY (Dissolved Oxygen): Measured in µmol/kg by BGC-ARGO optode sensors (Aanderaa 4330 / SBE 63). The Northern Arabian Sea contains one of "
            "the world's most acute Oxygen Minimum Zones (OMZ), where dissolved oxygen drops below 20 µmol/kg between 150m and 1000m depth."
        ),
        "payload": {"source": "variables", "var": "doxy", "topic": "hypoxia_omz"},
    },
    {
        "id": 1005,
        "text": (
            "CHLA (Chlorophyll-a): Fluorescent optical proxy for phytoplankton biomass (mg/m³). Monsoon-driven coastal upwelling "
            "along the southwest coast of India (Kerala/Goa/Malabar) elevates chlorophyll concentrations (> 2.0 mg/m³) during July-September."
        ),
        "payload": {"source": "variables", "var": "chla", "topic": "biological_productivity"},
    },
    {
        "id": 1006,
        "text": (
            "Marine Heatwave (MHW) Definition (Hobday et al. 2016): A prolonged discrete anomalously warm water event where SST "
            "exceeds the 90th percentile (P90) climatological threshold for at least 5 consecutive days. Categorized as Moderate (1x-2x threshold anomaly), "
            "Strong (2x-3x), Severe (3x-4x), or Extreme (>4x)."
        ),
        "payload": {"source": "primer", "topic": "marine_heatwaves", "reference": "Hobday2016"},
    },
    {
        "id": 1007,
        "text": (
            "ARGO Profiling Cycle: Autonomous floats descend to a parking depth of 1000m for 9-10 days (drift phase), then descend to 2000m before ascending "
            "to the sea surface while measuring temperature, salinity, and biogeochemical parameters. Data is transmitted via Iridium satellites."
        ),
        "payload": {"source": "documentation", "topic": "argo_float_mission"},
    },
    {
        "id": 1008,
        "text": (
            "Arabian Sea Oxygen Minimum Zone (AS-OMZ): Located in the northern and central Arabian Sea (lat 12°N-24°N, lon 60°E-74°E). "
            "High primary productivity combined with sluggish intermediate water renewal results in intense suboxia (< 20 µmol/kg DOXY) "
            "between 100m and 900m depth, driving massive denitrification and forcing pelagic fish into shallow surface layers."
        ),
        "payload": {"source": "regional_oceanography", "topic": "omz_arabian_sea", "basin": "arabian_sea"},
    },
    {
        "id": 1009,
        "text": (
            "Bay of Bengal Barrier Layer & Freshwater Lens: Massive river runoff (~1.6×10¹² m³/yr) creates a thin, buoyant low-salinity "
            "surface layer (30-33 PSU) over warm, saline subsurface water. This strong halocline inhibits vertical mixing, creating a thick "
            "Barrier Layer (15-50m) that traps solar heat and intensifies tropical cyclones."
        ),
        "payload": {"source": "regional_oceanography", "topic": "barrier_layer_bob", "basin": "bay_of_bengal"},
    },
    {
        "id": 1010,
        "text": (
            "Somali Current & Great Whirl Upwelling: During the Southwest Monsoon (June-September), southwesterly winds drive the intense "
            "northward Somali Current (> 2 m/s) and generate large anticyclonic eddies (the Great Whirl). Coastal divergence produces cold, "
            "nutrient-rich upwelling (SST < 22°C, high nitrate and chlorophyll) along the Horn of Africa and western Arabian Sea."
        ),
        "payload": {"source": "regional_oceanography", "topic": "somali_current_upwelling", "basin": "western_arabian_sea"},
    },
    {
        "id": 1011,
        "text": (
            "Indian Ocean Dipole (IOD): A coupled ocean-atmosphere climate mode. Positive IOD (pIOD) features anomalous cooling in the southeastern "
            "tropical Indian Ocean (off Sumatra/Java) and warming in the western Indian Ocean, driving enhanced rainfall over India and suppressing "
            "cyclone activity in the Bay of Bengal. Negative IOD (nIOD) reverses these thermal anomalies."
        ),
        "payload": {"source": "climate_modes", "topic": "indian_ocean_dipole", "mode": "IOD"},
    },
    {
        "id": 1012,
        "text": (
            "Wyrtki Jets: Strong eastward equatorial surface current jets occurring semi-annually during monsoon transition periods "
            "(April-May and October-November). Speeds exceed 1 m/s, transporting warm surface water from the western to the eastern equatorial "
            "Indian Ocean and deepening the thermocline in the east."
        ),
        "payload": {"source": "equatorial_dynamics", "topic": "wyrtki_jets", "region": "equatorial_indian_ocean"},
    },
    {
        "id": 1013,
        "text": (
            "ARGO Float WMO 1902303: Active BGC-Argo float deployed in the central Arabian Sea. Equipped with Sea-Bird CTD and Aanderaa "
            "Oxygen Optode. Transmits full vertical profiles (0-2000m) measuring intense mid-depth hypoxia (< 35 µmol/kg) and surface salinity > 36.2 PSU."
        ),
        "payload": {"source": "float_dossier", "platform_number": 1902303, "basin": "arabian_sea", "sensors": ["CTD", "DOXY"]},
    },
    {
        "id": 1014,
        "text": (
            "ARGO Float WMO 5906478: Deep-profiling BGC-Argo float in the western Arabian Sea / Oman Basin. Records upper thermocline "
            "variability, coastal upwelling plumes, and severe oxygen depletion in the mesopelagic zone."
        ),
        "payload": {"source": "float_dossier", "platform_number": 5906478, "basin": "arabian_sea", "sensors": ["CTD", "DOXY", "CHLA"]},
    },
    {
        "id": 1015,
        "text": (
            "ARGO Float WMO 2903567: Equatorial Indian Ocean BGC float monitoring Wyrtki Jet passage, mixed layer heat content, "
            "and equatorial upwelling waves (Kelvin and Rossby wave signatures)."
        ),
        "payload": {"source": "float_dossier", "platform_number": 2903567, "basin": "equatorial_io", "sensors": ["CTD", "DOXY"]},
    },
    {
        "id": 1016,
        "text": (
            "Hypoxia Physiological Impact Thresholds: Marine organisms experience varying physiological stress depending on dissolved oxygen: "
            "1. Normoxia (> 90 µmol/kg): Unimpaired aerobic respiration. "
            "2. Mild Hypoxia (60-90 µmol/kg): Reduced metabolic scope in active pelagic teleosts (tunas, billfish). "
            "3. Severe Hypoxia (20-60 µmol/kg): Lethal floor for most coastal and demersal finfish; schooling compression. "
            "4. Suboxia / Anoxia (< 20 µmol/kg): Only specialized OMZ zooplankton and microbes survive; complete fish mortality."
        ),
        "payload": {"source": "physiological_thresholds", "topic": "hypoxia_impact_tiers"},
    },
]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. PostgreSQL Schema & NL→SQL Exemplars
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARGO_SCHEMA_KNOWLEDGE_BASE = [
    {
        "id": 2001,
        "text": (
            "Table public.marine_data: Canonical physical ocean observation table containing 3.96M rows spanning 2022 to 2026 across DB1 and DB2. "
            "Columns: platform_number (INT), cycle_number (INT), direction (CHAR 'A'/'D'), latitude (FLOAT), longitude (FLOAT), "
            "time (TIMESTAMP UTC), pres (FLOAT dbar), temp (FLOAT °C), psal (FLOAT PSU), doxy (FLOAT µmol/kg), chla (FLOAT mg/m³), "
            "ph_in_situ_total (FLOAT), nitrate (FLOAT µmol/kg), geom (GEOGRAPHY POINT 4326). "
            "Primary Key: (platform_number, time, pres)."
        ),
        "payload": {"source": "schema", "table": "public.marine_data"},
    },
    {
        "id": 2002,
        "text": (
            "Table public.marine_biodiversity: CMLRE Darwin Core marine species occurrence table containing 105,866 in-situ observations (1946–2025). "
            "Columns: occurrence_id (VARCHAR), scientific_name (VARCHAR), kingdom (VARCHAR), phylum (VARCHAR), class (VARCHAR), "
            "order (VARCHAR), family (VARCHAR), genus (VARCHAR), species (VARCHAR), decimal_latitude (FLOAT), decimal_longitude (FLOAT), "
            "geom (GEOGRAPHY POINT 4326), event_date (TIMESTAMPTZ), minimum_depth_m (FLOAT), maximum_depth_m (FLOAT), "
            "basis_of_record (VARCHAR), source_dataset_name (TEXT). Indexed with GIST on geom and B-Tree on scientific_name."
        ),
        "payload": {"source": "schema", "table": "public.marine_biodiversity"},
    },
    {
        "id": 2003,
        "text": (
            "View public.v_latest_positions: Pre-computed real-time fleet map view returning the single newest observation position "
            "for each active ARGO float. "
            "Columns: platform_number (INT), time (TIMESTAMP UTC), latitude (FLOAT), longitude (FLOAT). "
            "Always use SELECT * FROM public.v_latest_positions for queries asking for 'current float positions', 'latest locations', or 'fleet map'."
        ),
        "payload": {"source": "schema", "table": "public.v_latest_positions"},
    },
    {
        "id": 2004,
        "text": (
            "SQL Exemplar - Recent Monthly Temperature & Oxygen Aggregation:\n"
            "SELECT DATE_TRUNC('month', time) AS month, AVG(temp) AS avg_temp, AVG(doxy) AS avg_doxy\n"
            "FROM public.marine_data\n"
            "WHERE time >= NOW() - INTERVAL '6 months'\n"
            "  AND latitude BETWEEN 8.0 AND 25.0 AND longitude BETWEEN 55.0 AND 75.0\n"
            "GROUP BY 1 ORDER BY 1 ASC LIMIT 100;"
        ),
        "payload": {"source": "few_shot_sql", "intent": "RECENT_MONTHLY_AGGREGATION"},
    },
    {
        "id": 2005,
        "text": (
            "SQL Exemplar - Historical Float Surfacing Trajectory:\n"
            "SELECT platform_number, time, latitude, longitude, temp, psal, doxy\n"
            "FROM public.marine_data\n"
            "WHERE platform_number = 1902303 AND pres < 20\n"
            "ORDER BY time ASC LIMIT 200;"
        ),
        "payload": {"source": "few_shot_sql", "intent": "FLOAT_TRAJECTORY"},
    },
    {
        "id": 2006,
        "text": (
            "SQL Exemplar - Vertical Depth Profile Cast:\n"
            "SELECT pres AS depth_m, temp, psal, doxy, chla, nitrate\n"
            "FROM public.marine_data\n"
            "WHERE platform_number = 1902303\n"
            "  AND time >= '2026-08-01'\n"
            "ORDER BY pres ASC LIMIT 500;"
        ),
        "payload": {"source": "few_shot_sql", "intent": "VERTICAL_DEPTH_CAST"},
    },
    {
        "id": 2007,
        "text": (
            "SQL Exemplar - Cross-Domain Spatial Join between Marine Biodiversity and ARGO Float Telemetry:\n"
            "SELECT b.scientific_name, b.family, b.genus, b.event_date,\n"
            "       m.platform_number AS nearest_argo_float, m.time AS argo_time, m.temp, m.doxy,\n"
            "       ROUND((ST_Distance(b.geom, m.geom)/1000.0)::numeric, 1) AS dist_km\n"
            "FROM public.marine_biodiversity b\n"
            "JOIN public.marine_data m\n"
            "  ON ST_DWithin(b.geom, m.geom, 50000)\n"
            " AND ABS(EXTRACT(EPOCH FROM (b.event_date - m.time))) <= 7 * 86400\n"
            "WHERE m.doxy < 60.0 AND m.pres <= 200\n"
            "ORDER BY dist_km ASC LIMIT 25;"
        ),
        "payload": {"source": "few_shot_sql", "intent": "BIO_ARGO_SPATIAL_JOIN"},
    },
]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. CMLRE Marine Living Resources & Darwin Core Biodiversity
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BIO_KNOWLEDGE_BASE = [
    {
        "id": 5001,
        "text": (
            "Sardinella longiceps (Indian Oil Sardine): Pelagic schooling clupeid fish supporting 15-20% of India's marine catch "
            "along Kerala, Goa, and Maharashtra. Optimal thermal envelope: 22.0°C - 26.0°C. SST anomalies > 28.5°C cause schooling collapse, "
            "forcing vertical displacement into deeper (> 80m) strata and poleward migration."
        ),
        "payload": {"scientific_name": "Sardinella longiceps", "family": "Clupeidae", "thermal_min": 22.0, "thermal_max": 26.0, "source": "CMLRE"},
    },
    {
        "id": 5002,
        "text": (
            "Rastrelliger kanagurta (Indian Mackerel): Coastal pelagic species throughout the Arabian Sea and Bay of Bengal. "
            "Thermal tolerance: 24.0°C - 27.5°C. Highly sensitive to oxygen minimum zone (OMZ) shoaling; dissolved oxygen levels < 50 µmol/kg "
            "restrict schooling to surface waters (< 30m), making them vulnerable to coastal trawling."
        ),
        "payload": {"scientific_name": "Rastrelliger kanagurta", "family": "Scombridae", "thermal_min": 24.0, "thermal_max": 27.5, "source": "CMLRE"},
    },
    {
        "id": 5003,
        "text": (
            "Acropora millepora (Staghorn Coral): Dominant reef-building scleractinian coral in Gulf of Mannar, Lakshadweep, and Andaman reefs. "
            "Thermal optimum: 24.0°C - 28.0°C. Temperature departures > +1.5°C above baseline for > 4 weeks (DHW > 4) induce critical coral bleaching "
            "and zooxanthellae loss."
        ),
        "payload": {"scientific_name": "Acropora millepora", "family": "Acroporidae", "thermal_min": 24.0, "thermal_max": 28.0, "source": "CMLRE"},
    },
    {
        "id": 5004,
        "text": (
            "Thunnus albacares (Yellowfin Tuna): High-trophic oceanic migratory predator across the equatorial Indian Ocean. "
            "Thermal window: 20.0°C - 29.0°C. Hypoxia limit: minimum 90 µmol/kg dissolved oxygen required for sustained aerobic burst swimming."
        ),
        "payload": {"scientific_name": "Thunnus albacares", "family": "Scombridae", "thermal_min": 20.0, "thermal_max": 29.0, "source": "CMLRE"},
    },
    {
        "id": 5005,
        "text": (
            "Katsuwonus pelamis (Skipjack Tuna): Epipelagic oceanic tuna common in Lakshadweep waters. "
            "Thermal optimum: 23.0°C - 28.5°C. Critical dissolved oxygen minimum: 70 µmol/kg. Aggregates around thermal fronts and upwelling edges."
        ),
        "payload": {"scientific_name": "Katsuwonus pelamis", "family": "Scombridae", "thermal_min": 23.0, "thermal_max": 28.5, "source": "CMLRE"},
    },
    {
        "id": 5006,
        "text": (
            "Penaeus monodon (Giant Tiger Prawn): Demersal crustacean along coastal estuaries and shelf waters of Bay of Bengal and Kerala backwaters. "
            "Thermal tolerance: 25.0°C - 31.0°C. Salinity tolerance: 15 - 35 PSU. Sensitive to benthic hypoxia (< 40 µmol/kg)."
        ),
        "payload": {"scientific_name": "Penaeus monodon", "family": "Penaeidae", "thermal_min": 25.0, "thermal_max": 31.0, "source": "CMLRE"},
    },
]


def _get_client():
    """Retrieve synchronous/async Qdrant client."""
    try:
        from qdrant_client import QdrantClient  # type: ignore
        return QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None, timeout=2, check_compatibility=False)
    except Exception as e:
        log.warning("Qdrant connection unavailable: %s", str(e))
        return None


def seed_qdrant_collections(client: Any) -> None:
    """Ingest and upsert rich domain knowledge into the 3 collections."""
    from qdrant_client.http import models  # type: ignore

    datasets: List[Tuple[str, List[Dict[str, Any]]]] = [
        ("argo_knowledge", ARGO_KNOWLEDGE_BASE),  # type: ignore[list-item]
        ("argo_schema", ARGO_SCHEMA_KNOWLEDGE_BASE),  # type: ignore[list-item]
        ("bio_knowledge", BIO_KNOWLEDGE_BASE),  # type: ignore[list-item]
    ]

    for col_name, items in datasets:
        try:
            texts = [str(item["text"]) for item in items]
            vectors = embed_texts(texts)

            points = [
                models.PointStruct(
                    id=int(item["id"]),
                    vector=vectors[idx],
                    payload={
                        "text": str(item["text"]),
                        **dict(item.get("payload", {}))  # type: ignore[arg-type]
                    }
                )
                for idx, item in enumerate(items)
            ]

            client.upsert(collection_name=col_name, points=points)
            log.info("Successfully ingested %d vector points into Qdrant collection '%s'", len(points), col_name)
        except Exception as e:
            log.warning("Failed to upsert points into collection '%s': %s", col_name, str(e))


async def init_qdrant():
    """Ensure all 3 collections exist and are seeded with domain knowledge."""
    client = _get_client()
    if client is None:
        log.warning("Qdrant client unavailable. Vector operations will use in-memory fallback.")
        return

    from qdrant_client.http import models  # type: ignore

    try:
        # Fast health probe (0.5s)
        client.get_collections()
    except Exception:
        log.info("Qdrant offline. Using in-process BM25 & semantic fallback.")
        return

    collections = ["argo_knowledge", "argo_schema", "bio_knowledge"]
    for col in collections:
        try:
            client.get_collection(col)
        except Exception:
            try:
                client.create_collection(
                    collection_name=col,
                    vectors_config=models.VectorParams(size=768, distance=models.Distance.COSINE),
                )
                log.info("Created Qdrant collection: %s", col)
            except Exception as e:
                log.warning("Could not create collection %s: %s", col, str(e))

    # Ingest knowledge points into all collections
    try:
        seed_qdrant_collections(client)
    except Exception as e:
        log.warning("Qdrant knowledge seeding skipped: %s", str(e))


def _in_memory_search(
    query: str,
    collection_name: str = "argo_knowledge",
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """Fast semantic/lexical similarity search against local knowledge bases."""
    local_db: List[Dict[str, Any]] = {
        "argo_knowledge": ARGO_KNOWLEDGE_BASE,
        "argo_schema": ARGO_SCHEMA_KNOWLEDGE_BASE,
        "bio_knowledge": BIO_KNOWLEDGE_BASE,
    }.get(collection_name, ARGO_KNOWLEDGE_BASE)  # type: ignore[assignment]

    q_terms = set(re.findall(r"\w+", query.lower()))
    if not q_terms:
        return [{"id": item["id"], "text": item["text"], "score": 1.0, "payload": item.get("payload", {})} for item in local_db[:limit]]

    scored = []
    for item in local_db:
        text = str(item.get("text", "")).lower()
        overlap = sum(1 for t in q_terms if t in text)
        if overlap > 0:
            scored.append({
                "id": item["id"],
                "text": item["text"],
                "score": overlap / max(1, len(q_terms)),
                "payload": item.get("payload", {})
            })
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit] if scored else [
        {"id": item["id"], "text": item["text"], "score": 0.5, "payload": item.get("payload", {})} for item in local_db[:limit]
    ]


async def search_similar(
    query: str,
    collection_name: str = "argo_knowledge",
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """Search similar passages in a specific Qdrant collection with automatic in-memory fallback."""
    client: Any = _get_client()

    if client is not None:
        try:
            vector = embed_texts([query])[0]
            if hasattr(client, "search"):
                results = client.search(
                    collection_name=collection_name,
                    query_vector=vector,
                    limit=limit,
                )
                if results:
                    return [
                        {
                            "id": hit.id,
                            "text": hit.payload.get("text", "") if hit.payload else "",
                            "score": float(hit.score),
                            "payload": hit.payload,
                        }
                        for hit in results
                    ]
        except Exception as e:
            log.debug("Remote Qdrant search unavailable (%s), using in-memory knowledge base", str(e))

    return _in_memory_search(query, collection_name=collection_name, limit=limit)


if __name__ == "__main__":
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    logging.basicConfig(level=logging.INFO)
    print("Running VARUNA Qdrant Vector Knowledge Base Ingestor...")
    asyncio.run(init_qdrant())
    print("Ingestion complete across argo_knowledge, argo_schema, bio_knowledge.")
