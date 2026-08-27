Absolutely bro. Here’s the **updated MD section/document for the frontend team**, highlighting the newly added `float_metadata` table while keeping the same structure and conventions as the earlier data contract.

---

# VARUNA — Argo Data Frontend Data Contract

## 1. High-Level Data Architecture

VARUNA's Argo observational data is currently distributed across **two Supabase databases** because the full dataset exceeded the storage capacity available in the original database.

```text
                              ERDDAP
                                │
                                ▼
                     Argo BGC Observations
                                │
                                ▼
                       Time-based split
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
        SUPABASE DB — HISTORICAL       SUPABASE DB — CURRENT
        2022 → July 2025               Aug 2025 → Present
                 │                             │
                 ▼                             ▼
          ┌───────────────┐              ┌───────────────┐
          │ marine_data   │              │ marine_data   │
          │               │              │               │
          │ float_metadata│              │ float_metadata│
          │               │              │               │
          │ v_latest_     │              │ v_latest_     │
          │ positions     │              │ positions     │
          └───────────────┘              └───────────────┘
                 │                             │
                 └──────────────┬──────────────┘
                                │
                                ▼
                          API / Backend
                                │
                                ▼
                         VARUNA Frontend
```

The logical structure is:

```text
marine_data
    ↓
Raw observation-level Argo measurements

float_metadata
    ↓
One summarized metadata record per Argo float

v_latest_positions
    ↓
Latest known position of each float
```

---

# 2. Database Division

## Historical Database

Contains observations from:

```text
2022-01-01 → 2025-07-31
```

Verified state:

| Property             | Value                 |
| -------------------- | --------------------- |
| Earliest observation | `2022-01-01 05:48:25` |
| Latest observation   | `2025-07-31 15:08:43` |
| Total observations   | `2,368,451`           |

---

## Current Database

Contains observations from:

```text
2025-08-01 → Present
```

Current ingestion contains approximately:

```text
1,592,787 observations
```

The database boundary is:

```text
HISTORICAL DB                     CURRENT DB

2022 ─────────────── Jul 2025 │ Aug 2025 ─────────────── Present
                               │
                               └── Database boundary
```

There is no intentional overlap between the two time ranges.

---

# 3. Available Tables and Views

Each database contains the following logical data structures:

```text
public
│
├── marine_data
│       Raw Argo observations
│
├── float_metadata
│       One row per unique Argo float
│
└── v_latest_positions
        Latest known position per float
```

---

# 4. `marine_data` — Raw Observation Table

```text
public.marine_data
```

This is the main Argo observation dataset.

Each row represents:

> **One measurement from one Argo float at one timestamp and one pressure level.**

Example:

```text
Float #2901234
      │
      ├── Cycle 184
      │      │
      │      ├── 10 dbar
      │      ├── 50 dbar
      │      ├── 100 dbar
      │      └── 500 dbar
      │
      └── Cycle 185
             │
             ├── 10 dbar
             ├── 50 dbar
             └── ...
```

Therefore, one float can correspond to thousands of rows.

### Schema

| Field              | Type                          | Description                                                                     |
| ------------------ | ----------------------------- | ------------------------------------------------------------------------------- |
| `platform_number`  | `INTEGER`                     | Unique identifier of the Argo float.                                            |
| `cycle_number`     | `INTEGER`                     | Profiling cycle associated with the observation.                                |
| `direction`        | `CHAR(1)`                     | Profile direction: `A` = ascending, `D` = descending.                           |
| `latitude`         | `DOUBLE PRECISION`            | Latitude of the observation.                                                    |
| `longitude`        | `DOUBLE PRECISION`            | Longitude of the observation.                                                   |
| `time`             | `TIMESTAMP WITHOUT TIME ZONE` | Observation timestamp. Stored without timezone metadata but interpreted as UTC. |
| `geom`             | `GEOGRAPHY(POINT, 4326)`      | PostGIS representation of latitude/longitude.                                   |
| `pres`             | `DOUBLE PRECISION`            | Pressure/depth level of the measurement, generally in dbar.                     |
| `temp`             | `DOUBLE PRECISION`            | Water temperature.                                                              |
| `psal`             | `DOUBLE PRECISION`            | Practical salinity.                                                             |
| `doxy`             | `DOUBLE PRECISION`            | Dissolved oxygen.                                                               |
| `chla`             | `DOUBLE PRECISION`            | Chlorophyll-a.                                                                  |
| `ph_in_situ_total` | `DOUBLE PRECISION`            | In-situ total pH.                                                               |
| `nitrate`          | `DOUBLE PRECISION`            | Nitrate concentration.                                                          |

Primary key:

```sql
(platform_number, time, pres)
```

---

