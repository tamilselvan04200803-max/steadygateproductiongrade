import { LruCache } from "./lru-cache";

/**
 * HMAC nonce replay-protection cache.
 * Nonces are short-lived (maxSkewMs * 2) and must be unique.
 */
export class NonceCache {
  private readonly cache: LruCache<boolean>;

  constructor(ttlMs: number, maxSize = 4096) {
    this.cache = new LruCache<boolean>({ maxSize, defaultTtlMs: ttlMs });
  }

  /**
   * Check if nonce exists; if not, register it.
   * Returns true if nonce was already seen (replay detected), false if fresh.
   */
  checkAndRegister(nonce: string): boolean {
    if (this.cache.has(nonce)) return true; // replay detected
    this.cache.set(nonce, true);
    return false; // fresh nonce registered
  }

  /** Proactively remove expired entries (from underlying LruCache). */
  prune(): void {
    this.cache.prune();
  }

  has(nonce: string): boolean {
    return this.cache.has(nonce);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return this.cache.getStats();
  }

  dispose(): void {
    this.cache.dispose();
  }
}