import requests
import pandas as pd
from pathlib import Path
import time
import random

# ============================================================
# CONFIG
# ============================================================

API = "https://api.obis.org/v3"

NODE_ID = "1a3b0f1a-4474-4d73-9ee1-d28f92a83996"

OUT = Path("indobis_analysis")
OUT.mkdir(exist_ok=True)

CSV_PATH = OUT / "indobis_dataset_analysis.csv"

HEADERS = {
    "Accept": "application/json",
    "User-Agent": "VARUNA-IndOBIS-Analysis/1.0"
}

# Network settings
TIMEOUT = 30
RETRIES = 3

# Number of occurrence records used for completeness QC
SAMPLE_SIZE = 100

# Delay between datasets
REQUEST_DELAY = 0.3


# ============================================================
# HTTP
# ============================================================

session = requests.Session()
session.headers.update(HEADERS)


def get_json(url, params=None, retries=RETRIES):

    for attempt in range(1, retries + 1):

        try:

            r = session.get(
                url,
                params=params,
                timeout=TIMEOUT
            )

            print(
                f"GET {r.url} -> {r.status_code}"
            )

            r.raise_for_status()

            return r.json()

        except requests.exceptions.Timeout:

            print(
                f"TIMEOUT "
                f"(attempt {attempt}/{retries})"
            )

        except requests.exceptions.ConnectionError as e:

            print(
                f"CONNECTION ERROR "
                f"(attempt {attempt}/{retries}): "
                f"{e}"
            )

        except requests.exceptions.HTTPError as e:

            print(
                f"HTTP ERROR "
                f"(attempt {attempt}/{retries}): "
                f"{e}"
            )

            # Don't repeatedly retry most HTTP errors
            if r.status_code not in [
                408,
                429,
                500,
                502,
                503,
                504
            ]:
                break

        except ValueError as e:

            print(
                f"JSON ERROR "
                f"(attempt {attempt}/{retries}): "
                f"{e}"
            )

        except Exception as e:

            print(
                f"REQUEST ERROR "
                f"(attempt {attempt}/{retries}): "
                f"{repr(e)}"
            )

        if attempt < retries:

            wait = attempt * 2 + random.random()

            print(
                f"Retrying in {wait:.1f} seconds..."
            )

            time.sleep(wait)

    return None


# ============================================================
# START
# ============================================================

print("=" * 100)
print("VARUNA — IndOBIS DATASET ANALYSIS")
print("=" * 100)

print(
    f"\nNode: {NODE_ID}"
)

print(
    f"Output: {CSV_PATH}"
)


# ============================================================
# 1. NODE METADATA
# ============================================================

print("\n")
print("=" * 100)
print("NODE INFORMATION")
print("=" * 100)

node_payload = get_json(
    f"{API}/node/{NODE_ID}"
)

if node_payload is not None:

    print(
        node_payload
    )

else:

    print(
        "Node metadata unavailable."
    )


# ============================================================
# 2. GET ALL DATASETS FROM NODE
# ============================================================

print("\n")
print("=" * 100)
print("FETCHING INDOBIS DATASETS")
print("=" * 100)

datasets = []

page = 1
size = 100


while True:

    print(
        f"\nDataset request {page}..."
    )

    payload = get_json(
        f"{API}/dataset",
        {
            "nodeid": NODE_ID,
            "size": size,
            "start": (page - 1) * size
        }
    )

    if payload is None:

        print(
            "Dataset request failed."
        )

        break


    results = payload.get(
        "results",
        []
    )

    print(
        f"Received {len(results)} datasets"
    )


    if not results:

        break


    datasets.extend(results)


    if len(results) < size:

        break


    page += 1


    if page > 20:

        print(
            "Safety stop reached."
        )

        break


print("\n")
print(
    "TOTAL DATASETS FOUND:",
    len(datasets)
)


# ============================================================
# 3. ANALYSE EACH DATASET
# ============================================================

rows = []