# 5. `float_metadata` — Argo Float Catalog

```text
public.float_metadata
```

This is the **recommended table for frontend float discovery and individual float overview pages**.

Unlike `marine_data`, this table contains:

> **Exactly one row per unique Argo float.**

It exists so that the frontend does not need to aggregate millions of observation rows just to display basic information about a float.

Conceptually:

```text
                    marine_data
              Millions of observations
                         │
                         │ Aggregate by
                         │ platform_number
                         ▼
                  float_metadata
                         │
                         ▼
              One row per Argo float
```

---

## `float_metadata` Schema

### Float Identity

| Field             | Type      | Description                                       |
| ----------------- | --------- | ------------------------------------------------- |
| `platform_number` | `INTEGER` | Unique identifier of the Argo float. Primary key. |

---

### Observation Lifetime

| Field                     | Type                          | Description                                                                  |
| ------------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `first_observation_time`  | `TIMESTAMP WITHOUT TIME ZONE` | Earliest observation currently available for this float in this database.    |
| `latest_observation_time` | `TIMESTAMP WITHOUT TIME ZONE` | Most recent observation currently available for this float in this database. |
| `observation_span_days`   | `DOUBLE PRECISION`            | Number of days between the first and latest available observations.          |

These fields are useful for displaying:

```text
Data Available

Jan 2022 → Aug 2026

Observation span:
1,600 days
```

---

### First Known Position

| Field             | Type               | Description                                     |
| ----------------- | ------------------ | ----------------------------------------------- |
| `first_latitude`  | `DOUBLE PRECISION` | Latitude of the earliest known valid position.  |
| `first_longitude` | `DOUBLE PRECISION` | Longitude of the earliest known valid position. |

Useful for understanding where the float first appears in the available dataset.

---

### Latest Known Position

| Field                 | Type               | Description                                                           |
| --------------------- | ------------------ | --------------------------------------------------------------------- |
| `latest_latitude`     | `DOUBLE PRECISION` | Most recent known latitude.                                           |
| `latest_longitude`    | `DOUBLE PRECISION` | Most recent known longitude.                                          |
| `latest_cycle_number` | `INTEGER`          | Cycle number associated with the latest known positioned observation. |
| `latest_direction`    | `CHAR(1)`          | Direction associated with the latest known positioned observation.    |

Useful for:

* Float detail pages
* Latest float location
* Individual float cards
* Fleet maps
* Recent activity information

---

### Activity and Dataset Statistics

| Field                | Type      | Description                                                                |
| -------------------- | --------- | -------------------------------------------------------------------------- |
| `total_observations` | `BIGINT`  | Total number of observation rows available for the float in this database. |
| `total_cycles`       | `INTEGER` | Number of distinct profiling cycles recorded for the float.                |

Example:

```text
Total observations: 8,421

Total cycles: 184
```

---

### Geographic Coverage

| Field           | Type               | Description                     |
| --------------- | ------------------ | ------------------------------- |
| `min_latitude`  | `DOUBLE PRECISION` | Southernmost recorded latitude. |
| `max_latitude`  | `DOUBLE PRECISION` | Northernmost recorded latitude. |
| `min_longitude` | `DOUBLE PRECISION` | Westernmost recorded longitude. |
| `max_longitude` | `DOUBLE PRECISION` | Easternmost recorded longitude. |

This provides the geographic operating range of the float within the dataset.

---

### Vertical Coverage

| Field          | Type               | Description                      |
| -------------- | ------------------ | -------------------------------- |
| `min_pressure` | `DOUBLE PRECISION` | Minimum recorded pressure level. |
| `max_pressure` | `DOUBLE PRECISION` | Maximum recorded pressure level. |

Example:

```text
Vertical Coverage

0 dbar → 2,000 dbar
```

---

### Sensor / Measurement Availability

These fields tell the frontend which measurement types are available **at least once** for the float.

| Field                  | Type      | Meaning                                           |
| ---------------------- | --------- | ------------------------------------------------- |
| `has_temperature`      | `BOOLEAN` | At least one temperature measurement exists.      |
| `has_salinity`         | `BOOLEAN` | At least one salinity measurement exists.         |
| `has_dissolved_oxygen` | `BOOLEAN` | At least one dissolved oxygen measurement exists. |
| `has_chlorophyll`      | `BOOLEAN` | At least one chlorophyll-a measurement exists.    |
| `has_ph`               | `BOOLEAN` | At least one pH measurement exists.               |
| `has_nitrate`          | `BOOLEAN` | At least one nitrate measurement exists.          |

Example frontend usage:

```text
Available Sensors

✓ Temperature
✓ Salinity
✓ Dissolved Oxygen
✓ Chlorophyll-a
✗ pH
✓ Nitrate
```

