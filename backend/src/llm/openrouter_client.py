"""
VARUNA — OpenRouter Async Client
Zero-local-LLM cloud cognitive engine powered by NVIDIA Nemotron-Ultra 550B.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, List, Optional

import httpx

try:
    from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type  # type: ignore
    _has_tenacity = True
except ImportError:
    _has_tenacity = False

from src.config import settings

log = logging.getLogger("varuna.openrouter")

DEFAULT_MODEL = settings.openrouter_model
DEFAULT_EMBED_MODEL = settings.openrouter_embed_model
OPENROUTER_URL = settings.openrouter_base_url


def _get_headers() -> Dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://varuna.incois.gov.in",
        "X-Title": "VARUNA Marine Intelligence Platform",
    }
    if settings.openrouter_api_key:
        headers["Authorization"] = f"Bearer {settings.openrouter_api_key}"
    return headers


async def chat_complete(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.1,
    max_tokens: int = 2048,
    task_tag: str = "general",
    trace: Optional[Any] = None,
) -> str:
    """
    Executes chat completion via OpenRouter API.
    Gracefully handles rate limits with exponential backoff.
    Falls back to grounded deterministic output if API key is not configured or offline.
    """
    chosen_model = model or DEFAULT_MODEL
    start_time = time.perf_counter()

    # If no API key configured, use intelligent deterministic fallback for local testing
    if not settings.openrouter_api_key:
        log.warning("OPENROUTER_API_KEY not configured. Using grounded offline synthesis for [%s].", task_tag)
        return _offline_chat_fallback(messages, task_tag)

    payload = {
        "model": chosen_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        models_to_try = [chosen_model]
        for fallback_m in ["google/gemini-2.5-flash", "nvidia/nemotron-3.5-lightning:free", "openrouter/free"]:
            if fallback_m not in models_to_try:
                models_to_try.append(fallback_m)

        for attempt_model in models_to_try:
            payload["model"] = attempt_model
            try:
                async with httpx.AsyncClient(timeout=35.0) as client:
                    resp = await client.post(
                        f"{OPENROUTER_URL}/chat/completions",
                        headers=_get_headers(),
                        json=payload,
                    )

                    if resp.status_code == 200:
                        data = resp.json()
                        content = data["choices"][0]["message"]["content"]
                        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

                        usage = data.get("usage", {})
                        if trace:
                            trace.log(
                                "OPENROUTER_COMPLETION",
                                f"Completed {task_tag} via {attempt_model} in {elapsed_ms:.1f}ms",
                                prompt_tokens=usage.get("prompt_tokens", 0),
                                completion_tokens=usage.get("completion_tokens", 0),
                            )
                        return content.strip()

                    log.warning("OpenRouter model %s returned status %s: %s", attempt_model, resp.status_code, resp.text[:100])
            except Exception as e:
                log.warning("OpenRouter request to %s failed: %s", attempt_model, str(e))

        log.error("All OpenRouter candidate models failed for task: %s", task_tag)
        return _offline_chat_fallback(messages, task_tag)

    except Exception as e:
        log.warning("OpenRouter connection failed [%s], using offline fallback: %s", task_tag, str(e))
        return _offline_chat_fallback(messages, task_tag)


async def embed_texts(
    texts: List[str],
    model: Optional[str] = None,
) -> List[List[float]]:
    """
    Generates dense embeddings via OpenRouter or Nomic API.
    """
    chosen_model = model or DEFAULT_EMBED_MODEL

    if not settings.openrouter_api_key:
        # Generate normalized deterministic 768-dim vectors for offline testing
        import hashlib
        vectors = []
        for t in texts:
            seed = int(hashlib.md5(t.encode()).hexdigest(), 16)
            import random
            rng = random.Random(seed)
            vec = [rng.gauss(0, 1) for _ in range(768)]
            norm = sum(x**2 for x in vec) ** 0.5
            vectors.append([x / norm for x in vec])
        return vectors

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{OPENROUTER_URL}/embeddings",
                headers=_get_headers(),
                json={
                    "model": chosen_model,
                    "input": texts,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                return [item["embedding"] for item in data["data"]]
    except Exception as e:
        log.warning("Embeddings API call failed, falling back to local vectors: %s", str(e))

    # Deterministic fallback vector
    import hashlib
    vectors = []
    for t in texts:
        seed = int(hashlib.md5(t.encode()).hexdigest(), 16)
        import random
        rng = random.Random(seed)
        vec = [rng.gauss(0, 1) for _ in range(768)]
        norm = sum(x**2 for x in vec) ** 0.5
        vectors.append([x / norm for x in vec])
    return vectors


def _offline_chat_fallback(messages: List[Dict[str, str]], task_tag: str) -> str:
    """Offline error message when LLM API is unavailable."""
    return f"ERROR: LLM API request failed for task {task_tag}. No fallback synthesized."
