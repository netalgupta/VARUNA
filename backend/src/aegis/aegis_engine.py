"""
VARUNA AEGIS — Top-Level Engine
run_aegis() is the single entry point called by the orchestrator.
It builds the evidence ledger, classifies intent, extracts claims,
runs the firewall, and returns an AegisResult.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from src.aegis.evidence_ledger import EvidenceLedger, EvidenceType
from src.aegis.intent_classifier import IntentClassification, classify_intent
from src.aegis.claim_extractor import Claim, ClaimLedger, ClaimType, build_claims_from_ledger
from src.aegis.claim_firewall import FirewallResult, run_firewall

log = logging.getLogger("varuna.aegis.engine")


@dataclass
class AegisResult:
    approved_claims: List[Claim] = field(default_factory=list)
    rejected_claims: List[Claim] = field(default_factory=list)
    background_claims: List[Claim] = field(default_factory=list)
    firewall_results: List[FirewallResult] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    intent: Optional[IntentClassification] = None
    guardrails_activated: List[str] = field(default_factory=list)
    epistemic_summary: Dict[str, int] = field(default_factory=dict)
    flags: List[str] = field(default_factory=list)

    def summary_line(self) -> str:
        return (
            f"AEGIS: {len(self.approved_claims)} approved, "
            f"{len(self.rejected_claims)} rejected, "
            f"{len(self.background_claims)} background, "
            f"{len(self.warnings)} warnings | "
            f"Guardrails: {', '.join(self.guardrails_activated)}"
        )

    def epistemic_report(self) -> str:
        lines = ["### 🛡️ AEGIS Epistemic Provenance Report"]
        for label, count in sorted(self.epistemic_summary.items()):
            lines.append(f"- **{label}**: {count} claim(s)")
        if self.rejected_claims:
            lines.append(f"\n**⛔ Rejected Claims ({len(self.rejected_claims)}):**")
            for c in self.rejected_claims:
                lines.append(f"  - `{c.claim_id}`: {c.rejection_reason}")
        if self.warnings:
            lines.append(f"\n**⚠️ Warnings ({len(self.warnings)}):**")
            for w in self.warnings[:10]:
                lines.append(f"  - {w}")
        return "\n".join(lines)


async def run_aegis(
    question: str,
    sql_rows: List[Dict[str, Any]],
    bio_matches: List[Dict[str, Any]],
    species_profiles: List[Dict[str, Any]],
    taxonomy_records: List[Dict[str, Any]],
    rag_texts: List[str],
) -> AegisResult:
    """
    Main AEGIS entry point — called by the orchestrator after all evidence is gathered.

    Pipeline:
      1. Build EvidenceLedger from all upstream results
      2. Classify intent + select guardrails
      3. Auto-extract typed Claims from evidence
      4. Run Claim Firewall
      5. Return AegisResult with approved/rejected/background claims
    """
    # 1. Build evidence ledger
    ledger = EvidenceLedger(
        sql_rows=sql_rows,
        bio_matches=bio_matches,
        species_profiles=species_profiles,
        taxonomy_records=taxonomy_records,
        rag_texts=rag_texts,
    )
    ledger.build_from_sql_rows(sql_rows)
    ledger.build_from_bio_rows(bio_matches)

    # 2. Classify intent
    intent = classify_intent(question)
    log.info(
        "AEGIS intent: %s | domain: %s | guardrails: %s | escalation_ceiling: %d | flags: %s",
        intent.intent, intent.domain, intent.guardrails,
        intent.escalation_ceiling, intent.flags,
    )

    # 3. Extract claims from evidence ledger
    claim_ledger = build_claims_from_ledger(ledger, question)
    log.info("AEGIS claim extractor produced %d claims.", len(claim_ledger.claims))

    # 4. Run firewall
    firewall_results = run_firewall(
        claim_ledger=claim_ledger,
        ledger=ledger,
        active_guardrails=intent.guardrails,
        claim_policy_name=intent.claim_policy,
        escalation_ceiling=intent.escalation_ceiling,
    )

    # 5. Collect results
    approved: List[Claim] = []
    rejected: List[Claim] = []
    background: List[Claim] = []
    all_warnings: List[str] = []
    epistemic_counts: Dict[str, int] = {}

    for fr in firewall_results:
        all_warnings.extend(fr.warnings)
        label = fr.epistemic_label or "UNKNOWN"
        epistemic_counts[label] = epistemic_counts.get(label, 0) + 1

        if fr.verdict in ("APPROVED", "APPROVED_WITH_WARNINGS"):
            approved.append(fr.claim)
        elif fr.verdict == "BACKGROUND_ASSOCIATION":
            background.append(fr.claim)
        else:
            rejected.append(fr.claim)

    result = AegisResult(
        approved_claims=approved,
        rejected_claims=rejected,
        background_claims=background,
        firewall_results=firewall_results,
        warnings=all_warnings,
        intent=intent,
        guardrails_activated=intent.guardrails,
        epistemic_summary=epistemic_counts,
        flags=intent.flags,
    )

    log.info(result.summary_line())
    return result


def build_evidence_context_for_synthesizer(result: AegisResult) -> Dict[str, Any]:
    """
    Produces a structured context dict that the synthesizer can use
    instead of raw SQL rows — only approved claims, with epistemic labels.
    """
    context = {
        "approved_claims": [],
        "background_claims": [],
        "rejected_count": len(result.rejected_claims),
        "warnings": result.warnings[:10],
        "epistemic_summary": result.epistemic_summary,
        "guardrails_activated": result.guardrails_activated,
        "flags": result.flags,
    }

    for claim in result.approved_claims:
        context["approved_claims"].append({
            "text": claim.text,
            "epistemic_label": claim.epistemic_label,
            "claim_type": claim.claim_type.value,
            "escalation_level": claim.escalation_level,
            "confidence": claim.confidence,
            "numeric_values": [(v, u) for v, u in claim.numeric_values],
            "species_names": claim.species_names,
            "evidence_ids": claim.evidence_ids,
            "warnings": claim.warnings,
        })

    for claim in result.background_claims:
        context["background_claims"].append({
            "text": claim.text,
            "epistemic_label": "BACKGROUND",
            "warning": (
                "Temporal or spatial mismatch detected — "
                "this is historical context, NOT a verified co-location or exposure claim."
            ),
        })

    return context
