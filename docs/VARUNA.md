# VARUNA — Agentic AI Ocean & Marine Ecosystem Intelligence Platform
## Complete Master Engineering Handbook & Architectural Source of Truth

> **Governing Document**: VARUNA Engineering Specification v2.0  
> **Permanent Context for Antigravity AI**: This document is the absolute authoritative source for VARUNA development.  
> **Mission**: Revolutionize INCOIS and CMLRE ocean data governance by fusing physical oceanographic observations with marine living resources data into a multi-agent cognitive intelligence platform with proactive early-warning capabilities.  
> **Team**: Ctrl Alt Defeat | **Target Hackathon**: Smart India Hackathon (SIH) 2026  
> **Core Scope**: Unified Marine Data Backbone fusing INCOIS Argo Float Observations with CMLRE Marine Living Resources  
> **Core Deployment Target**: 24 August 2026  

---

## 1. Executive Summary & The Problem We Solve

India's marine data ecosystem is divided across two Ministry of Earth Sciences (MoES) institutions:
- **INCOIS (Hyderabad)**: National Argo Data Centre holding real-time physical/chemical ocean data (temperature, salinity, pressure, dissolved oxygen, chlorophyll-a, nitrate, pH) from 3,800+ global and Indian Ocean ARGO floats.
- **CMLRE (Kochi)**: Centre for Marine Living Resources and Ecology holding taxonomic, otolith morphometric, and eDNA biodiversity data.

### The Governance Gap
Before VARUNA, **no bridge existed between these bodies**. In April 2026, INCOIS issued marine heatwave alerts across 6 ocean basins. In 2020, an undetected marine heatwave bleached **85% of corals in the Gulf of Mannar** and severely disrupted fisheries supporting **30+ million coastal livelihoods**. 

A named governance-gap analysis states the core problem directly:
> *"The lack of real-time integration of INCOIS ocean data into fisheries policy weakens the response to marine heatwave events."*

**VARUNA** solves this by establishing the **National Marine Data Backbone** requested by MoES, combining multi-agent task planning, proactive anomaly detection, and cross-domain biological fusion.

---

## 2. Competitive Literature Survey: Why We Beat OceanIQ (SIH 2025 Winner)

Last year's winning solution (**OceanIQ**, public repository: `PaarthNo1/OceanIQ--AI-Intelligent`) demonstrated competent production engineering with basic IFREMER ingestion and Gemini NL→SQL. However, our direct technical audit reveals 6 critical architectural limitations that VARUNA resolves:

```
┌────────────────────────┬───────────────────────────────────┬───────────────────────────────────────────┐
│ Feature / Capability   │ OceanIQ (2025 Winner)             │ VARUNA (Our Solution)                     │
├────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ RAG Pipeline           │ Flat Single-Shot RAG              │ Dynamic Multi-Agent Task DAG Planner      │
│ Proactive Intelligence │ Purely Reactive (answers only)    │ Autonomous Anomaly & MHW Early Warning    │
│ Data Scope             │ Single Dataset (ARGO physical)    │ Cross-Domain (INCOIS Physical + CMLRE Bio)│
│ Biodiversity Fusion    │ Zero taxonomy / biological data   │ Darwin Core Standardized Entity Resolution│
│ Memory Architecture    │ Stateless (no multi-turn context) │ Redis 11-Layer State & Temporal Recency   │
│ Local LLM Overhead     │ Heavyweight local model baggage   │ Zero-Local-LLM OpenRouter Nemotron-550B   │
│ Geospatial Analytics   │ Pure SQL haversine (slow)         │ Native PostGIS Spatial Indexes (GIST)     │
│ Frontend Dashboard     │ No production UI in public repo   │ Military-Grade Navy Command Center HUD    │
└────────────────────────┴───────────────────────────────────┴───────────────────────────────────────────┘
```

---

## 3. High-Level System Architecture

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
                                    │     Comparison & Aggregation Agent      │
                                    │     Multi-Region Delta & Trend Analysis │
                                    └────────────────────┬────────────────────┘
                                                         │
                                                         ▼
                                    ┌─────────────────────────────────────────┐
                                    │            Synthesizer Agent            │
                                    │    Zero-Hallucination Cited Markdown    │
                                    └────────────────────┬────────────────────┘
                                                         │
                                                         ▼
                                    ┌─────────────────────────────────────────┐
                                    │    Response Payload + Execution DAG     │
                                    │  Answer Prose + SQL + Plotly + Map Viz  │
                                    └─────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Autonomous Background Service: Marine Anomaly & Early-Warning Agent (Continuous 6-Hour Cron)           │