Important:

> `TRUE` means the variable exists for at least one observation. It does not guarantee that every profile or pressure level contains that measurement.

---

### Metadata Timestamps

| Field        | Type                          | Description                                          |
| ------------ | ----------------------------- | ---------------------------------------------------- |
| `created_at` | `TIMESTAMP WITHOUT TIME ZONE` | Time when the metadata record was initially created. |
| `updated_at` | `TIMESTAMP WITHOUT TIME ZONE` | Time when the metadata record was last refreshed.    |

---

# 6. Example `float_metadata` Record

```json
{
  "platform_number": 2901234,

  "first_observation_time": "2022-04-12T08:14:00",
  "latest_observation_time": "2026-08-21T14:32:00",

  "first_latitude": 12.42,
  "first_longitude": 73.81,

  "latest_latitude": 14.10,
  "latest_longitude": 71.55,

  "latest_cycle_number": 184,
  "latest_direction": "A",

  "total_observations": 8421,
  "total_cycles": 184,

  "observation_span_days": 1592,

  "min_latitude": 10.2,
  "max_latitude": 18.7,
  "min_longitude": 68.4,
  "max_longitude": 76.3,

  "min_pressure": 0,
  "max_pressure": 2000,

  "has_temperature": true,
  "has_salinity": true,
  "has_dissolved_oxygen": true,
  "has_chlorophyll": true,
  "has_ph": false,
  "has_nitrate": true
}
```

All timestamp fields should be interpreted by the application as **UTC**, despite being stored as `TIMESTAMP WITHOUT TIME ZONE`.

---

# 7. `v_latest_positions` — Latest Float Position View

```text
public.v_latest_positions
```

This view provides the latest known geographic position of each float.

It contains:

| Field             | Description                    |
| ----------------- | ------------------------------ |
| `platform_number` | Argo float identifier.         |
| `time`            | Latest known observation time. |
| `latitude`        | Latest known latitude.         |
| `longitude`       | Latest known longitude.        |

Conceptually:

```text
marine_data
      │
      │ Select newest valid position
      │ for each platform_number
      ▼
v_latest_positions
```

Recommended usage:

* Fleet map
* Float markers
* Latest known positions
* Current Argo activity visualization

---

# 8. Recommended Frontend Data Flow

## Fleet Overview

For a map containing all currently known float positions:

```text
v_latest_positions
```

or, if more metadata is needed:

```text
float_metadata
```

The frontend can render:

```text
● Float #2901234
  Last Seen: Aug 21, 2026
  Position: 14.10° N, 71.55° E
  Cycle: 184
```

---

## Float Directory / Search

For listing all floats:

```text
float_metadata
```

Example query:

```sql
SELECT
    platform_number,
    latest_observation_time,
    latest_latitude,
    latest_longitude,
    total_cycles,
    has_temperature,
    has_salinity,
    has_dissolved_oxygen,
    has_chlorophyll,
    has_ph,
    has_nitrate
FROM public.float_metadata
ORDER BY latest_observation_time DESC;
```

---

## Individual Float Page

### Step 1 — Fetch Float Metadata

```text
float_metadata
WHERE platform_number = <FLOAT_ID>
```

This provides:

* Observation lifetime
* First/latest position
* Latest cycle
* Number of cycles
* Observation count
* Geographic range
* Pressure range
* Available measurements

---

### Step 2 — Fetch Detailed Measurements

```text
marine_data
WHERE platform_number = <FLOAT_ID>
```

Use this for:

* Float trajectory
* Temperature history
* Salinity history
* Oxygen history
* Chlorophyll history
* pH history
* Nitrate history
* Vertical profiles

---

# 9. Recommended Individual Float UI

The metadata table enables an overview like:

```text
┌─────────────────────────────────────┐
│ ARGO FLOAT #2901234                 │
│                                     │
│ Latest Position                     │
│ 14.10° N, 71.55° E                  │
│                                     │
│ Last Seen                           │
│ Aug 21, 2026                        │
│                                     │
│ Observation Lifetime                │
│ Apr 2022 → Aug 2026                 │
│ 1,592 days                          │
│                                     │
│ Profiling Cycles                    │
│ 184                                 │
│                                     │
│ Vertical Coverage                   │
│ 0 → 2,000 dbar                     │
│                                     │
│ Available Variables                 │
│ ✓ Temp      ✓ Salinity              │
│ ✓ Oxygen    ✓ Chlorophyll           │
│ ✗ pH        ✓ Nitrate               │
└─────────────────────────────────────┘
```

---

# 10. Float Activity Status

The database does **not** permanently store:

```text
is_alive = true / false
```

This is intentional.

Instead, the frontend/backend should derive float activity dynamically from:

```text
latest_observation_time
```

For example:

```text
ACTIVE
Last observation within 30 days

STALE
Last observation between 30–90 days

INACTIVE
No observation for more than 90 days
```

These thresholds can be adjusted later based on the project's scientific requirements.

Important:

> Lack of a recent observation does not necessarily mean that an Argo float is permanently dead or retired.

Therefore, the UI should preferably use labels such as:

```text
Active
Recently Observed
Stale
No Recent Data
```

rather than scientifically asserting that a float is "dead."

---

# 11. Important Two-Database Behavior

Because the Argo data is split between two databases, the same float may exist in both databases.

Therefore:

```text
Float #2901234

Historical DB:
2022 → Jul 2025

Current DB:
Aug 2025 → Present
```

Each database's `float_metadata` table describes the data **available within that specific database only**.

For example:

```text
Historical float_metadata
first_observation:
2022-04-12

latest_observation:
2025-07-31


Current float_metadata
first_observation:
2025-08-01

latest_observation:
2026-08-21
```

Therefore, the frontend should ideally **not merge these two metadata tables itself**.

The recommended architecture is:

```text
                    FRONTEND
                        │
                        ▼
                 VARUNA API
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
    Historical DB                Current DB
    float_metadata               float_metadata
          │                           │
          └─────────────┬─────────────┘
                        │
                        ▼
              Unified Float Response
```

The backend can eventually merge metadata from both databases into a unified response.

---

# 12. Timestamp Contract

All relevant tables use:

```sql
TIMESTAMP WITHOUT TIME ZONE
```

including:

```text
marine_data.time

float_metadata.first_observation_time
float_metadata.latest_observation_time
float_metadata.created_at
float_metadata.updated_at

v_latest_positions.time
```

The ingestion pipeline receives timestamps from ERDDAP as UTC, normalizes them, and stores them without timezone metadata.

Therefore:

> **All application code should interpret these timestamps as UTC.**

Example database value:

```text
2026-08-21 14:32:00
```

should be treated as:

```text
2026-08-21 14:32:00 UTC
```

---

# 13. Recommended Table Usage Summary

| Frontend Requirement          | Recommended Source                       |
| ----------------------------- | ---------------------------------------- |
| Show all floats               | `float_metadata`                         |
| Search/filter floats          | `float_metadata`                         |
| Float metadata card           | `float_metadata`                         |
| Available sensors             | `float_metadata`                         |
| First/latest observation      | `float_metadata`                         |
| Latest float location         | `v_latest_positions` or `float_metadata` |
| Fleet map                     | `v_latest_positions`                     |
| Individual float trajectory   | `marine_data`                            |
| Individual float measurements | `marine_data`                            |
| Vertical profile              | `marine_data`                            |
| Time-series graphs            | `marine_data`                            |
| Temperature map               | Backend-aggregated `marine_data` query   |
| Salinity map                  | Backend-aggregated `marine_data` query   |

---

# 14. Core Rules for the Frontend Team

1. **Do not query millions of rows from `marine_data` for a simple float listing.**
2. Use `float_metadata` for float discovery, catalog pages, search, filters, and overview cards.
3. Use `v_latest_positions` for lightweight fleet/latest-position map rendering.
4. Use `marine_data` only when detailed observation-level data is required.
5. `platform_number` is the unique identifier of an Argo float.
6. One float can have thousands of rows in `marine_data`.
7. A float may exist in both the historical and current databases.
8. `float_metadata` in each database only summarizes data present in that specific database.
9. All stored timestamps are `TIMESTAMP WITHOUT TIME ZONE` but should be interpreted as UTC.
10. `NULL` measurement values mean **data unavailable**, not zero.
11. Sensor availability flags mean the measurement exists **at least once** for that float.
12. Float activity should be derived dynamically from `latest_observation_time`.

---

# Final Data Model

```text
                         ┌──────────────────┐
                         │   ARGO FLOAT     │
                         │ platform_number  │
                         └────────┬─────────┘
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ▼                ▼                ▼
        float_metadata    v_latest_positions   marine_data
                 │                │                │
                 │                │                │
                 │                │         Millions of
                 │                │         observations
                 │                │                │
                 ▼                ▼                ▼
           Float Catalog       Fleet Map      Detailed Analysis
           Float Overview      Current Pos.   Profiles
           Sensors                            Time Series
           Lifetime                           Trajectory
           Statistics                         Measurements
```

### In short

```text
float_metadata
    = "Who is this float and what data do we have?"

v_latest_positions
    = "Where was this float last seen?"

marine_data
    = "Show me the actual scientific observations."
```

This gives the frontend team a clean path without needing to understand or aggregate the entire raw Argo dataset themselves.
