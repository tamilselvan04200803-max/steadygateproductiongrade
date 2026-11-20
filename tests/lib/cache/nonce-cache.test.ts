/** NonceCache unit tests for SteadyGate v6.0-FINAL caching layer.

 * Tests the HMAC nonce replay-protection cache: checkAndRegister, has, prune,
 * single-flight nonce uniqueness with TTL bounds.
 */

import { NonceCache } from "@/lib/cache";
import { expect, test, beforeEach, afterEach, describe } from "@jest/globals";

describe("NonceCache", () => {
  let nonceCache: NonceCache;

  beforeEach(() => {
    nonceCache = new NonceCache(10_000, 4096); // 10s TTL, 4096 max size
  });

  afterEach(() => {
    nonceCache.clear();
  });

  test("checkAndRegister returns false for fresh nonce", () => {
    const result = nonceCache.checkAndRegister("nonce_abc");
    expect(result).toBe(false); // fresh nonce registered
  });

  test("checkAndRegister returns true for replayed nonce", () => {
    // First call registers the nonce
    nonceCache.checkAndRegister("nonce_def");
    // Second call detects replay
    const result = nonceCache.checkAndRegister("nonce_def");
    expect(result).toBe(true); // replay detected
  });

  test("checkAndRegister: first call false, second call true for same nonce", () => {
    expect(nonceCache.checkAndRegister("nonce_dup1")).toBe(false);
    expect(nonceCache.checkAndRegister("nonce_dup1")).toBe(true);
  });

  test("checkAndRegister: different nonces are independent", () => {
    expect(nonceCache.checkAndRegister("nonce_a")).toBe(false);
    expect(nonceCache.checkAndRegister("nonce_b")).toBe(false); // different nonce, also fresh
    // nonce_a should still be detected as replay if checked again
    expect(nonceCache.checkAndRegister("nonce_a")).toBe(true);
    // nonce_b should still be fresh
    expect(nonceCache.checkAndRegister("nonce_b")).toBe(false);
  });

  test("has checks nonce existence", () => {
    expect(nonceCache.has("existing_nonce")).toBe(false);
    nonceCache.checkAndRegister("new_nonce");
    expect(nonceCache.has("new_nonce")).toBe(true);
  });

  test("prune removes expired entries", () => {
    // Create a nonce cache with very short TTL for testing
    const shortTtlCache = new NonceCache(1, 4096); // 1ms TTL
    shortTtlCache.checkAndRegister("will_expire");
    // Immediately prune should remove it
    shortTtlCache.prune();
    expect(shortTtlCache.has("will_expire")).toBe(false);
    shortTtlCache.dispose();
  });

  test("getStats returns correct structure", () => {
    nonceCache.checkAndRegister("stats_nonce");
    const stats = nonceCache.getStats();
    expect(stats).toHaveProperty("hits");
    expect(stats).toHaveProperty("misses");
    expect(stats).toHaveProperty("evictions");
    expect(stats).toHaveProperty("size");
    expect(stats).toHaveProperty("maxSize");
    expect(typeof stats.hits).toBe("number");
    expect(typeof stats.size).toBe("number");
  });

  test("clear empties the nonce cache", () => {
    nonceCache.checkAndRegister("to_clear");
    expect(nonceCache.has("to_clear")).toBe(true);
    nonceCache.clear();
    expect(nonceCache.has("to_clear")).toBe(false);
    expect(nonceCache.getStats()["size"]).toBe(0);
  });

  test("NonceCache with custom TTL and maxSize", () => {
    const customNonce = new NonceCache(5_000, 16); // 5s TTL, max 16 entries
    customNonce.checkAndRegister("custom_nonce");
    const stats = customNonce.getStats();
    expect(stats.maxSize).toBe(16);
    customNonce.dispose();
  });

  test("checkAndRegister with empty string nonce", () => {
    const result = nonceCache.checkAndRegister("");
    expect(result).toBe(false); // empty string is a valid (though unusual) nonce
    const result2 = nonceCache.checkAndRegister("");
    expect(result2).toBe(true); // second call with same empty nonce is replay
  });
});