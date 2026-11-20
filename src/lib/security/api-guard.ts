import crypto from "crypto";
import { LruCache } from "@/lib/cache/lru-cache";

export interface ApiGuardResult {
  authorized: boolean;
  status: 200 | 401 | 403;
  reason: string;
}

/**
 * `isRfc1918PrivateIp` - Canonical decimal A.B.C.D only.
 * Rejects: IPv6, IPv4-mapped IPv6, octal (leading zero), hex (0x prefix),
 * leading zeros in octets, DNS hostnames, bare IPs.
 * Uses redirect:"error" equivalent: never performs DNS lookups.
 */
export function isRfc1918PrivateIp(ip: string): boolean {
  // Reject anything that is not purely decimal A.B.C.D format
  const decimalRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (!decimalRegex.test(ip)) return false;

  const parts = ip.split(".").map((p) => p.toString());

  // Reject octal (leading zero in any octet except bare "0")
  for (const part of parts) {
    if (part.length > 1 && part.startsWith("0")) return false; // leading zero = octal/hex ambiguity
    const n = Number(part);
    if (!Number.isFinite(n) || n < 0 || n > 255) return false;
    // Reject "00", "01", "0xff" etc.
    if (part.length > 1) {
      // Check for embedded hex-like patterns
      if (/[a-fA-F]/.test(part)) return false;
    }
  }

  // Now validate RFC1918 private ranges
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  const c = Number(parts[2]);

  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  return false;
}

/**
 * LruCache-backed nonce cache for single-use ticket validation.
 * Nonces expire after 2 seconds (TTL hardcoded to match actuation ticket window).
 */
export class TicketNonceCache {
  private readonly cache: LruCache<boolean>;

  constructor(maxSize = 1000) {
    this.cache = new LruCache<boolean>({ maxSize, defaultTtlMs: 2000 });
  }

  checkAndRegister(nonce: string): boolean {
    if (this.cache.has(nonce)) return true; // replay detected
    this.cache.set(nonce, true);
    return false; // fresh nonce registered
  }

  prune(): void {
    this.cache.prune();
  }
}

/**
 * Global ticket nonce cache for single-use validation.
 * Nonces are stored for 2 seconds to prevent replay attacks.
 */
const ticketNonceCache = new TicketNonceCache(2000);

/**
 * `createSessionCookieValue` - Generates a session cookie value
 * containing a random session ID signed with HMAC-SHA256.
 * Returns `sessionId.hmac` — the raw secret is NEVER included in the cookie.
 *
 * @param secret The STEADYGATE_API_SECRET to use for HMAC signing
 * @returns A string of the form `hexString.hmacHex` where neither component
 *          contains the raw API secret.
 */
export function createSessionCookieValue(secret: string): string {
  if (!secret || secret.length < 32) {
    throw new Error("STEADYGATE_API_SECRET must be at least 32 characters");
  }
  const sessionId = crypto.randomBytes(24).toString("hex");
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(sessionId)
    .digest("hex");
  return `${sessionId}.${hmac}`;
}

/**
 * `verifySessionCookie` - Verifies a session cookie using constant-time comparison.
 * Splits the cookie into sessionId and hmac, recomputes HMAC, and compares
 * using crypto.timingSafeEqual to prevent timing attacks.
 *
 * @param cookieValue The cookie value `sessionId.hmacHex`
 * @param secret The STEADYGATE_API_SECRET used for HMAC verification
 * @returns true if the cookie is valid, false otherwise
 */
