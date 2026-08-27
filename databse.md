# VARUNA — Argo Data Frontend Data Contract

## 1. High-Level Data Architecture

VARUNA's Argo observational data is currently split across **two Supabase databases** because the dataset exceeded the storage capacity of the original Supabase free-tier project.

```text
                         ERDDAP
                           │
                           ▼
                  Argo BGC Observations
                           │
                           ▼
              ┌────────────────────────┐
              │      Time-based split  │
              └────────────┬───────────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
     SUPABASE DB — OLD            SUPABASE DB — NEW
     2022 → July 2025             August 2025 → Present
             │                           │
             │                           │
     marine_data                  marine_data
     ├── 2022 partition           ├── 2025 partition*
     ├── 2023 partition           └── 2026 partition
     ├── 2024 partition
     └── 2025 partition*
             │                           │
             └─────────────┬─────────────┘
                           │
                    API / Backend Layer
                           │
                           ▼
                    VARUNA Frontend
```

**The frontend should ideally not need to know which database contains a particular observation.**

The backend/API layer should abstract the two-database split.

---

# 2. Database Division

## Database 1 — Historical / Old DB

Contains:

```text
2022-01-01 → 2025-07-31
```

Current verified state:

| Property             | Value                 |
| -------------------- | --------------------- |
| Earliest observation | `2022-01-01 05:48:25` |
| Latest observation   | `2025-07-31 15:08:43` |
| Total rows           | `2,368,451`           |

---

## Database 2 — Current / New DB

Contains:

```text
2025-08-01 → 2026-08-22
```

Current ingestion result:

| Property                    | Value                 |
| --------------------------- | --------------------- |
| Start                       | `2025-08-01`          |
| Latest ingestion checkpoint | `2026-08-22T09:25:31` |
| Rows processed              | `1,592,787`           |
| Windows completed           | `13`                  |

Combined, the two databases currently contain approximately:

```text
3,961,238 observations
```

The intended database boundary is:

```text
OLD DB                         NEW DB

2025-07-31 15:08:43
        │
        │
        ▼
2025-08-01 00:00:00
        │
        └──────────────────────────────►
```

There should be no intentional overlap between the two databases.

---

# 3. Main Table — `public.marine_data`

This is the **canonical Argo observation table**.

Each row represents **one Argo measurement at one pressure/depth level at one timestamp**.

The table is:

```text
public.marine_data
```

and is partitioned by `time`.

### Schema

```text
marine_data
│
├── platform_number
├── cycle_number
├── direction
├── latitude
├── longitude
├── time
├── geom
├── pres
├── temp
├── psal
├── doxy
├── chla
├── ph_in_situ_total
└── nitrate
```

---

# 4. Field-by-Field Description

| Field              | Type                          | Description                                                                                                                      |
| ------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `platform_number`  | `INTEGER`                     | Unique identifier of the Argo float/platform.                                                                                    |
| `cycle_number`     | `INTEGER`                     | Argo profiling cycle associated with the observation.                                                                            |
| `direction`        | `CHAR(1)`                     | Profile direction: `A` = ascending, `D` = descending.                                                                            |
| `latitude`         | `DOUBLE PRECISION`            | Latitude of the float observation.                                                                                               |
| `longitude`        | `DOUBLE PRECISION`            | Longitude of the float observation.                                                                                              |
| `time`             | `TIMESTAMP WITHOUT TIME ZONE` | Observation timestamp. The ingestion pipeline normalizes ERDDAP timestamps to UTC before storing them without timezone metadata. |
| `geom`             | `GEOGRAPHY(POINT, 4326)`      | PostGIS geographic representation of the observation's latitude/longitude.                                                       |
| `pres`             | `DOUBLE PRECISION`            | Pressure at which the measurement was taken, generally expressed in dbar.                                                        |
| `temp`             | `DOUBLE PRECISION`            | Water temperature.                                                                                                               |
| `psal`             | `DOUBLE PRECISION`            | Practical salinity.                                                                                                              |
| `doxy`             | `DOUBLE PRECISION`            | Dissolved oxygen measurement.                                                                                                    |
| `chla`             | `DOUBLE PRECISION`            | Chlorophyll-a concentration.                                                                                                     |
| `ph_in_situ_total` | `DOUBLE PRECISION`            | In-situ total pH measurement.                                                                                                    |
| `nitrate`          | `DOUBLE PRECISION`            | Nitrate concentration.                                                                                                           |

