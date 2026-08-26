# 🌊 VARUNA — Master Technical Context & System Specification
> **System Name**: VARUNA (Agentic AI Ocean & Marine Ecosystem Intelligence Platform)  
> **Hackathon / Track**: Smart India Hackathon (SIH) 2026 | Team: **Ctrl Alt Defeat**  
> **Core Problem Statement**: Revolutionizing Indian ocean data governance by creating a unified national marine data backbone that fuses real-time physical/chemical ocean telemetry from **INCOIS (Hyderabad)** with marine living resources, taxonomy, and ecological health records from **CMLRE (Kochi)** into a multi-agent cognitive intelligence platform with proactive early-warning capabilities.

---

## 🏗️ 1. High-Level Architecture Overview

VARUNA operates on an asynchronous **Multi-Agent Task Directed Acyclic Graph (DAG)** topology:

```
                            ┌─────────────────────────────────────────┐
                            │    User Natural Language Question       │
                            └────────────────────┬────────────────────┘
                                                 │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │   FastAPI Gateway (/api/v1/agent/chat)  │
                            └────────────────────┬────────────────────┘
                                                 │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │   Planner / Orchestrator Agent (LLM)    │
                            │   NVIDIA Nemotron-Ultra 550B via Router │
                            └────────────────────┬────────────────────┘
                                                 │
                     ┌───────────────────────────┼───────────────────────────┐
                     │                           │                           │
                     ▼                           ▼                           ▼
         ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
         │     SQL-Gen Agent     │   │ Hybrid Retrieval Agent│   │  Biodiversity Agent   │
         │   NL→SQL + PostGIS    │   │  BM25 + Qdrant Vector │   │ Darwin Core + Species │
         └───────────┬───────────┘   └───────────┬───────────┘   └───────────┬───────────┘
                     │                           │                           │
                     └───────────────────────────┼───────────────────────────┘
                                                 │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │            Synthesizer Agent            │
                            │    Zero-Hallucination Cited Markdown    │
                            └────────────────────┬────────────────────┘
                                                 │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │     Command Center HUD (Next.js 14)     │
                            └─────────────────────────────────────────┘
```

---

## 🗄️ 2. Finalized Biological Datasets (CMLRE)

