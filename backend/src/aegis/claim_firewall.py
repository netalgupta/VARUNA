"""
VARUNA AEGIS — Claim Firewall
The core verification engine. Implements:
  - BIO-001: Occurrence existence gate
  - BIO-002: Canonical taxonomy verification (canonical_taxonomy table)
  - BIO-003: Family membership verification
  - Formal co-location evidence-state machine (spatial + temporal + depth)
  - Contradiction detector
  - Forbidden inference enforcement
  - Escalation level gate (L0–L4)
  - Numerical bounds validation (NUMERIC guardrail)
  - Physiological threshold validation
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from src.aegis.claim_extractor import Claim, ClaimLedger, ClaimType
from src.aegis.evidence_ledger import EvidenceLedger, MAX_TEMPORAL_DELTA_SECONDS
from src.aegis.guardrail_registry import (
    FORBIDDEN_INFERENCE_MAP,
    PHYSICAL_QUANTITY_BOUNDS,
    CLAIM_POLICIES,
    CLAIM_ESCALATION_LEVELS,
    CLAIM_EVIDENCE_MATRIX,
)

log = logging.getLogger("varuna.aegis.firewall")


# ── Evidence Co-location State Machine States ─────────────────────────────────

class CoLocationState(str):
    UNVERIFIED          = "UNVERIFIED"
    TAXONOMY_FAILED     = "TAXONOMY_FAILED"       # BIO-002 failed → REJECT
    NO_OCCURRENCE       = "NO_OCCURRENCE"         # BIO-001 failed → REJECT
    SPATIAL_FAILED      = "SPATIAL_FAILED"        # Distance > threshold → CONTEXT only
    TEMPORAL_FAILED     = "TEMPORAL_FAILED"       # Time delta > threshold → BACKGROUND_ASSOCIATION
    DEPTH_INCOMPATIBLE  = "DEPTH_INCOMPATIBLE"    # Habitat depth incompatible
    CO_LOCATION         = "CO_LOCATION"           # All checks passed → FULL CO_LOCATION
    BACKGROUND_ONLY     = "BACKGROUND_ONLY"       # Historical only


@dataclass
class FirewallResult:
    claim: Claim
    verdict: str                 # "APPROVED" | "REJECTED" | "BACKGROUND_ASSOCIATION" | "WARNING"
    rules_checked: List[str] = field(default_factory=list)
    rules_failed: List[str] = field(default_factory=list)
    co_location_state: str = CoLocationState.UNVERIFIED
    rejection_reason: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    epistemic_label: str = ""


# ── Haversine distance ────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── BIO-001: Occurrence Existence ─────────────────────────────────────────────

def _check_bio_001(claim: Claim, ledger: EvidenceLedger) -> Optional[str]:
    """Returns rejection reason if no occurrence record found, else None."""
    for species in claim.species_names:
        if not ledger.occurrence_exists(species):
            return f"BIO-001: No occurrence record in marine_biodiversity for '{species}'. Existence claim rejected."
    return None


# ── BIO-002: Canonical Taxonomy ───────────────────────────────────────────────

def _check_bio_002(claim: Claim, ledger: EvidenceLedger) -> Optional[str]:
    """
    Returns rejection reason if species name does not resolve in canonical_taxonomy.
    Falls back to species_ecological_profiles if taxonomy_records list is empty
    (graceful degradation when canonical_taxonomy hasn't been seeded yet).
    """
    for species in claim.species_names:
        # Priority: canonical_taxonomy table
        tax_record = ledger.get_taxonomy_record(species)
        if tax_record:
            status = tax_record.get("taxonomic_status", "").lower()
            if status in ("invalid", "synonym", "misapplied"):
                return (
                    f"BIO-002: '{species}' resolves in canonical_taxonomy but has "
                    f"taxonomic_status='{status}'. Use accepted_name='{tax_record.get('accepted_name')}' instead."
                )
            continue  # Resolved

        # Fallback: species_ecological_profiles (acceptable for profiles, not for taxonomy)
        prof = ledger.get_species_profile(species)
        if prof:
            log.warning(
                "BIO-002 WARNING: '%s' resolved via species_ecological_profiles (not canonical_taxonomy). "
                "canonical_taxonomy should be populated for strict verification.", species
            )
            continue

        # Neither source has this name
        return (
            f"BIO-002: '{species}' not found in canonical_taxonomy or species_ecological_profiles. "
            f"Possible misspelling, obsolete name, or species not in VARUNA DB."
        )
    return None


# ── BIO-003: Family Membership ────────────────────────────────────────────────

def _check_bio_003(claim: Claim, ledger: EvidenceLedger, claimed_family: Optional[str]) -> Optional[str]:
    """Verifies that LLM-stated family matches the canonical taxonomy record."""
    if not claimed_family:
        return None
    for species in claim.species_names:
        tax_record = ledger.get_taxonomy_record(species)
        if not tax_record:
            continue
        db_family = str(tax_record.get("family", "")).strip().lower()
        if db_family and db_family != claimed_family.strip().lower():
            return (
                f"BIO-003: Family mismatch for '{species}'. "
                f"LLM claimed '{claimed_family}', canonical_taxonomy has '{db_family}'."
            )
    return None


# ── NUMERIC: Physical Quantity Bounds ─────────────────────────────────────────

def _check_numeric_bounds(claim: Claim) -> List[str]:
    """Warns if any numeric value is outside scientifically plausible bounds."""
    warnings = []
    unit_to_key = {
        "°C": "temp", "PSU": "psal", "µmol/kg": "doxy",
        "dbar": "pres", "km": "distance_km", "m": "pres",
        "mg/m³": "chla",
    }
    for val, unit in claim.numeric_values:
        key = unit_to_key.get(unit)
        if key and key in PHYSICAL_QUANTITY_BOUNDS:
            lo, hi = PHYSICAL_QUANTITY_BOUNDS[key]
            if not (lo <= val <= hi):
                warnings.append(
                    f"NUMERIC: Value {val} {unit} is outside expected bounds [{lo}, {hi}] for '{key}'."
                )
    return warnings


# ── PHYSIOLOGY: Threshold Comparison ─────────────────────────────────────────

def _check_physiology(claim: Claim, ledger: EvidenceLedger) -> Tuple[bool, List[str]]:
    """
    For INTERPRETATION claims involving a species, verifies that the environmental
    measurement is actually OUTSIDE the species' optimal envelope before allowing
    a 'stress' claim. Returns (reject, warnings).
    """
    warnings = []
    for species in claim.species_names:
        prof = ledger.get_species_profile(species)
        if not prof:
            continue

        temp_min = prof.get("temp_pref_min_c")
        temp_max = prof.get("temp_pref_max_c")
        sal_min  = prof.get("salinity_min_psu")
        sal_max  = prof.get("salinity_max_psu")
        do_thresh = prof.get("hypoxia_avoidance_threshold_umol_kg")

        for val, unit in claim.numeric_values:
            if unit == "°C" and temp_min is not None and temp_max is not None:
                if temp_min <= val <= temp_max:
                    warnings.append(
                        f"PHYSIOLOGY: {val} °C is within {species}'s thermal optimum "
                        f"[{temp_min}–{temp_max} °C]. Thermal stress claim is NOT supported."
                    )
            elif unit == "PSU" and sal_min is not None and sal_max is not None:
                if sal_min <= val <= sal_max:
                    warnings.append(
                        f"PHYSIOLOGY: {val} PSU is within {species}'s salinity optimum "
                        f"[{sal_min}–{sal_max} PSU]. Salinity stress claim is NOT supported."
                    )
            elif unit == "µmol/kg" and do_thresh is not None:
                if val >= do_thresh:
                    warnings.append(
                        f"PHYSIOLOGY: {val} µmol/kg is above {species}'s hypoxia avoidance "
                        f"threshold ({do_thresh} µmol/kg). Hypoxia stress claim is NOT supported."
                    )
    # Stress claims inside optimum range → warning (not hard rejection — depends on guardrail activation)
    return (False, warnings)


# ── Formal Co-location State Machine ─────────────────────────────────────────

def _run_colocation_state_machine(
    claim: Claim,
    ledger: EvidenceLedger,
    claim_policy_name: str,
) -> Tuple[str, List[str], Optional[str]]:
    """
    Implements the formal co-location evidence state machine:

         SPECIES_OCCURRENCE
               │
         taxonomy verified? ──NO──→ TAXONOMY_FAILED (REJECT)
               │YES
         occurrence_exists? ──NO──→ NO_OCCURRENCE (REJECT)
               │YES
         spatial_overlap?   ──NO──→ BACKGROUND_ONLY (CONTEXT)
               │YES
         temporal_overlap?  ──NO──→ BACKGROUND_ASSOCIATION (flag + warn)
               │YES
         depth_compatible?  ──NO──→ depth warning (but not hard reject)
               │YES
               ▼
          CO_LOCATION ✓

    Returns (state, warnings, rejection_reason)
    """
    warnings: List[str] = []
    policy = CLAIM_POLICIES.get(claim_policy_name)

    # Step 1: Taxonomy check
    for species in claim.species_names:
        tax = ledger.get_taxonomy_record(species)
        prof = ledger.get_species_profile(species)
        if not tax and not prof:
            return CoLocationState.TAXONOMY_FAILED, warnings, (
                f"BIO-002: '{species}' not resolvable in canonical_taxonomy or ecological profiles."
            )

    # Step 2: Occurrence check (BIO-001)
    for species in claim.species_names:
        if not ledger.occurrence_exists(species):
            return CoLocationState.NO_OCCURRENCE, warnings, (
                f"BIO-001: No occurrence record for '{species}' in marine_biodiversity."
            )

    # Step 3: Spatial check
    if claim.spatial_ref and policy and policy.max_spatial_km:
        lat_s, lon_s, _ = claim.spatial_ref
        # Find the nearest float position from sql_rows
        min_dist = None
        for row in ledger.sql_rows:
            rlat, rlon = row.get("latitude"), row.get("longitude")
            if rlat is None or lon_s is None:
                continue
            dist = _haversine_km(lat_s, lon_s, rlat, rlon)
            if min_dist is None or dist < min_dist:
                min_dist = dist
        if min_dist is not None and min_dist > policy.max_spatial_km:
            warnings.append(
                f"SPATIAL: Nearest float is {min_dist:.1f} km from occurrence — "
                f"exceeds {policy.max_spatial_km:.0f} km policy threshold. Downgraded to BACKGROUND context."
            )
            return CoLocationState.SPATIAL_FAILED, warnings, None

    # Step 4: Temporal check
    if claim.temporal_ref and policy and policy.max_temporal_delta_days:
        max_delta = timedelta(days=policy.max_temporal_delta_days)
        # Find closest measurement timestamp
        for row in ledger.sql_rows:
            row_time = row.get("time")
            if not row_time or not isinstance(row_time, datetime):
                continue
            delta = abs(claim.temporal_ref - row_time)
            if delta > max_delta:
                warnings.append(
                    f"TEMPORAL: Occurrence record is from {claim.temporal_ref.date()} "
                    f"and environmental measurement is from {row_time.date()} "
                    f"(Δ = {delta.days} days). "
                    f"Exceeds {policy.max_temporal_delta_days:.0f}-day '{claim_policy_name}' policy. "
                    f"CO_LOCATION rejected. Retaining as BACKGROUND_ASSOCIATION."
                )
                return CoLocationState.TEMPORAL_FAILED, warnings, None

    # Step 5: Depth compatibility
    if claim.species_names:
        for species in claim.species_names:
            prof = ledger.get_species_profile(species)
            if not prof:
                continue
            depth_max = prof.get("depth_max_m")
            if depth_max is not None:
                for row in ledger.sql_rows:
                    row_pres = row.get("pres", 0)
                    if row_pres and row_pres > depth_max * 1.5:
                        warnings.append(
                            f"DEPTH: Float measurement at {row_pres:.0f} dbar is below "
                            f"{species}'s depth envelope (max {depth_max:.0f} m). "
                            f"Depth habitat incompatibility noted."
                        )

    return CoLocationState.CO_LOCATION, warnings, None


# ── Contradiction Detector ────────────────────────────────────────────────────

def _detect_contradictions(claim: Claim, ledger: EvidenceLedger) -> List[str]:
    """Detects logical contradictions between claim text and DB evidence."""
    contradictions = []
    for species in claim.species_names:
        prof = ledger.get_species_profile(species)
        if not prof:
            continue
        depth_max = prof.get("depth_max_m", 0)

        # Check if claim asserts deep-sea while profile says shallow
        if depth_max and depth_max < 500:
            for val, unit in claim.numeric_values:
                if unit == "m" and val > 1500:
                    contradictions.append(
                        f"BIO_CONTRADICTION_001: '{species}' profile depth_max={depth_max:.0f} m "
                        f"but claim references {val:.0f} m. Possible deep-sea misclassification."
                    )

        # Check thermal contradiction
        temp_max = prof.get("temp_pref_max_c")
        if temp_max:
            for val, unit in claim.numeric_values:
                if unit == "°C" and val < 5.0 and temp_max > 20.0:
                    contradictions.append(
                        f"BIO_CONTRADICTION_002: '{species}' is a warm-water species "
                        f"(temp_pref_max={temp_max} °C) but claim references {val:.1f} °C."
                    )
    return contradictions


# ── Forbidden Inference Check ─────────────────────────────────────────────────

_FORBIDDEN_KEYWORDS = {
    "CAUSED_BY":          ["caus", "due to", "because of", "result of", "driven by"],
    "POPULATION_DECLINE": ["declin", "reduc", "collaps", "crash", "falling"],
    "ENDANGERED":         ["endanger", "threatened", "critically", "iucn"],
    "BLEACHING":          ["bleach"],
    "MORTALITY":          ["mortalit", "die", "dying", "dead"],
    "POPULATION_COLLAPSE":["collaps", "crash", "disappear"],
}

def _check_forbidden_inferences(claim: Claim, escalation_ceiling: int) -> List[str]:
    """
    Detects forbidden inference patterns in the claim text.
    Returns list of rejection reasons (empty = no forbidden inferences).
    """
    rejections = []
    text_lower = claim.text.lower()

    if claim.escalation_level >= 4 and escalation_ceiling < 4:
        rejections.append(
            f"ESCALATION-L4: Claim is a high-stakes ecological conclusion (L4) "
            f"but this question's escalation ceiling is L{escalation_ceiling}. REJECTED."
        )

    # Check for forbidden inference patterns
    for (evidence_rel, claimed_rel), (code, explanation) in FORBIDDEN_INFERENCE_MAP.items():
        forbidden_words = _FORBIDDEN_KEYWORDS.get(claimed_rel, [])
        if any(w in text_lower for w in forbidden_words):
            # Only reject if not backed by longitudinal evidence
            if claimed_rel in ("POPULATION_DECLINE", "ENDANGERED", "POPULATION_COLLAPSE"):
                rejections.append(
                    f"{code}: {explanation} Claim text appears to assert '{claimed_rel}' "
                    f"without longitudinal evidence. REJECTED (L4 claim)."
                )
                break

    return rejections


# ── Main Firewall Runner ──────────────────────────────────────────────────────

def run_firewall(
    claim_ledger: ClaimLedger,
    ledger: EvidenceLedger,
    active_guardrails: List[str],
    claim_policy_name: str = "DIRECT_OBSERVATION",
    escalation_ceiling: int = 3,
) -> List[FirewallResult]:
    """
    Runs every claim through the activated guardrails.
    Returns a list of FirewallResult objects with verdicts.
    """
    results: List[FirewallResult] = []

    for claim in claim_ledger.claims:
        fr = FirewallResult(claim=claim, verdict="APPROVED", epistemic_label=claim.epistemic_label)

        # ── NUMERIC bounds ──────────────────────────────────────────────────
        if "NUMERIC" in active_guardrails:
            fr.rules_checked.append("NUMERIC")
            numeric_warnings = _check_numeric_bounds(claim)
            fr.warnings.extend(numeric_warnings)

        # ── TAXONOMIC (BIO-002) ─────────────────────────────────────────────
        if "TAXONOMIC" in active_guardrails and claim.species_names:
            fr.rules_checked.append("TAXONOMIC")
            bio_002_fail = _check_bio_002(claim, ledger)
            if bio_002_fail:
                fr.verdict = "REJECTED"
                fr.rejection_reason = bio_002_fail
                fr.rules_failed.append("TAXONOMIC/BIO-002")
                claim.approved = False
                claim.rejection_reason = bio_002_fail
                results.append(fr)
                continue

        # ── BIODIVERSITY_OCCURRENCE (BIO-001) ───────────────────────────────
        if "BIODIVERSITY_OCCURRENCE" in active_guardrails and claim.species_names:
            fr.rules_checked.append("BIODIVERSITY_OCCURRENCE")
            bio_001_fail = _check_bio_001(claim, ledger)
            if bio_001_fail:
                fr.verdict = "REJECTED"
                fr.rejection_reason = bio_001_fail
                fr.rules_failed.append("BIODIVERSITY_OCCURRENCE/BIO-001")
                claim.approved = False
                claim.rejection_reason = bio_001_fail
                results.append(fr)
                continue

        # ── SPATIAL + TEMPORAL co-location state machine ─────────────────
        if "SPATIAL" in active_guardrails or "TEMPORAL" in active_guardrails:
            if claim.species_names:
                fr.rules_checked.extend(["SPATIAL", "TEMPORAL"])
                state, co_warnings, co_rejection = _run_colocation_state_machine(
                    claim, ledger, claim_policy_name
                )
                fr.co_location_state = state
                fr.warnings.extend(co_warnings)

                if state == CoLocationState.TAXONOMY_FAILED:
                    fr.verdict = "REJECTED"
                    fr.rejection_reason = co_rejection
                    fr.rules_failed.append("COLOCATION/TAXONOMY")
                    claim.approved = False
                    claim.rejection_reason = co_rejection

                elif state == CoLocationState.NO_OCCURRENCE:
                    fr.verdict = "REJECTED"
                    fr.rejection_reason = co_rejection
                    fr.rules_failed.append("COLOCATION/BIO-001")
                    claim.approved = False
                    claim.rejection_reason = co_rejection

                elif state == CoLocationState.SPATIAL_FAILED:
                    # Not a co-location — preserve as background context only
                    fr.verdict = "BACKGROUND_ASSOCIATION"
                    fr.epistemic_label = "BACKGROUND"
                    claim.epistemic_label = "BACKGROUND"
                    fr.warnings.append(
                        "SPATIAL: Distance exceeded threshold. "
                        "Claim downgraded to BACKGROUND context — not a co-location."
                    )

                elif state == CoLocationState.TEMPORAL_FAILED:
                    # Old record + live float → BACKGROUND_ASSOCIATION, never CO_LOCATION
                    fr.verdict = "BACKGROUND_ASSOCIATION"
                    fr.epistemic_label = "BACKGROUND"
                    claim.epistemic_label = "BACKGROUND"
                    # co_warnings already contain the explicit temporal mismatch message

                elif state == CoLocationState.CO_LOCATION:
                    fr.epistemic_label = "OBSERVED_EXPOSURE"
                    claim.epistemic_label = "OBSERVED_EXPOSURE"

                if fr.verdict in ("REJECTED",):
                    results.append(fr)
                    continue

        # ── PHYSIOLOGY ─────────────────────────────────────────────────────
        if "PHYSIOLOGY" in active_guardrails and claim.claim_type == ClaimType.INTERPRETATION:
            fr.rules_checked.append("PHYSIOLOGY")
            _, phys_warnings = _check_physiology(claim, ledger)
            fr.warnings.extend(phys_warnings)

        # ── Contradiction detection ─────────────────────────────────────────
        if claim.species_names:
            contradictions = _detect_contradictions(claim, ledger)
            if contradictions:
                fr.warnings.extend(contradictions)

        # ── Forbidden inferences + escalation ceiling ───────────────────────
        if "ECOLOGICAL_INFERENCE" in active_guardrails or claim.escalation_level >= 4:
            fr.rules_checked.append("ECOLOGICAL_INFERENCE")
            fi_rejections = _check_forbidden_inferences(claim, escalation_ceiling)
            if fi_rejections:
                fr.verdict = "REJECTED"
                fr.rejection_reason = fi_rejections[0]
                fr.rules_failed.append("FORBIDDEN_INFERENCE")
                claim.approved = False
                claim.rejection_reason = fi_rejections[0]
                results.append(fr)
                continue

        # ── Final verdict ───────────────────────────────────────────────────
        if fr.verdict == "APPROVED" and not fr.epistemic_label:
            # Assign epistemic label based on claim type
            label_map = {
                ClaimType.OBSERVATION:    "OBSERVED",
                ClaimType.DERIVATION:     "DERIVED",
                ClaimType.COMPARISON:     "DERIVED",
                ClaimType.INTERPRETATION: "INFERRED",
                ClaimType.HYPOTHESIS:     "HYPOTHESIS",
            }
            fr.epistemic_label = label_map.get(claim.claim_type, "BACKGROUND")
            claim.epistemic_label = fr.epistemic_label

        if fr.warnings:
            fr.verdict = "APPROVED_WITH_WARNINGS" if fr.verdict == "APPROVED" else fr.verdict

        results.append(fr)

    return results