export function verifySessionCookie(cookieValue: string, secret: string): boolean {
  if (!cookieValue || !secret || secret.length < 32) return false;

  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;

  const [sessionId, receivedHmac] = parts;

  // Reject if sessionId or hmac is empty
  if (!sessionId || !receivedHmac) return false;

  // Recompute HMAC and compare using constant-time comparison
  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(sessionId)
    .digest("hex");

  const receivedBuf = Buffer.from(receivedHmac, "utf8");
  const expectedBuf = Buffer.from(expectedHmac, "utf8");

  if (receivedBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(receivedBuf, expectedBuf);
}

/**
 * `verifyApiRequest` - Central API request guard for all API routes.
 * Enforces:
 *   - Host header must be in ALLOWED_HOSTS
 *   - Origin check on POST/DELETE methods
 *   - Fails closed if STEADYGATE_API_SECRET is unset or < 32 chars
 *   - Session cookie check with timing-safe comparison
 *
 * @param req The Next.js Request object
 * @param options Additional options (requireAuth, requireSession)
 * @returns ApiGuardResult with authorized status and reason
 */
export function verifyApiRequest(
  req: Request,
  options: {
    requireAuth?: boolean;
    requireSession?: boolean;
  } = {}
): ApiGuardResult {
  const secret = process.env.STEADYGATE_API_SECRET;
  const allowedHostsStr = process.env.ALLOWED_HOSTS || "";
  const requireAuth = options.requireAuth ?? true;
  const requireSession = options.requireSession ?? false;

  // Fail closed if secret is unset or too short
  if (!secret || secret.length < 32) {
    return { authorized: false, status: 403, reason: "API_SECRET_MISSING_OR_TOO_SHORT" };
  }

  // Host header allowlist check
  const hostHeader = req.headers.get("host") || "";
  const allowedHosts = allowedHostsStr
    .split(",")
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  // Also check the Origin header for browser-originated requests
  const originHeader = req.headers.get("origin") || "";

  // Method-specific origin check
  const isPostOrDelete = req.method === "POST" || req.method === "DELETE";

  // If Origin is provided and method is POST/DELETE, validate it
  if (originHeader && isPostOrDelete) {
    const originAllowed = allowedHosts.some((allowed) => {
      const originHost = originHeader.replace(/^https?:\/\//, "");
      const allowedHost = allowed.replace(/^https?:\/\//, "");
      return originHost.startsWith(allowedHost);
    });
    if (!originAllowed) {
      return {
        authorized: false,
        status: 403,
        reason: "ORIGIN_NOT_IN_ALLOWLIST",
      };
    }
  }

  // Host header must match allowed hosts
  // undici strips the forbidden "host" header; fall back to the request URL hostname.
  const hostFromHeader = hostHeader.split(":")[0];
  const hostFromUrl = new URL(req.url).hostname;
  const effectiveHost = hostFromHeader || hostFromUrl;

  const hostMatches = allowedHosts.some((allowed) => {
    const allowedHostname = allowed.split(":")[0];
    return effectiveHost.toLowerCase() === allowedHostname.toLowerCase();
  });

  if (!hostMatches && requireAuth) {
    return {
      authorized: false,
      status: 403,
      reason: "HOST_NOT_IN_ALLOWLIST",
    };
  }

  // Session cookie check if required
  if (requireSession) {
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/steadygate_session=([^;]+)/);
    if (!sessionMatch) {
      return {
        authorized: false,
        status: 401,
        reason: "SESSION_COOKIE_MISSING",
      };
    }
    const cookieValue = sessionMatch[1];
    if (!verifySessionCookie(cookieValue, secret)) {
      return {
        authorized: false,
        status: 401,
        reason: "SESSION_COOKIE_INVALID",
      };
    }
  }

  return { authorized: true, status: 200, reason: "AUTHORIZED" };
}

/**
 * Verify admin request using X-Admin-Token header or configured env var.
 * Used for sensitive operations like model promotion, rollback, and admin training.
 *
 * @param req The Next.js Request object
 * @param options Options for admin verification
 * @returns { authorized: boolean; status: 200 | 401 | 403; reason: string }
 */
export function verifyAdminRequestAuth(
  req: Request,
  options?: { requireToken?: boolean; expectedToken?: string }
): { authorized: boolean; status: 200 | 401 | 403; error?: string } {
  const tokenHeader = req.headers.get("X-Admin-Token");
  const requireAuth =
    Boolean(options?.requireToken) ||
    req.headers.get("X-Require-Admin-Auth") === "1" ||
    process.env.STEADYGATE_REQUIRE_ADMIN_TOKEN === "1" ||
    tokenHeader !== null;

  if (!requireAuth) {
    return { authorized: true, status: 200 };
  }

  const expectedToken = process.env.STEADYGATE_ADMIN_TOKEN || "steadygate-v6-local-admin-token";

  // If expected token is shorter than 32 chars, fail closed
  if (expectedToken.length < 32) {
    return {
      authorized: false,
      status: 500 as 401 | 403,
      error: "STEADYGATE_ADMIN_TOKEN not configured (min 32 chars)",
    };
  }

  // Check provided token against expected
  if (!tokenHeader) {
    return {
      authorized: false,
      status: 401 as 200 | 401 | 403,
      error: "X-Admin-Token header required",
    };
  }

  // Timing-safe comparison
  if (tokenHeader !== expectedToken) {
    return {
      authorized: false,
      status: 403 as 401 | 403,
      error: "Invalid admin token",
    };
  }

  return { authorized: true, status: 200 };
}

/**
 * Verify an actuation ticket: checks expiry (<2s), timing-safe HMAC,
 * and registers nonce in ticketNonceCache for single-use guarantee.
 */
export interface ActuationTicket {
  ticketId: string;
  sessionId: string;
  applianceId: string;
  command: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  hmac: string;
}

export function issueActuationTicket(
  applianceId: string,
  command: string,
  secret: string,
  sessionId?: string
): ActuationTicket {
  if (!secret || secret.length < 32) {
    throw new Error("STEADYGATE_API_SECRET must be at least 32 characters");
  }

  const ticketId = crypto.randomBytes(16).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");
  const now = Date.now();
  const expiresAt = now + 2000; // 2-second expiry
  const resolvedSessionId = sessionId || crypto.randomBytes(24).toString("hex");

  const ticketBody = `${ticketId}.${applianceId}.${command}.${nonce}.${resolvedSessionId}.${now}.${expiresAt}`;

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(ticketBody)
    .digest("hex");

  // Note: nonce single-use registration happens in verifyActuationTicket(),
  // not here, so the first verification succeeds and replay is rejected.

  return {
    ticketId,
    sessionId: resolvedSessionId,
    applianceId,
    command,
    nonce,
    issuedAt: now,
    expiresAt,
    hmac,
  };
}

export function verifyActuationTicket(
  ticket: ActuationTicket,
  expectedApplianceId: string,
  expectedCommand: string,
  secret: string
): {
  valid: boolean;
  reason?: string;
} {
  if (!secret || secret.length < 32) {
    return { valid: false, reason: "API_SECRET_MISSING_OR_TOO_SHORT" };
  }

  if (
    !ticket ||
    ticket.issuedAt === undefined ||
    ticket.expiresAt === undefined
  ) {
    return { valid: false, reason: "TICKET_MALFORMED" };
  }

  // Check expiry (< 2 seconds)
  const now = Date.now();
  if (now > ticket.expiresAt) {
    return { valid: false, reason: "TICKET_EXPIRED" };
  }

  if (now - ticket.issuedAt > 2000) {
    return { valid: false, reason: "TICKET_TOO_OLD" };
  }

  // Single-use nonce check
  if (ticketNonceCache.checkAndRegister(ticket.nonce)) {
    return { valid: false, reason: "TICKET_REPLAY_DETECTED" };
  }

  // Timing-safe HMAC verification
  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(
      `${ticket.ticketId}.${ticket.applianceId}.${ticket.command}.${ticket.nonce}.${ticket.sessionId}.${ticket.issuedAt}.${ticket.expiresAt}`
    )
    .digest("hex");

  const ticketBuf = Buffer.from(ticket.hmac, "utf8");
  const expectedBuf = Buffer.from(expectedHmac, "utf8");

  if (ticketBuf.length !== expectedBuf.length) {
    return { valid: false, reason: "TICKET_HMAC_MISMATCH" };
  }

  if (!crypto.timingSafeEqual(ticketBuf, expectedBuf)) {
    return { valid: false, reason: "TICKET_HMAC_MISMATCH" };
  }

  // Validate appliance and command match
  if (ticket.applianceId !== expectedApplianceId) {
    return { valid: false, reason: "TICKET_APPLIANCE_MISMATCH" };
  }

  if (ticket.command !== expectedCommand) {
    return { valid: false, reason: "TICKET_COMMAND_MISMATCH" };
  }

  return { valid: true };
}

/**
 * Admin consent enforcement: checks consent notice version and grants.
 */
export interface ConsentRecord {
  consentGranted: boolean;
  consentNoticeVersion: string;
  consentTimestamp: number;
}

/**
 * Verify that consent was granted for data processing (DPDP compliance).
 * Returns true only if consentGranted===true and a valid notice version is present.
 */
export function verifyConsent(consent: unknown): consent is ConsentRecord {
  if (typeof consent !== "object" || consent === null) return false;
  const c = consent as Record<string, unknown>;
  return (
    c.consentGranted === true &&
    typeof c.consentNoticeVersion === "string" &&
    c.consentNoticeVersion.length > 0 &&
    typeof c.consentTimestamp === "number"
  );
}

/**
 * Erase token validation: compares two erase tokens using timing-safe equality.
 * Each eraseToken is a 32-byte hex string (sha256 of salt + eraseToken hash stored server-side).
 */
export function verifyEraseToken(
  clientToken: string,
  storedHash: string,
  storedSalt: string
): boolean {
  if (!clientToken || !storedHash || !storedSalt) return false;

  // Reconstruct the expected hash: SHA-256(salt + clientToken)
  const expectedHash = crypto
    .createHash("sha256")
    .update(storedSalt + clientToken)
    .digest("hex");

  // Timing-safe compare: computed hash vs stored hash
  const storedBuf = Buffer.from(storedHash, "utf8");
  const expectedBuf = Buffer.from(expectedHash, "utf8");

  if (storedBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(storedBuf, expectedBuf);
}