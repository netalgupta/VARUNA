// ============================================================
// VARUNA ARGO INGESTION SERVICE
//
// ERDDAP -> PostgreSQL/Supabase
//
// Features:
//   - Finds latest timestamp already in Supabase
//   - Uses configurable lookback for safe cron reruns
//   - Fetches ERDDAP CSV in time windows
//   - Correct ERDDAP CSV parsing
//   - Inserts into partitioned public.marine_data parent
//   - Builds PostGIS geom server-side
//   - ON CONFLICT DO NOTHING for idempotency
//   - Retries ERDDAP failures
//   - Treats ERDDAP "no matching results" as no-new-data
//   - Updates float_metadata for affected floats
//   - Runs automatically through node-cron
//
// Database schema:
//   public.marine_data
//   public.float_metadata
//   public.v_latest_positions
//
// IMPORTANT:
//   marine_data.time is TIMESTAMP WITHOUT TIME ZONE.
//   All timestamps are normalized to UTC before insertion.
// ============================================================

import cron from "node-cron";
import axios from "axios";
import dotenv from "dotenv";
import pg from "pg";
import { parse } from "csv-parse/sync";

dotenv.config();

const { Pool } = pg;


// ============================================================
// CONFIGURATION
// ============================================================

const ERDDAP_BASE =
    "https://www.ifremer.fr/erddap/tabledap/" +
    "ArgoFloats-synthetic-BGC.csv";

const TABLE_NAME = "public.marine_data";

const START_DATE =
    new Date("2022-01-01T00:00:00Z");

const LAT_MIN = 0;
const LAT_MAX = 30;

const LON_MIN = 50;
const LON_MAX = 100;

const WINDOW_DAYS = Number(
    process.env.WINDOW_DAYS || 7
);

const LOOKBACK_HOURS = Number(
    process.env.LOOKBACK_HOURS || 24
);

const DB_BATCH_SIZE = Number(
    process.env.DB_BATCH_SIZE || 4000
);

const MAX_RETRIES = Number(
    process.env.MAX_RETRIES || 5
);

const REQUEST_TIMEOUT_MS = Number(
    process.env.REQUEST_TIMEOUT_MS || 300000
);

const REQUEST_DELAY_MS = Number(
    process.env.REQUEST_DELAY_MS || 1000
);

const REFRESH_FLOAT_METADATA =
    String(
        process.env.REFRESH_FLOAT_METADATA || "true"
    ).toLowerCase() === "true";

const CRON_SCHEDULE =
    process.env.CRON_SCHEDULE ||
    "0 * * * *";


// ============================================================
// ERDDAP COLUMNS
// ============================================================

const COLUMNS = [
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
];


// ============================================================
// DATABASE POOL
// ============================================================

const pool = new Pool({
    host: process.env.PG_HOST,
    port: Number(
        process.env.PG_PORT || 5432
    ),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,

    ssl: {
        rejectUnauthorized: false,
    },

    max: 5,

    idleTimeoutMillis: 30000,

    connectionTimeoutMillis: 30000,
});


// ============================================================
// DATABASE CONNECTION TEST
// ============================================================

async function verifyDatabaseConnection() {

    const client =
        await pool.connect();

    try {

        await client.query(
            "SET TIME ZONE 'UTC';"
        );

        await client.query(
            "SELECT 1;"
        );

        console.log(
            "--> Supabase PostgreSQL connection: OK"
        );

    } finally {

        client.release();

    }
}


// ============================================================
// GET LATEST TIMESTAMP
// ============================================================