│ • Hobday (2016) Marine Heatwave 90th percentile threshold exceedance calculation                       │
│ • Hypoxia Minimum Zone (OMZ) expansion detection (DOXY < 60 µmol/kg)                                   │
│ • Pushes live alerts to public.anomaly_alerts and WebSocket feed                                       │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Deep-Dive Subsystem Specifications

### 4.1 NetCDF Ingestion & HPC Extraction (`backend/src/ingestion/`)
- **Spec**: Complies with Argo User's Manual V3.1 multidimensional arrays (`N_PROF`, `N_PARAM`, `N_LEVELS`).
- **Epoch Conversion**: Julian days (`JULD`) relative to `1950-01-01 00:00:00 UTC` are vectorized into ISO-8601 timestamps.
- **QC Bitmasking**: Accepts valid quality flags in `[1, 2, 5, 8]` while zeroing bad sensor reads.
- **Dual Persistence**: Saves raw immutable columnar Parquet archives in `data/processed/` and bulk-loads spatial geography points into PostgreSQL via `COPY`.

### 4.2 CMLRE Biodiversity & Darwin Core Integration (`backend/src/database/`)
- **Schema Standard**: Implements TDWG Darwin Core fields (`occurrenceID`, `scientificName`, `decimalLatitude`, `decimalLongitude`, `eventDate`, `individualCount`).
- **Spatial-Temporal Correlation**: Joins biological occurrences with physical ARGO float observations within a spatial radius $\le 50.0\,\text{km}$ and temporal window $\le 7\,\text{days}$.

### 4.3 Proactive Marine Heatwave & Anomaly Engine (`backend/src/agents/anomaly_agent.py`)
- **Climatological Baseline**: Computes rolling 30-day mean $\mu_{clim}$ and 90th percentile $P_{90}$ for $2^\circ \times 2^\circ$ spatial grid cells.
- **MHW Severity Tiers**:
  - `CRITICAL`: Anomaly $> +3.5^\circ\text{C}$
  - `HIGH`: Anomaly $> +2.0^\circ\text{C}$
  - `MODERATE`: Anomaly $> +1.2^\circ\text{C}$
  - `ADVISORY`: Emerging thermal trend $> +0.8^\circ\text{C}$
- **Hypoxia Alerts**: Triggered when Dissolved Oxygen $\text{DOXY} < 60.0\,\mu\text{mol/kg}$.

### 4.4 Zero-Local-LLM OpenRouter Cognitive Layer (`backend/src/llm/`)
- **Model**: `nvidia/nemotron-ultra-550b-a55b:free` via OpenRouter HTTPS API.
- **Benefits**: Zero local GPU/RAM baggage, $< 250\text{MB}$ server footprint, sub-second latency.
- **SQL Sanitizer**: AST parser enforcing strict `SELECT`-only execution.

---

## 5. Team Workstream & Individual Ownership Matrix

