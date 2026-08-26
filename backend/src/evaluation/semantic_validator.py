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


# Semantic expectations for each benchmark query
QUERY_SEMANTIC_SPECS: Dict[str, Dict[str, Any]] = {
    "PHYS_01": {
        "required_tables": ["marine_data"],
        "required_columns": ["temp", "psal", "pres"],
        "required_predicates": ["platform_number = 1902303"],
        "required_order": ["pres", "time"],
    },
    "PHYS_02": {
        "required_tables": ["marine_data"],
        "required_columns": ["psal"],
        "required_predicates": ["pres"],
        "required_aggregations": ["avg", "group by"],
    },
    "PHYS_03": {
        "required_tables": ["marine_data"],
        "required_columns": ["pres"],
        "required_order": ["pres desc"],
    },
    "PHYS_04": {
        "required_tables": ["marine_data"],
        "required_columns": ["latitude", "longitude", "time"],
        "required_predicates": ["1902303"],
        "required_order": ["time"],
    },
    "PHYS_05": {
        "required_tables": ["marine_data"],
        "required_columns": ["temp", "pres"],
        "required_predicates": ["5906478"],
    },
    "PHYS_06": {
        "required_tables": ["marine_data", "v_latest_positions"],
        "required_columns": ["platform_number", "latitude", "longitude"],
        "required_predicates": ["80", "100"],  # Bay of Bengal longitude
    },
    "PHYS_07": {
        "required_tables": ["marine_data"],
        "required_columns": ["temp"],
        "required_aggregations": ["avg"],
    },
    "BGC_08": {
        "required_tables": ["marine_data"],
        "required_columns": ["doxy"],
        "required_predicates": ["150", "800"],
        "required_order": ["doxy asc"],
    },
    "BGC_09": {
        "required_tables": ["marine_data"],
        "required_columns": ["doxy"],
        "required_predicates": ["pres"],
    },
    "BGC_10": {
        "required_tables": ["marine_data"],
        "required_columns": ["doxy"],
        "required_aggregations": ["date_trunc", "avg"],
    },
    "BGC_11": {
        "required_tables": ["marine_data"],
        "required_columns": ["doxy", "platform_number"],
        "required_predicates": ["doxy < 20", "300"],
    },
    "BGC_12": {
        "required_tables": ["marine_data"],
        "required_columns": ["pres"],
    },
    "BGC_13": {
        "required_tables": ["marine_data"],
        "required_columns": ["doxy", "psal"],
        "required_aggregations": ["corr", "avg"],
    },
    "BGC_14": {
        "required_tables": ["marine_data"],
        "required_columns": ["latitude", "longitude", "doxy"],
    },
    "BIO_15": {
        "required_tables": ["marine_biodiversity"],
        "required_columns": ["family"],
        "required_aggregations": ["count", "group by"],
        "required_order": ["desc"],
    },
    "BIO_16": {
        "required_tables": ["marine_biodiversity"],
        "required_columns": ["scientific_name", "maximum_depth_m"],
        "required_predicates": ["2000"],
    },
    "BIO_17": {
        "required_tables": ["marine_biodiversity"],
        "required_columns": ["scientific_name"],
        "required_predicates": ["sardinella"],
    },
    "BIO_18": {
        "required_tables": [],
    },
    "BIO_19": {
        "required_tables": ["marine_biodiversity"],
        "required_predicates": ["scombridae"],
    },
    "BIO_20": {
        "required_tables": ["marine_biodiversity"],
        "required_predicates": ["77", "80"],  # Gulf of Mannar
    },
    "BIO_21": {
        "required_tables": ["marine_biodiversity"],
        "required_predicates": ["thunnus"],
    },
    "FUS_22": {
        "required_tables": ["marine_biodiversity", "marine_data"],
        "required_predicates": ["st_dwithin", "doxy"],
    },
    "FUS_23": {
        "required_tables": ["marine_biodiversity", "marine_data"],
        "required_predicates": ["st_dwithin", "29.5"],
    },
    "FUS_24": {
        "required_tables": ["marine_biodiversity", "marine_data"],
        "required_predicates": ["st_dwithin"],
    },
    "FUS_25": {
        "required_tables": ["marine_biodiversity", "marine_data"],
        "required_predicates": ["st_dwithin", "45"],
    },
    "FUS_26": {
        "required_tables": ["marine_biodiversity", "marine_data"],
        "required_predicates": ["st_dwithin"],
    },
    "FUS_27": {
        "required_tables": ["marine_biodiversity"],
        "required_predicates": ["penaeus"],
    },
    "FUS_28": {
        "required_tables": ["marine_biodiversity", "marine_data"],
        "required_predicates": ["st_dwithin"],
    },
    "SPA_29": {
        "required_tables": ["marine_data", "v_latest_positions"],
        "required_columns": ["latitude", "longitude"],
    },
    "SPA_30": {
        "required_tables": ["marine_data", "v_latest_positions"],
        "required_columns": ["latitude", "longitude"],
    },
    "SPA_31": {
        "required_tables": ["marine_data"],
        "required_aggregations": ["avg"],
    },
    "SPA_32": {
        "required_tables": ["marine_data"],
        "required_predicates": ["1902303"],
    },
    "SPA_33": {
        "required_tables": ["marine_data"],
        "required_columns": ["temp"],
    },
    "SPA_34": {
        "required_tables": ["marine_data"],
        "required_columns": ["doxy", "pres"],
    },
    "SPA_35": {
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
        if pred.lower() not in sql_low:
            reasons.append(f"Missing required predicate / filter: '{pred}'")

    # 4. Aggregation check
    req_aggs = spec.get("required_aggregations", [])
    for agg in req_aggs:
        if agg.lower() not in sql_low:
            reasons.append(f"Missing required aggregation: '{agg}'")

    # 5. Order check
    req_orders = spec.get("required_order", [])
    for order in req_orders:
        if order.lower() not in sql_low:
            reasons.append(f"Missing required ordering: '{order}'")

    # 6. Check for unresolved template braces
    if "{" in sql or "}" in sql:
        reasons.append("Unresolved template syntax detected (e.g., {species_term})")

    is_valid = len(reasons) == 0
    return is_valid, reasons
