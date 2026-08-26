import io
from pathlib import Path
from urllib.parse import quote

import pandas as pd
import requests
import xarray as xr


# ============================================================
# CONFIG
# ============================================================

ERDDAP_BASE = (
    "https://www.ifremer.fr/erddap/tabledap/"
    "ArgoFloats-synthetic-BGC.nc"
)

OUTPUT_DIR = Path("./argo_demo_data")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

NETCDF_FILE = OUTPUT_DIR / "argo_raw.nc"
CSV_FILE = OUTPUT_DIR / "argo_parsed.csv"


# ------------------------------------------------------------
# Variables we want for the demo
# ------------------------------------------------------------

COLUMNS = [
    "platform_number",
    "cycle_number",
    "direction",
    "latitude",
    "longitude",
    "time",
    "pres",
    "temp",
    "psal",
    "doxy",
    "chla",
    "ph_in_situ_total",
    "nitrate",
]


# ------------------------------------------------------------
# Demo subset
#
# Keep this small so the NetCDF download is quick.
# Change these values later if you want a larger demo.
# ------------------------------------------------------------

START_DATE = "2025-07-01T00:00:00Z"
END_DATE = "2025-08-01T00:00:00Z"

LAT_MIN = 0
LAT_MAX = 30

LON_MIN = 50
LON_MAX = 100


# ============================================================
# BUILD ERDDAP URL
# ============================================================

def build_url():

    variables = ",".join(COLUMNS)

    constraints = [
        f"latitude>={LAT_MIN}",
        f"latitude<={LAT_MAX}",
        f"longitude>={LON_MIN}",
        f"longitude<={LON_MAX}",
        f"time>={START_DATE}",
        f"time<{END_DATE}",
    ]

    query = variables + "&" + "&".join(
        quote(
            constraint,
            safe="=<>!,-_:T.Z"
        )
        for constraint in constraints
    )

    return f"{ERDDAP_BASE}?{query}"


# ============================================================
# DOWNLOAD NETCDF
# ============================================================

def download_netcdf(url):

    print("Downloading NetCDF from ERDDAP...")
    print()
    print(url)
    print()

    response = requests.get(
        url,
        timeout=300,
    )

    response.raise_for_status()

    NETCDF_FILE.write_bytes(response.content)

    size_mb = NETCDF_FILE.stat().st_size / (1024 * 1024)

    print(f"Downloaded: {size_mb:.2f} MB")
    print(f"Saved raw NetCDF: {NETCDF_FILE}")


# ============================================================
# PARSE NETCDF → DATAFRAME
# ============================================================

def parse_netcdf():

    print()
    print("Parsing NetCDF...")

    dataset = xr.open_dataset(
        NETCDF_FILE
    )

    print()
    print("Variables found:")
    print(list(dataset.variables))

    print()

    dataframe = dataset.to_dataframe().reset_index()

    dataset.close()

    print(f"Parsed rows: {len(dataframe):,}")

    return dataframe


# ============================================================
# CLEAN DATA
# ============================================================

def clean_dataframe(df):

    print("Cleaning parsed data...")

    # Keep only requested variables
    available_columns = [
        column
        for column in COLUMNS
        if column in df.columns
    ]

    df = df[available_columns].copy()

    # Numeric fields
    numeric_columns = [
        "platform_number",
        "cycle_number",
        "latitude",
        "longitude",
        "pres",
        "temp",
        "psal",
        "doxy",
        "chla",
        "ph_in_situ_total",
        "nitrate",
    ]

    for column in numeric_columns:

        if column in df.columns:

            df[column] = pd.to_numeric(
                df[column],
                errors="coerce",
            )

    # Timestamp
    if "time" in df.columns:

        df["time"] = pd.to_datetime(
            df["time"],
            errors="coerce",
            utc=True,
        )

    # Direction
    if "direction" in df.columns:

        df["direction"] = (
            df["direction"]
            .astype("string")
            .str.strip()
            .str.upper()
        )

    return df


# ============================================================
# SAVE CSV
# ============================================================

def save_csv(df):

    df.to_csv(
        CSV_FILE,
        index=False,
    )

    size_mb = CSV_FILE.stat().st_size / (1024 * 1024)

    print()
    print(f"Saved parsed CSV: {CSV_FILE}")
    print(f"CSV size: {size_mb:.2f} MB")


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("VARUNA — ARGO NETCDF ")
    print("=" * 70)

    url = build_url()

    # 1. ERDDAP → NetCDF
    download_netcdf(url)

    # 2. NetCDF → DataFrame
    dataframe = parse_netcdf()

    # 3. Clean parsed data
    dataframe = clean_dataframe(
        dataframe
    )

    # 4. DataFrame → CSV
    save_csv(dataframe)

    # 5. Preview
    print()
    print("=" * 70)
    print("CSV PREVIEW")
    print("=" * 70)

    print(
        dataframe.head(10).to_string(
            index=False
        )
    )

    print()
    print(
        f"Final rows: {len(dataframe):,}"
    )

    print()
    print("Demo pipeline completed successfully.")


if __name__ == "__main__":
    main()