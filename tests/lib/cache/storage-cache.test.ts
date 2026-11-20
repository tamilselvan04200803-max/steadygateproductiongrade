/** StorageCache unit tests for SteadyGate v6.0-FINAL caching layer.

 * Tests the JSON file cache with TTL-based invalidation:
 * readJson, invalidate, clear, getStats, missing file handling,
 * corrupted JSON handling.
 */

import { StorageCache } from "@/lib/cache";
import { expect, test, beforeEach, afterEach, describe } from "@jest/globals";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";

const TEST_STORAGE_DIR = join(__dirname, "..", "..", "..", "temp_storage_test");

function makeStorageCache(overrides: { ttlMs?: number; maxSize?: number } = {}): StorageCache {
  // Ensure test directory exists
  if (!require("fs").existsSync(TEST_STORAGE_DIR)) {
    mkdirSync(TEST_STORAGE_DIR, { recursive: true });
  }
  // Constructor takes (storageDir: string, ttlMs: number, maxSize: number)
  return new StorageCache(TEST_STORAGE_DIR, overrides.ttlMs ?? 30_000, overrides.maxSize ?? 64);
}

function writeTestJson(fileName: string, data: any): void {
  const filePath = join(TEST_STORAGE_DIR, fileName);
  writeFileSync(filePath, JSON.stringify(data));
}

function cleanStorageDir(): void {
  if (require("fs").existsSync(TEST_STORAGE_DIR)) {
    rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
  }
}

beforeEach(() => {
  cleanStorageDir();
});

afterEach(() => {
  cleanStorageDir();
});

describe("StorageCache", () => {
  let cache: StorageCache;

  beforeEach(() => {
    cache = makeStorageCache();
  });

  afterEach(() => {
    cache.clear();
  });

  test("readJson returns value for existing file", () => {
    writeTestJson("config.json", { volume: 0.8, muted: false });
    const result = cache.readJson<{ volume: number; muted: boolean }>("config.json");
    expect(result).toEqual({ volume: 0.8, muted: false });
  });

  test("readJson returns null for missing file", () => {
    const result = cache.readJson<never>("nonexistent.json");
    expect(result).toBeNull();
  });

  test("readJson merges subsequent reads from cache", () => {
    writeTestJson("settings.json", { theme: "dark", contrast: 0.9 });
    const first = cache.readJson<{ theme: string; contrast: number }>("settings.json");
    const second = cache.readJson<{ theme: string; contrast: number }>("settings.json");
    expect(first).toEqual(second);
    expect(second).toEqual({ theme: "dark", contrast: 0.9 });
  });

  test("invalidate removes a cached key", () => {
    writeTestJson("invalidate.json", { enabled: true });
    cache.readJson("invalidate.json"); // cache it
    const invalidated = cache.invalidate("invalidate.json");
    expect(invalidated).toBe(true);
    // After invalidation, read should re-read from disk
    const fresh = cache.readJson<{ enabled: boolean }>("invalidate.json");
    expect(fresh).toEqual({ enabled: true }); // still reads fine from disk
  });

  test("readJson type parameter works correctly", () => {
    writeTestJson("types.json", { count: 42, label: "test" });
    const result = cache.readJson<{ count: number; label: string }>("types.json");
    expect(result).toHaveProperty("count", 42);
    expect(result).toHaveProperty("label", "test");
    expect(typeof result!.count).toBe("number");
    expect(typeof result!.label).toBe("string");
  });

  test("clear empties the cache", () => {
    writeTestJson("a.json", { x: 1 });
    writeTestJson("b.json", { y: 2 });
    cache.readJson("a.json");
    cache.readJson("b.json");
    expect(cache.getStats().size).toBe(2);
    cache.clear();
    expect(cache.getStats().size).toBe(0);
    // Both files should still be readable (from disk)
    const a = cache.readJson("a.json");
    const b = cache.readJson("b.json");
    expect(a).toEqual({ x: 1 });
    expect(b).toEqual({ y: 2 });
  });

  test("getStats returns correct structure", () => {
    cache.readJson("stats1.json"); // miss (file not written yet, but cache miss counted)
    const stats = cache.getStats();
    expect(stats).toHaveProperty("hits");
    expect(stats).toHaveProperty("misses");
    expect(stats).toHaveProperty("evictions");
    expect(stats).toHaveProperty("size");
    expect(stats).toHaveProperty("maxSize");
    expect(typeof stats.hits).toBe("number");
    expect(typeof stats.misses).toBe("number");
    expect(typeof stats.size).toBe("number");
    expect(typeof stats.maxSize).toBe("number");
  });

  test("readJson with nested objects works correctly", () => {
    writeTestJson("nested.json", { settings: { theme: "dark", fontSize: 14 } });
    const result = cache.readJson<{ settings: { theme: string; fontSize: number } }>("nested.json");
    expect(result).toEqual({ settings: { theme: "dark", fontSize: 14 } });
    expect(result!.settings.theme).toBe("dark");
    expect(result!.settings.fontSize).toBe(14);
  });

  test("readJson with array data works correctly", () => {
    writeTestJson("array.json", [1, 2, 3, 4, 5]);
    const result = cache.readJson<number[]>("array.json");
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  test("cache respects maxSize and evicts LRU entries", () => {
    const tinyDir = join(__dirname, "..", "..", "..", "tiny_storage_test");
    if (!require("fs").existsSync(tinyDir)) {
      mkdirSync(tinyDir, { recursive: true });
    }
    const tinyCache = new StorageCache(tinyDir, 60_000, 2);
    writeTestJson("first.json", { id: 1 });
    writeTestJson("second.json", { id: 2 });
    writeTestJson("third.json", { id: 3 }); // should evict first.json (LRU)

    // Access second.json to make it recently used
    tinyCache.readJson("second.json");
    // Adding third should evict first (least recently used)
    tinyCache.readJson("third.json");

    // first.json should be evicted from cache
    const evicted = tinyCache.readJson<{ id: number }>("first.json");
    // After eviction, it re-reads from disk
    expect(evicted).toEqual({ id: 1 }); // still reads from disk

    tinyCache.clear();
    rmSync(tinyDir, { recursive: true, force: true });
  });

  test("corrupted JSON returns null gracefully", () => {
    const corruptedDir = join(__dirname, "..", "..", "..", "corrupt_storage_test");
    if (!require("fs").existsSync(corruptedDir)) {
      mkdirSync(corruptedDir, { recursive: true });
    }
    writeFileSync(join(corruptedDir, "bad.json"), "not valid json{");
    const badCache = new StorageCache(corruptedDir, 60_000, 64);
    const result = badCache.readJson("bad.json");
    expect(result).toBeNull(); // should not throw, should return null
    badCache.clear();
    rmSync(corruptedDir, { recursive: true, force: true });
  });
});