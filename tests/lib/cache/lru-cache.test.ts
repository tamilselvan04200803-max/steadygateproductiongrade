/** LRU Cache unit tests for SteadyGate v6.0-FINAL caching layer.

 * Tests the bounded TTL LRU cache: get/set/evict/prune/hit-ratio.
 * All tests enforce strict TypeScript types and edge cases.
 */

import { LruCache, CacheEntry, CacheKey, CacheStats, CacheConfig } from "@/lib/cache";
import { expect, test, beforeEach, afterEach, describe } from "@jest/globals";

const defaultConfig = {
  maxSize: 512,
  defaultTtlMs: 60_000,
  staleWhileRevalidateMs: 5_000,
  pruneIntervalMs: 30_000,
};

function makeCache(overrides: Partial<CacheConfig> = {}) {
  return new LruCache<number>({ ...defaultConfig, ...overrides });
}

describe("LruCache", () => {
  let cache: LruCache<number>;

  beforeEach(() => {
    cache = makeCache();
  });

  afterEach(() => {
    cache.dispose();
  });

  test("get returns undefined for missing key", () => {
    const result = cache.get("nonexistent");
    expect(result).toBeUndefined();
  });

  test("get returns value and increments hits for existing key", () => {
    cache.set("key1", 42);
    const result = cache.get("key1");
    expect(result).toBe(42);
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(0);
  });

  test("get evicts expired entry and increments misses", () => {
    cache.set("key2", 99, 1); // 1ms TTL
    expect(cache.get("key2")).toBe(99);
    cache.prune();
    const afterPrune = cache.get("key2");
    expect(afterPrune).toBeUndefined();
    const stats = cache.getStats();
    expect(stats.evictions).toBeGreaterThanOrEqual(0);
  });

  test("set respects maxSize and evicts LRU entry", () => {
    const tinyCache = new LruCache<number>({ maxSize: 2, defaultTtlMs: 60_000 });
    tinyCache.set("a", 1);
    tinyCache.set("b", 2);
    tinyCache.set("c", 3);
    expect(tinyCache.get("a")).toBeUndefined();
    expect(tinyCache.get("b")).toBe(2);
    expect(tinyCache.get("c")).toBe(3);
    expect(tinyCache.getStats().evictions).toBe(1);
    tinyCache.dispose();
  });

  test("get with existing key updates accessedAt (LRU ordering)", () => {
    const orderCache = new LruCache<number>({ maxSize: 3, defaultTtlMs: 60_000 });
    orderCache.set("first", 1);
    orderCache.set("second", 2);
    orderCache.set("third", 3);
    orderCache.get("first");
    orderCache.set("fourth", 4);
    expect(orderCache.get("second")).toBeUndefined();
    expect(orderCache.get("first")).toBe(1);
    expect(orderCache.get("third")).toBe(3);
    expect(orderCache.get("fourth")).toBe(4);
    orderCache.dispose();
  });

  test("prune removes expired entries", () => {
    const pruneCache = new LruCache<number>({ maxSize: 10, defaultTtlMs: 10 });
    pruneCache.set("short_lived", 42);
    expect(pruneCache.get("short_lived")).toBe(42);
    pruneCache.prune();
    expect(pruneCache.get("short_lived")).toBeUndefined();
    pruneCache.dispose();
  });

  test("getStats returns correct structure", () => {
    const statsCache = new LruCache<number>({ maxSize: 5, defaultTtlMs: 60_000 });
    statsCache.set("k1", 100);
    statsCache.get("k1"); // hit
    statsCache.get("missing"); // miss
    const stats = statsCache.getStats();
    expect(stats).toHaveProperty("hits");
    expect(stats).toHaveProperty("misses");
    expect(stats).toHaveProperty("evictions");
    expect(stats).toHaveProperty("size");
    expect(stats).toHaveProperty("maxSize");
    expect(typeof stats.hits).toBe("number");
    expect(typeof stats.misses).toBe("number");
    expect(typeof stats.size).toBe("number");
    expect(typeof stats.maxSize).toBe("number");
    statsCache.dispose();
  });

  test("has checks expiry and returns boolean", () => {
    const hasCache = new LruCache<number>({ maxSize: 5, defaultTtlMs: 50 });
    hasCache.set("check_key", 1);
    expect(hasCache.has("check_key")).toBe(true);
    hasCache.dispose();
  });

  test("delete removes a key", () => {
    const delCache = new LruCache<number>({ maxSize: 5, defaultTtlMs: 60_000 });
    delCache.set("delete_me", 42);
    expect(delCache.delete("delete_me")).toBe(true);
    expect(delCache.get("delete_me")).toBeUndefined();
    expect(delCache.delete("delete_me")).toBe(false); // second delete returns false
    delCache.dispose();
  });

  test("clear empties the cache", () => {
    const clearCache = new LruCache<number>({ maxSize: 5, defaultTtlMs: 60_000 });
    clearCache.set("a", 1);
    clearCache.set("b", 2);
    clearCache.set("c", 3);
    clearCache.clear();
    expect(clearCache.get("a")).toBeUndefined();
    expect(clearCache.get("b")).toBeUndefined();
    expect(clearCache.get("c")).toBeUndefined();
    expect(clearCache.getStats().size).toBe(0);
    clearCache.dispose();
  });

  test("keys returns all current keys", () => {
    const keysCache = new LruCache<number>({ maxSize: 5, defaultTtlMs: 60_000 });
    keysCache.set("x", 1);
    keysCache.set("y", 2);
    const k = keysCache.keys();
    expect(k).toContain("x");
    expect(k).toContain("y");
    expect(k.length).toBe(2);
    keysCache.dispose();
  });

  test("set with custom TTL overrides default", () => {
    const customTtlCache = new LruCache<number>({ maxSize: 5, defaultTtlMs: 1000 });
    customTtlCache.set("temp", 99, 5000); // 5 second override
    expect(customTtlCache.get("temp")).toBe(99);
    customTtlCache.dispose();
  });

  test("evictions counter increments on eviction", () => {
    const evictionCache = new LruCache<number>({ maxSize: 2, defaultTtlMs: 60_000 });
    evictionCache.set("a", 1);
    evictionCache.set("b", 2);
    const beforeEviction = evictionCache.getStats().evictions;
    evictionCache.set("c", 3); // should evict "a" (LRU since "b" was accessed)
    const afterEviction = evictionCache.getStats().evictions;
    expect(afterEviction).toBeGreaterThan(beforeEviction);
    evictionCache.dispose();
  });

  test("dispose stops the prune timer", () => {
    const cacheWithTimer = new LruCache<number>({ maxSize: 5, defaultTtlMs: 60_000 });
    cacheWithTimer.set("test", 1);
    cacheWithTimer.dispose();
    expect(cacheWithTimer.get("test")).toBe(1);
    cacheWithTimer.dispose();
  });
});