async function getLatestTimestampFromDB() {

    console.log(
        "STEP 1: Checking latest record in Supabase..."
    );

    const client =
        await pool.connect();

    try {

        await client.query(
            "SET TIME ZONE 'UTC';"
        );

        const result =
            await client.query(`
                SELECT
                    MAX(time)::text AS latest_time
                FROM ${TABLE_NAME};
            `);

        const latestTime =
            result.rows[0]?.latest_time;

        if (!latestTime) {

            console.log(
                "--> Database is empty."
            );

            console.log(
                `--> Starting from ${START_DATE.toISOString()}`
            );

            return START_DATE;
        }

        // marine_data.time is TIMESTAMP WITHOUT TIME ZONE.
        //
        // We intentionally interpret the stored value as UTC.

        const latestDate =
            new Date(
                `${latestTime}Z`
            );

        if (
            Number.isNaN(
                latestDate.getTime()
            )
        ) {

            throw new Error(
                `Invalid latest timestamp returned by DB: ${latestTime}`
            );
        }

        console.log(
            `--> Latest DB record: ${latestDate.toISOString()}`
        );

        return latestDate;

    } finally {

        client.release();

    }
}


// ============================================================
// BUILD ERDDAP URL
// ============================================================

function buildErddapUrl(
    windowStart,
    windowEnd
) {

    const variables =
        COLUMNS.join(",");

    const startTime =
        windowStart.toISOString();

    const endTime =
        windowEnd.toISOString();

    const constraints = [
        `latitude>=${LAT_MIN}`,
        `latitude<=${LAT_MAX}`,
        `longitude>=${LON_MIN}`,
        `longitude<=${LON_MAX}`,
        `time>=${startTime}`,
        `time<${endTime}`,
    ];

    return (
        `${ERDDAP_BASE}?` +
        variables +
        "&" +
        constraints
            .map(
                value =>
                    encodeURI(value)
            )
            .join("&")
    );
}


// ============================================================
// DOWNLOAD ERDDAP CSV
// ============================================================