---

# 5. Important Data Model Concept

A single float does **not** correspond to a single row.

One Argo float produces multiple cycles, and each cycle can contain measurements at multiple pressure/depth levels.

For example:

```text
Float 2901234
    │
    ├── Cycle 1
    │     ├── 5 dbar
    │     ├── 10 dbar
    │     ├── 20 dbar
    │     └── ...
    │
    ├── Cycle 2
    │     ├── 5 dbar
    │     ├── 10 dbar
    │     └── ...
    │
    └── Cycle 3
          ├── 5 dbar
          └── ...
```

Therefore:

> **One Argo float can have thousands of observation rows.**

---

# 6. Primary Key

The table uses:

```sql
PRIMARY KEY (
    platform_number,
    time,
    pres
)
```

An individual observation is therefore uniquely identified by:

```text
Float + Timestamp + Pressure
```

For frontend/API purposes:

> `platform_number` alone is **not** a unique observation identifier.

---

# 7. `direction`

The `direction` field represents the direction of the Argo profile:

```text
A = Ascending
D = Descending
```

Conceptually:

```text
Surface
   ↑
   │     A — ascending
   │
   │
   │
   │
   ↓     D — descending
Deep
```

For most frontend use cases, filtering by `direction` is not required unless displaying individual vertical profiles.

---

# 8. `geom` — Geographic Field

The `geom` field uses:

```sql
GEOGRAPHY(POINT, 4326)
```

It represents the geographic location of the observation using WGS84 / EPSG:4326.

It is constructed from:

```text
longitude → X
latitude  → Y
```

For example:

```text
latitude  = 12.5
longitude = 72.3
```

represents approximately:

```text
POINT(72.3 12.5)
```

### Frontend recommendation

For normal map rendering, prefer:

```text
latitude
longitude
```

directly.

For example:

```json
{
  "latitude": 12.5,
  "longitude": 72.3
}
```

The `geom` column is primarily useful for PostGIS spatial queries and backend-side geospatial processing.

---

# 9. Time-Based Partitions

`marine_data` is a **partitioned parent table**.

The physical data is divided into yearly partitions:

```text
marine_data
│
├── marine_data_2022
│      2022-01-01 → 2022-12-31
│
├── marine_data_2023
│      2023-01-01 → 2023-12-31
│
├── marine_data_2024
│      2024-01-01 → 2024-12-31
│
├── marine_data_2025
│      2025-01-01 → 2025-12-31
│
└── marine_data_2026
       2026-01-01 → 2026-12-31
```

The frontend/API should normally query:

```text
public.marine_data
```

rather than querying individual partitions.

PostgreSQL handles partition routing internally.

---

# 10. Important Timestamp Behavior

The database column is:

```sql
time TIMESTAMP WITHOUT TIME ZONE
```

This means the database does **not** store timezone metadata with the value.

However, the ingestion pipeline receives timestamps from ERDDAP as UTC and normalizes them before storing them.

Therefore, for the VARUNA data contract:

> **Treat `time` values as UTC, even though the PostgreSQL column itself is `TIMESTAMP WITHOUT TIME ZONE`.**

Example database value:

```text
2026-08-21 14:32:00
```

should be interpreted by the application as:

```text
2026-08-21 14:32:00 UTC
```

If the backend converts timestamps to API responses, it should maintain this UTC interpretation consistently.

---

# 11. `v_latest_positions`

The database also contains the helper view:

```text
public.v_latest_positions
```

This is intended primarily for the **latest-position / fleet map**.

It returns **one row per Argo float**, representing the latest known observation position for that float.

Conceptually:

```text
marine_data
     │
     │ For each platform_number:
     │ select newest observation
     ▼
v_latest_positions
```

The view contains:

| Field             | Meaning                                   |
| ----------------- | ----------------------------------------- |
| `platform_number` | Argo float identifier                     |
| `time`            | Timestamp of the latest known observation |
| `latitude`        | Latest latitude                           |
| `longitude`       | Latest longitude                          |

Query:

```sql
SELECT *
FROM public.v_latest_positions;
```

returns approximately **one row per float**, rather than millions of individual observations.

---

# 12. Example Latest-Position Record

Example:

```json
{
  "platform_number": 2901234,
  "time": "2026-08-21T14:32:00",
  "latitude": 12.42,
  "longitude": 73.81
}
```

