"""
SteadyGate Python cache module — bounded TTL LRU caches for telemetry, outbox, and ADC.
Provides single-flight, eviction, and observability matching the TypeScript layer.
"""

from __future__ import annotations

import time
from collections import Counter
from dataclasses import dataclass, field
from typing import Any


@dataclass
class CacheEntry:
    """Unified cache entry with TTL and access tracking."""

    value: Any
    expiryMs: float        # absolute expiry timestamp (epoch ms)
    accessedAt: float      # last access (for LRU)
    createdAt: float
    hitCount: int = 0


class LRUCache:
    """Bounded TTL LRU cache with proactive expiration.

    Single-threaded (Node.js event loop / browser main thread) — no locks required.
    O(1) get/set/evict via dict + access-order tracking.
    """

    def __init__(self, max_size: int = 512, default_ttl_ms: float = 60_000,
                 stale_while_revalidate_ms: float = 5_000,
                 prune_interval_ms: float = 30_000) -> None:
        self.max_size = max_size
        self.default_ttl_ms = default_ttl_ms
        self.stale_while_revalidate_ms = stale_while_revalidate_ms
        self.prune_interval_ms = prune_interval_ms
        self._map: dict[str, CacheEntry] = {}
        self._hits = 0
        self._misses = 0
        self._evictions = 0
        self._prune_timer = None
        self._start_prune_timer()

    def _now(self) -> float:
        return time.monotonic() * 1000.0

    def _is_expired(self, entry: CacheEntry, now: float) -> bool:
        return now >= entry.expiryMs

    def _evict_key(self, key: str) -> None:
        self._map.pop(key, None)
        self._evictions += 1

    def _start_prune_timer(self) -> None:
        import threading
        if self._prune_timer is not None:
            return
        self._prune_timer = threading.Timer(
            self.prune_interval_ms / 1000.0, self._periodic_prune
        )
        self._prune_timer.daemon = True
        self._prune_timer.start()

    def _periodic_prune(self) -> None:
        now = self._now()
        removed = 0
        keys_to_remove = [
            k for k, v in self._map.items()
            if self._is_expired(v, now)
        ]
        for k in keys_to_remove:
            self._map.pop(k, None)
            removed += 1
        if removed > 0 and hasattr(self, "_prune_timer") and self._prune_timer is not None:
            # Re-schedule
            self._start_prune_timer()

    def get(self, key: str) -> Any | None:
        now = self._now()
        entry = self._map.get(key)
        if entry is None:
            self._misses += 1
            return None
        if self._is_expired(entry, now):
            self._evict_key(key)
            self._misses += 1
            return None
        entry.accessedAt = now
        entry.hitCount += 1
        self._hits += 1
        return entry.value

    def set(self, key: str, value: Any, ttl_ms: float | None = None) -> None:
        now = self._now()
        ttl = ttl_ms if ttl_ms is not None else self.default_ttl_ms
        entry = CacheEntry(
            value=value,
            expiryMs=now + ttl,
            accessedAt=now,
            createdAt=now,
            hitCount=0,
        )
        if key in self._map:
            self._map[key] = entry
            return
        if len(self._map) >= self.max_size:
            # Evict least recently used (oldest accessedAt)
            lru_key = min(self._map, key=lambda k: self._map[k].accessedAt)
            self._evict_key(lru_key)
        self._map[key] = entry

    def delete(self, key: str) -> bool:
        existed = key in self._map
        self._map.pop(key, None)
        return existed

    def clear(self) -> None:
        self._map.clear()
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    def get_stats(self) -> dict[str, int]:
        total = self._hits + self._misses
        hit_ratio = self._hits / total if total > 0 else 0.0
        return {
            "hits": self._hits,
            "misses": self._misses,
            "evictions": self._evictions,
            "size": len(self._map),
            "max_size": self.max_size,
            "hit_ratio": round(hit_ratio, 4),
        }

    def has(self, key: str) -> bool:
        now = self._now()
        entry = self._map.get(key)
        if entry is None:
            return False
        if self._is_expired(entry, now):
            self._evict_key(key)
            return False
        return True

    def keys(self) -> list[str]:
        return list(self._map.keys())

    def prune(self) -> int:
        return self._periodic_prune()

    def dispose(self) -> None:
        if self._prune_timer is not None:
            self._prune_timer.cancel()
            self._prune_timer = None


