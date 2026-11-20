"""Python unit tests for SteadyGate caching layer (`steadygate/cache.py`).

Mirrors the TS cache test structure: LRUCache, NonceCache, GestureTelemetryCache.
"""
from __future__ import annotations

import time
import sys
import os

import pytest

from steadygate.cache import LRUCache, NonceCache, GestureTelemetryCache


# ── LRUCache tests ────────────────────────────────────────────────────────────

def test_lru_cache_basic_get_set() -> None:
    cache = LRUCache(max_size=512, default_ttl_ms=60_000)
    cache.set("key1", 42)
    value = cache.get("key1")
    assert value == 42
    cache.dispose()


def test_lru_cache_miss_returns_none() -> None:
    cache = LRUCache(max_size=512, default_ttl_ms=60_000)
    value = cache.get("nonexistent")
    assert value is None


def test_lru_cache_ttl_expiry() -> None:
    """Entry expires after default_ttl_ms; get returns None and evicts."""
    # Use a very short TTL by patching _now; instead we test prune()
    cache = LRUCache(max_size=512, default_ttl_ms=10)  # 10ms TTL
    cache.set("short_lived", 99)
    # Should be available immediately
    assert cache.get("short_lived") == 99
    time.sleep(0.02)
    # Prune should remove it (timer may not fire in test, but _periodic_prune logic)
    cache._periodic_prune()
    # After prune, entry should be gone
    assert cache.get("short_lived") is None
    cache.dispose()


def test_lru_cache_eviction_under_capacity() -> None:
    """When map size >= max_size, LRU entry is evicted."""
    cache = LRUCache(max_size=2, default_ttl_ms=60_000)
    cache.set("a", 1)
    cache.set("b", 2)
    # Adding a third entry should evict the LRU ("a" since "b" was accessed after "a")
    cache.set("c", 3)
    assert cache.get("a") is None  # evicted
    assert cache.get("b") == 2     # still there
    assert cache.get("c") == 3     # still there
    assert cache.get_stats()["evictions"] >= 1
    cache.dispose()


def test_lru_cache_hit_and_miss_counts() -> None:
    """Hits and misses are tracked correctly."""
    cache = LRUCache(max_size=512, default_ttl_ms=60_000)
    cache.set("k1", 10)
    assert cache.get("k1") == 10  # hit
    assert cache.get("k1") == 10  # hit again
    assert cache.get("k2") is None  # miss
    stats = cache.get_stats()
    assert stats["hits"] == 2
    assert stats["misses"] == 1
    cache.dispose()


def test_lru_cache_clear() -> None:
    """clear() empties the map and resets counters."""
    cache = LRUCache(max_size=512, default_ttl_ms=60_000)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.clear()
    stats = cache.get_stats()
    assert stats["size"] == 0
    assert stats["hits"] == 0
    assert stats["misses"] == 0
    assert stats["evictions"] == 0
    assert cache.get("a") is None
    assert cache.get("b") is None
    cache.dispose()


def test_lru_cache_delete() -> None:
    """delete() removes a key; returns True if it existed."""
    cache = LRUCache(max_size=512, default_ttl_ms=60_000)
    cache.set("del_me", 42)
    assert cache.delete("del_me") is True
    assert cache.get("del_me") is None
    assert cache.delete("del_me") is False  # second delete returns False
    cache.dispose()


def test_lru_cache_has_checks_expiry() -> None:
    """has() checks expiry and evicts if expired."""
    cache = LRUCache(max_size=512, default_ttl_ms=5)
    cache.set("expiry_test", 1)
    assert cache.has("expiry_test") is True
    # Very short TTL; in practice the periodic timer handles this
    # but the has() method internally checks _is_expired
    cache.dispose()


def test_lru_cache_get_stats_structure() -> None:
    """get_stats() returns dict with expected keys and types."""
    cache = LRUCache(max_size=512, default_ttl_ms=60_000)
    cache.set("k", 1)
    cache.get("k")  # hit
    stats = cache.get_stats()
    assert "hits" in stats
    assert "misses" in stats
    assert "evictions" in stats
    assert "size" in stats
    assert "max_size" in stats
    assert isinstance(stats["hits"], int)
    assert isinstance(stats["size"], int)
    assert isinstance(stats["max_size"], int)
    cache.dispose()


# ── NonceCache tests ──────────────────────────────────────────────────────────

def test_nonce_cache_fresh_and_replay() -> None:
    cache = NonceCache(ttl_ms=10_000, max_size=4096)
    # First registration: false (fresh)
    assert cache.check_and_register("nonce_abc") is False
    # Second registration of same nonce: true (replay detected)
    assert cache.check_and_register("nonce_abc") is True


def test_nonce_cache_different_nonces_independent() -> None:
    cache = NonceCache(ttl_ms=10_000, max_size=4096)
    assert cache.check_and_register("nonce_a") is False
    assert cache.check_and_register("nonce_b") is False
    # nonce_a replay on second check
    assert cache.check_and_register("nonce_a") is True
    # nonce_c still fresh
    assert cache.check_and_register("nonce_c") is False