The frontend can use this directly for the fleet/map interface.

---

# 13. Main Frontend Use Cases

## A. Display Latest Position of Every Float

Use:

```text
v_latest_positions
```

This is appropriate for:

* Argo fleet map
* Float markers
* Current/latest float positions
* Fleet overview
* Latest observation timestamp

The frontend receives:

```text
platform_number
latitude
longitude
time
```

---

## B. Retrieve a Particular Float's History

Example:

```sql
SELECT
    platform_number,
    cycle_number,
    direction,
    latitude,
    longitude,
    time,
    pres,
    temp,
    psal,
    doxy,
    chla,
    ph_in_situ_total,
    nitrate
FROM public.marine_data
WHERE platform_number = <FLOAT_ID>
ORDER BY time ASC, pres ASC;
```

Useful for:

* Float trajectory
* Historical movement
* Measurement history
* Time-series visualization
* Profile visualization

---

# 14. Retrieve Recent Observations

Example:

```sql
SELECT *
FROM public.marine_data
WHERE time >= CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY time DESC;
```

Useful for:

* Recent observations
* Recent ocean conditions
* Recent float activity
* Dashboard statistics

The application should use pagination/limits for large result sets.

---

# 15. Geographic Filtering

The current ingestion region is:

```text
Latitude:   0° → 30° N
Longitude: 50° → 100° E
```

This covers the target VARUNA ocean region.

A basic bounding-box query:

```sql
SELECT
    platform_number,
    time,
    latitude,
    longitude,
    temp,
    psal,
    doxy,
    chla,
    ph_in_situ_total,
    nitrate
FROM public.marine_data
WHERE latitude BETWEEN 0 AND 30
  AND longitude BETWEEN 50 AND 100;
```

For more advanced geographic queries, the backend can use the PostGIS `geom` column.

---

# 16. Oceanographic Variables

The main environmental variables available in the dataset are:

```text
Temperature
Salinity
Dissolved Oxygen
Chlorophyll-a
pH
Nitrate
```

These can be used for:

```text
Temperature
    → Time series
    → Spatial maps
    → Vertical profiles

Salinity
    → Time series
    → Spatial maps
    → Vertical profiles

Dissolved Oxygen
    → Time series
    → Spatial maps
    → Vertical profiles

Chlorophyll-a
    → Time series
    → Spatial maps
    → Vertical profiles

pH
    → Time series
    → Spatial maps
    → Vertical profiles

Nitrate
    → Time series
    → Spatial maps
    → Vertical profiles
```

---

# 17. NULL Values

Not every observation contains every oceanographic variable.

For example:

```json
{
  "temp": 27.42,
  "psal": 35.12,
  "doxy": null,
  "chla": 0.21,
  "nitrate": null
}
```

`NULL` means that the measurement is unavailable/missing.

It does **not** mean zero.

Therefore:

```text
NULL ≠ 0
```

The frontend should represent unavailable measurements as something such as:

```text
N/A
```

rather than displaying `0`.

---

# 18. Recommended Frontend/API Architecture

The frontend should ideally **not directly implement the two-database split**.

Recommended architecture:

```text
                    ┌────────────────────┐
                    │      FRONTEND      │
                    │   React / Next.js  │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │     API/BACKEND    │
                    │                    │
                    │ Data aggregation   │
                    │ Database routing   │
                    │ Filtering          │
                    │ Pagination         │
                    │ Authentication     │
                    └─────────┬──────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
              OLD SUPABASE        NEW SUPABASE
              2022–Jul 2025       Aug 2025–present
```

The frontend should simply request data from the API.

The backend determines which database needs to be queried.

---

# 19. Suggested API Endpoints

A possible backend interface:

```text
GET /api/floats/latest
```

Returns latest known position for every float.

```text
GET /api/floats/{platform_number}
```

Returns information/history for a particular float.

```text
GET /api/floats/{platform_number}/trajectory
```

Returns the geographic trajectory of a float.

```text
GET /api/floats/{platform_number}/profiles
```

Returns vertical profile observations.

```text
GET /api/observations
```

Returns filtered observations.

```text
GET /api/observations?start=...&end=...
```

Returns observations within a time range.

```text
GET /api/ocean/temperature
GET /api/ocean/salinity
GET /api/ocean/oxygen
GET /api/ocean/chlorophyll
GET /api/ocean/ph
GET /api/ocean/nitrate
```