class NonceCache:
    """HMAC nonce replay-protection cache.

    Nonces are short-lived and must be unique.
    """

    def __init__(self, ttl_ms: float = 10_000, max_size: int = 4096) -> None:
        self._cache = LRUCache(max_size=max_size, default_ttl_ms=ttl_ms)

    def check_and_register(self, nonce: str) -> bool:
        """Check if nonce exists; if not, register it.
        Returns True if nonce was already seen (replay detected), False if fresh.
        """
        if self._cache.has(nonce):
            return True  # replay detected
        self._cache.set(nonce, True)
        return False  # fresh nonce registered

    def has(self, nonce: str) -> bool:
        return self._cache.has(nonce)

    def clear(self) -> None:
        self._cache.clear()

    def prune(self) -> int:
        return self._cache.prune()

    def dispose(self) -> None:
        self._cache.dispose()

    def get_stats(self) -> dict[str, int]:
        return self._cache.get_stats()


class GestureTelemetryCache:
    """Bounded cache for gesture telemetry stats (mirrors plugins.py stats_by_gesture)."""

    def __init__(self, max_size: int = 256, default_ttl_ms: float = 60_000) -> None:
        self._cache = LRUCache(max_size=max_size, default_ttl_ms=default_ttl_ms)
        self._total_events_n: int = 0

    def observe(self, gesture: str, frames_n: int = 1,
                score_sum: float = 0.0, quality_sum: float = 0.0,
                commits_n: int = 0, rejects_n: int = 0,
                confusions_n: int = 0, background_triggers_n: int = 0,
                reason_counts: Counter[str] | None = None) -> None:
        """Ingest telemetry data for a gesture."""
        key = f"gesture:{gesture}"
        cached = self._cache.get(key)
        if cached is not None:
            # Merge with existing
            if isinstance(cached, dict):
                existing_frames = cached.get("frames_n", 0) or 0
                existing_score = cached.get("score_sum", 0.0) or 0.0
                existing_quality = cached.get("quality_sum", 0.0) or 0.0
                existing_commits = cached.get("commits_n", 0) or 0
                existing_rejects = cached.get("rejects_n", 0) or 0
                existing_confusions = cached.get("confusions_n", 0) or 0
                existing_background = cached.get("background_triggers_n", 0) or 0
                existing_reasons = Counter(cached.get("reason_counts") or {})
                if reason_counts:
                    for k, v in reason_counts.items():
                        existing_reasons[k] += v
                cached = {
                    "frames_n": existing_frames + frames_n,
                    "score_sum": existing_score + score_sum,
                    "quality_sum": existing_quality + quality_sum,
                    "commits_n": existing_commits + commits_n,
                    "rejects_n": existing_rejects + rejects_n,
                    "confusions_n": existing_confusions + confusions_n,
                    "background_triggers_n": existing_background + background_triggers_n,
                    "reason_counts": dict(existing_reasons),
                }
        else:
            cached = {
                "frames_n": frames_n,
                "score_sum": score_sum,
                "quality_sum": quality_sum,
                "commits_n": commits_n,
                "rejects_n": rejects_n,
                "confusions_n": confusions_n,
                "background_triggers_n": background_triggers_n,
                "reason_counts": dict(reason_counts) if reason_counts else {},
            }
        self._cache.set(key, cached)

    def get_stats(self) -> dict[str, Any]:
        stats = {
            "total_events_n": self._total_events_n,
            "gestures": {},
            "hit_ratio": 0.0,
        }
        cached_gestures = self._cache.keys()
        for key in cached_gestures:
            entry = self._cache.get(key)
            if entry is not None and isinstance(entry, dict):
                stats["gestures"][key] = entry
        if stats["gestures"]:
            stats["hit_ratio"] = self._cache.get_stats().get("hit_ratio", 0.0)
        return stats

    def get_hit_ratio(self) -> float:
        return self._cache.get_stats().get("hit_ratio", 0.0)

    def prune(self) -> int:
        return self._periodic_prune()

    def dispose(self) -> None:
        self._cache.dispose()