for index, ds in enumerate(
    datasets,
    start=1
):

    dataset_id = ds.get(
        "id"
    )

    title = (
        ds.get("title")
        or ds.get("name")
        or "UNKNOWN"
    )


    print("\n")
    print("=" * 100)
    print(
        f"[{index}/{len(datasets)}] {title}"
    )
    print("=" * 100)

    print(
        "Dataset ID:",
        dataset_id
    )


    if not dataset_id:

        print(
            "WARNING: Dataset has no ID. Skipping."
        )

        continue


    # --------------------------------------------------------
    # DATASET METADATA
    # --------------------------------------------------------

    metadata = ds.copy()

    metadata_payload = get_json(
        f"{API}/dataset/{dataset_id}"
    )

    if metadata_payload is not None:

        # OBIS normally returns dataset metadata
        # inside "results".

        metadata_results = (
            metadata_payload.get(
                "results",
                []
            )
            if isinstance(
                metadata_payload,
                dict
            )
            else []
        )

        if metadata_results:

            metadata = metadata_results[0]


    # --------------------------------------------------------
    # BASIC METADATA
    # --------------------------------------------------------

    records_metadata = (
        metadata.get("records")
        or ds.get("records")
    )

    published = (
        metadata.get("published")
        or ds.get("published")
    )

    modified = (
        metadata.get("modified")
        or ds.get("modified")
    )


    # --------------------------------------------------------
    # OCCURRENCE TOTAL
    #
    # IMPORTANT:
    # We do NOT call /occurrence?size=1 here.
    #
    # That was the request causing your script to hang.
    #
    # We use the dataset metadata record count when
    # available.
    # --------------------------------------------------------

    occurrence_total = records_metadata


    # --------------------------------------------------------
    # YEAR STATISTICS
    # --------------------------------------------------------

    year_stats = {}

    year_payload = get_json(
        f"{API}/statistics/years",
        {
            "datasetid": dataset_id
        }
    )


    if isinstance(
        year_payload,
        list
    ):

        for item in year_payload:

            if not isinstance(
                item,
                dict
            ):
                continue


            year = item.get(
                "year"
            )

            records = item.get(
                "records",
                0
            )


            try:

                year = int(
                    year
                )

                records = int(
                    records or 0
                )


                if 1900 <= year <= 2100:

                    year_stats[year] = records

            except (
                TypeError,
                ValueError
            ):

                continue


    elif isinstance(
        year_payload,
        dict
    ):

        # Fallback for alternative response structures

        for key, value in year_payload.items():

            try:

                year = int(
                    key
                )

            except (
                TypeError,
                ValueError
            ):

                continue


            if not (
                1900 <= year <= 2100
            ):

                continue


            if isinstance(
                value,
                dict
            ):

                records = value.get(
                    "records",
                    0
                )

            else:

                records = value


            try:

                year_stats[year] = int(
                    records or 0
                )

            except (
                TypeError,
                ValueError
            ):

                pass


    print(
        f"Year statistics found for "
        f"{len(year_stats)} years"
    )


    # --------------------------------------------------------
    # YEAR RANGE
    # --------------------------------------------------------

    years = sorted(
        year_stats.keys()
    )


    min_year = (
        min(years)
        if years
        else None
    )

    max_year = (
        max(years)
        if years
        else None
    )


    # --------------------------------------------------------
    # YEAR COUNTS
    # --------------------------------------------------------

    def year_count(year):

        return year_stats.get(
            year,
            0
        )


    records_2020 = year_count(
        2020
    )

    records_2021 = year_count(
        2021
    )

    records_2022 = year_count(
        2022
    )

    records_2023 = year_count(
        2023
    )

    records_2024 = year_count(
        2024
    )

    records_2025 = year_count(
        2025
    )

    records_2026 = year_count(
        2026
    )


    recent_records = sum(
        [
            records_2020,
            records_2021,
            records_2022,
            records_2023,
            records_2024,
            records_2025,
            records_2026
        ]
    )


    # --------------------------------------------------------
    # QC STATISTICS
    # --------------------------------------------------------

    qc = {}

    qc_payload = get_json(
        f"{API}/statistics/qc",
        {
            "datasetid": dataset_id
        }
    )

    if qc_payload is not None:

        qc = qc_payload


    # --------------------------------------------------------
    # SAMPLE 100 RECORDS
    # --------------------------------------------------------

    sample = []

    sample_payload = get_json(
        f"{API}/occurrence",
        {
            "datasetid": dataset_id,
            "size": SAMPLE_SIZE
        }
    )


    if sample_payload is not None:

        sample = sample_payload.get(
            "results",
            []
        )


    sample_df = pd.DataFrame(
        sample
    )


    print(
        f"Sample records retrieved: "
        f"{len(sample_df)}"
    )


    # --------------------------------------------------------
    # FIELD COMPLETENESS
    # --------------------------------------------------------

    def completeness(column):

        if sample_df.empty:

            return 0.0


        if column not in sample_df.columns:

            return 0.0


        return round(
            sample_df[column]
            .notna()
            .mean()
            * 100,
            1
        )


    species_pct = completeness(
        "scientificName"
    )

    lat_pct = completeness(
        "decimalLatitude"
    )

    lon_pct = completeness(
        "decimalLongitude"
    )

    date_pct = completeness(
        "eventDate"
    )

    min_depth_pct = completeness(
        "minimumDepthInMeters"
    )

    max_depth_pct = completeness(
        "maximumDepthInMeters"
    )

    count_pct = completeness(
        "individualCount"
    )


    # --------------------------------------------------------
    # DATASET TYPE / EXTENSIONS
    # --------------------------------------------------------

    extensions = (
        metadata.get(
            "extensions"
        )
        or []
    )


    if isinstance(
        extensions,
        str
    ):

        extensions_text = extensions

    else:

        extensions_text = ",".join(
            map(
                str,
                extensions
            )
        )


    # --------------------------------------------------------
    # BASIS OF RECORD
    # --------------------------------------------------------

    basis_records = []


    if (
        not sample_df.empty
        and
        "basisOfRecord" in sample_df.columns
    ):

        basis_records = (
            sample_df[
                "basisOfRecord"
            ]
            .dropna()
            .astype(str)
            .unique()
            .tolist()
        )


    basis_text = ",".join(
        basis_records
    )


    # --------------------------------------------------------
    # RECENCY
    # --------------------------------------------------------

    has_2020_plus = (
        max_year is not None
        and max_year >= 2020
    )

    has_2024_plus = (
        max_year is not None
        and max_year >= 2024
    )

    has_recent_data = (
        recent_records > 0
    )


    # --------------------------------------------------------
    # SCORE
    # --------------------------------------------------------

    score = 0


    # Scientific name
    if species_pct >= 95:

        score += 4

    elif species_pct >= 80:

        score += 3

    elif species_pct >= 50:

        score += 1


    # Latitude
    if lat_pct >= 95:

        score += 3

    elif lat_pct >= 80:

        score += 2

    elif lat_pct >= 50:

        score += 1


    # Longitude
    if lon_pct >= 95:

        score += 3

    elif lon_pct >= 80:

        score += 2

    elif lon_pct >= 50:

        score += 1


    # Event date
    if date_pct >= 95:

        score += 3

    elif date_pct >= 80:

        score += 2

    elif date_pct >= 50:

        score += 1


    # Depth
    if (
        min_depth_pct >= 80
        or max_depth_pct >= 80
    ):

        score += 2

    elif (
        min_depth_pct >= 50
        or max_depth_pct >= 50
    ):

        score += 1


    # Recent observation years
    if has_2020_plus:

        score += 3

    if has_2024_plus:

        score += 2


    # Actual recent records
    if recent_records > 100:

        score += 2

    elif recent_records > 0:

        score += 1


    # --------------------------------------------------------
    # CLASSIFICATION
    # --------------------------------------------------------

    if (
        score >= 18
        and species_pct >= 80
        and lat_pct >= 80
        and lon_pct >= 80
        and date_pct >= 80
    ):

        classification = "STRONG"


    elif (
        score >= 13
        and species_pct >= 70
        and lat_pct >= 70
        and lon_pct >= 70
    ):

        classification = "GOOD"


    elif score >= 8:

        classification = "REVIEW"


    else:

        classification = "DROP"


    # --------------------------------------------------------
    # SAVE ROW
    # --------------------------------------------------------

    row = {

        "dataset_id":
            dataset_id,

        "title":
            title,

        "records":
            occurrence_total,

        "published":
            published,

        "modified":
            modified,

        "first_year":
            min_year,

        "last_year":
            max_year,

        "records_2020":
            records_2020,

        "records_2021":
            records_2021,

        "records_2022":
            records_2022,

        "records_2023":
            records_2023,

        "records_2024":
            records_2024,

        "records_2025":
            records_2025,

        "records_2026":
            records_2026,

        "recent_2020_2026":
            recent_records,

        "scientificName_pct":
            species_pct,

        "latitude_pct":
            lat_pct,

        "longitude_pct":
            lon_pct,

        "eventDate_pct":
            date_pct,

        "minimumDepth_pct":
            min_depth_pct,

        "maximumDepth_pct":
            max_depth_pct,

        "individualCount_pct":
            count_pct,

        "extensions":
            extensions_text,

        "basisOfRecord":
            basis_text,

        "score":
            score,

        "classification":
            classification
    }


    rows.append(
        row
    )


    # --------------------------------------------------------
    # SAVE PROGRESS
    # --------------------------------------------------------

    progress_df = pd.DataFrame(
        rows
    )

    progress_df.to_csv(
        CSV_PATH,
        index=False
    )


    print(
        f"Saved progress: "
        f"{len(rows)}/{len(datasets)} datasets"
    )


    # Small delay
    time.sleep(
        REQUEST_DELAY
    )


