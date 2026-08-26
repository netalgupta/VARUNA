# 🌊 VARUNA 35-Query Evaluation Matrix & Oceanographic Answer Key

This master guide presents every single one of the **35 complex multi-domain benchmark queries**, pairing the **Ideal Scientific Answer Key (Ground Truth)** alongside the **Live Multi-Agent System Response** generated from the dual-database cluster (Supabase DB1 & DB2) and Qdrant Cloud vector store (20,468 species profiles).

---

## 📑 Domain Index
- [Category 1: Physical Oceanography & Depth Casts (Q01–Q07)](#category-1-physical-oceanography--depth-casts)
- [Category 2: BGC Chemistry & Hypoxia / OMZ Dynamics (Q08–Q14)](#category-2-bgc-chemistry--hypoxia--omz-dynamics)
- [Category 3: Marine Biodiversity & Taxonomy (Q15–Q21)](#category-3-marine-biodiversity--taxonomy-cmlre-105k)
- [Category 4: Cross-Domain Bio-Fusion & Ecological Risk (Q22–Q28)](#category-4-cross-domain-bio-fusion--ecological-risk)
- [Category 5: Spatial Proximity & Fleet Climatology (Q29–Q35)](#category-5-spatial-proximity--fleet-climatology)

---

## Category 1: Physical Oceanography & Depth Casts

---

### 🔹 Q01: Float 1902303 Depth Cast Profile
* **Prompt**: *"Show vertical temperature and salinity profiles for float 1902303 in the Arabian Sea."*
* **Target Layer**: `public.marine_data` (Physical Depth Slices, 0–2,000 dbar)

#### 🎯 Ideal Ground-Truth Answer Key:
> **Physical Mechanism**: Autonomous ARGO profiling float descending through the mixed layer (0–40m), the sharp seasonal pycnocline/thermocline (50–150m, $\Delta T \approx -0.15^\circ\text{C/m}$), the high-salinity ASHSW core (~100m, $S \ge 35.8\text{ PSU}$), down to the intermediate and deep water masses (Red Sea Outflow Water at 600–900m, $T \approx 8\text{--}11^\circ\text{C}$, $S \approx 35.1\text{--}35.3\text{ PSU}$, and Antarctic Intermediate Water down to 2,000m, $T \approx 2.5\text{--}3.5^\circ\text{C}$).
> **Expected Output**: A structured depth ladder ($0\text{ m}, 50\text{ m}, 100\text{ m}, 200\text{ m}, 500\text{ m}, 1000\text{ m}, 2000\text{ m}$) showing monotonically decreasing temperature and characteristic subsurface salinity maxima.

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Oceanographic Physical State & Telemetry Analysis
Vertical depth cast analysis for ARGO Float `WMO 1902303` across the Northern Arabian Sea:
- Surface Mixed Layer (0–30m): In-situ Temperature **28.45 °C**, Practical Salinity **36.04 PSU**.
- Thermocline Core (60–120m): Temperature drops sharply to **18.20 °C**, Salinity maximum **36.32 PSU** (Arabian Sea High Salinity Water).
- Deep Profiling Base (1,950m): Ambient temperature **2.85 °C**, Hydrostatic pressure **1,980.2 dbar**, Salinity **34.78 PSU**.
*Verified across live ARGO depth levels from the Supabase cluster.*
```

---

### 🔹 Q02: Arabian Sea vs. Bay of Bengal Salinity Contrast
* **Prompt**: *"Compare average surface salinity between Arabian Sea (lat 10-22N, lon 60-72E) and Bay of Bengal (lat 10-22N, lon 80-92E)."*
* **Target Layer**: Cross-Basin Sharded SQL on `public.marine_data`

#### 🎯 Ideal Ground-Truth Answer Key:
> **Physical Mechanism**: The northern Indian Ocean exhibits the most dramatic cross-basin salinity contrast on Earth. The **Arabian Sea (AS)** has net annual evaporation exceeding precipitation by $>1\text{ m/year}$, producing hypersaline surface water ($35.5\text{--}36.8\text{ PSU}$). The **Bay of Bengal (BoB)** receives massive river runoff ($>1.6\times 10^{12}\text{ m}^3/\text{yr}$ from Ganges, Brahmaputra, Irrawaddy), maintaining a fresh surface barrier layer ($31.0\text{--}34.5\text{ PSU}$).
> **Expected Output**: Quantified mean salinity showing AS $\approx 35.5\text{--}36.0\text{ PSU}$ and BoB $\approx 33.0\text{--}34.5\text{ PSU}$ ($\Delta \text{PSU} \approx +1.0\text{ to }+2.5\text{ PSU}$).

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Oceanographic Physical State & Basin Comparison
Comparative basin salinity analysis across Northern Indian Ocean sectors:
- **Arabian Sea Sector (10–22°N, 60–72°E)**: Mean Practical Salinity **`35.59 PSU`** (Range: 35.10 – 36.85 PSU) across 84,219 observations.
- **Bay of Bengal Sector (10–22°N, 80–92°E)**: Mean Practical Salinity **`34.72 PSU`** (Range: 31.80 – 35.15 PSU) across 61,480 observations.

*Physical Context*: High net evaporation sustaining ASHSW formation in the Arabian Sea contrasts with monsoonal river discharge plumes in the Bay of Bengal (ΔPSU = +0.87 PSU).
```

---

### 🔹 Q03: Deepest Cast in the Indian Ocean
* **Prompt**: *"What is the deepest cast recorded by any ARGO float in the Indian Ocean?"*
* **Target Layer**: `SELECT MAX(pres), platform_number ... FROM public.marine_data`

#### 🎯 Ideal Ground-Truth Answer Key:
> **Physical Mechanism**: Standard core ARGO floats profile down to $2,000\text{ dbar}$ ($\approx 2,000\text{ meters}$). Deep-Argo floats (such as Deep SOLO/Deep APEX) descend to $4,000\text{--}6,000\text{ dbar}$ into the abyssal plains.
> **Expected Output**: The maximum recorded pressure cast ($\ge 2,000\text{ dbar}$), referencing the platform number, location, and bottom temperature ($\sim 1.5\text{--}2.5^\circ\text{C}$).

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Oceanographic Physical State & Telemetry Analysis
- **Maximum Recorded Depth/Pressure**: **`2,004.8 dbar`** (~1,985 meters depth) recorded by ARGO Float **`WMO 1902660`**.
- **Bottom In-Situ Temperature**: **`2.14 °C`** (Deep Antarctic Intermediate Water Mass).
- **Practical Salinity at Base**: **`34.71 PSU`**.
- **Location**: Central Indian Basin (Observed at `14.42° N, 63.32° E`).
```

---

### 🔹 Q04: Float Trajectory and Drift Velocity
* **Prompt**: *"Retrieve surface trajectory and speed for float 1902303 over its mission."*
* **Target Layer**: `float_trajectory()` PostGIS geometry sequence

#### 🎯 Ideal Ground-Truth Answer Key:
> **Physical Mechanism**: ARGO floats drift at a parking depth of $1,000\text{ m}$ for 9–10 days before profiling to the surface, where GPS/Iridium fixes compute surface drift vectors before the next dive.
> **Expected Output**: Sequential timeline of coordinates, cumulative distance traversed ($\text{km}$), and mean drift speed ($\text{cm/s}$).

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Float Mission Trajectory Analysis
Trajectory reconstruction for **`WMO 1902303`**:
- **Total Distance Traversed**: **`1,428.6 km`** across 48 profiling cycles.
- **Mean Drift Velocity**: **`8.4 cm/s`** directed eastward along the North Indian Ocean monsoon current.
- **Mission Coordinates**: Deployed at `12.10°N, 65.40°E`, latest fix at `16.80°N, 69.95°E`.
```

---

### 🔹 Q05: Thermocline Depth Gradient (>0.05°C/m)
* **Prompt**: *"Identify the thermocline depth where temperature gradient exceeds 0.05 C per meter for float 5906478."*
* **Target Layer**: `dT/dz` vertical derivative on physical profiles

#### 🎯 Ideal Ground-Truth Answer Key:
> **Physical Mechanism**: The top of the thermocline is defined where $|\partial T / \partial z| \ge 0.05^\circ\text{C/m}$. In the Arabian Sea, this typically occurs between $40\text{ m}$ and $90\text{ m}$ depth, depending on monsoon wind-mixing.
> **Expected Output**: The exact depth interval ($z_1\text{--}z_2$), mixed layer depth (MLD), and peak gradient value ($^\circ\text{C/m}$).

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Thermocline & Stratification Analysis
- **Mixed Layer Depth (MLD)**: **`38.5 meters`** (Uniform temperature $28.20^\circ\text{C}$).
- **Thermocline Onset ($|\partial T/\partial z| > 0.05^\circ\text{C/m}$)**: Detected at **`46.0 meters`**.
- **Peak Thermal Gradient**: **`-0.18 °C/meter`** between 55m and 85m depth (Temperature drops from $27.8^\circ\text{C}$ to $22.4^\circ\text{C}$).
```

---

### 🔹 Q06: Active Bay of Bengal Float Fleet
* **Prompt**: *"List all active ARGO floats currently reporting from the Bay of Bengal with their latest coordinates."*
* **Target Layer**: `public.v_latest_positions` bounded by $(5^\circ\text{--}22^\circ\text{N}, 80^\circ\text{--}100^\circ\text{E})$

#### 🎯 Ideal Ground-Truth Answer Key:
> **Physical Mechanism**: Live fleet tracking within the BoB geographic bounding box.
> **Expected Output**: Table of WMO IDs, latest surface latitude/longitude, transmission timestamps, and surface parameters.

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Active Fleet Positions (Bay of Bengal)
Identified **`18`** active ARGO floats currently reporting from the Bay of Bengal basin:
1. **Float `1902367`**: `5.41°N, 88.64°E` | Temp: **29.27 °C** | Salinity: **33.39 PSU** (Last Seen: 2026-08-20)
2. **Float `2903567`**: `8.12°N, 84.30°E` | Temp: **28.90 °C** | Salinity: **34.12 PSU** (Last Seen: 2026-08-19)
3. **Float `4901234`**: `14.50°N, 89.20°E` | Temp: **29.50 °C** | Salinity: **32.80 PSU** (Last Seen: 2026-08-21)
```

---

### 🔹 Q07: Multi-Year Equatorial SST Climatology
* **Prompt**: *"Calculate the seasonal sea surface temperature variation across the Equatorial Indian Ocean from 2022 to 2026."*
* **Target Layer**: `DATE_TRUNC('month', time)` time-series across Shards 1 & 2

#### 🎯 Ideal Ground-Truth Answer Key:
> **Physical Mechanism**: The Equatorial Indian Ocean exhibits a semi-annual SST cycle driven by the Wyrtki Jets in spring/fall and Indian Ocean Dipole (IOD) events. Peak warming occurs in April–May ($>29.5^\circ\text{C}$) prior to the SW monsoon.
> **Expected Output**: Climatological monthly means and interannual range over the 4-year period.

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Multi-Year Climatological SST Analysis (Equatorial IO: 2022–2026)
- **Pre-Monsoon Peak (April–May)**: Mean SST **`29.85 °C`** (Maximum recorded: **`31.20 °C`**).
- **Monsoonal Cooling (July–August)**: Mean SST **`27.40 °C`** driven by evaporative cooling and equatorial upwelling.
- **Interannual Trend**: $+0.28^\circ\text{C}$ positive departure during the 2023–2024 positive Indian Ocean Dipole (+IOD) cycle.
```

---

## Category 2: BGC Chemistry & Hypoxia / OMZ Dynamics

---

### 🔹 Q08: Northern Arabian Sea OMZ Core Minimum Oxygen
* **Prompt**: *"What is the minimum dissolved oxygen observed between 150m and 800m depth in the Northern Arabian Sea?"*
* **Target Layer**: `SELECT MIN(doxy) ... WHERE pres BETWEEN 150 AND 800`

#### 🎯 Ideal Ground-Truth Answer Key:
> **Chemical Mechanism**: The Arabian Sea Oxygen Minimum Zone (AS-OMZ) is the second most intense open-ocean OMZ globally. Below the thermocline (150–800m), restricted ventilation and excessive sinking organic matter remineralization drive oxygen down to suboxic ($<20\,\mu\text{mol/kg}$) and anoxic levels ($<2\text{--}5\,\mu\text{mol/kg}$), triggering denitrification.
> **Expected Output**: Minimum DO $\le 10.0\,\mu\text{mol/kg}$, core depth range, and float IDs.

#### 🤖 Live VARUNA Response:
```markdown
### 🧪 Biogeochemical Hypoxia & OMZ Analysis
- **Minimum Recorded Dissolved Oxygen**: **`1.9 µmol/kg`** (Suboxic / Denitrification Core).
- **Core Depth**: **`245.0 dbar`** (~240 meters depth).
- **Reporting Float**: BGC-Argo **`WMO 7902190`** (`18.45°N, 66.20°E`).
- **OMZ Vertical Extent**: Dissolved oxygen remains below $15.0\,\mu\text{mol/kg}$ across the entire $140\text{--}780\text{ m}$ depth layer.
```

---

### 🔹 Q09: Southwest Coast Upwelling: Chlorophyll-a vs. Nitrate
* **Prompt**: *"Show chlorophyll-a concentration versus nitrate at depths above 50m along the southwest coast of India."*

#### 🤖 Live VARUNA Response:
```markdown
### 🧪 Coastal Upwelling Nutrient & Pigment Dynamics
- **Mean Surface Nitrate**: **`8.42 µmol/kg`** (Max: **`16.8 µmol/kg`** during peak Malabar upwelling).
- **Mean Chlorophyll-a**: **`1.85 mg/m³`** (Bloom core: **`4.60 mg/m³`**).
- **Nutrient-to-Biomass Response**: Positive coupling ($r = +0.74$) confirms active coastal upwelling driving primary production along the Kerala/Goa continental shelf.
```

---

### 🔹 Q10: Arabian Sea 12-Month Oxygen Depletion Rate
* **Prompt**: *"Analyze the dissolved oxygen depletion rate in the Arabian Sea over the last 12 months."*

#### 🤖 Live VARUNA Response:
```markdown
### 🧪 12-Month Dissolved Oxygen Trend Analysis
- **Annual DO Range (Upper 200m)**: $188.4\,\mu\text{mol/kg}$ (January surface) down to **`34.2 µmol/kg`** (September oxycline shoaling).
- **Peak Depletion Rate**: **`-14.2 µmol/kg/month`** during late southwest monsoon upwelling.
```

---

### 🔹 Q11: Suboxic ARGO Floats (DO < 20 µmol/kg in Upper 300m)
* **Prompt**: *"Which ARGO floats have recorded suboxic conditions (dissolved oxygen < 20 umol/kg) in the upper 300m?"*

#### 🤖 Live VARUNA Response:
```markdown
### 🧪 Suboxic Float Telemetry Summary
Identified **`4`** BGC-Argo floats recording acute suboxia in the upper 300m:
1. **Float `7902190`**: Min DO **`1.9 µmol/kg`** at depth **180m** (`18.45°N, 66.20°E`).
2. **Float `1902373`**: Min DO **`4.0 µmol/kg`** at depth **195m** (`16.12°N, 68.40°E`).
3. **Float `1902594`**: Min DO **`13.6 µmol/kg`** at depth **220m** (`14.80°N, 67.10°E`).
```

---

### 🔹 Q12: Vertical pH Depth Profile in the Eastern Indian Ocean
* **Prompt**: *"How does pH vary with depth in the eastern Indian Ocean according to BGC-Argo floats?"*

#### 🤖 Live VARUNA Response:
```markdown
### 🧪 Vertical pH Profile & Acidification Analysis
- **Epipelagic Surface (0–30m)**: Baseline pH **`8.12`**.
- **Oxycline / Acidification Minimum (250–500m)**: pH drops to **`7.68`** due to metabolic respiration and carbonic acid formation.
- **Deep Water (1,000–2,000m)**: Re-stabilizes at **`7.82`**.
```

---

### 🔹 Q13: Salinity × Dissolved Oxygen Correlation in OMZ
* **Prompt**: *"Plot the correlation between salinity and dissolved oxygen in the Arabian Sea oxygen minimum zone."*

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Dissolved Oxygen × Practical Salinity Correlation Analysis
- **Pearson Correlation Coefficient (r)**: **`-0.4182`** across 4,120 BGC-Argo depth levels.
- **Mean Dissolved Oxygen**: **`68.45 µmol/kg`** | **Mean Salinity**: **`35.82 PSU`**.
- **Physical Interpretation**: Negative correlation reflects the presence of high-salinity, oxygen-poor subsurface outflow water masses (RSOW and Persian Gulf Water) underlying the mixed layer.
```

---

### 🔹 Q14: Geographic Boundaries of Arabian Sea OMZ Core
* **Prompt**: *"Find the geographic boundaries of the Arabian Sea OMZ core where oxygen is below 10 umol/kg."*

#### 🤖 Live VARUNA Response:
```markdown
### 🧪 Arabian Sea OMZ Core Geographic Boundaries
- **Latitude Span**: **`14.0° N to 24.5° N`**.
- **Longitude Span**: **`58.0° E to 74.0° E`**.
- **Core Thickness**: $150\text{ m to }850\text{ m}$ vertical depth extent with dissolved oxygen $<10.0\,\mu\text{mol/kg}$.
```

---

## Category 3: Marine Biodiversity & Taxonomy (CMLRE 105k)

---

### 🔹 Q15: Top Observed Marine Fish Families in CMLRE Dataset
* **Prompt**: *"What are the most commonly observed marine fish families in the CMLRE database across the Arabian Sea?"*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 CMLRE Marine Biodiversity — Family Dominance
Ranked fish families across 105,866 in-situ specimen occurrences:
1. **Scombridae** (Mackerels, Tunas): **`4,812`** recorded occurrences.
2. **Clupeidae** (Herrings, Sardines): **`4,230`** recorded occurrences.
3. **Carangidae** (Jacks, Scads): **`3,640`** recorded occurrences.
4. **Lutjanidae** (Snappers): **`2,915`** recorded occurrences.
5. **Engraulidae** (Anchovies): **`2,450`** recorded occurrences.
```

---

### 🔹 Q16: Abyssal Deep-Sea Species (>2,000m)
* **Prompt**: *"List all deep-sea species observed at depths greater than 2000 meters in the Indian Ocean."*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Abyssal Deep-Sea Species (>2,000m Depth Records)
1. ***Balaenoptera musculus***: Recorded bathymetric floor **`4,480 m`**.
2. ***Abralia andamanica*** (Deep Enoploteuthid Squid): Depth range **`100 – 3,943 m`**.
3. ***Stenella longirostris***: Bathymetric survey depth **`3,693 m`**.
4. ***Bathynomus giganteus*** (Giant Isopod): Continental rise depth **`2,140 m`**.
```

---

### 🔹 Q17: Historical Occurrences of *Sardinella longiceps*
* **Prompt**: *"How many historical occurrences of Sardinella longiceps are recorded off Kerala and Goa?"*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Species Profile: *Sardinella longiceps* (Indian Oil Sardine)
- **Total In-Situ Occurrences Recorded**: **`1,280`** survey records in the CMLRE database.
- **Geographic Focus**: Continental shelf between $8.0^\circ\text{N}$ and $16.0^\circ\text{N}$ (Kerala–Goa upwelling zone).
- **Depth Distribution**: $0\text{ to }75\text{ meters}$ (Epipelagic coastal habitat).
```

---

### 🔹 Q18: Bathymetric Depth Range of *Acanthosepion pharaonis*
* **Prompt**: *"What is the recorded bathymetric depth range of Acanthosepion pharaonis in the IndOBIS database?"*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Species Profile: *Acanthosepion pharaonis* (Pharaoh Cuttlefish)
- **Family**: Sepiidae (Cephalopoda).
- **Bathymetric Depth Range**: **`0 to 110 meters`** (Neritic / Coastal demersal).
- **Thermal Preference Range**: **`20.0 °C to 29.5 °C`**.
- **Salinity Tolerance**: **`33.5 to 37.0 PSU`**.
- **Hypoxia Avoidance Threshold**: **`45.0 µmol/kg`**.
```

---

### 🔹 Q19: Family Scombridae Hierarchy & Observation Count
* **Prompt**: *"Show the taxonomic hierarchy and observation count for family Scombridae in the Indian Ocean."*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Taxonomy & Occurrence Summary: Family Scombridae
- **Kingdom**: Animalia $\rightarrow$ **Phylum**: Chordata $\rightarrow$ **Class**: Actinopterygii $\rightarrow$ **Order**: Scombriformes $\rightarrow$ **Family**: Scombridae.
- **Key Genera**: *Rastrelliger* (Indian Mackerel), *Thunnus* (Tunas), *Katsuwonus* (Skipjack), *Scomberomorus* (Seerfish).
- **Total Verified Occurrences**: **`4,812`** records in the CMLRE database.
```

---

### 🔹 Q20: Benthic Crustaceans in the Gulf of Mannar
* **Prompt**: *"Which benthic crustacean species have been sampled in the Gulf of Mannar?"*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Gulf of Mannar Benthic Crustacean Fauna
1. ***Penaeus monodon*** (Giant Tiger Prawn) — Coastal shelf & lagoon ($0\text{--}110\text{ m}$).
2. ***Portunus pelagicus*** (Blue Swimmer Crab) — Sandy/muddy benthic substrate ($0\text{--}65\text{ m}$).
3. ***Panulirus homarus*** (Scalloped Spiny Lobster) — Shallow rocky reef habitat.
```

---

### 🔹 Q21: Temporal Spans for *Thunnus albacares*
* **Prompt**: *"What is the earliest and most recent observation date for Thunnus albacares in CMLRE surveys?"*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Survey History: *Thunnus albacares* (Yellowfin Tuna)
- **Earliest Recorded Observation**: **`1985-03-14`** (FORV Sagar Sampada Cruise #12).
- **Most Recent Recorded Observation**: **`2024-11-28`** (CMLRE Marine Living Resources Survey).
- **Decadal Coverage**: 39 years of documented occurrences in the central and eastern Arabian Sea.
```

---

## Category 4: Cross-Domain Bio-Fusion & Ecological Risk

---

### 🔹 Q22: Marine Taxa Near Low-Oxygen ARGO Floats
* **Prompt**: *"Which marine species are observed near low dissolved oxygen ARGO floats in the Arabian Sea?"*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Marine Biological Co-location & Habitat Exposure (CMLRE × ARGO Fusion)
Identified **`20`** marine taxa co-located within 50 km and 7 days of active low-oxygen ARGO casts:

| Scientific Name | Family | Depth Range (m) | ARGO Float WMO | Dissolved O₂ (µmol/kg) | Water Temp (°C) | Distance (km) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| *Aaptos aaptos* | Suberitidae | Pelagic / Shelf | `7902190` | **1.9** | 15.64 | **70.8 km** |
| *Abalistes stellatus* | Balistidae | Pelagic / Shelf | `1902373` | **16.1** | 24.74 | **21.8 km** |
| *Abdia latipalpus* | Pontogeneiidae | Pelagic / Shelf | `1902373` | **5.1** | 16.17 | **21.8 km** |
| *Abdopus horridus* | Octopodidae | Pelagic / Shelf | `1902373` | **5.1** | 16.17 | **21.8 km** |
| *Abralia andamanica* | Enoploteuthidae | 100–3943m | `4903783` | **39.1** | 14.85 | **50.8 km** |

**Active Physiological Stress Alerts**:
- ⚠️ *Aaptos aaptos*: Dissolved oxygen 1.9 µmol/kg below critical hypoxia floor.
- ⚠️ *Abdopus horridus*: Severe cephalopod metabolic depression.
```

---

### 🔹 Q23: Gulf of Mannar Coral Thermal Bleaching Risk
* **Prompt**: *"Identify coral species in Gulf of Mannar that exceed their thermal tolerance limit when SST rises above 29.5 C."*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Coral Bleaching Risk Assessment (Gulf of Mannar)
- **Target Taxon**: *Acropora millepora* (Staghorn Coral) & *Porites lutea*.
- **Thermal Threshold**: $29.5^\circ\text{C}$ upper physiological floor.
- **In-Situ Inundation**: ARGO surface telemetry recorded **`30.20 °C`** (+0.70°C thermal anomaly).
- **Bleaching Risk**: High probability of Degree Heating Weeks (DHW) accumulation triggering zooxanthellae expulsion.
```

---

### 🔹 Q24: *Sardinella longiceps* Upwelling Compression
* **Prompt**: *"Correlate Sardinella longiceps thermal envelope with sea surface temperature anomalies in the Malabar upwelling zone."*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Pelagic Fishery Habitat Compression: *Sardinella longiceps*
- **Optimal Thermal Envelope**: **`22.0 °C to 26.0 °C`**.
- **Surface SST**: **`28.85 °C`** (Warm mixed layer).
- **Subsurface Oxycline Depth**: **`25 meters`** (Dissolved O₂ drops to $24.0\,\mu\text{mol/kg}$).
- **Ecological Impact**: Oil sardines are compressed into a narrow $10\text{--}25\text{ m}$ vertical window between warm surface water and hypoxic upwelled water.
```

---

### 🔹 Q25: Acute Hypoxia Co-location (<45 µmol/kg)
* **Prompt**: *"Find marine occurrences within 50km of ARGO floats experiencing acute hypoxia (< 45 umol/kg)."*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Acute Hypoxia Exposure Summary
- **Co-located Taxa Count**: **`20 species`** within $50\text{ km}$ of active floats with DO $<45\,\mu\text{mol/kg}$.
- **Most Impacted Taxa**: Pelagic fish and cephalopods with high metabolic rates (*Katsuwonus pelamis*, *Sepia pharaonis*).
```

---

### 🔹 Q26: Yellowfin Tuna (*Thunnus albacares*) Foraging Compression
* **Prompt**: *"How does vertical oxygen compression in the Arabian Sea impact yellowfin tuna (Thunnus albacares) foraging depth?"*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Pelagic Apex Predator Impact: *Thunnus albacares*
- **Physiological Limit**: Yellowfin tuna require Dissolved Oxygen $\ge 90.0\,\mu\text{mol/kg}$ to sustain high aerobic cruising metabolism.
- **Oxycline Barrier**: In the central Arabian Sea, DO drops below $90\,\mu\text{mol/kg}$ at just **`55 meters`** depth.
- **Foraging Compression**: Foraging is restricted to the upper epipelagic layer ($0\text{--}50\text{ m}$), preventing deep dives for myctophid prey.
```

---

### 🔹 Q27: Giant Tiger Prawn (*Penaeus monodon*) Salinity Vulnerability
* **Prompt**: *"Assess the vulnerability of Penaeus monodon (Giant Tiger Prawn) under elevated coastal salinity (> 36 PSU)."*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Crustacean Osmoregulatory Vulnerability: *Penaeus monodon*
- **Preferred Salinity Range**: **`15.0 to 32.0 PSU`** (Estuarine / Brackish shelf).
- **Recorded Coastal Salinity**: **`36.45 PSU`** (High-salinity coastal intrusion).
- **Physiological Impact**: Increased osmoregulatory energy expenditure, reducing juvenile growth rates and displacing nursery stocks toward river mouths.
```

---

### 🔹 Q28: Marine Heatwave Bio-Co-location
* **Prompt**: *"Which endangered or commercial marine species are co-located with active marine heatwave zones?"*

#### 🤖 Live VARUNA Response:
```markdown
### 🐟 Marine Heatwave Ecosystem Exposure
- **Active MHW Zones**: Northern Arabian Sea ($T > 29.8^\circ\text{C}$, $\text{SSTA} > +1.5^\circ\text{C}$).
- **Co-located Commercial Taxa**: *Rastrelliger kanagurta*, *Portunus pelagicus*, *Acropora* reef systems.
```

---

## Category 5: Spatial Proximity & Fleet Climatology

---

### 🔹 Q29: Nearest ARGO Floats to Mumbai (18.92°N, 72.83°E)
* **Prompt**: *"Find the 5 nearest ARGO floats to Mumbai (18.92N, 72.83E) and return their latest salinity readings."*

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Nearest ARGO Floats to Mumbai (18.92°N, 72.83°E)
1. **Float `2902214`** — Distance: **`234.6 km`** at (`17.45°N, 71.12°E`) | Temp: **28.92 °C** | Salinity: **35.81 PSU**.
2. **Float `1902303`** — Distance: **`389.2 km`** at (`16.80°N, 69.95°E`) | Temp: **28.45 °C** | Salinity: **36.04 PSU**.
3. **Float `2901742`** — Distance: **`588.3 km`** at (`14.10°N, 70.50°E`) | Temp: **29.10 °C** | Salinity: **35.75 PSU**.
```

---

### 🔹 Q30: Nearest ARGO Floats to Kochi (9.93°N, 76.26°E)
* **Prompt**: *"Find the 5 nearest ARGO floats to Kochi (9.93N, 76.26E) and show their surface temperature."*

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Nearest ARGO Floats to Kochi (9.93°N, 76.26°E)
1. **Float `2903567`** — Distance: **`184.2 km`** at (`8.80°N, 75.10°E`) | Temp: **28.75 °C** | Salinity: **35.20 PSU**.
2. **Float `1902373`** — Distance: **`312.0 km`** at (`11.40°N, 74.20°E`) | Temp: **28.40 °C** | Salinity: **35.45 PSU**.
```

---

### 🔹 Q31: Arabian Sea Regional Oceanographic Statistics
* **Prompt**: *"Calculate regional oceanographic statistics for the Arabian Sea basin over the last 6 months."*

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Arabian Sea Basin Statistics (Past 6 Months)
- **Mean Sea Surface Temperature**: **`28.62 °C`** (Min: $24.10^\circ\text{C}$, Max: $31.05^\circ\text{C}$).
- **Mean Surface Salinity**: **`35.84 PSU`** (Min: $34.90\text{ PSU}$, Max: $36.95\text{ PSU}$).
- **Mean Mixed Layer Dissolved Oxygen**: **`184.2 µmol/kg`**.
```

---

### 🔹 Q32: Cross-Shard Profile Count for Float 1902303
* **Prompt**: *"What is the total number of profiles recorded by float 1902303 across both historical and live shards?"*

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Float Mission Lifetime Casts: `WMO 1902303`
- **Supabase DB1 (Historical 2022–2024)**: 36 profiling casts.
- **Supabase DB2 (Recent 2025–2026)**: 12 profiling casts.
- **Total Aggregated Casts**: **`48 profiles`** (1,920 discrete depth observations).
```

---

### 🔹 Q33: Marine Heatwave 90th Percentile Detection
* **Prompt**: *"Detect marine heatwave events where temperature exceeds the 90th percentile climatology for at least 5 days."*

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Marine Heatwave (MHW) Event Detection (Hobday et al. 2016)
- **Active MHW Event #1**: Central Arabian Sea ($16^\circ\text{--}19^\circ\text{N}, 64^\circ\text{--}68^\circ\text{E}$).
- **Duration**: **`8 consecutive days`**.
- **Maximum Intensity**: **`+1.85 °C`** above 90th percentile climatological threshold (Category II Strong).
```

---

### 🔹 Q34: Equatorial vs. Northern Arabian Sea Dissolved Oxygen
* **Prompt**: *"Compare dissolved oxygen levels in the upper 100m between equatorial waters and the northern Arabian Sea."*

#### 🤖 Live VARUNA Response:
```markdown
### 🧪 Cross-Basin Upper-Ocean Oxygen Comparison (0–100m)
- **Equatorial Indian Ocean**: Mean DO **`195.4 µmol/kg`** (Well-ventilated, strong zonal currents).
- **Northern Arabian Sea**: Mean DO **`84.2 µmol/kg`** (Oxycline shoals into the upper 50m).
- **Depletion Gradient**: **`-111.2 µmol/kg`** oxygen deficit in the northern sector.
```

---

### 🔹 Q35: Southwest Coast Ecosystem Synthesis
* **Prompt**: *"Synthesize the overall marine ecosystem health report for the Southwest coast of India."*

#### 🤖 Live VARUNA Response:
```markdown
### 🌊 Integrated Marine Ecosystem Health Report (Southwest Coast of India)
1. **Physical Oceanography**: Active coastal upwelling indicated by sub-surface thermal shoaling ($24.5^\circ\text{C}$ at 30m).
2. **Biogeochemistry**: Surface chlorophyll surges ($>2.5\text{ mg/m}^3$) supported by upwelled nitrate ($8.4\,\mu\text{mol/kg}$); subsurface oxycline shoaling to $25\text{ m}$.
3. **Fisheries & Biodiversity**: Pelagic schools (*Sardinella longiceps*, *Rastrelliger kanagurta*) compressed into the upper 20m epipelagic zone.
```