### 2.1 DATASET 1: Marine Species Occurrences (Spatial Store)
* **File Location**: [cmlre_occurrence_clean.csv](file:///Users/aditya4/Desktop/Varuna/cmlre_occurrence_clean.csv) & `cmlre_occurrence_clean.parquet`
* **Scale**: **5,385 clean deduplicated records** across **2,521 unique species**.
* **Date Range**: 1999 to **2024–2025** (Directly overlaps with active **2022–2026 ARGO floats**).
* **Merged Sources**:
  1. *Indian Ocean Marine Fauna Voucher Specimens (CMLRE)* (2,527 records)
  2. *eDNA-derived Metagenomic Biodiversity — NE Arabian Sea* (1,876 records)
  3. *Deep-Sea Fishery Resources from Fish Landing Centres 2024–2025* (821 records)
  4. *Voucher Specimen Collections — CMLRE Referral Centre* (126 records)
  5. *Marine Mammal Sightings — Northern Indian Ocean 2024–2025* (41 records)
* **Destination**: Supabase PostgreSQL table `public.marine_biodiversity` with PostGIS Geography Point geometry (`geom GEOGRAPHY(POINT, 4326)`).

#### PostgreSQL DDL Contract (`public.marine_biodiversity`):
```sql
CREATE TABLE IF NOT EXISTS public.marine_biodiversity (
    id                   BIGSERIAL PRIMARY KEY,
    occurrence_id        VARCHAR(255) NOT NULL UNIQUE,
    event_id             VARCHAR(255),
    
    -- Taxonomy
    scientific_name      VARCHAR(255) NOT NULL,
    scientific_name_id   VARCHAR(255),
    family               VARCHAR(100),
    genus                VARCHAR(100),
    species              VARCHAR(100),
    
    -- Spatial & Temporal Coordinates
    decimal_latitude     DOUBLE PRECISION NOT NULL,
    decimal_longitude    DOUBLE PRECISION NOT NULL,
    geom                 GEOGRAPHY(POINT, 4326),  -- Generated: ST_SetSRID(ST_MakePoint(decimal_longitude, decimal_latitude), 4326)
    event_date           TIMESTAMPTZ,
    
    -- Vertical Depth & Abundance
    minimum_depth_m      DOUBLE PRECISION DEFAULT 0.0,
    maximum_depth_m      DOUBLE PRECISION DEFAULT 10.0,
    individual_count     INT4 DEFAULT 1,
    
    -- Quality Context & Source Provenance
    occurrence_status    VARCHAR(50) DEFAULT 'present',
    basis_of_record      VARCHAR(100) DEFAULT 'PreservedSpecimen',
    source_dataset_id    VARCHAR(255) NOT NULL,
    source_dataset_name  VARCHAR(255) NOT NULL,
    dataset_type         VARCHAR(50) NOT NULL     -- 'voucher', 'edna', 'fishery', 'marine_mammal', 'voucher_referral'
);

CREATE INDEX IF NOT EXISTS idx_bio_geom ON public.marine_biodiversity USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_bio_species ON public.marine_biodiversity (scientific_name);
CREATE INDEX IF NOT EXISTS idx_bio_date ON public.marine_biodiversity (event_date);
CREATE INDEX IF NOT EXISTS idx_bio_type ON public.marine_biodiversity (dataset_type);
```

---

### 2.2 DATASET 2: Species Ecological Knowledge Layer (Vector Store)
* **File Location**: [species_ecological_profiles.csv](file:///Users/aditya4/Desktop/Varuna/species_ecological_profiles.csv) & [species_ecological_profiles.json](file:///Users/aditya4/Desktop/Varuna/species_ecological_profiles.json)
* **Scale**: **2,521 species profiles** with **100% complete environmental tolerance envelopes**.
* **Enrichment Sources**: FishBase (`v24.07`), SeaLifeBase (`v24.07`), Taxonomic Synonyms table, and Indian Ocean Hydrographic Stratification Envelopes (Arabian Sea OMZ & Bay of Bengal thermocline profiles).
* **Destination**: **Qdrant Vector Database (`bio_knowledge` collection)** using 768-dim dense embeddings (`nomic-ai/nomic-embed-text-v1.5` via OpenRouter).

#### Schema Structure:
```json
{
  "species_id": "GALATHEA_QUADRANGULARIS",
  "scientific_name": "Galathea quadrangularis",
  "aphia_id_lsid": "urn:lsid:marinespecies.org:taxname:1767982",
  "family": "Galatheidae",
  "genus": "Galathea",
  "common_name": "Squat lobster",
  "habitat_zone": "benthic",
  "depth_min_m": 43.1,
  "depth_max_m": 269.2,
  "temp_pref_min_c": 18.0,
  "temp_pref_max_c": 26.0,
  "salinity_min_psu": 34.0,
  "salinity_max_psu": 36.2,
  "hypoxia_avoidance_threshold_umol_kg": 45.0,
  "ecological_response": "Genus-level ecological classification: Predominantly benthic marine taxa within family Galatheidae. Environmental tolerance limits: Preferred Temp 18.0–26.0 °C; Salinity 34.0–36.2 PSU; Hypoxia avoidance floor 45.0 µmol/kg.",
  "evidence_source": "FishBase/SeaLifeBase_Genus_Inference"
}
```

---

## 🌊 3. Physical Oceanography Store (INCOIS ARGO Floats)

* **Main Table**: `public.marine_data` (Partitioned by observation year: `marine_data_2022` through `2026`).
* **Primary Key**: `PRIMARY KEY (platform_number, time, pres)`.
* **Telemetry Fields**: `platform_number`, `cycle_number`, `direction`, `latitude`, `longitude`, `time`, `geom` (PostGIS point), `pres` (dbar/depth), `temp` (°C), `psal` (PSU), `doxy` (µmol/kg), `chla` (mg/m³), `ph_in_situ_total`, `nitrate` (µmol/kg).
* **Supabase Multi-DB Sharding**:
  - **Database 1 (Historical)**: Observations $\le$ 31 July 2025.
  - **Database 2 (Current)**: Observations $\ge$ 1 August 2025.
  - Handled seamlessly via `backend/src/database/postgres.py` using `asyncio.gather` for parallel cross-boundary querying.

---

## 🔗 4. Cross-Domain ARGO ↔ CMLRE Spatial Join Contract

To join physical telemetry with biological occurrences, the SQL-Gen Agent executes:

$$\Delta r \le 50.0\,\text{km} \quad \text{and} \quad |\Delta t| \le 7\,\text{days} \quad \text{and} \quad \text{ARGO}_{\text{depth}} \le \text{Bio}_{\text{max\_depth}}$$

```sql
SELECT 
    b.scientific_name, 
    b.family,
    b.dataset_type,
    b.minimum_depth_m,
    b.maximum_depth_m,
    m.platform_number AS argo_float_id,
    m.time AS argo_obs_time,
    m.temp AS water_temperature_c,
    m.psal AS salinity_psu,
    m.doxy AS dissolved_oxygen_umol_kg,
    ST_Distance(b.geom, m.geom) / 1000.0 AS distance_km
FROM public.marine_biodiversity b
JOIN public.marine_data m
  ON ST_DWithin(b.geom, m.geom, 50000)  -- Radius <= 50km
 AND ABS(EXTRACT(EPOCH FROM (b.event_date - m.time))) <= 7 * 86400 -- Window <= 7 days
WHERE m.temp > 28.5  -- Thermal Anomaly filter
ORDER BY distance_km ASC
LIMIT 20;
```

---

## 🧠 5. Qdrant Vector DB Topography (3 Collections)

1. **`argo_knowledge`**: Textual profile summaries of ARGO float observations and Indian Ocean oceanographic dynamics.
2. **`argo_schema`**: Table DDLs, column definitions, and 50+ curated NL→SQL few-shot examples for schema linking.
3. **`bio_knowledge`**: CMLRE species ecological profiles, thermal envelopes, depth bounds, and hypoxia stress thresholds (from Dataset 2).

#### Structured Embedding Payload Chunk:
```text
Species: {common_name} ({scientific_name})
Taxonomy: Family {family}, Genus {genus}
Habitat: {habitat_zone} (Depth: {depth_min_m}m - {depth_max_m}m)
Environmental Tolerances: Preferred Temp {temp_pref_min_c}°C - {temp_pref_max_c}°C | Salinity {salinity_min_psu} - {salinity_max_psu} PSU | Hypoxia Avoidance Threshold {hypoxia_avoidance_threshold_umol_kg} µmol/kg
Ecological Description: {ecological_response}
Evidence: {evidence_source}
```

---

## 🤖 6. Multi-Agent RAG Synthesizer Reasoning Invariants

When the Synthesizer Agent receives physical telemetry from the SQL Agent and ecological profiles from the Retrieval Agent:

1. **Marine Heatwave (MHW) Stress Rule**:
   $$\text{If } \text{ARGO}_{\text{temp}} > \text{Species}_{\text{temp\_pref\_max\_c}} + 1.5^\circ\text{C} \implies \text{Flag Thermal Stress / School Dispersal}$$
2. **Hypoxia Zone Compression Rule**:
   $$\text{If } \text{ARGO}_{\text{doxy}} < \text{Species}_{\text{hypoxia\_avoidance\_threshold}} \implies \text{Flag Habitat Compression / Vertical Migration}$$
3. **Zero Numerical Hallucination**:
   Every numerical figure in the synthesized response must strictly cite the returned SQL row (`occurrence_id`) or Qdrant profile evidence (`evidence_source`).

---

## 🎯 7. Next Action Items for the Implementation Agent

1. **Step 1 — PostgreSQL Table Ingestion**:
   - Run the ingestion script to load `cmlre_occurrence_clean.csv` into Supabase `public.marine_biodiversity`.
2. **Step 2 — Qdrant Vector Seeding**:
   - Embed and upsert `species_ecological_profiles.json` into the Qdrant `bio_knowledge` collection using `nomic-ai/nomic-embed-text-v1.5`.
3. **Step 3 — API End-to-End Test**:
   - Test compound natural language queries through `/api/v1/agent/chat` verifying that the Orchestrator DAG triggers both the SQL-Gen Agent (PostGIS) and Hybrid Retrieval Agent (Qdrant) seamlessly!
