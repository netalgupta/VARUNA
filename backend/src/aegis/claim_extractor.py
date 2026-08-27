"""
VARUNA AEGIS — Claim Extractor
Parses upstream SQL rows + bio matches + RAG into a typed ClaimLedger of Claim objects.
Each Claim has: type, epistemic level, evidence references, numeric values, and species names.
"""
from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from src.aegis.evidence_ledger import EvidenceLedger, EvidenceItem, EvidenceType

log = logging.getLogger("varuna.aegis.extractor")


class ClaimType(str, Enum):
    OBSERVATION    = "OBSERVATION"     # L0 — direct DB row
    DERIVATION     = "DERIVATION"      # L1 — formula on DB rows
    COMPARISON     = "COMPARISON"      # L2 — cross-source
    INTERPRETATION = "INTERPRETATION"  # L3 — biological inference
    HYPOTHESIS     = "HYPOTHESIS"      # L4 — high-stakes ecological


@dataclass
class Claim:
    """A single verifiable scientific claim produced by the system."""
    claim_id: str
    text: str
    claim_type: ClaimType
    evidence_ids: List[str]                      # EvidenceItem.source references
    escalation_level: int                        # 0–4
    confidence: float                            # 1.0 for OBSERVED, < 1.0 for INFERRED
    numeric_values: List[Tuple[float, str]] = field(default_factory=list)  # (value, unit)
    species_names: List[str] = field(default_factory=list)
    spatial_ref: Optional[Tuple[float, float, float]] = None  # (lat, lon, dist_km)
    temporal_ref: Optional[datetime] = None
    approved: bool = True
    rejection_reason: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    epistemic_label: str = ""  # Set by AEGIS after approval: OBSERVED/DERIVED/INFERRED/BACKGROUND


@dataclass
class ClaimLedger:
    """All claims extracted from the current pipeline run."""
    claims: List[Claim] = field(default_factory=list)

    def approved(self) -> List[Claim]:
        return [c for c in self.claims if c.approved]

    def rejected(self) -> List[Claim]:
        return [c for c in self.claims if not c.approved]

    def by_type(self, ct: ClaimType) -> List[Claim]:
        return [c for c in self.claims if c.claim_type == ct]


# ── Numeric extraction helper ─────────────────────────────────────────────────

# Common units we expect to see in marine science outputs
_UNIT_PATTERNS = [
    (r"([-+]?\d+(?:\.\d+)?)\s*°?c\b",           "°C"),
    (r"([-+]?\d+(?:\.\d+)?)\s*psu\b",            "PSU"),
    (r"([-+]?\d+(?:\.\d+)?)\s*µmol/kg",          "µmol/kg"),
    (r"([-+]?\d+(?:\.\d+)?)\s*umol/kg",          "µmol/kg"),
    (r"([-+]?\d+(?:\.\d+)?)\s*mg/m[³3]",         "mg/m³"),
    (r"([-+]?\d+(?:\.\d+)?)\s*dbar\b",           "dbar"),
    (r"([-+]?\d+(?:\.\d+)?)\s*km\b",             "km"),
    (r"([-+]?\d+(?:\.\d+)?)\s*m\b",              "m"),
    (r"([-+]?\d+(?:\.\d+)?)\s*cm/s\b",           "cm/s"),
    (r"([-+]?\d+(?:\.\d+)?)\s*years?\b",         "years"),
    (r"([-+]?\d+(?:\.\d+)?)\s*days?\b",          "days"),
    (r"([-+]?\d+(?:\.\d+)?)\s*months?\b",        "months"),
    (r"([-+]?\d+(?:\.\d+)?)\s*cycles?\b",        "cycles"),
    (r"([-+]?\d+(?:\.\d+)?)\s*records?\b",       "records"),
    (r"([-+]?\d+(?:\.\d+)?)\s*occurrences?\b",   "occurrences"),
    (r"([-+]?\d+(?:\.\d+)?)\s*taxa\b",           "taxa"),
    (r"([-+]?\d+(?:\.\d+)?)\s*count\b",          "count"),
]

_SPECIES_RE = re.compile(
    r"\b([A-Z][a-z]+\s+[a-z]+(?:\s+[a-z]+)?)\b"  # Binomial or trinomial name
)

_FLOAT_ID_RE = re.compile(r"(?:float|wmo|platform)[:\s#]*(\d{5,10})", re.IGNORECASE)


def _extract_numerics(text: str) -> List[Tuple[float, str]]:
    results = []
    for pattern, unit in _UNIT_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            try:
                results.append((float(m.group(1)), unit))
            except ValueError:
                pass
    return results


def _extract_species(text: str) -> List[str]:
    return list(set(m.group(1) for m in _SPECIES_RE.finditer(text)))