# ============================================================
# FINAL DATAFRAME
# ============================================================

df = pd.DataFrame(
    rows
)


# ============================================================
# SORT
# ============================================================

if not df.empty:

    classification_order = {

        "STRONG": 0,

        "GOOD": 1,

        "REVIEW": 2,

        "DROP": 3
    }


    df["_sort"] = (
        df["classification"]
        .map(
            classification_order
        )
    )


    df = df.sort_values(

        [
            "_sort",
            "score",
            "recent_2020_2026",
            "records"
        ],

        ascending=[
            True,
            False,
            False,
            False
        ]
    )


    df = df.drop(
        columns=[
            "_sort"
        ]
    )


# ============================================================
# SAVE FULL ANALYSIS
# ============================================================

df.to_csv(
    CSV_PATH,
    index=False
)


# ============================================================
# SUMMARY
# ============================================================

print("\n")
print("=" * 100)
print("FINAL INDOBIS ANALYSIS")
print("=" * 100)


if df.empty:

    print(
        "NO DATASETS ANALYSED."
    )

else:

    print(
        "\nClassification counts:"
    )

    print(
        df[
            "classification"
        ].value_counts()
    )


    print("\n")


    print(
        df[
            [
                "classification",
                "score",
                "records",
                "first_year",
                "last_year",
                "recent_2020_2026",
                "scientificName_pct",
                "latitude_pct",
                "longitude_pct",
                "eventDate_pct",
                "minimumDepth_pct",
                "maximumDepth_pct",
                "title"
            ]
        ].to_string(
            index=False
        )
    )


