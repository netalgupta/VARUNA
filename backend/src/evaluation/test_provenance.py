import sys
from pathlib import Path
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_BACKEND_ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from src.evaluation.claim_provenance_verifier import verify_numerical_claims

sample_responses = {
    'PHYS_02': 'Arabian Sea Mean Salinity 35.59 PSU across 84,219 observations. Bay of Bengal Mean Salinity 34.72 PSU. Delta offset is +0.87 PSU.',
    'PHYS_03': 'Maximum Recorded Pressure is 2062.7 dbar by WMO 5907086. In-situ temperature at base is 2.14 °C and salinity is 34.71 PSU.',
    'BGC_08': 'Minimum Dissolved Oxygen is 1.9 µmol/kg at depth 245 meters recorded by Float 7902190.',
    'FUS_22': 'Found 20 marine species within 50km of low oxygen floats. Minimum DO is 1.9 µmol/kg at 19.2 km distance.',
    'SPA_29': 'Nearest float to Mumbai is 2902214 at distance 234.6 km with surface salinity 36.12 PSU.'
}

for qid, text in sample_responses.items():
    res = verify_numerical_claims(qid, text)
    mod = res['modality']
    vc = res['verified_claims_count']
    tc = res['total_claims_count']
    print(f"=== {qid} ({mod}) -> Verified Claims: {vc}/{tc} ===")
    for c in res['claims_ledger']:
        status = '✅ PASS' if c['provenance_verified'] else '❌ FAIL'
        metric = c['metric']
        val = c['extracted_value']
        unit = c['unit']
        src = c['evidence_source']
        trans = c['transformation']
        print(f"   {status} {metric}: {val} {unit} -> Source: {src} ({trans})")
    print()
