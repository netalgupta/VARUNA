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


def _get_key_pool() -> List[str]:
    keys: List[str] = []
    if getattr(settings, "openrouter_api_keys_pool", ""):
        for k in settings.openrouter_api_keys_pool.split(","):
            k_clean = k.strip()
            if k_clean and k_clean not in keys:
                keys.append(k_clean)
    if settings.openrouter_api_key and settings.openrouter_api_key not in keys:
        keys.append(settings.openrouter_api_key)
    return keys


def _get_headers_for_key(api_key: str) -> Dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://varuna.incois.gov.in",
        "X-Title": "VARUNA Marine Intelligence Platform",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


_active_key_idx = 0


async def chat_complete(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.1,
    max_tokens: int = 2048,
    task_tag: str = "general",
    trace: Optional[Any] = None,
) -> str:
    """
    Executes chat completion via OpenRouter API with multi-key rotation and multi-model failover.
    """
    global _active_key_idx
    chosen_model = model or DEFAULT_MODEL
    start_time = time.perf_counter()
    key_pool = _get_key_pool()

    if not key_pool:
        log.warning("No OPENROUTER API keys configured in pool. Using offline error for [%s].", task_tag)
        return _offline_chat_fallback(messages, task_tag)

    payload = {
        "model": chosen_model,
        "messages": messages,
        "temperature": max(0.1, temperature),
        "max_tokens": max_tokens,
        "frequency_penalty": 0.3,
        "presence_penalty": 0.1,
    }

    models_to_try = [chosen_model]
    for fallback_m in [
        "nvidia/nemotron-3-super-120b-a12b:free",
        "google/gemma-4-31b-it:free",
        "nvidia/nemotron-3.5-lightning:free",
    ]:
        if fallback_m not in models_to_try:
            models_to_try.append(fallback_m)

    # Multi-Key x Multi-Model Resilient Cascade (capped at 4 key rotations max for sub-15s response time)
    num_keys = len(key_pool)
    max_offsets = min(num_keys, 4)
    for offset in range(max_offsets):
        if (time.perf_counter() - start_time) > 20.0:
            log.warning("OpenRouter retry cascade exceeded 20s budget, failing over to deterministic grounded synthesizer.")
            break

        current_idx = (_active_key_idx + offset) % num_keys
        attempt_key = key_pool[current_idx]
        headers = _get_headers_for_key(attempt_key)

        for attempt_model in models_to_try:
            payload["model"] = attempt_model
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(
                        f"{OPENROUTER_URL}/chat/completions",
                        headers=headers,
                        json=payload,
                    )

                    if resp.status_code == 200:
                        data = resp.json()
                        content = data["choices"][0]["message"]["content"]
                        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                        _active_key_idx = current_idx  # Sticky success

                        usage = data.get("usage", {})
                        if trace:
                            trace.log(
                                "OPENROUTER_COMPLETION",
                                f"Completed {task_tag} via {attempt_model} (key: ...{attempt_key[-6:]}) in {elapsed_ms:.1f}ms",
                                prompt_tokens=usage.get("prompt_tokens", 0),
                                completion_tokens=usage.get("completion_tokens", 0),
                            )
                        return content.strip()

                    # If 402/429 occurs on this key, rotate immediately
                    if resp.status_code in (402, 429):
                        log.warning("Key ...%s rate/credit limited (status %s) for %s. Rotating to next key in pool.", attempt_key[-6:], resp.status_code, attempt_model)
                        _active_key_idx = (current_idx + 1) % num_keys
                        break
                    else:
                        log.warning("OpenRouter model %s returned status %s: %s", attempt_model, resp.status_code, resp.text[:100])
            except Exception as e:
                log.warning("OpenRouter request to %s with key ...%s failed: %s", attempt_model, attempt_key[-6:], str(e))

    log.error("All OpenRouter keys and candidate models in pool failed for task: %s", task_tag)
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

    key_pool = _get_key_pool()
    api_key = key_pool[0] if key_pool else settings.openrouter_api_key
    headers = _get_headers_for_key(api_key)

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{OPENROUTER_URL}/embeddings",
                headers=headers,
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
