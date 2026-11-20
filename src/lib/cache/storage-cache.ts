import { LruCache } from "./lru-cache";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Cached reads of storage/*.json files with TTL-based invalidation.
 * Reduces repeated disk I/O for configuration and appliance state.
 */
export class StorageCache {
  private readonly cache: LruCache<unknown>;
  private readonly storageDir: string;

  constructor(storageDir: string, ttlMs = 30_000, maxSize = 64) {
    this.storageDir = storageDir;
    this.cache = new LruCache<unknown>({ maxSize, defaultTtlMs: ttlMs });
  }

  /** Read and cache a JSON file. Returns null if file does not exist. */
  readJson<T = unknown>(fileName: string): T | null {
    const key = `json:${fileName}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached as T;

    const filePath = join(this.storageDir, fileName);
    if (!existsSync(filePath)) return null;

    try {
      const raw = readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as T;
      this.cache.set(key, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  /** Invalidate a cached JSON file. */
  invalidate(fileName: string): boolean {
    return this.cache.delete(`json:${fileName}`);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return this.cache.getStats();
  }
}