"""
VARUNA AEGIS — Evidence Ledger
Typed evidence store: OBSERVED | DERIVED | INFERRED | BACKGROUND | HYPOTHESIS
Every claim in the system must trace to at least one EvidenceItem.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

log = logging.getLogger("varuna.aegis.ledger")


class EvidenceType(str, Enum):
    OBSERVED   = "OBSERVED"     # Direct DB measurement — one row, confidence=1.0
    DERIVED    = "DERIVED"      # Computed from DB rows (aggregation, formula)
    INFERRED   = "INFERRED"     # Cross-source interpretation (exposure + profile)
    BACKGROUND = "BACKGROUND"   # RAG / knowledge-base / literature context
    HYPOTHESIS = "HYPOTHESIS"   # Speculative / model-based — confidence < 0.5


# Maximum temporal delta allowed per claim class (seconds)
MAX_TEMPORAL_DELTA_SECONDS: Dict[str, float] = {
    "OBSERVED_EXPOSURE":        86_400,         # 24 hours  — same measurement campaign
    "CO_LOCATION":              86_400 * 30,    # 30 days   — same seasonal window
    "BACKGROUND_ASSOCIATION":   86_400 * 365 * 5,  # 5 years — regional history
    "CLIMATOLOGY":              86_400 * 365 * 40, # 40 years — long-term baseline
    "DEFAULT":                  86_400 * 365,   # 1 year    — generic fallback
}


@dataclass
class EvidenceItem:
    """A single, uniquely identified piece of evidence from the database or RAG."""
    source: str                          # e.g. "marine_data:7902190:cycle54" or "rag:chunk_012"
    evidence_type: EvidenceType
    table: str                           # PostgreSQL table or "rag" / "taxonomy"
    column: str                          # Column or field name
    value: Any                           # Raw value from the source
    transformation: Optional[str] = None # e.g. "MIN(doxy) WHERE pres BETWEEN 150 AND 800"
    timestamp: Optional[datetime] = None  # Observation time
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    depth_m: Optional[float] = None
    platform_number: Optional[int] = None
    scientific_name: Optional[str] = None
    confidence: float = 1.0              # 1.0 for OBSERVED, fractional for INFERRED


@dataclass
class EvidenceLedger:
    """
    Complete collection of verified evidence from all upstream agents.
    Built by the orchestrator after SQL + BIO + RAG tasks complete,
    before AEGIS claim verification begins.
    """
    items: List[EvidenceItem] = field(default_factory=list)

    # Raw upstream results (kept for reference by firewall checks)
    sql_rows: List[Dict[str, Any]] = field(default_factory=list)
    bio_matches: List[Dict[str, Any]] = field(default_factory=list)
    species_profiles: List[Dict[str, Any]] = field(default_factory=list)
    taxonomy_records: List[Dict[str, Any]] = field(default_factory=list)
    rag_texts: List[str] = field(default_factory=list)

    def add(self, item: EvidenceItem) -> str:
        """Add an EvidenceItem and return its source ID."""
        self.items.append(item)
        return item.source

    def get_by_source(self, source: str) -> Optional[EvidenceItem]:
        for item in self.items:
            if item.source == source:
                return item
        return None

    def observed_items(self) -> List[EvidenceItem]:
        return [i for i in self.items if i.evidence_type == EvidenceType.OBSERVED]

    def get_species_profile(self, scientific_name: str) -> Optional[Dict[str, Any]]:
        """Return the ecological profile for a species by exact or partial name match."""
        name_lower = scientific_name.lower()
        for p in self.species_profiles:
            sn = str(p.get("scientific_name", "")).lower()
            if sn == name_lower or name_lower in sn or sn in name_lower:
                return p
        return None

    def get_taxonomy_record(self, scientific_name: str) -> Optional[Dict[str, Any]]:
        """Return the canonical taxonomy record for a species."""
        name_lower = scientific_name.lower()
        for t in self.taxonomy_records:
            sn = str(t.get("scientific_name", "")).lower()
            accepted = str(t.get("accepted_name", "")).lower()
            if sn == name_lower or accepted == name_lower:
                return t
        return None

    def occurrence_exists(self, scientific_name: str) -> bool:
        """BIO-001: asserts at least one occurrence record for this species."""
        name_lower = scientific_name.lower()
        for bio in self.bio_matches:
            if name_lower in str(bio.get("scientific_name", "")).lower():
                return True
        return False

    def build_from_sql_rows(self, rows: List[Dict[str, Any]], table: str = "marine_data") -> None:
        """Auto-populate EvidenceItems from raw SQL result rows."""
        for i, row in enumerate(rows):
            platform = row.get("platform_number")
            cycle = row.get("cycle_number")
            source_id = f"{table}:{platform}:cycle{cycle}:row{i}" if platform else f"{table}:row{i}"

            # One EvidenceItem per meaningful column
            for col in ("temp", "psal", "doxy", "chla", "nitrate", "ph_in_situ_total", "pres"):
                if row.get(col) is not None:
                    self.items.append(EvidenceItem(
                        source=f"{source_id}:{col}",
                        evidence_type=EvidenceType.OBSERVED,
                        table=table,
                        column=col,
                        value=row[col],
                        timestamp=row.get("time"),
                        latitude=row.get("latitude") or row.get("decimal_latitude"),
                        longitude=row.get("longitude") or row.get("decimal_longitude"),
                        depth_m=row.get("pres") or row.get("minimum_depth_m"),
                        platform_number=platform,
                        confidence=1.0,
                    ))

    def build_from_bio_rows(self, bio_rows: List[Dict[str, Any]]) -> None:
        """Auto-populate EvidenceItems from CMLRE biodiversity occurrence records."""
        for i, row in enumerate(bio_rows):
            occurrence_id = row.get("occurrence_id") or row.get("id") or i
            scientific_name = row.get("scientific_name", "unknown")
            source_id = f"marine_biodiversity:{occurrence_id}"
            self.items.append(EvidenceItem(
                source=source_id,
                evidence_type=EvidenceType.OBSERVED,
                table="marine_biodiversity",
                column="scientific_name",
                value=scientific_name,
                timestamp=row.get("event_date"),
                latitude=row.get("decimal_latitude"),
                longitude=row.get("decimal_longitude"),
                depth_m=row.get("minimum_depth_m"),
                scientific_name=scientific_name,
                confidence=1.0,
            ))