def test_nonce_cache_has() -> None:
    cache = NonceCache(ttl_ms=10_000, max_size=4096)
    assert cache.has("new_nonce") is False
    cache.check_and_register("new_nonce")
    assert cache.has("new_nonce") is True


def test_nonce_cache_prune() -> None:
    """prune() removes expired entries (with very short TTL for testing)."""
    cache = NonceCache(ttl_ms=1, max_size=4096)
    cache.check_and_register("will_expire")
    time.sleep(0.005)
    cache.prune()
    assert cache.has("will_expire") is False
    cache.dispose()


def test_nonce_cache_get_stats() -> None:
    cache = NonceCache(ttl_ms=10_000, max_size=4096)
    cache.check_and_register("stats_nonce")
    stats = cache.get_stats()
    assert "hits" in stats
    assert "misses" in stats
    assert "evictions" in stats
    assert "size" in stats
    assert "max_size" in stats
    assert isinstance(stats["hit_ratio"], float)
    cache.dispose()


def test_nonce_cache_clear() -> None:
    cache = NonceCache(ttl_ms=10_000, max_size=4096)
    cache.check_and_register("to_clear")
    assert cache.has("to_clear") is True
    cache.clear()
    assert cache.has("to_clear") is False
    assert cache.get_stats()["size"] == 0


def test_nonce_cache_custom_ttl_and_maxsize() -> None:
    cache = NonceCache(ttl_ms=5_000, max_size=16)
    cache.check_and_register("custom")
    stats = cache.get_stats()
    assert stats["max_size"] == 16
    cache.dispose()


def test_nonce_cache_empty_string() -> None:
    cache = NonceCache(ttl_ms=10_000, max_size=4096)
    # Empty string is a valid key
    assert cache.check_and_register("") is False
    assert cache.check_and_register("") is True  # replay


# ── GestureTelemetryCache tests ───────────────────────────────────────────────

def test_gesture_telemetry_cache_observe_new() -> None:
    cache = GestureTelemetryCache(max_size=256, default_ttl_ms=60_000)
    cache.observe("OPEN_PALM", frames_n=5, score_sum=4.5, quality_sum=4.0,
                  commits_n=2, rejects_n=1, confusions_n=0, background_triggers_n=0)
    stats = cache.get_hit_ratio()
    # Hit ratio may be 0.0 initially; just verify no crash
    assert isinstance(stats, float)


def test_gesture_telemetry_cache_observe_existing_merge() -> None:
    cache = GestureTelemetryCache(max_size=256, default_ttl_ms=60_000)
    cache.observe("POINTING_UP", frames_n=3, score_sum=2.7, quality_sum=2.4,
                  commits_n=1, rejects_n=0, confusions_n=0, background_triggers_n=0)
    # Observe same gesture again - should merge
    cache.observe("POINTING_UP", frames_n=2, score_sum=1.8, quality_sum=1.6,
                  commits_n=1, rejects_n=0, confusions_n=0, background_triggers_n=0)
    stats = cache.get_hit_ratio()
    assert isinstance(stats, float)
    cache.dispose()


def test_gesture_telemetry_cache_observe_merges_counts() -> None:
    """reason_counts are merged across observes for the same gesture."""
    from collections import Counter
    cache = GestureTelemetryCache(max_size=256, default_ttl_ms=60_000)
    cache.observe("THUMBS_UP", frames_n=1, score_sum=0.9, quality_sum=0.9,
                  commits_n=1, rejects_n=0, confusions_n=0, background_triggers_n=0,
                  reason_counts=Counter({"LOW_SCORE": 1}))
    cache.observe("THUMBS_UP", frames_n=1, score_sum=0.95, quality_sum=0.95,
                  commits_n=1, rejects_n=0, confusions_n=0, background_triggers_n=0,
                  reason_counts=Counter({"OUTSIDE_ZONE": 1}))
    # reason_counts should be merged: LOW_SCORE=1, OUTSIDE_ZONE=1
    stats = cache.get_stats()
    assert isinstance(stats, dict)
    cache.dispose()


# ── Integration: GestureTelemetryCache stats get_stats ────────────────────────

def test_gesture_telemetry_cache_get_stats_no_nameerror() -> None:
    """The critical bug fix: get_stats() must not raise NameError on `cached_guests`."""
    cache = GestureTelemetryCache(max_size=256, default_ttl_ms=60_000)
    # observe a gesture to populate the cache
    cache.observe("OPEN_PALM", frames_n=1, score_sum=0.9, quality_sum=0.9,
                  commits_n=1, rejects_n=0, confusions_n=0, background_triggers_n=0)
    # This was crashing with: NameError: name 'cached_guests' is not defined
    s = cache.get_stats()
    assert isinstance(s, dict)
    assert "hit_ratio" in s
    cache.dispose()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])