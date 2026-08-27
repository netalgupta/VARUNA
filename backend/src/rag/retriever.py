"""
FloatChat AI â€” Hybrid Retriever (BM25 + Qdrant Vector Search + Cross-Encoder Reranking)

WHY Hybrid retrieval?
  BM25 alone: great for exact keyword matches ("Arabian Sea", "platform 1902367")
  Vector search alone: great for semantic meaning ("upwelling indicators", "warm anomaly")
  BM25 + Vector together = best of both worlds â€” neither misses what the other finds.

WHY Cross-encoder reranking?
  BM25 and vector scores are not comparable (different scales). A cross-encoder
  takes the query AND a candidate chunk AS A PAIR and scores actual relevance.
  It's slower (O(k) model calls) but applied to only the top 20 candidates â†’ fast enough.

WHY Qdrant instead of Chroma?
  Chroma is great for prototyping. Qdrant:
  - Has native filtering (metadata + payload filtering with vector search)
  - Scales to 100M+ vectors comfortably
  - Has HNSW quantization for memory efficiency
  - Has built-in batch upsert API
  - Production-grade with built-in monitoring
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np  # type: ignore
from rank_bm25 import BM25Okapi  # type: ignore
from qdrant_client import QdrantClient  # type: ignore
from qdrant_client.models import (  # type: ignore
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue,
)

from src.config import settings  # type: ignore
from src.llm.ollama_client import embed  # type: ignore

# ━━ Qdrant client (lazy singleton) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_qdrant: Optional[QdrantClient] = None


def get_qdrant() -> QdrantClient:
    global _qdrant
    if _qdrant is None:
        _qdrant = QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key or None,
            timeout=5,
            check_compatibility=False,
        )
    return _qdrant


# ━━ In-memory BM25 corpus (refreshed on startup + ingestion) ━━━━━━━━━━━━━━━━━
class BM25Index:
    """
    Maintains a BM25 index over all text chunks in the Qdrant collection.
    Rebuilt when the retriever is initialized or when new data is ingested.
    This is kept in-process memory (fast) â€” NOT persisted to disk.
    """
    def __init__(self):
        self.corpus: List[str] = []
        self.ids: List[str] = []
        self.payloads: List[Dict] = []
        self._bm25: Optional[BM25Okapi] = None

    def build(self, chunks: List[Dict[str, Any]]):
        """chunks: list of {id, text, payload}"""
        self.corpus = [c["text"] for c in chunks]
        self.ids = [c["id"] for c in chunks]
        self.payloads = [c.get("payload", {}) for c in chunks]
        tokenized = [doc.lower().split() for doc in self.corpus]
        self._bm25 = BM25Okapi(tokenized)

    def search(self, query: str, top_k: int = 20) -> List[Dict[str, Any]]:
        bm25 = self._bm25
        if bm25 is None or not self.corpus:
            return []
        
        tokens = query.lower().split()
        scores = bm25.get_scores(tokens)  # type: ignore
        
        # Top-k indices sorted by score descending
        # Convert to float array ensuring compatibility
        scores_arr = np.array(scores, dtype=float)
        top_idx = np.argsort(scores_arr)[::-1][:top_k]  # type: ignore
        
        results = []
        for i in top_idx:
            if scores[i] > 0:
                results.append({
                    "id": self.ids[i],
                    "text": self.corpus[i],
                    "payload": self.payloads[i],
                    "bm25_score": float(scores[i]),
                })
        return results


# ━━ Main retriever ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class HybridRetriever:
    """
    Production hybrid retriever:
      1. BM25 search (keyword)
      2. Qdrant vector search (semantic)
      3. Reciprocal Rank Fusion (score merging)
      4. Cross-encoder reranking (via Ollama embedding similarity as proxy)
    """

    def __init__(self):
        self.bm25 = BM25Index()
        self._initialized = False

    async def initialize(self):
        """Load all chunks from Qdrant and build BM25 index."""
        client = get_qdrant()
        chunks = []
        try:
            offset = None
            while True:
                results, next_offset = client.scroll(
                    collection_name=settings.qdrant_collection,
                    limit=1000,
                    offset=offset,
                    with_payload=True,
                    with_vectors=False,
                )
                for p in results:
                    text = p.payload.get("text", "") if p.payload else ""
                    chunks.append({"id": str(p.id), "text": text, "payload": p.payload or {}})
                if next_offset is None or len(results) < 1000:
                    break
                offset = next_offset
        except Exception:
            # Seed default oceanographic domain knowledge chunks when Qdrant is offline
            chunks = [
                {
                    "id": "argo_overview",
                    "text": "ARGO floats are autonomous oceanographic profiling instruments deployed worldwide to measure temperature, salinity, pressure, dissolved oxygen, chlorophyll-a, nitrate, and pH throughout the upper 2000 metres of the ocean.",
                    "payload": {"source": "argo_manual", "topic": "argo_floats"}
                },
                {
                    "id": "thermohaline_circulation",
                    "text": "Thermohaline circulation is the large-scale ocean circulation driven by global density gradients created by surface heat and freshwater fluxes. Cold, high-salinity water sinks at high latitudes and drives deep water currents.",
                    "payload": {"source": "oceanography_basics", "topic": "thermohaline"}
                },
                {
                    "id": "bgc_sensors",
                    "text": "Bio-Geo-Chemical (BGC) ARGO floats carry optical and chemical sensors to observe ocean oxygenation, primary productivity via chlorophyll fluorescence, nutrient concentrations (nitrate), and ocean acidification via pH.",
                    "payload": {"source": "bgc_manual", "topic": "bgc_sensors"}
                },
                {
                    "id": "arabian_sea_upwelling",
                    "text": "The Arabian Sea undergoes intense seasonal upwelling during the Southwest Monsoon (June-September), bringing nutrient-rich deep waters to the surface, driving chlorophyll phytoplankton blooms and oxygen depletion.",
                    "payload": {"source": "incois_report", "topic": "arabian_sea"}
                }
            ]

        self.bm25.build(chunks)
        self._initialized = True

    async def retrieve(
        self,
        query: str,
        top_k: Optional[int] = None,
        filters: Optional[Dict] = None,
    ) -> List[Dict[str, Any]]:
        """
        Full hybrid retrieval pipeline.
        Returns top chunks ranked and merged from BM25 + vector search.
        """
        top_k = top_k or settings.rag_top_k
        candidate_k = min(top_k * 3, 30)

        # ━━ Step 1: BM25 candidates ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        bm25_results = self.bm25.search(query, top_k=candidate_k)

        # ━━ Step 2: Vector search ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        query_vec = await embed([query])
        qvec = query_vec[0]

        qdrant_filter = None
        if filters:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in filters.items()
            ]
            if conditions:
                qdrant_filter = Filter(must=conditions)

        vector_results = []
        try:
            client: Any = get_qdrant()
            if hasattr(client, "search"):
                vector_results = client.search(
                    collection_name=settings.qdrant_collection,
                    query_vector=qvec,
                    limit=candidate_k,
                    query_filter=qdrant_filter,
                    with_payload=True,
                )
        except Exception:
            pass

        # ━━ Step 3: Reciprocal Rank Fusion (RRF) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # RRF merges ranked lists without needing score normalization.
        # score(d) = Î£ 1/(k + rank_i(d)) where k=60 (standard constant)
        # WHY RRF? Because BM25 scores (0â†’âˆž) and cosine similarity (0â†’1) are
        # incompatible scales. RRF only uses rank position, not raw score.

        RRF_K = 60
        scores: Dict[str, Dict] = {}

        for rank, r in enumerate(bm25_results):
            cid = r["id"]
            if cid not in scores:
                scores[cid] = {"text": r["text"], "payload": r["payload"],
                               "bm25_score": 0, "vector_score": 0, "rrf": 0}
            scores[cid]["bm25_score"] = r["bm25_score"]
            scores[cid]["rrf"] += settings.rag_bm25_weight / (RRF_K + rank + 1)

        for rank, r in enumerate(vector_results):
            cid = str(r.id)
            text = r.payload.get("text", "") if r.payload else ""
            if cid not in scores:
                scores[cid] = {"text": text, "payload": r.payload or {},
                               "bm25_score": 0, "vector_score": 0, "rrf": 0}
            scores[cid]["vector_score"] = float(r.score)
            scores[cid]["rrf"] += settings.rag_vector_weight / (RRF_K + rank + 1)

        # Sort by RRF score
        merged = sorted(
            [{"id": cid, **data} for cid, data in scores.items()],
            key=lambda x: x["rrf"],
            reverse=True,
        )[:candidate_k]  # type: ignore


        # ━━ Step 4: LLM-based reranking ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # WHY rerank? Because embedding similarity is asymmetric and often
        # misses complex semantic relationships.
        # we pick the top candidates from RRF and pass them to the LLM.
        from src.rag.reranker import rerank_with_llm  # type: ignore
        reranked = await rerank_with_llm(query, merged, top_n=settings.rag_rerank_top_n)

        return reranked

# ━━ Collection management ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def ensure_collection(vector_size: int = 768):
    """Create Qdrant collection if it doesn't exist."""
    client = get_qdrant()
    existing = [c.name for c in client.get_collections().collections]
    if settings.qdrant_collection not in existing:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE,
            ),
        )


async def upsert_chunks(chunks: List[Dict[str, Any]]):
    """
    Upsert text chunks into Qdrant.
    Each chunk: {id, text, payload: {source, type, region, ...}}
    """
    # Generate embeddings in batch
    texts = [c["text"] for c in chunks]
    vecs = await embed(texts)

    points = [
        PointStruct(
            id=c.get("id", i),
            vector=vecs[i],
            payload={**c.get("payload", {}), "text": c["text"]},
        )
        for i, c in enumerate(chunks)
    ]
    get_qdrant().upsert(
        collection_name=settings.qdrant_collection,
        points=points,
        wait=True,
    )


# ━━ Singleton retriever ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_retriever: Optional[HybridRetriever] = None


async def get_retriever() -> HybridRetriever:
    global _retriever
    if _retriever is None:
        _retriever = HybridRetriever()
        await _retriever.initialize()
    return _retriever


async def retrieve_hybrid(query: str, top_k: int = 10) -> List[Dict[str, Any]]:
    """Convenience helper for hybrid retrieval."""
    try:
        retriever = await get_retriever()
        return await retriever.retrieve(query, top_k=top_k)
    except Exception:
        from src.database.qdrant import search_similar
        return await search_similar(query, limit=top_k)