| Member | Name | Role | Primary Files Owned |
|---|---|---|---|
| **M1** | **[Aryan Lomte (Lead)](file:///e:/Hackathons/floatchatai-main/docs/assignments/Aryan_Lomte.md)** | AI Systems Architect & Full RAG Lead | `src/agents/orchestrator.py`, `src/agents/anomaly_agent.py`, `src/agents/synthesizer_agent.py`, `src/llm/openrouter_client.py`, `src/chains/sql_rag_chain.py`, `src/database/qdrant.py`, `src/api/routes.py` |
| **M2** | **[Aditya Yadav](file:///e:/Hackathons/floatchatai-main/docs/assignments/Aditya_Yadav.md)** | Data Engineer & Backend Lead | `src/ingestion/pipeline.py`, `src/ingestion/seed_biodiversity.py`, `src/database/postgres.py` |
| **M3** | **[Sahil Shah](file:///e:/Hackathons/floatchatai-main/docs/assignments/Sahil_Shah.md)** | Predictive ML & Sensor QC Lead | `src/ml/mhw_forecast.py`, `src/ml/qc_autoencoder.py` |
| **M4** | **[Advay Chavan](file:///e:/Hackathons/floatchatai-main/docs/assignments/Advay_Chavan.md)** | Frontend Full-Stack Lead | `frontend/app/page.tsx`, `frontend/components/ChatPanel.tsx`, `frontend/components/AgentGraph.tsx` |
| **M5** | **[Netal Gupta](file:///e:/Hackathons/floatchatai-main/docs/assignments/Netal_Gupta.md)** | Geospatial Visualization Specialist | `frontend/components/OceanMap.tsx`, `frontend/components/AnomalyAlerts.tsx` |
| **M6** | **[Kanishka Sahal](file:///e:/Hackathons/floatchatai-main/docs/assignments/Kanishka_Sahal.md)** | Marine Analytics & Presentation Lead | `frontend/components/CrossDomainExplorer.tsx`, `frontend/components/Charts/`, SIH Deck & Video |

---

## 6. Zero-Docker Native Local Development

### 1. Backend Launch (Terminal 1)
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1   # Windows
# source venv/bin/activate    # Linux/Mac
pip install -r requirements.txt

# Seed 500+ Indian Ocean marine species records
python -m src.ingestion.seed_biodiversity

# Start FastAPI server
uvicorn main:app --reload --port 8000
```
- Swagger API Docs: `http://localhost:8000/docs`

### 2. Frontend Launch (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
- Command Center UI: `http://localhost:3000`

---

## 7. Rules Antigravity AI Must Never Violate

1. **Zero-Local-LLM Invariant**: All AI inference must pass through `openrouter_client.py`. No local Ollama or HuggingFace in production.
2. **Zero-Startup-Block Invariant**: Never load neural models at server import time.
3. **Strict SQL Sanitization**: Every query must pass AST validation guaranteeing `SELECT`-only semantics.
4. **Data Provenance Invariant**: Every numerical value in an answer must cite a returned SQL row. Zero hallucination.
5. **Discrete Binning**: Cross-domain joins must enforce $\Delta r \le 50\,\text{km}$ and $\Delta t \le 7\,\text{days}$.
6. **No Committed Secrets**: Never commit `.env` files.
7. **Modesty in Claims**: Never use "first", "unique", or "100%" (penalized by SIH rubric).
8. **TypeScript Strict Mode**: Zero `any` or `@ts-ignore` in `frontend/`.
9. **Liquid Glass Identity**: Preserve `.glass` and `--accent: #2EE6C6` styling. Never add generic purple AI glow blobs.
10. **Async Non-Blocking I/O**: All FastAPI route handlers and database queries must be `async/await`.

---

## 8. Complete Documentation Sitemap

- [docs/architecture/01_SYSTEM_OVERVIEW.md](file:///e:/Hackathons/floatchatai-main/docs/architecture/01_SYSTEM_OVERVIEW.md) — Master architecture and subsystems
- [docs/architecture/02_MULTI_AGENT_ORCHESTRATION.md](file:///e:/Hackathons/floatchatai-main/docs/architecture/02_MULTI_AGENT_ORCHESTRATION.md) — Task DAG execution engine
- [docs/architecture/03_NETCDF_INGESTION_AND_HPC_ETL.md](file:///e:/Hackathons/floatchatai-main/docs/architecture/03_NETCDF_INGESTION_AND_HPC_ETL.md) — NetCDF V3.1 parsing specs
- [docs/architecture/04_CMLRE_BIODIVERSITY_FUSION.md](file:///e:/Hackathons/floatchatai-main/docs/architecture/04_CMLRE_BIODIVERSITY_FUSION.md) — Darwin Core cross-domain joins
- [docs/architecture/05_PROACTIVE_ANOMALY_ENGINE.md](file:///e:/Hackathons/floatchatai-main/docs/architecture/05_PROACTIVE_ANOMALY_ENGINE.md) — Hobday MHW and Hypoxia formulas
- [docs/architecture/06_DATABASE_AND_VECTOR_SCHEMA.md](file:///e:/Hackathons/floatchatai-main/docs/architecture/06_DATABASE_AND_VECTOR_SCHEMA.md) — PostgreSQL + Qdrant DDLs
- [docs/architecture/07_LLM_OPENROUTER_ENGINE.md](file:///e:/Hackathons/floatchatai-main/docs/architecture/07_LLM_OPENROUTER_ENGINE.md) — OpenRouter Nemotron integration
- [docs/architecture/08_FRONTEND_OPERATIONS_CENTER.md](file:///e:/Hackathons/floatchatai-main/docs/architecture/08_FRONTEND_OPERATIONS_CENTER.md) — Command center UI design
- [docs/assignments/INDEX.md](file:///e:/Hackathons/floatchatai-main/docs/assignments/INDEX.md) — Team responsibility index
- [docs/development/01_LOCAL_SETUP_NO_DOCKER.md](file:///e:/Hackathons/floatchatai-main/docs/development/01_LOCAL_SETUP_NO_DOCKER.md) — Native local setup
- [docs/development/02_CODING_STANDARDS_AND_RULES.md](file:///e:/Hackathons/floatchatai-main/docs/development/02_CODING_STANDARDS_AND_RULES.md) — Coding conventions
- [docs/development/03_NETCDF_WORKFLOW_GUIDE.md](file:///e:/Hackathons/floatchatai-main/docs/development/03_NETCDF_WORKFLOW_GUIDE.md) — NetCDF download & ingest
- [docs/development/04_API_CONTRACTS.md](file:///e:/Hackathons/floatchatai-main/docs/development/04_API_CONTRACTS.md) — REST & WebSocket specifications