# ============================================================
# SHORTLIST
# ============================================================

print("\n")
print("=" * 100)
print("RECOMMENDED SHORTLIST — FOR HUMAN REVIEW")
print("=" * 100)


if df.empty:

    print(
        "No datasets analysed."
    )

else:

    shortlist = df[
        df["classification"].isin(
            [
                "STRONG",
                "GOOD"
            ]
        )
    ]


    if shortlist.empty:

        print(
            "No automatic shortlist."
        )

    else:

        print(
            shortlist[
                [
                    "classification",
                    "score",
                    "records",
                    "first_year",
                    "last_year",
                    "recent_2020_2026",
                    "scientificName_pct",
                    "latitude_pct",
                    "longitude_pct",
                    "eventDate_pct",
                    "minimumDepth_pct",
                    "maximumDepth_pct",
                    "title",
                    "dataset_id"
                ]
            ].to_string(
                index=False
            )
        )


# ============================================================
# DONE
# ============================================================

print("\n")
print("=" * 100)
print("DONE")
print("=" * 100)

print(
    f"\nFull analysis saved to:\n"
    f"{CSV_PATH}"
)

print(
    "\nIMPORTANT:"
    "\nThis script ANALYSES datasets only."
    "\nIt does NOT download/merge occurrence datasets."
)