async function downloadErddapWindow(
    windowStart,
    windowEnd
) {

    const url =
        buildErddapUrl(
            windowStart,
            windowEnd
        );

    console.log("");
    console.log(
        "ERDDAP WINDOW"
    );

    console.log(
        `${windowStart.toISOString()} -> ${windowEnd.toISOString()}`
    );

    let lastError = null;

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {

        try {

            console.log(
                `--> ERDDAP request attempt ${attempt}/${MAX_RETRIES}`
            );

            const response =
                await axios.get(
                    url,
                    {
                        timeout:
                            REQUEST_TIMEOUT_MS,

                        responseType:
                            "text",

                        transformResponse:
                            data => data,

                        headers: {
                            "User-Agent":
                                "VARUNA-Argo-Ingestion/1.0"
                        },

                        validateStatus:
                            status =>
                                (
                                    status >= 200 &&
                                    status < 300
                                ) ||
                                status === 404
                    }
                );


            // ====================================================
            // 404 HANDLING
            // ====================================================
            //
            // ERDDAP uses 404 when the requested time range
            // lies outside the current available data range.
            //
            // This is NOT a retryable server failure.
            //
            // It means:
            // "No matching data currently exists for this window."
            // ====================================================

            if (response.status === 404) {

                console.log(
                    "--> ERDDAP returned HTTP 404."
                );

                const responseText =
                    String(response.data || "");

                console.log(
                    "--> ERDDAP response:"
                );

                console.log(
                    responseText.slice(0, 2000)
                );

                if (
                    responseText.includes(
                        "no matching results"
                    ) ||
                    responseText.includes(
                        "outside of the variable's actual_range"
                    )
                ) {

                    console.log(
                        "--> No available ERDDAP data for this window."
                    );

                    return null;
                }

                throw new Error(
                    "ERDDAP returned HTTP 404 for requested window"
                );
            }


            // ====================================================
            // RESPONSE VALIDATION
            // ====================================================

            const csvText =
                response.data;

            if (
                !csvText ||
                typeof csvText !== "string"
            ) {

                console.log(
                    "--> ERDDAP returned an empty response."
                );

                return null;
            }

            const trimmed =
                csvText.trim();

            if (!trimmed) {

                return null;

            }


            // ====================================================
            // TEXTUAL ERDDAP ERROR
            // ====================================================

            if (
                trimmed.startsWith("Error {") ||
                trimmed.startsWith("<html") ||
                trimmed.includes(
                    "Your query produced no matching results"
                )
            ) {

                if (
                    trimmed.includes(
                        "no matching results"
                    )
                ) {

                    console.log(
                        "--> No matching rows for this window."
                    );

                    return null;
                }

                throw new Error(
                    `ERDDAP returned an error response:\n${trimmed.slice(0, 1000)}`
                );
            }


            console.log(
                `--> Downloaded ${Buffer.byteLength(
                    csvText,
                    "utf8"
                )} bytes`
            );

            return csvText;

        } catch (error) {

            lastError = error;

            console.error(
                `--> ERDDAP attempt ${attempt} failed:`,
                error.message
            );

            if (
                attempt === MAX_RETRIES
            ) {

                break;

            }

            const backoff =
                Math.min(
                    30000,
                    3000 *
                        (
                            2 **
                            (attempt - 1)
                        )
                );

            console.log(
                `--> Retrying after ${backoff} ms...`
            );

            await sleep(
                backoff
            );
        }
    }

    throw new Error(
        `ERDDAP request failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
    );
}


// ============================================================
// PARSE ERDDAP CSV
// ============================================================
//
// IMPORTANT FIX
//
// ERDDAP CSV structure:
//
// Line 1 = column names
// Line 2 = units
// Line 3+ = data
//
// DO NOT use:
//     columns: true + from_line: 3
//
// because csv-parse will then treat line 3 as the header.
//
// Instead:
//   1. Parse the first line as the header.
//   2. Remove the second line (units).
//   3. Parse remaining lines using the known columns.
// ============================================================

function parseErddapCsv(csvText) {

    if (!csvText) {

        return [];

    }

    const lines =
        csvText
            .replace(/^\uFEFF/, "")
            .split(/\r?\n/);

    if (
        lines.length < 3
    ) {

        return [];

    }


    // ------------------------------------------------------------
    // Validate / obtain ERDDAP header
    // ------------------------------------------------------------

    const headerRecords =
        parse(
            lines[0],
            {
                relax_quotes: true,
                trim: true,
            }
        );

    const headers =
        headerRecords[0] || [];

    if (
        headers.length !==
        COLUMNS.length
    ) {

        throw new Error(
            `Unexpected ERDDAP header. Expected ${COLUMNS.length} columns, got ${headers.length}.`
        );

    }


    // ------------------------------------------------------------
    // Parse data only
    //
    // Skip:
    //   line 1 -> header
    //   line 2 -> units
    // ------------------------------------------------------------

    const dataText =
        lines
            .slice(2)
            .join("\n");

    if (!dataText.trim()) {

        return [];

    }


    const records =
        parse(
            dataText,
            {
                columns: COLUMNS,

                skip_empty_lines: true,

                relax_quotes: true,

                relax_column_count: true,

                trim: true,
            }
        );


    return records;
}


// ============================================================
// NORMALIZE TIMESTAMP
// ============================================================
//
// DB schema:
//     TIMESTAMP WITHOUT TIME ZONE
//
// ERDDAP:
//     UTC timestamp
//
// We normalize to UTC and remove timezone suffix.
// ============================================================

function normalizeTimestamp(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return date
        .toISOString()
        .replace("T", " ")
        .replace("Z", "");
}


// ============================================================
// NULL / NUMBER HELPERS
// ============================================================

function nullableNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}


function nullableInteger(value) {

    const number =
        nullableNumber(value);

    return number === null
        ? null
        : Math.trunc(number);
}


function nullableDirection(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }

    const direction =
        String(value)
            .trim()
            .toUpperCase();

    if (
        direction === "A" ||
        direction === "D"
    ) {

        return direction;

    }

    return null;
}


// ============================================================
// CLEAN ROW
// ============================================================

function normalizeRow(raw) {

    const row = {

        platform_number:
            nullableInteger(
                raw.platform_number
            ),

        cycle_number:
            nullableInteger(
                raw.cycle_number
            ),

        direction:
            nullableDirection(
                raw.direction
            ),

        latitude:
            nullableNumber(
                raw.latitude
            ),

        longitude:
            nullableNumber(
                raw.longitude
            ),

        time:
            normalizeTimestamp(
                raw.time
            ),

        pres:
            nullableNumber(
                raw.pres
            ),

        temp:
            nullableNumber(
                raw.temp
            ),

        psal:
            nullableNumber(
                raw.psal
            ),

        doxy:
            nullableNumber(
                raw.doxy
            ),

        chla:
            nullableNumber(
                raw.chla
            ),

        ph_in_situ_total:
            nullableNumber(
                raw.ph_in_situ_total
            ),

        nitrate:
            nullableNumber(
                raw.nitrate
            ),
    };


    // ------------------------------------------------------------
    // DB NOT NULL requirements
    // ------------------------------------------------------------

    if (
        row.platform_number === null ||
        row.time === null ||
        row.pres === null
    ) {

        return null;

    }


    // ------------------------------------------------------------
    // Geographic sanity checks
    // ------------------------------------------------------------

    if (
        row.latitude !== null &&
        (
            row.latitude < -90 ||
            row.latitude > 90
        )
    ) {

        row.latitude = null;

    }


    if (
        row.longitude !== null &&
        (
            row.longitude < -180 ||
            row.longitude > 180
        )
    ) {

        row.longitude = null;

    }


    return row;
}


// ============================================================
// INSERT BATCH
// ============================================================
//
// Inserts into public.marine_data.
//
// geom is generated server-side.
//
// Partition routing is handled automatically by PostgreSQL.
// ============================================================

async function insertBatch(
    client,
    rows
) {

    if (!rows.length) {

        return;

    }


    const values = [];

    const placeholders = [];

    let parameterIndex = 1;


    for (
        const row of rows
    ) {

        values.push(
            row.platform_number,
            row.cycle_number,
            row.direction,
            row.latitude,
            row.longitude,
            row.time,
            row.pres,
            row.temp,
            row.psal,
            row.doxy,
            row.chla,
            row.ph_in_situ_total,
            row.nitrate
        );


        const p = [];


        for (
            let i = 0;
            i < 13;
            i++
        ) {

            p.push(
                `$${parameterIndex++}`
            );

        }


        placeholders.push(
            `(${p.join(",")})`
        );

    }


    const sql = `

        INSERT INTO ${TABLE_NAME} (

            platform_number,
            cycle_number,
            direction,

            latitude,
            longitude,
            time,

            geom,

            pres,
            temp,
            psal,
            doxy,
            chla,
            ph_in_situ_total,
            nitrate

        )

        SELECT

            v.platform_number::INTEGER,
            v.cycle_number::INTEGER,
            v.direction::CHAR(1),

            v.latitude::DOUBLE PRECISION,
            v.longitude::DOUBLE PRECISION,

            v.time::TIMESTAMP WITHOUT TIME ZONE,

            CASE
                WHEN
                    v.latitude IS NOT NULL
                    AND
                    v.longitude IS NOT NULL
                THEN
                    ST_SetSRID(
                        ST_MakePoint(
                            v.longitude::DOUBLE PRECISION,
                            v.latitude::DOUBLE PRECISION
                        ),
                        4326
                    )::geography
                ELSE
                    NULL
            END,

            v.pres::DOUBLE PRECISION,
            v.temp::DOUBLE PRECISION,
            v.psal::DOUBLE PRECISION,
            v.doxy::DOUBLE PRECISION,
            v.chla::DOUBLE PRECISION,
            v.ph_in_situ_total::DOUBLE PRECISION,
            v.nitrate::DOUBLE PRECISION

        FROM (
            VALUES
                ${placeholders.join(",")}
        ) AS v (

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
        )

        ON CONFLICT (
            platform_number,
            time,
            pres
        )

        DO NOTHING;

    `;


    await client.query(
        sql,
        values
    );
}


// ============================================================
// INGEST PARSED ROWS
// ============================================================

async function ingestRows(
    rows
) {

    if (!rows.length) {

        return {
            processed: 0,
            affectedFloats: new Set(),
        };

    }


    const cleanRows = [];

    const affectedFloats =
        new Set();


    for (
        const raw of rows
    ) {

        const row =
            normalizeRow(raw);


        if (!row) {

            continue;

        }


        cleanRows.push(row);

        affectedFloats.add(
            row.platform_number
        );

    }


    console.log(
        `--> Valid rows after cleaning: ${cleanRows.length.toLocaleString()}`
    );


    // Diagnostic information.
    //
    // If this is unexpectedly zero, show the first
    // raw row and its keys.

    if (
        cleanRows.length === 0 &&
        rows.length > 0
    ) {

        console.error(
            "--> WARNING: All parsed rows were rejected."
        );

        console.error(
            "--> First parsed row:"
        );

        console.error(
            rows[0]
        );

        console.error(
            "--> Parsed row keys:"
        );

        console.error(
            Object.keys(rows[0] || {})
        );

    }


    if (!cleanRows.length) {

        return {
            processed: 0,
            affectedFloats,
        };

    }


    const client =
        await pool.connect();

    let processed = 0;


    try {

        await client.query(
            "SET TIME ZONE 'UTC';"
        );


        for (
            let i = 0;
            i < cleanRows.length;
            i += DB_BATCH_SIZE
        ) {

            const batch =
                cleanRows.slice(
                    i,
                    i + DB_BATCH_SIZE
                );


            const batchNumber =
                Math.floor(
                    i / DB_BATCH_SIZE
                ) + 1;


            const totalBatches =
                Math.ceil(
                    cleanRows.length /
                    DB_BATCH_SIZE
                );


            console.log(
                `--> DB batch ${batchNumber}/${totalBatches} (${batch.length} rows)`
            );


            await insertBatch(
                client,
                batch
            );


            processed +=
                batch.length;

        }

    } finally {

        client.release();

    }


    return {
        processed,
        affectedFloats,
    };
}


// ============================================================
// REFRESH FLOAT METADATA
// ============================================================
//
// Updates only floats affected by this ingestion run.
//
// marine_data = source of truth
// float_metadata = frontend-friendly catalog
// ============================================================

async function refreshFloatMetadata(
    affectedFloats
) {

    if (
        !REFRESH_FLOAT_METADATA ||
        affectedFloats.size === 0
    ) {

        return;

    }


    const platforms =
        Array.from(
            affectedFloats
        );


    console.log(
        `--> Refreshing metadata for ${platforms.length} affected floats...`
    );


    const client =
        await pool.connect();


    try {

        await client.query(
            "SET TIME ZONE 'UTC';"
        );


        const sql = `

            WITH selected_floats AS (

                SELECT *
                FROM public.marine_data

                WHERE platform_number =
                    ANY($1::INTEGER[])

            ),

            float_stats AS (

                SELECT

                    platform_number,

                    MIN(time)
                        AS first_observation_time,

                    MAX(time)
                        AS latest_observation_time,

                    COUNT(*)
                        AS total_observations,

                    COUNT(
                        DISTINCT cycle_number
                    )
                        AS total_cycles,

                    EXTRACT(
                        EPOCH FROM (
                            MAX(time) -
                            MIN(time)
                        )
                    ) / 86400.0
                        AS observation_span_days,

                    MIN(latitude)
                        AS min_latitude,

                    MAX(latitude)
                        AS max_latitude,

                    MIN(longitude)
                        AS min_longitude,

                    MAX(longitude)
                        AS max_longitude,

                    MIN(pres)
                        AS min_pressure,

                    MAX(pres)
                        AS max_pressure,

                    BOOL_OR(
                        temp IS NOT NULL
                    )
                        AS has_temperature,

                    BOOL_OR(
                        psal IS NOT NULL
                    )
                        AS has_salinity,

                    BOOL_OR(
                        doxy IS NOT NULL
                    )
                        AS has_dissolved_oxygen,

                    BOOL_OR(
                        chla IS NOT NULL
                    )
                        AS has_chlorophyll,

                    BOOL_OR(
                        ph_in_situ_total IS NOT NULL
                    )
                        AS has_ph,

                    BOOL_OR(
                        nitrate IS NOT NULL
                    )
                        AS has_nitrate

                FROM selected_floats

                GROUP BY
                    platform_number

            ),

            first_position AS (

                SELECT DISTINCT ON (
                    platform_number
                )

                    platform_number,

                    latitude
                        AS first_latitude,

                    longitude
                        AS first_longitude

                FROM selected_floats

                WHERE
                    latitude IS NOT NULL
                    AND
                    longitude IS NOT NULL

                ORDER BY
                    platform_number,
                    time ASC

            ),

            latest_position AS (

                SELECT DISTINCT ON (
                    platform_number
                )

                    platform_number,

                    latitude
                        AS latest_latitude,

                    longitude
                        AS latest_longitude,

                    cycle_number
                        AS latest_cycle_number,

                    direction
                        AS latest_direction

                FROM selected_floats

                WHERE
                    latitude IS NOT NULL
                    AND
                    longitude IS NOT NULL

                ORDER BY
                    platform_number,
                    time DESC

            )

            INSERT INTO public.float_metadata (

                platform_number,

                first_observation_time,
                latest_observation_time,

                first_latitude,
                first_longitude,

                latest_latitude,
                latest_longitude,

                latest_cycle_number,
                latest_direction,

                total_observations,
                total_cycles,

                observation_span_days,

                min_latitude,
                max_latitude,

                min_longitude,
                max_longitude,

                min_pressure,
                max_pressure,

                has_temperature,
                has_salinity,
                has_dissolved_oxygen,
                has_chlorophyll,
                has_ph,
                has_nitrate,

                updated_at

            )

            SELECT

                fs.platform_number,

                fs.first_observation_time,
                fs.latest_observation_time,

                fp.first_latitude,
                fp.first_longitude,

                lp.latest_latitude,
                lp.latest_longitude,

                lp.latest_cycle_number,
                lp.latest_direction,

                fs.total_observations,
                fs.total_cycles,

                fs.observation_span_days,

                fs.min_latitude,
                fs.max_latitude,

                fs.min_longitude,
                fs.max_longitude,

                fs.min_pressure,
                fs.max_pressure,

                fs.has_temperature,
                fs.has_salinity,
                fs.has_dissolved_oxygen,
                fs.has_chlorophyll,
                fs.has_ph,
                fs.has_nitrate,

                CURRENT_TIMESTAMP

            FROM float_stats fs

            LEFT JOIN first_position fp

                ON fs.platform_number =
                   fp.platform_number

            LEFT JOIN latest_position lp

                ON fs.platform_number =
                   lp.platform_number

            ON CONFLICT (
                platform_number
            )

            DO UPDATE SET

                first_observation_time =
                    EXCLUDED.first_observation_time,

                latest_observation_time =
                    EXCLUDED.latest_observation_time,

                first_latitude =
                    EXCLUDED.first_latitude,

                first_longitude =
                    EXCLUDED.first_longitude,

                latest_latitude =
                    EXCLUDED.latest_latitude,

                latest_longitude =
                    EXCLUDED.latest_longitude,

                latest_cycle_number =
                    EXCLUDED.latest_cycle_number,

                latest_direction =
                    EXCLUDED.latest_direction,

                total_observations =
                    EXCLUDED.total_observations,

                total_cycles =
                    EXCLUDED.total_cycles,

                observation_span_days =
                    EXCLUDED.observation_span_days,

                min_latitude =
                    EXCLUDED.min_latitude,

                max_latitude =
                    EXCLUDED.max_latitude,

                min_longitude =
                    EXCLUDED.min_longitude,

                max_longitude =
                    EXCLUDED.max_longitude,

                min_pressure =
                    EXCLUDED.min_pressure,

                max_pressure =
                    EXCLUDED.max_pressure,

                has_temperature =
                    EXCLUDED.has_temperature,

                has_salinity =
                    EXCLUDED.has_salinity,

                has_dissolved_oxygen =
                    EXCLUDED.has_dissolved_oxygen,

                has_chlorophyll =
                    EXCLUDED.has_chlorophyll,

                has_ph =
                    EXCLUDED.has_ph,

                has_nitrate =
                    EXCLUDED.has_nitrate,

                updated_at =
                    CURRENT_TIMESTAMP;

        `;


        await client.query(
            sql,
            [platforms]
        );


        console.log(
            "--> Float metadata refresh: OK"
        );

    } finally {

        client.release();

    }
}


// ============================================================
// PROCESS ONE WINDOW
// ============================================================

async function processWindow(
    windowStart,
    windowEnd
) {

    const csv =
        await downloadErddapWindow(
            windowStart,
            windowEnd
        );


    if (!csv) {

        return {
            rowsProcessed: 0,
            affectedFloats: new Set(),
        };

    }


    console.log(
        "--> Parsing ERDDAP CSV..."
    );


    const records =
        parseErddapCsv(
            csv
        );


    console.log(
        `--> Parsed ${records.length.toLocaleString()} raw rows`
    );


    if (!records.length) {

        return {
            rowsProcessed: 0,
            affectedFloats: new Set(),
        };

    }


    // Helpful one-time diagnostic.

    console.log(
        "--> Sample parsed row:"
    );

    console.log(
        records[0]
    );


    const result =
        await ingestRows(
            records
        );


    return {

        rowsProcessed:
            result.processed,

        affectedFloats:
            result.affectedFloats,

    };
}


// ============================================================
// MAIN INGESTION RUN
// ============================================================

async function runDataIngestion() {

    console.log("");

    console.log(
        "============================================================"
    );

    console.log(
        "VARUNA ARGO INGESTION RUN"
    );

    console.log(
        `[${new Date().toISOString()}]`
    );

    console.log(
        "============================================================"
    );


    const runStarted =
        Date.now();


    try {

        // ----------------------------------------------------
        // STEP 0 — DATABASE CHECK
        // ----------------------------------------------------

        await verifyDatabaseConnection();


        // ----------------------------------------------------
        // STEP 1 — FIND LAST DATABASE RECORD
        // ----------------------------------------------------

        const latestDbTime =
            await getLatestTimestampFromDB();


        // ----------------------------------------------------
        // STEP 2 — CALCULATE START / END
        // ----------------------------------------------------

        const now =
            new Date();


        let ingestionStart;


        const databaseWasEmpty =
            latestDbTime.getTime() ===
            START_DATE.getTime();


        if (databaseWasEmpty) {

            ingestionStart =
                START_DATE;

        } else {

            ingestionStart =
                new Date(
                    latestDbTime.getTime()
                    -
                    LOOKBACK_HOURS *
                    60 *
                    60 *
                    1000
                );


            if (
                ingestionStart <
                START_DATE
            ) {

                ingestionStart =
                    START_DATE;

            }

        }


        const ingestionEnd =
            now;


        console.log("");

        console.log(
            "INGESTION RANGE"
        );

        console.log(
            `--> Start: ${ingestionStart.toISOString()}`
        );

        console.log(
            `--> End:   ${ingestionEnd.toISOString()}`
        );


        if (
            ingestionStart >=
            ingestionEnd
        ) {

            console.log(
                "--> Database is already up-to-date."
            );

            return;

        }


        // ----------------------------------------------------
        // STEP 3 — PROCESS WINDOWS
        // ----------------------------------------------------

        let currentStart =
            ingestionStart;


        let totalProcessed = 0;


        const allAffectedFloats =
            new Set();


        while (
            currentStart <
            ingestionEnd
        ) {

            const currentEnd =
                new Date(
                    Math.min(

                        currentStart.getTime()
                        +
                        WINDOW_DAYS *
                        24 *
                        60 *
                        60 *
                        1000,

                        ingestionEnd.getTime()

                    )
                );


            console.log("");

            console.log(
                "------------------------------------------------------------"
            );

            console.log(
                `WINDOW: ${currentStart.toISOString()} -> ${currentEnd.toISOString()}`
            );

            console.log(
                "------------------------------------------------------------"
            );


            try {

                const result =
                    await processWindow(
                        currentStart,
                        currentEnd
                    );


                totalProcessed +=
                    result.rowsProcessed;


                for (
                    const platformNumber
                    of result.affectedFloats
                ) {

                    allAffectedFloats.add(
                        platformNumber
                    );

                }


                console.log(
                    `--> Window processed: ${result.rowsProcessed.toLocaleString()} rows`
                );


            } catch (error) {

                // Never silently skip a failed window.

                throw new Error(
                    `Window failed ${currentStart.toISOString()} -> ${currentEnd.toISOString()}: ${error.message}`
                );

            }


            currentStart =
                currentEnd;


            if (
                currentStart <
                ingestionEnd
            ) {

                await sleep(
                    REQUEST_DELAY_MS
                );

            }

        }


        // ----------------------------------------------------
        // STEP 4 — UPDATE FLOAT METADATA
        // ----------------------------------------------------

        await refreshFloatMetadata(
            allAffectedFloats
        );


        // ----------------------------------------------------
        // SUMMARY
        // ----------------------------------------------------

        const elapsed =
            (
                Date.now()
                -
                runStarted
            ) / 1000;


        console.log("");

        console.log(
            "============================================================"
        );

        console.log(
            "INGESTION RUN COMPLETED SUCCESSFULLY"
        );

        console.log(
            `Total source rows processed: ${totalProcessed.toLocaleString()}`
        );

        console.log(
            `Affected floats: ${allAffectedFloats.size.toLocaleString()}`
        );

        console.log(
            `Runtime: ${elapsed.toFixed(2)} seconds`
        );

        console.log(
            "============================================================"
        );


    } catch (error) {

        console.error("");

        console.error(
            "============================================================"
        );

        console.error(
            "INGESTION RUN FAILED"
        );

        console.error(
            error.stack ||
            error.message
        );

        console.error(
            "============================================================"
        );

    }

}


// ============================================================
// SLEEP
// ============================================================

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


// ============================================================
// CRON
// ============================================================

console.log(
    "VARUNA ARGO ingestion service started."
);

console.log(
    `Cron schedule: ${CRON_SCHEDULE}`
);

console.log(
    `Lookback: ${LOOKBACK_HOURS} hours`
);

console.log(
    `ERDDAP window: ${WINDOW_DAYS} days`
);


cron.schedule(
    CRON_SCHEDULE,
    async () => {

        await runDataIngestion();

    }
);


// ============================================================
// RUN ON STARTUP
// ============================================================

runDataIngestion();




//// eveyr hour live ingestion, 
// Every hour
//     ↓
// Check latest record in Supabase
//     ↓
// latest_time - 24 hours
//     ↓
// Fetch ERDDAP data
//     ↓
// up to current UTC time
//     ↓
// Clean + deduplicate
//     ↓
// Insert new records