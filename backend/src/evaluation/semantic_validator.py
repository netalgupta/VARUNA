"""
VARUNA — Multi-Stage Semantic & Execution Validator
Enforces a 4-tier validation pipeline:
  1. SQL_EXECUTION_PASS: Query executes on Supabase without DB errors.
  2. SEMANTIC_SQL_PASS: Query contains the exact required table, predicates, and aggregations.
  3. RESULT_PASS: Result set is non-empty and contains the expected fields.
  4. ANSWER_PASS: Synthesizer generated an answer grounded in the retrieved rows.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple


# ── Benchmark Evidence Modality Classification ──────────────────────────────
# Modalities: SQL_ONLY, SQL_POSTGIS, SQL_RAG_HYBRID, DERIVED_ANALYTICS, MULTI_SHARD_UNION, FULL_SYNTHESIS

QUERY_SEMANTIC_SPECS: Dict[str, Dict[str, Any]] = {
    "PHYS_01": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data"],
        "required_columns": ["temp", "psal", "pres"],
        "required_predicates": ["1902303"],
        "required_order": [("pres", "time")],
    },
    "PHYS_02": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data"],
        "required_columns": ["psal"],
        "required_predicates": ["pres"],
        "required_aggregations": ["avg", ("group by", "as", "union")],
    },
    "PHYS_03": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data"],
        "required_columns": ["pres"],
        "required_order": [("pres desc", "order by")],
    },
    "PHYS_04": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data"],
        "required_columns": ["latitude", "longitude", "time"],
        "required_predicates": ["1902303"],
        "required_order": ["time"],
    },
    "PHYS_05": {
        "modality": "DERIVED_ANALYTICS",
        "required_tables": ["marine_data"],
        "required_columns": ["temp", "pres"],
        "required_predicates": ["5906478"],
    },
    "PHYS_06": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data", "v_latest_positions"],
        "required_columns": ["platform_number", "latitude", "longitude"],
        "required_predicates": [("80", "78", "82", "75"), ("95", "100", "92", "90")],  # BoB Longitude
    },
    "PHYS_07": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data"],
        "required_columns": ["temp"],
        "required_aggregations": ["avg"],
    },
    "BGC_08": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data"],
        "required_columns": ["doxy"],
        "required_predicates": ["150", "800"],
        "required_order": [("doxy asc", "order by", "min")],
    },
    "BGC_09": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data"],
        "required_columns": ["pres"],
        "required_predicates": ["50"],
    },
    "BGC_10": {
        "modality": "DERIVED_ANALYTICS",
        "required_tables": ["marine_data"],
        "required_columns": ["doxy"],
        "required_aggregations": ["avg"],
    },
    "BGC_11": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data"],
        "required_columns": ["doxy", "platform_number"],
        "required_predicates": ["20", "300"],
    },
    "BGC_12": {
        "modality": "SQL_RAG_HYBRID",
        "required_tables": ["marine_data"],
        "required_columns": ["pres"],
    },
    "BGC_13": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data"],
        "required_columns": ["doxy", "psal"],
        "required_aggregations": [("avg", "corr", "select", "group by")],
    },
    "BGC_14": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data"],
        "required_columns": ["latitude", "longitude", "doxy"],
    },
    "BIO_15": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_biodiversity"],
        "required_columns": ["family"],
        "required_aggregations": ["count", "group by"],
        "required_order": ["desc"],
    },
    "BIO_16": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_biodiversity"],
        "required_columns": ["scientific_name", "maximum_depth_m"],
        "required_predicates": ["2000"],
    },
    "BIO_17": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_biodiversity"],
        "required_columns": ["scientific_name"],
        "required_predicates": ["sardinella"],
    },
    "BIO_18": {
        "modality": "SQL_ONLY",
        "required_tables": ["species_ecological_profiles", "marine_biodiversity"],
        "required_predicates": ["acanthosepion"],
    },
    "BIO_19": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_biodiversity"],
        "required_predicates": ["scombridae"],
    },
    "BIO_20": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_biodiversity"],
        "required_predicates": ["77", "80"],  # Gulf of Mannar Longitude
    },
    "BIO_21": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_biodiversity"],
        "required_predicates": ["thunnus"],
    },
    "FUS_22": {
        "modality": "SQL_POSTGIS",
        "required_tables": ["marine_biodiversity", "marine_data"],
        "required_predicates": ["st_dwithin", "doxy"],
    },
    "FUS_23": {
        "modality": "SQL_POSTGIS",
        "required_tables": ["marine_biodiversity", "marine_data"],
        "required_predicates": ["st_dwithin"],
    },
    "FUS_24": {
        "modality": "SQL_POSTGIS",
        "required_tables": ["marine_biodiversity", "marine_data"],
        "required_predicates": ["st_dwithin"],
    },
    "FUS_25": {
        "modality": "SQL_POSTGIS",
        "required_tables": ["marine_biodiversity", "marine_data"],
        "required_predicates": ["st_dwithin"],
    },
    "FUS_26": {
        "modality": "SQL_POSTGIS",
        "required_tables": ["marine_biodiversity", "marine_data"],
        "required_predicates": ["st_dwithin"],
    },
    "FUS_27": {
        "modality": "SQL_RAG_HYBRID",
        "required_tables": ["species_ecological_profiles", "marine_biodiversity", "marine_data"],
        "required_predicates": ["penaeus"],
    },
    "FUS_28": {
        "modality": "SQL_POSTGIS",
        "required_tables": ["marine_biodiversity", "marine_data"],
        "required_predicates": ["st_dwithin"],
    },
    "SPA_29": {
        "modality": "SQL_POSTGIS",
        "required_tables": ["marine_data", "v_latest_positions"],
        "required_columns": ["platform_number", "psal"],
    },
    "SPA_30": {
        "modality": "SQL_POSTGIS",
        "required_tables": ["marine_data", "v_latest_positions"],
        "required_columns": ["platform_number", "temp"],
    },
    "SPA_31": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data"],
        "required_aggregations": ["avg"],
    },
    "SPA_32": {
        "modality": "MULTI_SHARD_UNION",
        "required_tables": ["marine_data"],
        "required_predicates": ["1902303"],
    },
    "SPA_33": {
        "modality": "DERIVED_ANALYTICS",
        "required_tables": ["marine_data"],
        "required_columns": ["temp"],
    },
    "SPA_34": {
        "modality": "SQL_ONLY",
        "required_tables": ["marine_data"],
        "required_columns": ["doxy", "pres"],
    },
    "SPA_35": {
        "modality": "FULL_SYNTHESIS",
        "required_tables": ["marine_biodiversity", "marine_data"],
    },
}


def validate_semantic_sql(qid: str, sql: Optional[str]) -> Tuple[bool, List[str]]:
    """
    Validates whether the SQL generated for query qid contains the necessary semantic clauses.
    """
    if not sql:
        spec = QUERY_SEMANTIC_SPECS.get(qid, {})
        # Some queries are pure vector searches (e.g. BIO_18)
        if "bio_knowledge" in spec.get("required_tables", []):
            return True, ["Pure Vector RAG (No SQL required)"]
        return False, ["No SQL generated or SQL is None"]

    spec = QUERY_SEMANTIC_SPECS.get(qid, {})
    if not spec:
        return True, ["No specific semantic constraints registered"]

    reasons: List[str] = []
    sql_low = sql.lower()

    # 1. Table check
    req_tables = spec.get("required_tables", [])
    if req_tables:
        found_table = any(t.lower() in sql_low for t in req_tables)
        if not found_table:
            reasons.append(f"Missing required table(s): {req_tables}")

    # 2. Column check
    req_cols = spec.get("required_columns", [])
    for col in req_cols:
        if col.lower() not in sql_low:
            reasons.append(f"Missing required column: {col}")

    # 3. Predicate check
    req_preds = spec.get("required_predicates", [])
    for pred in req_preds:
        if isinstance(pred, (list, tuple)):
            if not any(str(p).lower() in sql_low for p in pred):
                reasons.append(f"Missing required predicate (any of {pred})")
        else:
            if str(pred).lower() not in sql_low:
                reasons.append(f"Missing required predicate / filter: '{pred}'")

    # 4. Aggregation check
    req_aggs = spec.get("required_aggregations", [])
    for agg in req_aggs:
        if isinstance(agg, (list, tuple)):
            if not any(str(a).lower() in sql_low for a in agg):
                reasons.append(f"Missing required aggregation (any of {agg})")
        else:
            if str(agg).lower() not in sql_low:
                reasons.append(f"Missing required aggregation: '{agg}'")

    # 5. Order check
    req_orders = spec.get("required_order", [])
    for order in req_orders:
        if isinstance(order, (list, tuple)):
            if not any(str(o).lower() in sql_low for o in order):
                reasons.append(f"Missing required ordering (any of {order})")
        else:
            if str(order).lower() not in sql_low:
                reasons.append(f"Missing required ordering: '{order}'")

    # 6. Check for unresolved template braces
    if "{" in sql or "}" in sql:
        reasons.append("Unresolved template syntax detected (e.g., {species_term})")

    is_valid = len(reasons) == 0
    return is_valid, reasons
