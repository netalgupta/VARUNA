"""
FloatChat AI — Central Config
All settings from environment with sensible defaults.
"""
from __future__ import annotations
from functools import lru_cache
from pydantic_settings import BaseSettings  # type: ignore
from pydantic import Field  # type: ignore


class Settings(BaseSettings):
    # ── App ────────────────────────────────────────────
    app_env: str = Field("dev", alias="FLOATCHAT_APP_ENV")
    cors_origins: str = Field(
        "http://localhost:3000,http://127.0.0.1:3000",
        alias="FLOATCHAT_CORS_ORIGINS",
    )
    log_level: str = Field("DEBUG", alias="FLOATCHAT_LOG_LEVEL")

    # ── PostgreSQL (Dual Supabase Sharded Connection Pools) ──
    pg_dsn: str = Field(
        "postgresql://postgres.skbxtnjcvutzgkzgrrxr:HelloWorldIsSoLame@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres",
        alias="PG_DSN",
    )
    pg_dsn_db1: str = Field(
        "postgresql://postgres.anpvaxwncqsxetujkqce:HelloWorldIsSoLame@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres",
        alias="PG_DSN_DB1",
    )
    pg_dsn_db2: str = Field(
        "postgresql://postgres.skbxtnjcvutzgkzgrrxr:HelloWorldIsSoLame@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres",
        alias="PG_DSN_DB2",
    )

    # ── Qdrant ─────────────────────────────────────────
    qdrant_url: str = Field("http://localhost:6333", alias="QDRANT_URL")
    qdrant_api_key: str = Field("", alias="QDRANT_API_KEY")
    qdrant_collection: str = Field("argo_knowledge", alias="QDRANT_COLLECTION")

    # ── Redis ──────────────────────────────────────────
    redis_url: str = Field("redis://localhost:6379/0", alias="REDIS_URL")

    # ── OpenRouter / Cloud Cognitive API ────────────────
    openrouter_api_key: str = Field("", alias="OPENROUTER_API_KEY")
    openrouter_api_keys_pool: str = Field("", alias="OPENROUTER_API_KEYS_POOL")
    openrouter_base_url: str = Field("https://openrouter.ai/api/v1", alias="OPENROUTER_BASE_URL")
    openrouter_model: str = Field("google/gemini-2.5-flash", alias="OPENROUTER_MODEL")
    openrouter_embed_model: str = Field("nomic-ai/nomic-embed-text-v1.5:free", alias="OPENROUTER_EMBED_MODEL")
    hf_token: str = Field("", alias="HF_TOKEN")

    # ── Legacy Offline Fallback Settings (Never in Primary Flow) ──
    ollama_url: str = Field("http://localhost:11434", alias="OLLAMA_URL")
    ollama_sql_model: str = Field("qwen2.5:7b", alias="OLLAMA_SQL_MODEL")
    ollama_narrate_model: str = Field("llama3:8b", alias="OLLAMA_NARRATE_MODEL")
    ollama_embed_model: str = Field("nomic-embed-text", alias="OLLAMA_EMBED_MODEL")
    ollama_rewrite_model: str = Field("qwen2.5:7b", alias="OLLAMA_REWRITE_MODEL")
    ollama_code_model: str = Field("qwen2.5:7b", alias="OLLAMA_CODE_MODEL")

    # ── RAG ────────────────────────────────────────────
    rag_top_k: int = Field(12, alias="RAG_TOP_K")
    rag_bm25_weight: float = Field(0.35, alias="RAG_BM25_WEIGHT")
    rag_vector_weight: float = Field(0.65, alias="RAG_VECTOR_WEIGHT")
    rag_rerank_top_n: int = Field(5, alias="RAG_RERANK_TOP_N")
    rag_max_context_tokens: int = Field(8000, alias="RAG_MAX_CONTEXT_TOKENS")

    # ── SQL ────────────────────────────────────────────
    sql_max_rows: int = Field(500, alias="FLOATCHAT_SQL_LIMIT")
    force_sql_default: bool = Field(False, alias="FLOATCHAT_FORCE_SQL_DEFAULT")

    # ── Data ───────────────────────────────────────────
    data_raw_dir: str = Field("./data/raw", alias="DATA_RAW_DIR")
    data_parquet_dir: str = Field("./data/processed", alias="DATA_PARQUET_DIR")

    # ── ML real-data sources (Member 3) ────────────────
    #: Master switch: serve MHW forecasts from the live Supabase ARGO archives
    ml_real_data: bool = Field(False, alias="VARUNA_ML_REAL_DATA")
    #: ';'-separated Supabase Postgres DSNs (time-range routing is automatic).
    #: Empty -> falls back to physics-informed synthetic data paths.
    argo_db_urls: str = Field("", alias="VARUNA_ARGO_DB_URLS")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "populate_by_name": True,
        "extra": "ignore",
    }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
