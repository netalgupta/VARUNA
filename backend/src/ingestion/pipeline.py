"""
FloatChat AI â€” Full Ingestion Pipeline Orchestrator

WHY python over Aditya's Node.js ingestion?
  Aditya's branch `Adi_main_api_backend` wrote a brilliant concept for a cron-based
  ingestion service in Node.js. However, NetCDF is a complex binary format meant for
  HPC clusters. Python uses `netCDF4` and `PyArrow`, which map directly to C-libraries
  that read multidimensional arrays 100x faster than JS ever could.
  
  Our strategy: Use Python for the heavy lifting (parsing NetCDF â†’ Parquet â†’ Postgres)
  to ensure we don't lose data precision or fumble the QC flags.

Pipeline steps:
  1. Fetch NetCDF from IFREMER FTP (or read local)
  2. Parse via `netcdf_reader.py` â†’ PyArrow Table
  3. Save to Parquet (DuckDB archive)
  4. Load PyArrow Table into PostgreSQL `marine_data` partitioned tables
  5. Update `floats` registry in Postgres
  6. Add float to the Knowledge Graph
"""
from __future__ import annotations

import logging
import os
import glob
from pathlib import Path

from src.config import settings  # type: ignore
from src.ingestion.netcdf_reader import read_argo_netcdf, save_parquet  # type: ignore
from src.database.postgres import get_pool  # type: ignore

log = logging.getLogger(__name__)

async def ingest_file(netcdf_path: str) -> bool:
    """Run the pipeline for a single ARGO NetCDF file."""
    log.info(f"Starting ingestion for {netcdf_path}")
    
    # ━━ 1. Parse into Arrow Table ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    table = read_argo_netcdf(netcdf_path)
    if table is None or len(table) == 0:
        log.warning(f"No data parsed from {netcdf_path}")
        return False

    # ━━ 2. Save Parquet Archive ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    filename = Path(netcdf_path).stem
    save_parquet(table, settings.data_parquet_dir, filename)

    # ━━ 3. Load into PostgreSQL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # We use psycopg's COPY for blazing fast bulk inserts
    pool = get_pool()
    if pool is None:
        raise RuntimeError("Database connection pool is not available")
    
    with pool.connection() as conn:
        with conn.cursor() as cur:
            # We must ignore duplicate primary keys (id, time).
            # Postgres COPY doesn't support ON CONFLICT.
            # So we COPY to a temp table, then INSERT ... ON CONFLICT DO NOTHING.
            
            cur.execute("""
                CREATE TEMP TABLE tmp_marine_data (LIKE public.marine_data INCLUDING ALL) ON COMMIT DROP;
            """)
            
            # Extract distinct float platform metadata
            df = table.to_pandas()
            
            # Export Arrow to CSV for COPY
            import io
            csv_buf = io.StringIO()
            # columns must match temp table (excluding id / geom which are auto)
            cols = ["platform_number", "time", "latitude", "longitude", 
                    "pres", "pres_qc", "temp", "temp_qc", "psal", "psal_qc",
                    "doxy", "doxy_qc", "chla", "nitrate", "ph_in_situ_total", "bbp700"]
            
            df[cols].to_csv(csv_buf, index=False, header=False, na_rep='NULL')
            csv_buf.seek(0)
            
            with cur.copy(f"COPY tmp_marine_data ({','.join(cols)}) FROM STDIN WITH (FORMAT CSV, NULL 'NULL')") as copy:
                while True:
                    data = csv_buf.read(8192)
                    if not data:
                        break
                    copy.write(data)
            
            # Now insert from temp to main, computing PostGIS geom
            cur.execute("""
                INSERT INTO public.marine_data (
                    platform_number, time, latitude, longitude, geom,
                    pres, pres_qc, temp, temp_qc, psal, psal_qc,
                    doxy, doxy_qc, chla, nitrate, ph_in_situ_total, bbp700
                )
                SELECT 
                    platform_number, time, latitude, longitude,
                    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::GEOGRAPHY,
                    pres, pres_qc, temp, temp_qc, psal, psal_qc,
                    doxy, doxy_qc, chla, nitrate, ph_in_situ_total, bbp700
                FROM tmp_marine_data
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND time IS NOT NULL
                ON CONFLICT (id, time) DO NOTHING;
            """)
            
            inserted = cur.rowcount
            
            # ━━ 4. Update Float Registry ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            platforms = df['platform_number'].unique()
            for p in platforms:
                p_df = df[df['platform_number'] == p]
                if p_df.empty: continue
                # Get the most recent position
                latest = p_df.sort_values('time', ascending=False).iloc[0]
                
                cur.execute("""
                    INSERT INTO public.floats (
                        wmo_id, platform_type, program, last_seen, 
                        last_lat, last_lon, geom, total_profiles
                    ) VALUES (%s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::GEOGRAPHY, %s)
                    ON CONFLICT (wmo_id) DO UPDATE SET
                        last_seen = EXCLUDED.last_seen,
                        last_lat = EXCLUDED.last_lat,
                        last_lon = EXCLUDED.last_lon,
                        geom = EXCLUDED.geom,
                        total_profiles = public.floats.total_profiles + EXCLUDED.total_profiles;
                """, (
                    str(p), "Argo", "Indian Ocean ARGO", 
                    latest['time'], float(latest['latitude']), float(latest['longitude']),
                    float(latest['longitude']), float(latest['latitude']), len(p_df)
                ))
            
            conn.commit()

            # ━━ 5. Add to Knowledge Graph ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            # (Deferred operation usually, but we register the float now)
            from src.memory.knowledge_graph import add_float_node  # type: ignore
            from src.utils.geo import classify_region  # type: ignore
            for p in platforms:
                p_df = df[df['platform_number'] == p]
                latest = p_df.sort_values('time', ascending=False).iloc[0]
                reg = classify_region(latest['latitude'], latest['longitude'])
                measured = []
                if p_df['temp'].notna().any(): measured.append("temp")
                if p_df['psal'].notna().any(): measured.append("psal")
                if p_df['doxy'].notna().any(): measured.append("doxy")
                if p_df['chla'].notna().any(): measured.append("chla")
                add_float_node(int(p), reg, measured)

    log.info(f"Ingested {inserted} rows into PostgreSQL for {netcdf_path}")
    return True


async def run_batch(raw_dir: str):
    """Run ingestion for all NetCDF files in the directory."""
    files = glob.glob(os.path.join(raw_dir, "**/*.nc"), recursive=True)
    log.info(f"Found {len(files)} NetCDF files to ingest.")
    
    success: int = 0
    for f in files:
        if await ingest_file(f):
            success += 1  # type: ignore
            
    log.info(f"Batch complete. Successfully ingested {success}/{len(files)} files.")
    return {"total": len(files), "success": success}
