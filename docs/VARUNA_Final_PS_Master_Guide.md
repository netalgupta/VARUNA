# VARUNA — Agentic AI Ocean & Marine Ecosystem Intelligence Platform
### Complete Master Guide — Unified Marine Backbone (INCOIS Physical + CMLRE Biodiversity)
Team: Ctrl Alt Defeat | Smart India Hackathon (SIH) 2026

---

## 0. Naming

**Primary recommendation: VARUNA**
Varuna is the Vedic deity of the ocean and cosmic/water order — short, memorable, thematically exact for an ocean-intelligence platform, and safely non-identifying for the anonymized deck (it's a product name, not personal/institutional info).

Alternates if you want options: **TIDE** (Tracking Intelligence for Data & Ecosystems), **NEER** (Sanskrit/Hindi for water, short and clean), **SAGAR** (ocean).

Going with **VARUNA** for the rest of this document — swap freely.

---

## 1. One-line pitch (for the top of Slide 1 / opening of the video)
*VARUNA is an agentic AI platform that lets scientists, fisheries officers, and disaster-management agencies ask natural-language questions across India's ocean and marine-biodiversity data — and proactively warns them before a marine heatwave or ecological anomaly hits.*

---

## 2. Full Problem Statement (merged, PPT-ready)

### 2.1 Background
India's marine data ecosystem is split across two Ministry of Earth Sciences bodies with no bridge between them:
- **INCOIS** (Indian National Centre for Ocean Information Services), Hyderabad — the National Argo Data Centre and Regional Argo Data Centre, holding real-time physical/chemical ocean data (temperature, salinity, BGC) from Argo floats, moored buoys, and tide gauges.
- **CMLRE** (Centre for Marine Living Resources and Ecology), Kochi — holding taxonomy, otolith morphology, and molecular/eDNA biodiversity data on India's marine living resources.

Both organizations independently expose this data in raw, expert-only formats (NetCDF, siloed databases, unstructured records). Neither provides a way to ask a single cross-domain question like *"did the marine heatwave in the Arabian Sea this April correlate with a shift in sardine distribution?"*

### 2.2 Why this is a real, high-stakes government problem
- Argo float data feeds directly into INCOIS's Global Ocean Data Assimilation System, which supplies initial ocean conditions to the Coupled Forecast System (seasonal/monsoon forecasts) and the HWRF model (cyclone prediction). INCOIS is also India's Tsunami Service Provider under UNESCO-IOC, issuing advisories within a 10-minute window after tsunamigenic earthquakes.
- As of **April 2026**, INCOIS issued marine heatwave alerts across **six ocean basins**, from the Arabian Sea to Andaman waters — warning of coral bleaching, disrupted fisheries, and falling ocean productivity.
- The **2020 marine heatwave bleached 85% of corals in the Gulf of Mannar** and damaged seagrass/kelp nurseries.
- India's fisheries sector, supporting an estimated **30+ million livelihoods**, is directly exposed — sardine and mackerel stocks are retreating to deeper, cooler waters as surface temperatures rise.
- A named governance-gap analysis states the core problem directly: *"the lack of real-time integration of INCOIS ocean data into fisheries policy weakens the response to marine heatwave events."* **This is your problem statement, in an external source's own words — use it as your hook line on Slide 2.**
- On the CMLRE side: MoES's own PS text explicitly frames the missing piece as a **"national marine data backbone"** — official confirmation this integration gap is recognized at the ministry level, not just inferred.

### 2.3 Affected users / stakeholders
- State disaster-management cells (cyclone/tsunami preparedness)
- Fisheries departments (catch advisories, heatwave response)
- CMLRE marine scientists & conservationists (ecosystem assessment, species monitoring)
- Coastal researchers and, downstream, coastal/fishing communities

### 2.4 Root cause (Slide 2 / supports rubric criterion 2)
- Data is siloed in NetCDF (INCOIS) and separate taxonomy/molecular systems (CMLRE) — each requiring domain-specific tooling to even read.
- No natural-language layer exists between raw data and the non-technical decision-makers who need answers.
- No cross-organizational bridge — INCOIS's physical-ocean data and CMLRE's biodiversity data are never correlated, even though the underlying question (how ocean conditions affect marine life) spans both.
- Existing tools are reactive only — nobody is watching the data stream and proactively flagging anomalies before they become news.

---

## 3. Datasets — real, public, traceable (Slide 7 / Slide 8 references)

| Dataset | Source | Link | Use in VARUNA |
|---|---|---|---|
| Indian Ocean Argo float profiles | INCOIS (National/Regional Argo Data Centre) | https://services.incois.gov.in/argo/ | Core physical/chemical ocean data (temp, salinity, BGC) |
| Indian Ocean Argo data (open data catalog) | Open Government Data (OGD) Platform India, Ministry of Earth Sciences | https://www.data.gov.in/resource/indian-ocean-argo-data | Alternate/bulk access, NDSAP-licensed |
| Global Argo float data (GDAC) | IFREMER / Coriolis (one of two official Argo Global Data Centres) | https://www.coriolis.eu.org/Data-Access/Data-Download (also mirrored via ftp.ifremer.fr) | Broader Indian Ocean coverage beyond INCOIS-only floats; this is also what OceanIQ ingests from — matching their pipeline shows you understood the reference implementation |
| Ocean Biodiversity Information System (OBIS) | Intergovernmental Oceanographic Commission | https://obis.org/ | Species occurrence records — stand-in for CMLRE taxonomy data for the PoC |
| Global Biodiversity Information Facility (GBIF) | GBIF Secretariat | https://www.gbif.org/ | Cross-check/supplementary species distribution records |
| Darwin Core metadata standard | TDWG (Biodiversity Information Standards) | https://dwc.tdwg.org/ | Metadata schema to standardize taxonomy/biodiversity ingestion, matching international practice |

**Note:** CMLRE's own internal otolith/eDNA datasets are not public. For the PoC, use OBIS/GBIF as realistic stand-ins and say so explicitly in the video ("we've architected for CMLRE's actual data schema, demonstrated here against OBIS/GBIF public records") — this is honest and actually strengthens your feasibility score versus overclaiming access you don't have.

---

## 4. Competitor / Prior-Work Analysis (Slide 3 — Literature Survey)

### OceanIQ (Prior SIH Reference Benchmark, public repo, verified directly)
**What it does well:** real-time IFREMER/Argo ingestion with automatic Data Assembly Centre detection, PostgreSQL+PostGIS, dual FAISS indices (profile semantics + schema-linking for NL→SQL), Gemini-based SQL generation with a validator/sanitizer/executor safety chain, JWT auth, rate limiting. Genuinely solid production engineering — acknowledge this directly in your deck; it strengthens your credibility to show you understood a real reference solution rather than a strawman.

**Where it stops — your literature gap statement:**
1. Single-shot pipeline (classify → RAG lookup → one SQL query → response) — no multi-step agentic planning for compound/comparative questions.
2. Stateless — no multi-turn session memory.
3. Purely reactive — answers questions, never proactively surfaces anomalies.
4. Single dataset (ARGO only) — no biodiversity/taxonomy fusion.
5. No visible frontend/visualization code in the public repo.
6. No offline/low-bandwidth mode, despite the original PS text requesting it.

### International analogues (for the CMLRE-side literature comparison)
- **OBIS / GBIF** — global biodiversity data aggregation, but general-purpose, not AI-correlated with physical ocean parameters.
- **Darwin Core / ISO 19115** — metadata standardization practice VARUNA should follow for its ingestion layer.

**Gap statement to put on Slide 3, near-verbatim:**
*"Existing solutions either provide single-domain query access (OceanIQ, ARGO-only, single-shot RAG) or generic biodiversity data aggregation without cross-domain AI correlation (OBIS/GBIF). No reviewed system combines agentic multi-step reasoning, proactive anomaly alerting, and cross-domain (physical ocean + marine biodiversity) data fusion in one platform. VARUNA addresses this directly."*

---

## 5. Proposed Architecture (Slide 4 + Slide 5)

### 5.1 Design philosophy
Not a flat RAG pipeline like OceanIQ — a genuine multi-agent system with a planner, specialized tool-calling sub-agents, and a synthesizer, extensible across two data domains.

### 5.2 Core components
1. **Ingestion layer**
   - ARGO/physical: NetCDF → PostgreSQL (structured) + FAISS/Qdrant (profile-summary embeddings), following OceanIQ's proven DAC-detection pattern for Argo but adding a queue-based async ETL (Celery) for resilience.
   - Biodiversity/taxonomy (CMLRE-pattern): OBIS/GBIF records → normalized schema with Darwin Core metadata tagging → second vector index.

2. **Planner / orchestrator agent (LLM-driven)**
   - Decomposes a user query into a task DAG. Example: *"compare BGC in the Arabian Sea over the last 6 months against the equator in March 2023"* → [fetch-A, fetch-B, compare, plot], each dispatched to the right sub-agent.

3. **Tool-calling sub-agents**
   - **SQL-gen agent** — NL→SQL against PostgreSQL (schema-RAG context, matching OceanIQ's dual-index approach but agent-callable, not a single fixed step).
   - **Retrieval agent** — FAISS/Qdrant similarity search across ocean-profile or biodiversity embeddings.
   - **Cross-domain entity-resolution agent** — links a species/taxonomy record to the ocean parameters recorded at matching location/time; this is the CMLRE-fusion core.
   - **Comparison/aggregation agent** — handles multi-part/comparative questions.
   - **Visualization agent** — generates map/trajectory/depth-time plots (Leaflet/Plotly) and biodiversity-trend charts.

4. **Marine Anomaly & Early-Warning Agent (the centerpiece differentiator)**
   - Runs continuously (not query-triggered) over incoming ARGO data.
   - Flags statistically significant temperature/salinity/chlorophyll anomalies — marine heatwave precursors, potential harmful algal bloom signals.
   - Pushes alerts to a fisheries/disaster-management-facing dashboard.
   - This is what closes the exact governance gap cited in Section 2.2 — turns VARUNA from "chatbot for scientists" into "decision-support layer for government."

5. **Synthesizer agent** — merges sub-agent outputs into a natural-language answer + supporting chart/map, with every numeric claim traceable back to its source record (never freeform-generated).

6. **Session memory** — multi-turn conversational context, so follow-ups ("now filter to just BGC floats") work naturally — a direct gap in OceanIQ's stateless design.

### 5.3 Tech stack (Slide 5)
- **Backend:** FastAPI, Celery (async ingestion queues), LangGraph-style agent orchestration
- **Databases:** PostgreSQL + PostGIS (structured/geospatial), FAISS or Qdrant (dual indices: ocean-profile semantics + schema-linking, extended with a third for biodiversity)
- **LLM:** Gemini or an open model (Llama/Mistral/Qwen) for NL→SQL and synthesis — open model preferred for cost control at scale
- **CV module (CMLRE extension):** ResNet/ViT-based otolith shape/morphometrics analysis (stretch goal)
- **Frontend:** React + Leaflet (geospatial float trajectories, alert map) + Plotly (depth-time plots, biodiversity trend charts)
- **Auth/safety:** JWT auth, rate limiting on LLM calls, SQL validator/sanitizer/executor chain (matching and extending OceanIQ's safety pattern)

---

## 6. Innovation / Differentiation Summary (Slide 6)
1. **True agentic planning** vs. OceanIQ's single-shot RAG — compound/comparative questions are actually decomposed and answered correctly, not best-guessed in one SQL call.
2. **Proactive, not reactive** — the anomaly/early-warning agent is the single biggest differentiator; nothing in the reviewed prior work does this.
3. **Cross-domain fusion** — physical ocean + marine biodiversity in one platform, architected as an extensible "national marine data backbone" per MoES's own stated goal, not two bolted-together tools.
4. **Full source traceability** across both domains — every answer links back to the originating float/record.
5. **Honest, scoped feasibility** — explicitly demonstrating on public OBIS/GBIF data while architecting for CMLRE's real schema, rather than overclaiming access you don't have.

*(Rubric explicitly warns against claims of "first," "unique," or "100%" — phrase all of this as "not present in reviewed prior work," not "the world's first.")*

---

## 7. Feasibility, Impact & Roadmap (Slide 7)

**PoC scope for the hackathon (keep this honest and stated on-slide):**
- Fully build: agentic planner + sub-agents + session memory + anomaly-alert agent, over real ARGO data (Indian Ocean subset).
- Fully build: cross-domain correlation for taxonomy data (OBIS/GBIF as CMLRE stand-in).
- Roadmap only, not built: eDNA module, full CMLRE production data integration, otolith CV module (stretch goal if time allows).

**Why this scope is realistic:**
- Public datasets for both core domains (Section 3) — no data-access blocker for what's actually being built.
- Bounded query archetypes (5–8 supported patterns) rather than open-ended generality — a common, defensible hackathon-PoC scoping choice.

**Impact:**
- Faster, decision-ready ocean and biodiversity intelligence for INCOIS/CMLRE-adjacent stakeholders.
- Directly serves MoES's own "national marine data backbone" goal.
- Ties concretely to the named governance gap (INCOIS data ↔ fisheries policy integration).

**Risks & mitigations:**
- *LLM hallucination on numeric values* → all numeric answers forced through the SQL/retrieval tool path, never freeform generation.
- *Anomaly-agent false positives* → tune thresholds against historical known-heatwave periods (e.g., 2020, April 2026 events) as validation baselines.
- *Cross-domain entity resolution is imprecise data (imperfect location/time keys)* → scope correlation to coarse spatial/temporal bins for the PoC rather than exact matching.

---

## 8. Team Composition (Slide 9 — Member 1–6 only, no names, per anonymization rule)

| Member | Role |
|---|---|
| Member 1 (Lead) | AI, backend, overall system architecture — agentic orchestrator, anomaly agent |
| Member 2 | Backend, blockchain/web3 background — ingestion pipeline, auth/security layer |
| Member 3 | Backend, AI — NL→SQL / retrieval sub-agents, model integration |
| Member 4 | Frontend, full-stack — dashboard + chat UI |
| Member 5 | Frontend — alert-map UI, anomaly-feed visualization |
| Member 6 | Frontend + presentation — CMLRE/biodiversity viz module (otolith/taxonomy viewer) + deck/video work |

*(Internal reference only — Member 3 is Sahil Shah, backend + AI, added per your latest update.)*

---

## 9. References list (compile for Slide 8 — verify each link again close to submission)
1. INCOIS role in ocean forecasting, tsunami advisories — INCOIS official site / OpenGov Asia coverage.
2. April 2026 marine heatwave alert across six ocean basins — Down To Earth reporting.
3. 2020 Gulf of Mannar coral bleaching (85%) — Business Standard / PWOnlyIAS.
4. Fisheries livelihood exposure to marine heatwaves — pmfias.com governance analysis (source of the "lack of real-time integration" quote).
5. OceanIQ — public GitHub repository (reviewed as prior work): github.com/PaarthNo1/OceanIQ--AI-Intelligent
6. OBIS — https://obis.org/
7. GBIF — https://www.gbif.org/
8. Darwin Core standard — https://dwc.tdwg.org/
9. Argo Global Data Centres (IFREMER/Coriolis) — https://www.coriolis.eu.org/Data-Access/Data-Download
10. INCOIS Argo data access — https://services.incois.gov.in/argo/
11. Indian Ocean Argo data (OGD Platform) — https://www.data.gov.in/resource/indian-ocean-argo-data

---

## 10. PPT NARRATIVE — how to actually present each slide

**Slide 1 (PS & Team ID):** Say the title once, clearly, then move fast. Don't linger — judges want to get to the problem.

**Slide 2 (Problem & Users):** Open with the quote: *"the lack of real-time integration of INCOIS ocean data into fisheries policy weakens the response to marine heatwave events."* Then: "This is not a hypothetical. In April 2026, INCOIS issued heatwave alerts across six ocean basins. In 2020, a heatwave bleached 85% of corals in the Gulf of Mannar. Behind all of this sits raw, siloed ocean and biodiversity data that only domain experts can read." Land on: two ministry bodies (INCOIS, CMLRE), two datasets, one integration gap, one platform.

**Slide 3 (Literature):** Present OceanIQ respectfully — "a strong existing solution, real-time ingestion, solid engineering" — then pivot cleanly to the specific gaps (single-shot, stateless, reactive, single-dataset). This shows maturity, not dismissiveness. End on the gap statement from Section 4.

**Slide 4 (Idea):** Walk the architecture top-down: planner agent → sub-agents → synthesizer, then the anomaly agent as the standout feature. Use the architecture diagram as the visual anchor — don't read bullet points, point at the diagram.

**Slide 5 (Tech Stack):** Keep this fast and confident — this is a "we know what we're doing" slide, not a discussion slide. Group by layer (data, agents, frontend).

**Slide 6 (Innovation):** Lead with the anomaly-alert agent — it's your strongest, most memorable differentiator. Don't bury it under the other three points.

**Slide 7 (Feasibility):** Be explicit and confident about scope: "we are building X fully, and roadmapping Y" — judges respect honest scoping far more than vague, overclaimed ambition. This directly addresses the rubric's "unrealistic scope" red flag.

**Slide 8 (References):** Don't dwell — it's there to be checked, not narrated.

**Slide 9 (Team):** Quick, confident, map each member to a real contribution — judges are checking for genuine distribution of work, not padding.

---

## 11. VIDEO NARRATIVE (5–7 minutes)

- **0:00–1:00 — Hook + Problem:** Open on the marine heatwave stat and the governance-gap quote. Make it visceral, not abstract — "somewhere between raw ocean sensor data and a fisheries officer's decision, the signal is getting lost."
- **1:00–2:00 — Root cause + existing solution review:** Introduce OceanIQ fairly, then name the specific gaps.
- **2:00–4:00 — Solution walkthrough:** Screen-record the architecture diagram, then (if a working PoC exists) a live or recorded demo: ask a compound question, show the planner decompose it, show the anomaly-alert feed firing on a known historical heatwave period as validation.
- **4:00–5:30 — Differentiation + feasibility:** State scope honestly — what's built vs. roadmapped — and why that's still a strong, government-relevant platform.
- **5:30–7:00 — Impact + close:** Tie back to the stakes named in the problem section — fisheries livelihoods, disaster preparedness, MoES's own "national marine data backbone" goal. End clean, no filler.

**Reminders from the rubric:** no faces, no names/college/mentor mentions, keep citations visible/mentioned when discussing the literature and stats, avoid claiming a fully "completed" product if it isn't — demonstrate workflow/PoC honestly instead.
