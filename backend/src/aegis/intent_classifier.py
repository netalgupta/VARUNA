"""
VARUNA AEGIS — Intent Classifier & Guardrail Selector
Classifies user question into intent + domain + guardrail set + claim policy.
Uses keyword heuristics first (zero LLM cost); falls back to LLM for complex compound questions.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional

log = logging.getLogger("varuna.aegis.intent")


@dataclass
class IntentClassification:
    intent: str
    domain: str
    modality: str
    guardrails: List[str]
    claim_policy: str
    escalation_ceiling: int   # Maximum L-level allowed without rejection
    flags: List[str] = field(default_factory=list)  # e.g. ["HIGH_RISK_CLAIM", "L4_FLAG"]


# ── Keyword rule tables ───────────────────────────────────────────────────────

# (pattern, intent, domain, modality, guardrails, claim_policy, escalation_ceiling, flags)
_KEYWORD_RULES = [
    # Physical — pure SQL aggregation
    (r"\b(mean|average|avg)\s+(sst|sea.?surface.?temperature|temp)", "sst_aggregation", "physical_oceanography",
     "SQL_ONLY",
     ["NUMERIC", "TEMPORAL", "PROVENANCE"],
     "DIRECT_OBSERVATION", 1, []),

    (r"\b(salinity|psal)\b.*\b(compar|contrast|difference|vs|versus)", "salinity_comparison", "physical_oceanography",
     "SQL_ONLY",
     ["NUMERIC", "STATISTICAL", "PROVENANCE"],
     "DIRECT_OBSERVATION", 1, []),

    (r"\b(thermocline|mixed.?layer|pycnocline)\b", "thermocline_analysis", "physical_oceanography",
     "DERIVED_ANALYTICS",
     ["NUMERIC", "DERIVED_METRIC", "PROVENANCE"],
     "DIRECT_OBSERVATION", 1, []),

    (r"\b(trajectory|speed|drift|displacement)\b.*\bfloat", "float_trajectory", "physical_oceanography",
     "DERIVED_ANALYTICS",
     ["NUMERIC", "DERIVED_METRIC", "PROVENANCE"],
     "DIRECT_OBSERVATION", 1, []),

    (r"\b(deepest|maximum.?depth|max.?pressure)\b", "max_depth_query", "physical_oceanography",
     "SQL_ONLY",
     ["NUMERIC", "PROVENANCE"],
     "DIRECT_OBSERVATION", 0, []),

    # BGC
    (r"\b(dissolved.?oxygen|doxy|hypox|subox|anox|omz|oxygen.?minimum)\b", "oxygen_analysis", "bgc_chemistry",
     "SQL_ONLY",
     ["NUMERIC", "STATISTICAL", "PROVENANCE"],
     "DIRECT_OBSERVATION", 1, []),

    (r"\b(chlorophyll|chla|nitrate|nutrient)\b.*\b(vs|versus|and|correlation)\b", "bgc_correlation", "bgc_chemistry",
     "SQL_ONLY",
     ["NUMERIC", "STATISTICAL", "DERIVED_METRIC", "PROVENANCE"],
     "DIRECT_OBSERVATION", 1, []),

    (r"\bph\b|\bacidity\b|\bocean.?acidification\b", "ph_analysis", "bgc_chemistry",
     "SQL_RAG_HYBRID",
     ["NUMERIC", "STATISTICAL", "UNCERTAINTY", "PROVENANCE"],
     "DIRECT_OBSERVATION", 2, []),

    (r"\b(marine.?heatwave|mhw|thermal.?anomaly|90th.?percentile)\b", "marine_heatwave", "physical_oceanography",
     "DERIVED_ANALYTICS",
     ["NUMERIC", "TEMPORAL", "DERIVED_METRIC", "STATISTICAL", "PROVENANCE"],
     "DIRECT_OBSERVATION", 2, []),

    # Biodiversity — simple taxonomy / occurrence
    (r"\b(most.?common|dominant|frequently|families|genera)\b.*\b(fish|marine|species|taxa)\b",
     "species_abundance_query", "marine_biodiversity",
     "SQL_ONLY",
     ["TAXONOMIC", "BIODIVERSITY_OCCURRENCE", "STATISTICAL", "NUMERIC", "PROVENANCE"],
     "DIRECT_OBSERVATION", 1, []),

    (r"\b(taxonom|classification|kingdom|phylum|class|order|family|genus)\b", "taxonomy_query", "marine_biodiversity",
     "SQL_ONLY",
     ["TAXONOMIC", "PROVENANCE"],
     "DIRECT_OBSERVATION", 0, []),

    (r"\b(depth.?range|bathymetric|minimum.?depth|maximum.?depth)\b.*\b(species|fish|cephalopod|crustacean)\b",
     "species_depth_query", "marine_biodiversity",
     "SQL_ONLY",
     ["TAXONOMIC", "BIODIVERSITY_OCCURRENCE", "NUMERIC", "PROVENANCE"],
     "DIRECT_OBSERVATION", 1, []),

    (r"\b(occurrence|record|observation)\b.*\b(sardinella|thunnus|acanthosepion|penaeus|panulirus|portunus)\b",
     "species_occurrence_query", "marine_biodiversity",
     "SQL_ONLY",
     ["TAXONOMIC", "BIODIVERSITY_OCCURRENCE", "TEMPORAL", "PROVENANCE"],
     "DIRECT_OBSERVATION", 1, []),

    # Cross-domain — exposure and vulnerability
    (r"\b(near|proximity|co.?locat|within)\b.*\b(hypox|oxygen|float|argo)\b", "species_proximity_hypoxia",
     "cross_domain_bio_fusion",
     "SQL_POSTGIS",
     ["TAXONOMIC", "BIODIVERSITY_OCCURRENCE", "SPATIAL", "TEMPORAL", "CROSS_DOMAIN", "PROVENANCE", "UNCERTAINTY"],
     "ACUTE_HYPOXIA_EXPOSURE", 2, []),

    (r"\b(vulnerab|stress|impact|affect|harm|assess)\b.*\b(species|fish|coral|prawn|tuna|monodon|penaeus|sardine)\b",
     "species_vulnerability", "cross_domain_bio_fusion",
     "SQL_RAG_HYBRID",
     ["TAXONOMIC", "BIODIVERSITY_OCCURRENCE", "PHYSIOLOGY", "ECOLOGICAL_INFERENCE", "PROVENANCE", "UNCERTAINTY"],
     "HISTORICAL_HABITAT", 3, []),

    (r"\b(penaeus|monodon|prawn|shrimp|lobster|crustacean)\b.*\b(salinit|stress|elevated|above)\b",
     "species_vulnerability", "cross_domain_bio_fusion",
     "SQL_RAG_HYBRID",
     ["TAXONOMIC", "BIODIVERSITY_OCCURRENCE", "PHYSIOLOGY", "ECOLOGICAL_INFERENCE", "PROVENANCE", "UNCERTAINTY"],
     "HISTORICAL_HABITAT", 3, []),

    (r"\b(coral|bleach)\b", "coral_bleaching", "cross_domain_bio_fusion",
     "SQL_POSTGIS",
     ["TAXONOMIC", "BIODIVERSITY_OCCURRENCE", "PHYSIOLOGY", "ECOLOGICAL_INFERENCE", "SPATIAL", "PROVENANCE", "UNCERTAINTY"],
     "ENVIRONMENTAL_EXPOSURE", 3, []),

    (r"\b(foraging.?depth|habitat.?compression|diving)\b.*\b(tuna|yellowfin|thunnus)\b",
     "foraging_depth_compression", "cross_domain_bio_fusion",
     "SQL_POSTGIS",
     ["TAXONOMIC", "PHYSIOLOGY", "ECOLOGICAL_INFERENCE", "DERIVED_METRIC", "PROVENANCE", "UNCERTAINTY"],
     "ENVIRONMENTAL_EXPOSURE", 3, []),

    # Spatial proximity
    (r"\b(nearest|closest|5.?float|proximity)\b.*\b(mumbai|kochi|chennai|city|port)\b",
     "spatial_proximity_query", "spatial_fleet",
     "SQL_POSTGIS",
     ["NUMERIC", "SPATIAL", "DERIVED_METRIC", "PROVENANCE"],
     "DIRECT_OBSERVATION", 1, []),

    # High-risk L4 flags
    (r"\b(declining|collapse|disappear|extinct|endangered|threatened|climate.?change.+caus)\b",
     "high_risk_ecological", "marine_biodiversity",
     "FULL_SYNTHESIS",
     ["TAXONOMIC", "ECOLOGICAL_INFERENCE", "CROSS_DOMAIN", "PROVENANCE", "UNCERTAINTY"],
     "CLIMATOLOGICAL_HABITAT", 4, ["HIGH_RISK_CLAIM", "L4_FLAG"]),

    (r"\b(ecosystem.?health|holistic|synthesis|overall)\b", "holistic_synthesis", "full_synthesis",
     "FULL_SYNTHESIS",
     ["TAXONOMIC", "NUMERIC", "STATISTICAL", "PROVENANCE", "UNCERTAINTY"],
     "CLIMATOLOGICAL_HABITAT", 3, []),

    # Multi-shard / fleet
    (r"\b(both.?shard|historical.+live|total.?profile|cross.?shard)\b", "multi_shard_query", "fleet",
     "MULTI_SHARD_UNION",
     ["NUMERIC", "STATISTICAL", "PROVENANCE"],
     "DIRECT_OBSERVATION", 1, []),
]


def classify_intent(question: str) -> IntentClassification:
    """
    Fast keyword-based intent + guardrail classification.
    Returns the first matching rule. Falls back to a generic 'unclassified' result
    rather than calling an LLM (keeps latency near-zero for evaluation loops).
    """
    q = question.lower().strip()

    for pattern, intent, domain, modality, guardrails, claim_policy, escalation_ceiling, flags in _KEYWORD_RULES:
        if re.search(pattern, q, re.IGNORECASE):
            log.debug("AEGIS intent matched pattern '%s' -> intent=%s, guardrails=%s", pattern, intent, guardrails)
            return IntentClassification(
                intent=intent,
                domain=domain,
                modality=modality,
                guardrails=guardrails,
                claim_policy=claim_policy,
                escalation_ceiling=escalation_ceiling,
                flags=flags,
            )

    # Generic fallback — minimal guardrails, no bio-specific rules
    log.info("AEGIS intent classifier: no specific pattern matched for '%s', using generic fallback.", question[:60])
    return IntentClassification(
        intent="general_oceanographic",
        domain="physical_oceanography",
        modality="SQL_ONLY",
        guardrails=["NUMERIC", "PROVENANCE"],
        claim_policy="DIRECT_OBSERVATION",
        escalation_ceiling=2,
        flags=[],
    )
