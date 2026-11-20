import { z } from "zod";

/** Unified cache entry with TTL and access tracking. */
export interface CacheEntry<V> {
  value: V;
  expiryMs: number;        // absolute expiry timestamp
  accessedAt: number;      // last access (for LRU)
  createdAt: number;
  hitCount: number;
}

/** Generic cache key type. */
export type CacheKey = string;

/** Cache statistics for observability. */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
}

/** Zod schema for cache configuration validation. */
export const CacheConfigSchema = z.object({
  maxSize: z.number().positive().default(512),
  defaultTtlMs: z.number().positive().default(60_000),
  staleWhileRevalidateMs: z.number().nonnegative().default(5_000),
  pruneIntervalMs: z.number().positive().default(30_000),
});

export type CacheConfig = z.infer<typeof CacheConfigSchema>;

/** Result of a get-or-compute operation. */
export interface GetOrComputeResult<V> {
  value: V;
  hit: boolean;
  ageMs: number;
}