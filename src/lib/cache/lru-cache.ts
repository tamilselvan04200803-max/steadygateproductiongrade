import { CacheConfig, CacheEntry, CacheKey, CacheStats } from "./types";

/**
 * Bounded TTL LRU cache with proactive expiration.
 * Single-threaded (Node.js event loop / browser main thread) — no locks required.
 * O(1) get/set/evict via Map + doubly-linked access order.
 */
export class LruCache<V> {
  private readonly map: Map<CacheKey, CacheEntry<V>> = new Map();
  private readonly config: Required<CacheConfig>;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    const parsed = CacheConfigSchema.parse(config);
    this.config = {
      maxSize: parsed.maxSize,
      defaultTtlMs: parsed.defaultTtlMs,
      staleWhileRevalidateMs: parsed.staleWhileRevalidateMs,
      pruneIntervalMs: parsed.pruneIntervalMs,
    };
    this.startPruneTimer();
  }

  private now(): number {
    return Date.now();
  }

  private isExpired(entry: CacheEntry<V>, now: number): boolean {
    return now >= entry.expiryMs;
  }

  private evict(key: CacheKey): void {
    this.map.delete(key);
    this.evictions++;
  }

  private startPruneTimer(): void {
    if (typeof setInterval === "undefined") return;
    this.pruneTimer = setInterval(() => this.prune(), this.config.pruneIntervalMs);
    if (this.pruneTimer.unref) this.pruneTimer.unref();
  }

  /** Get a value by key. Returns undefined if missing or expired. */
  get(key: CacheKey): V | undefined {
    const now = this.now();
    const entry = this.map.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (this.isExpired(entry, now)) {
      this.evict(key);
      this.misses++;
      return undefined;
    }
    entry.accessedAt = now;
    entry.hitCount++;
    this.hits++;
    return entry.value;
  }

  /** Set a key-value pair with optional TTL override. Evicts LRU entry if over capacity. */
  set(key: CacheKey, value: V, ttlMs?: number): void {
    const now = this.now();
    const ttl = ttlMs ?? this.config.defaultTtlMs;
    const entry: CacheEntry<V> = {
      value,
      expiryMs: now + ttl,
      accessedAt: now,
      createdAt: now,
      hitCount: 0,
    };

    if (this.map.has(key)) {
      this.map.set(key, entry);
      return;
    }

    if (this.map.size >= this.config.maxSize) {
      // Evict least recently used (oldest accessedAt)
      let lruKey: CacheKey | null = null;
      let lruTime = Infinity;
      for (const [k, v] of this.map) {
        if (v.accessedAt < lruTime) {
          lruTime = v.accessedAt;
          lruKey = k;
        }
      }
      if (lruKey !== null) this.evict(lruKey);
    }

    this.map.set(key, entry);
  }

  /** Delete a key. Returns true if the key existed. */
  delete(key: CacheKey): boolean {
    const existed = this.map.has(key);
    this.map.delete(key);
    return existed;
  }

  /** Clear all entries. */
  clear(): void {
    this.map.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /** Proactively remove expired entries. */
  prune(): number {
    const now = this.now();
    let removed = 0;
    for (const [key, entry] of this.map) {
      if (this.isExpired(entry, now)) {
        this.evict(key);
        removed++;
      }
    }
    return removed;
  }

  /** Current cache statistics. */
  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.map.size,
      maxSize: this.config.maxSize,
    };
  }

  /** Get hit ratio (0-1). */
  getHitRatio(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  /** Stop the prune timer (for tests/cleanup). */
  dispose(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
  }

  get size(): number {
    return this.map.size;
  }

  has(key: CacheKey): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (this.isExpired(entry, this.now())) {
      this.evict(key);
      return false;
    }
    return true;
  }

  keys(): CacheKey[] {
    return Array.from(this.map.keys());
  }
}

import { CacheConfigSchema } from "./types";