These can expose purpose-built data for visualization rather than making the frontend process raw observations.

---

# 20. Example API Response — Latest Position

```json
{
  "platform_number": 2901234,
  "time": "2026-08-21T14:32:00",
  "latitude": 12.42,
  "longitude": 73.81
}
```

The timestamp should be interpreted as UTC.

---

# 21. Example API Response — Observation

```json
{
  "platform_number": 2901234,
  "cycle_number": 184,
  "direction": "A",
  "time": "2026-08-21T14:32:00",
  "latitude": 12.42,
  "longitude": 73.81,
  "pres": 50.0,
  "temp": 27.42,
  "psal": 35.12,
  "doxy": 198.3,
  "chla": 0.21,
  "ph_in_situ_total": 8.04,
  "nitrate": 1.72
}
```

---

# 22. Performance Guidelines for Frontend

The complete dataset contains **millions of observations**.

The frontend should **never request the entire `marine_data` table at once**.

Use:

* Pagination
* Time-range filtering
* Float/platform filtering
* Geographic filtering
* Variable selection
* Aggregation
* Backend-side processing

For example, avoid:

```sql
SELECT *
FROM public.marine_data;
```

for a frontend request.

Prefer:

```sql
SELECT
    platform_number,
    time,
    latitude,
    longitude,
    temp
FROM public.marine_data
WHERE platform_number = <FLOAT_ID>
  AND time >= <START_TIME>
  AND time < <END_TIME>
ORDER BY time ASC
LIMIT 1000;
```

---

# 23. Core Rules for the Frontend Team

### Data model

1. `marine_data` is the canonical Argo observation dataset.
2. Each row represents one measurement at a particular float, timestamp, and pressure.
3. `platform_number` identifies the float, not an individual observation.
4. The observation primary key is `(platform_number, time, pres)`.

### Time

5. `time` is stored as `TIMESTAMP WITHOUT TIME ZONE`.
6. The ingestion pipeline normalizes source timestamps to UTC before storage.
7. Applications should therefore interpret stored `time` values as UTC.
8. API responses should maintain this UTC interpretation consistently.

### Geography

9. `latitude` and `longitude` are the easiest fields for frontend map rendering.
10. `geom` is the PostGIS geographic representation and is primarily useful for backend spatial queries.

### Latest positions

11. `v_latest_positions` provides the latest known position for each float.
12. Use `v_latest_positions` for the main fleet/latest-position map rather than querying the entire observation table.

### Missing data

13. Oceanographic fields may contain `NULL`.
14. `NULL` means unavailable/missing, not zero.

### Database split

15. Historical data is in the old Supabase database: `2022 → 2025-07-31`.
16. Current data is in the new Supabase database: `2025-08-01 → present`.
17. The frontend should ideally not implement this database split itself.
18. The backend/API layer should handle database routing.

### Performance

19. Never load millions of raw observations into the browser.
20. Use filtering, pagination, aggregation, and purpose-built API endpoints.
21. For maps, use `v_latest_positions` or backend-generated spatial/aggregated data whenever possible.

---

# 24. Current Database Structure — Summary

```text
SUPABASE DATABASE
│
└── public
    │
    ├── marine_data
    │   │
    │   ├── marine_data_2022
    │   ├── marine_data_2023
    │   ├── marine_data_2024
    │   ├── marine_data_2025
    │   └── marine_data_2026
    │
    └── v_latest_positions
```

Across the two Supabase databases:

```text
OLD DATABASE
└── marine_data
    ├── 2022
    ├── 2023
    ├── 2024
    └── 2025
        └── data through 2025-07-31


NEW DATABASE
└── marine_data
    ├── 2025
    │   └── data from 2025-08-01 onward
    └── 2026
```

The logical data model is therefore:

```text
                    ARGO FLOAT
                         │
                         │ platform_number
                         ▼
                    PROFILING CYCLE
                         │
                         │ cycle_number
                         ▼
                    OBSERVATION
                         │
              ┌──────────┼──────────┐
              │          │          │
             TIME     LOCATION    PRESSURE
              │          │          │
              │      lat / lon     pres
              │
              ▼
       OCEAN MEASUREMENTS
              │
       ┌──────┼──────┬──────┬──────┬──────┐
       ▼      ▼      ▼      ▼      ▼      ▼
      temp   psal   doxy   chla    pH   nitrate
```

This is the **data contract the frontend/API team should work against**.