def build_claims_from_ledger(
    ledger: EvidenceLedger,
    question: str,
) -> ClaimLedger:
    """
    Auto-constructs a ClaimLedger from the evidence ledger.
    Produces one Claim per distinct evidence category, ready for firewall verification.
    """
    claim_ledger = ClaimLedger()
    cid = 0

    def next_id() -> str:
        nonlocal cid
        cid += 1
        return f"claim_{cid:04d}"

    # ── L0: Direct observation claims from SQL rows ───────────────────────────
    for i, row in enumerate(ledger.sql_rows[:10]):  # Cap at 10 representative rows
        platform = row.get("platform_number")
        pres = row.get("pres")
        temp = row.get("temp")
        psal = row.get("psal")
        doxy = row.get("doxy")

        if platform is None:
            continue

        numerics = []
        text_parts = [f"Float WMO {platform}"]
        if pres is not None:
            text_parts.append(f"at {pres:.1f} dbar")
            numerics.append((float(pres), "dbar"))
        if temp is not None:
            text_parts.append(f"recorded temperature {temp:.2f} °C")
            numerics.append((float(temp), "°C"))
        if psal is not None:
            text_parts.append(f"salinity {psal:.2f} PSU")
            numerics.append((float(psal), "PSU"))
        if doxy is not None:
            text_parts.append(f"dissolved oxygen {doxy:.1f} µmol/kg")
            numerics.append((float(doxy), "µmol/kg"))

        ev_ids = [item.source for item in ledger.items
                  if item.platform_number == platform and item.table == "marine_data"][:5]

        claim_ledger.claims.append(Claim(
            claim_id=next_id(),
            text=" ".join(text_parts) + ".",
            claim_type=ClaimType.OBSERVATION,
            evidence_ids=ev_ids,
            escalation_level=0,
            confidence=1.0,
            numeric_values=numerics,
            temporal_ref=row.get("time"),
            spatial_ref=(row.get("latitude"), row.get("longitude"), 0.0) if row.get("latitude") else None,
            epistemic_label="OBSERVED",
        ))

    # ── L0: Biodiversity occurrence claims ────────────────────────────────────
    for bio in ledger.bio_matches[:5]:
        sci_name = bio.get("scientific_name", "Unknown")
        family = bio.get("family", "")
        depth_min = bio.get("minimum_depth_m")
        depth_max = bio.get("maximum_depth_m")
        ev_ids = [item.source for item in ledger.items if item.scientific_name == sci_name][:3]

        numerics = []
        text_parts = [f"{sci_name} ({family}) occurrence recorded"]
        if depth_min is not None and depth_max is not None:
            text_parts.append(f"at depths {depth_min:.0f}–{depth_max:.0f} m")
            numerics.extend([(float(depth_min), "m"), (float(depth_max), "m")])

        claim_ledger.claims.append(Claim(
            claim_id=next_id(),
            text=" ".join(text_parts) + ".",
            claim_type=ClaimType.OBSERVATION,
            evidence_ids=ev_ids,
            escalation_level=0,
            confidence=1.0,
            numeric_values=numerics,
            species_names=[sci_name],
            temporal_ref=bio.get("event_date"),
            spatial_ref=(bio.get("decimal_latitude"), bio.get("decimal_longitude"), 0.0)
                        if bio.get("decimal_latitude") else None,
            epistemic_label="OBSERVED",
        ))

    # ── L2: Cross-source inference claims from species profiles ───────────────
    for prof in ledger.species_profiles[:3]:
        sci_name = prof.get("scientific_name", "Unknown")
        temp_min = prof.get("temp_pref_min_c")
        temp_max = prof.get("temp_pref_max_c")
        sal_min  = prof.get("salinity_min_psu")
        sal_max  = prof.get("salinity_max_psu")
        do_thresh = prof.get("hypoxia_avoidance_threshold_umol_kg")

        numerics = []
        text_parts = [f"{sci_name} physiological envelope:"]
        if temp_min is not None and temp_max is not None:
            text_parts.append(f"thermal preference {temp_min}–{temp_max} °C")
            numerics.extend([(float(temp_min), "°C"), (float(temp_max), "°C")])
        if sal_min is not None and sal_max is not None:
            text_parts.append(f"salinity preference {sal_min}–{sal_max} PSU")
            numerics.extend([(float(sal_min), "PSU"), (float(sal_max), "PSU")])
        if do_thresh is not None:
            text_parts.append(f"hypoxia avoidance threshold {do_thresh} µmol/kg")
            numerics.append((float(do_thresh), "µmol/kg"))

        ev_ids = [f"species_profile:{sci_name}"]

        claim_ledger.claims.append(Claim(
            claim_id=next_id(),
            text=" ".join(text_parts) + ".",
            claim_type=ClaimType.COMPARISON,
            evidence_ids=ev_ids,
            escalation_level=2,
            confidence=0.95,
            numeric_values=numerics,
            species_names=[sci_name],
            epistemic_label="BACKGROUND",
        ))

    # ── L1: Derived statistical claims from RAG texts ─────────────────────────
    for j, rag in enumerate(ledger.rag_texts[:2]):
        numerics = _extract_numerics(rag)
        species = _extract_species(rag)
        if not numerics and not species:
            continue
        claim_ledger.claims.append(Claim(
            claim_id=next_id(),
            text=rag[:200].strip(),
            claim_type=ClaimType.DERIVATION,
            evidence_ids=[f"rag:chunk_{j}"],
            escalation_level=1,
            confidence=0.80,
            numeric_values=numerics[:5],
            species_names=species[:3],
            epistemic_label="BACKGROUND",
        ))

    log.debug("AEGIS claim extractor produced %d claims from ledger.", len(claim_ledger.claims))
    return claim_ledger
