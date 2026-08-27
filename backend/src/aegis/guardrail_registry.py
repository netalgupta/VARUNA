"""
VARUNA AEGIS — Guardrail Registry
12 rule types, Claim Escalation Levels (L0–L4), Forbidden Inference Map,
Claim × Evidence Compatibility Matrix, and Claim Policy schema.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, FrozenSet, List, Optional, Set, Tuple


# ── Claim Escalation Levels ──────────────────────────────────────────────────

@dataclass(frozen=True)
class EscalationLevel:
    level: int
    name: str
    description: str
    indicator: str
    min_evidence_required: int
    lm_confidence_threshold: float   # Minimum confidence for auto-approval

CLAIM_ESCALATION_LEVELS: Dict[int, EscalationLevel] = {
    0: EscalationLevel(
        level=0,
        name="DIRECT_OBSERVATION",
        description="A single database row — float measurement, occurrence record.",
        indicator="🟢",
        min_evidence_required=1,
        lm_confidence_threshold=1.0,
    ),
    1: EscalationLevel(
        level=1,
        name="SIMPLE_DERIVATION",
        description="Two aggregates or a deterministic arithmetic formula on DB rows.",
        indicator="🟢",
        min_evidence_required=2,
        lm_confidence_threshold=0.99,
    ),
    2: EscalationLevel(
        level=2,
        name="CROSS_SOURCE_INFERENCE",
        description="Species occurrence + environmental measurement from a different source.",
        indicator="🟡",
        min_evidence_required=2,
        lm_confidence_threshold=0.85,
    ),
    3: EscalationLevel(
        level=3,
        name="BIOLOGICAL_INTERPRETATION",
        description="Requires a validated physiological relationship (species profile + measurement).",
        indicator="🟠",
        min_evidence_required=3,
        lm_confidence_threshold=0.70,
    ),
    4: EscalationLevel(
        level=4,
        name="HIGH_STAKES_ECOLOGICAL",
        description="Population trends, conservation status, causal ecosystem claims. "
                    "Rejected unless longitudinal / authoritative external evidence is provided.",
        indicator="🔴",
        min_evidence_required=5,
        lm_confidence_threshold=0.0,   # Always rejected — no auto-approval
    ),
}


# ── Forbidden Inference Map ──────────────────────────────────────────────────
# Keys are (evidence_relation, claimed_relation) pairs.
# Value is (rule_code, explanation).

FORBIDDEN_INFERENCE_MAP: Dict[Tuple[str, str], Tuple[str, str]] = {
    ("OBSERVED_AT",          "CAUSED_BY"):          ("FI-001", "Observation does not establish causation."),
    ("CORRELATED_WITH",      "CAUSED_BY"):           ("FI-002", "Correlation does not establish causation."),
    ("EXPOSED_TO",           "HARMED_BY"):           ("FI-003", "Exposure does not establish harm without physiological evidence."),
    ("OUTSIDE_OPTIMUM",      "POPULATION_DECLINE"):  ("FI-004", "Sub-optimal conditions do not imply population-level decline."),
    ("LOW_ABUNDANCE",        "ENDANGERED"):          ("FI-005", "Low local abundance does not establish IUCN-level endangerment."),
    ("HIGH_ABUNDANCE",       "HEALTHY_POPULATION"):  ("FI-006", "High local abundance does not establish population health."),
    ("OCCURRENCE",           "RESIDENCY"):           ("FI-007", "An occurrence record is not evidence of permanent residency."),
    ("OCCURRENCE",           "BREEDING"):            ("FI-008", "An occurrence record is not evidence of breeding activity."),
    ("PRESENCE",             "PREFERENCE"):          ("FI-009", "Presence in a region is not evidence of habitat preference."),
    ("ABSENCE",              "EXTINCTION"):          ("FI-010", "Absence from a sample is not evidence of extinction."),
    ("THERMAL_EXCEEDANCE",   "BLEACHING"):           ("FI-011", "Temperature above bleaching threshold does not guarantee bleaching without coral survey data."),
    ("BLEACHING",            "MORTALITY"):           ("FI-012", "Bleaching does not imply mortality without recovery survey data."),
    ("MORTALITY",            "POPULATION_COLLAPSE"): ("FI-013", "Localised mortality events do not imply population collapse."),
    ("HYPOXIA_EXPOSURE",     "MORTALITY"):           ("FI-014", "Proximity to hypoxic water does not establish individual mortality."),
    ("SALINITY_STRESS",      "REPRODUCTIVE_FAILURE"):("FI-015", "Salinity stress does not establish reproductive failure without breeding data."),
    ("WARMING",              "RANGE_SHIFT"):         ("FI-016", "Local warming does not establish range shift without time-series occurrence data."),
    ("DEPTH_COMPRESSION",    "STARVATION"):          ("FI-017", "Habitat depth compression does not establish starvation without prey/abundance data."),
    ("OMZ_EXPANSION",        "FISHERY_COLLAPSE"):    ("FI-018", "OMZ expansion does not establish fishery collapse without catch time-series."),
}


# ── Claim × Evidence Compatibility Matrix ────────────────────────────────────
# Maps a claim type to the minimum evidence requirements.

CLAIM_EVIDENCE_MATRIX: Dict[str, Dict[str, object]] = {
    "SPECIES_EXISTS": {
        "required": ["occurrence_record"],
        "escalation": 0,
        "description": "At least one verified occurrence record in marine_biodiversity.",
    },
    "SPECIES_LOCATION": {
        "required": ["occurrence_record", "coordinates"],
        "escalation": 0,
        "description": "Occurrence record with valid decimal_latitude/decimal_longitude.",
    },
    "SPECIES_DEPTH": {
        "required": ["occurrence_record", "depth"],
        "escalation": 0,
        "description": "Occurrence record with minimum_depth_m / maximum_depth_m.",
    },
    "SPECIES_ABUNDANCE": {
        "required": ["aggregated_occurrence_records"],
        "min_count": 5,
        "escalation": 1,
        "description": "COUNT(*) >= 5 occurrence records.",
    },
    "TAXONOMY": {
        "required": ["canonical_taxonomy"],
        "escalation": 0,
        "description": "Must resolve against canonical_taxonomy table (NOT species_ecological_profiles).",
    },
    "THERMAL_TOLERANCE": {
        "required": ["species_ecological_profile"],
        "escalation": 1,
        "description": "temp_pref_min_c / temp_pref_max_c from species_ecological_profiles.",
    },
    "SPECIES_EXPOSURE": {
        "required": ["occurrence_record", "environmental_measurement"],
        "escalation": 2,
        "description": "Co-located occurrence + float measurement (spatial + temporal overlap required).",
    },
    "SPECIES_STRESSED": {
        "required": ["occurrence_record", "environmental_measurement", "species_ecological_profile"],
        "escalation": 3,
        "description": "Exposure + physiological threshold verification from species profile.",
    },
    "POPULATION_DECLINING": {
        "required": ["longitudinal_population_data"],
        "escalation": 4,
        "description": "Multi-year time-series population data — ALWAYS rejected without it.",
    },
    "SPECIES_ENDANGERED": {
        "required": ["authoritative_conservation_status"],
        "escalation": 4,
        "description": "IUCN Red List or equivalent — ALWAYS rejected without it.",
    },
    "ECOSYSTEM_CAUSATION": {
        "required": ["experimental_ecological_evidence"],
        "escalation": 4,
        "description": "Causal ecological claims require experimental/longitudinal evidence.",
    },
    "CO_LOCATION": {
        "required": ["occurrence_record", "environmental_measurement", "spatial_overlap", "temporal_overlap"],
        "escalation": 2,
        "description": "Strict: spatial distance ≤ 50km AND temporal delta within claim policy AND taxonomy verified.",
    },
    "BACKGROUND_ASSOCIATION": {
        "required": ["occurrence_record", "temporal_mismatch_warning"],
        "escalation": 1,
        "description": "Historical occurrence in a region — temporal overlap NOT required, but mismatch must be flagged.",
    },
}


# ── Claim Policy Schema ───────────────────────────────────────────────────────
# Defines spatial / temporal / depth policies per claim class.

@dataclass(frozen=True)
class ClaimPolicy:
    claim_class: str
    temporal_policy: str    # SAME_EVENT_WINDOW | SEASONAL | MULTI_YEAR | CLIMATOLOGY
    spatial_policy: str     # WITHIN_50KM | WITHIN_200KM | REGIONAL | GLOBAL
    depth_policy: str       # OVERLAPPING_DEPTH | ANY_DEPTH | SURFACE_ONLY
    taxonomy_policy: str    # CANONICAL_ONLY | PROFILE_OK | ANY
    max_temporal_delta_days: Optional[float]
    max_spatial_km: Optional[float]

CLAIM_POLICIES: Dict[str, ClaimPolicy] = {
    "ENVIRONMENTAL_EXPOSURE": ClaimPolicy(
        claim_class="ENVIRONMENTAL_EXPOSURE",
        temporal_policy="SAME_EVENT_WINDOW",
        spatial_policy="WITHIN_50KM",
        depth_policy="OVERLAPPING_DEPTH",
        taxonomy_policy="CANONICAL_ONLY",
        max_temporal_delta_days=1.0,
        max_spatial_km=50.0,
    ),
    "HISTORICAL_HABITAT": ClaimPolicy(
        claim_class="HISTORICAL_HABITAT",
        temporal_policy="MULTI_YEAR",
        spatial_policy="REGIONAL",
        depth_policy="ANY_DEPTH",
        taxonomy_policy="CANONICAL_ONLY",
        max_temporal_delta_days=365.0 * 5,
        max_spatial_km=200.0,
    ),
    "ACUTE_HYPOXIA_EXPOSURE": ClaimPolicy(
        claim_class="ACUTE_HYPOXIA_EXPOSURE",
        temporal_policy="SAME_EVENT_WINDOW",
        spatial_policy="WITHIN_50KM",
        depth_policy="OVERLAPPING_DEPTH",
        taxonomy_policy="CANONICAL_ONLY",
        max_temporal_delta_days=1.0,
        max_spatial_km=50.0,
    ),
    "CLIMATOLOGICAL_HABITAT": ClaimPolicy(
        claim_class="CLIMATOLOGICAL_HABITAT",
        temporal_policy="CLIMATOLOGY",
        spatial_policy="REGIONAL",
        depth_policy="ANY_DEPTH",
        taxonomy_policy="CANONICAL_ONLY",
        max_temporal_delta_days=365.0 * 40,
        max_spatial_km=500.0,
    ),
    "DIRECT_OBSERVATION": ClaimPolicy(
        claim_class="DIRECT_OBSERVATION",
        temporal_policy="SAME_EVENT_WINDOW",
        spatial_policy="WITHIN_50KM",
        depth_policy="ANY_DEPTH",
        taxonomy_policy="ANY",
        max_temporal_delta_days=None,  # Single row — no delta
        max_spatial_km=None,
    ),
}


# ── 12 Guardrail Rule Definitions ────────────────────────────────────────────

@dataclass(frozen=True)
class GuardrailRule:
    rule_id: str
    name: str
    description: str
    applies_to_claim_types: FrozenSet[str]
    escalation_gate: int   # Minimum escalation level where this rule activates
    is_hard_gate: bool     # If True, failure = CLAIM_REJECTED (not just warning)

GUARDRAIL_REGISTRY: Dict[str, GuardrailRule] = {
    "NUMERIC": GuardrailRule(
        rule_id="NUMERIC",
        name="Numerical Bounds Validation",
        description="All reported physical quantities must fall within scientifically valid ranges: "
                    "temp (-5 to 35°C), psal (0 to 42 PSU), doxy (0 to 600 µmol/kg), "
                    "pres (0 to 2100 dbar), distance (0 to 20000 km).",
        applies_to_claim_types=frozenset(["OBSERVATION", "DERIVATION"]),
        escalation_gate=0,
        is_hard_gate=True,
    ),
    "TEMPORAL": GuardrailRule(
        rule_id="TEMPORAL",
        name="Temporal Co-location Validity",
        description="Enforces claim-class-specific MAX_TEMPORAL_DELTA. "
                    "CO_LOCATION requires overlap within 24h. BACKGROUND_ASSOCIATION allows years.",
        applies_to_claim_types=frozenset(["CO_LOCATION", "ENVIRONMENTAL_EXPOSURE"]),
        escalation_gate=2,
        is_hard_gate=True,
    ),
    "SPATIAL": GuardrailRule(
        rule_id="SPATIAL",
        name="Spatial Co-location Enforcement",
        description="Species occurrence must be within claim-policy-specified radius of "
                    "the environmental measurement point. Default 50 km for bio-fusion claims.",
        applies_to_claim_types=frozenset(["CO_LOCATION", "ENVIRONMENTAL_EXPOSURE", "SPECIES_EXPOSURE"]),
        escalation_gate=2,
        is_hard_gate=True,
    ),
    "TAXONOMIC": GuardrailRule(
        rule_id="TAXONOMIC",
        name="Canonical Taxonomy Verification",
        description="All species names must resolve against canonical_taxonomy table. "
                    "Rejects misspellings, obsolete names, genus-species confusion. "
                    "species_ecological_profiles is NOT the taxonomy authority.",
        applies_to_claim_types=frozenset(["TAXONOMY", "SPECIES_EXISTS", "SPECIES_LOCATION",
                                          "SPECIES_DEPTH", "SPECIES_ABUNDANCE", "SPECIES_STRESSED",
                                          "CO_LOCATION", "ENVIRONMENTAL_EXPOSURE"]),
        escalation_gate=0,
        is_hard_gate=True,
    ),
    "BIODIVERSITY_OCCURRENCE": GuardrailRule(
        rule_id="BIODIVERSITY_OCCURRENCE",
        name="Occurrence Record Existence Gate (BIO-001)",
        description="Never allow a species existence or location claim without a verified "
                    "occurrence record in marine_biodiversity. No inference from ecological profile alone.",
        applies_to_claim_types=frozenset(["SPECIES_EXISTS", "SPECIES_LOCATION", "CO_LOCATION"]),
        escalation_gate=0,
        is_hard_gate=True,
    ),
    "PHYSIOLOGY": GuardrailRule(
        rule_id="PHYSIOLOGY",
        name="Physiological Threshold Validation",
        description="Thermal/salinity/DO stress claims require species_ecological_profiles "
                    "thresholds. Claims that observed value ∈ [optimal_min, optimal_max] "
                    "are rejected as stress claims.",
        applies_to_claim_types=frozenset(["SPECIES_STRESSED", "THERMAL_TOLERANCE", "SPECIES_EXPOSURE"]),
        escalation_gate=3,
        is_hard_gate=True,
    ),
    "ECOLOGICAL_INFERENCE": GuardrailRule(
        rule_id="ECOLOGICAL_INFERENCE",
        name="Ecological Inference Escalation Gate",
        description="Biological interpretation claims (L3+) require validated physiological "
                    "relationship. High-stakes ecological conclusions (L4) are always rejected "
                    "unless longitudinal evidence is explicitly available.",
        applies_to_claim_types=frozenset(["INTERPRETATION", "HYPOTHESIS"]),
        escalation_gate=3,
        is_hard_gate=True,
    ),
    "STATISTICAL": GuardrailRule(
        rule_id="STATISTICAL",
        name="Statistical Validity",
        description="Aggregation claims (AVG, CORR, percentile) require minimum sample count. "
                    "Correlations must be reported with r and p-value context. "
                    "Min sample: n ≥ 30 for means, n ≥ 100 for correlations.",
        applies_to_claim_types=frozenset(["DERIVATION", "STATISTICAL"]),
        escalation_gate=1,
        is_hard_gate=False,
    ),
    "DERIVED_METRIC": GuardrailRule(
        rule_id="DERIVED_METRIC",
        name="Derived Metric Formula Traceability",
        description="Computed values (haversine distance, dT/dz, percentile thresholds) must "
                    "have their formula documented in the claim's evidence transformation field.",
        applies_to_claim_types=frozenset(["DERIVATION"]),
        escalation_gate=1,
        is_hard_gate=False,
    ),
    "CROSS_DOMAIN": GuardrailRule(
        rule_id="CROSS_DOMAIN",
        name="Cross-Domain Evidence Chain Completeness",
        description="Multi-source claims (SQL + BIO + RAG) must have all three evidence "
                    "links populated. No partial chains are allowed for CO_LOCATION claims.",
        applies_to_claim_types=frozenset(["CO_LOCATION", "SPECIES_STRESSED", "ECOSYSTEM_CAUSATION"]),
        escalation_gate=2,
        is_hard_gate=True,
    ),
    "PROVENANCE": GuardrailRule(
        rule_id="PROVENANCE",
        name="Numerical Provenance Trace",
        description="Every numerical value in a synthesized claim must trace back to a specific "
                    "EvidenceItem source ID. Values that appear in the synthesis without a "
                    "corresponding EvidenceItem are rejected.",
        applies_to_claim_types=frozenset(["OBSERVATION", "DERIVATION", "CO_LOCATION"]),
        escalation_gate=0,
        is_hard_gate=True,
    ),
    "UNCERTAINTY": GuardrailRule(
        rule_id="UNCERTAINTY",
        name="Uncertainty Labelling Enforcement",
        description="All INFERRED and HYPOTHESIS claims must include explicit confidence "
                    "annotation and hedged language. Claims at L2+ without uncertainty "
                    "language are rejected.",
        applies_to_claim_types=frozenset(["INTERPRETATION", "HYPOTHESIS", "CROSS_SOURCE_INFERENCE"]),
        escalation_gate=2,
        is_hard_gate=False,
    ),
}


# ── Physical Quantity Bounds (for NUMERIC guardrail) ─────────────────────────

PHYSICAL_QUANTITY_BOUNDS: Dict[str, Tuple[float, float]] = {
    "temp":               (-5.0,   35.0),    # °C
    "psal":               (0.0,    42.0),    # PSU
    "doxy":               (0.0,    600.0),   # µmol/kg
    "chla":               (0.0,    50.0),    # mg/m³
    "nitrate":            (0.0,    60.0),    # µmol/kg
    "ph_in_situ_total":   (7.4,    8.5),     # pH units
    "pres":               (0.0,    2200.0),  # dbar (~m)
    "distance_km":        (0.0,    20000.0), # km
    "correlation_r":      (-1.0,   1.0),     # Pearson r
    "confidence":         (0.0,    1.0),
}
