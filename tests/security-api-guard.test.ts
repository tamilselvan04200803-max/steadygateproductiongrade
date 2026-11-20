/**
 * SteadyGate Security API Guard Tests
 * Phase 1: SSRF evasion, fail-closed, login/lockout, ticket single-use, erasure
 *
 * Run: node ./node_modules/tsx/dist/cli.mjs tests/security-api-guard.test.ts
 */

import assert from "node:assert";
import {
  isRfc1918PrivateIp,
  verifyApiRequest,
  createSessionCookieValue,
  verifySessionCookie,
  verifyConsent,
  verifyEraseToken,
  issueActuationTicket,
  verifyActuationTicket,
} from "../src/lib/security/api-guard";
import crypto from "node:crypto";

// Helper: create a mock Request object for verifyApiRequest
// Host must come from the URL (undici strips the "host" header as forbidden).
function mockRequest(opts: {
  host?: string;
  origin?: string;
  cookie?: string;
  method?: string;
  body?: Record<string, unknown>;
}): Request {
  const headers: Record<string, string> = {};
  if (opts.origin) headers["origin"] = opts.origin;
  if (opts.cookie) headers["cookie"] = opts.cookie;

  return new Request(`http://${opts.host ?? "localhost"}/`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  ✓ [PASS] ${name}${detail ? ` (${detail})` : ""}`);
  } else {
    failed += 1;
    console.error(`  ✗ [FAIL] ${name}${detail ? ` (${detail})` : ""}`);
    process.exitCode = 1;
  }
}

function suite(name: string, fn: () => void) {
  console.log(`\n== ${name} ==`);
  fn();
}

// ---- isRfc1918PrivateIp Tests ----
suite("isRfc1918PrivateIp", () => {
  // RFC1918 positive cases
  check("10.0.0.0/8 matches", isRfc1918PrivateIp("10.0.0.0"));
  check("10.255.255.255 matches", isRfc1918PrivateIp("10.255.255.255"));
  check("10.1.2.3 matches", isRfc1918PrivateIp("10.1.2.3"));

  check("172.16.0.0/12 matches", isRfc1918PrivateIp("172.16.0.0"));
  check("172.31.255.255 matches", isRfc1918PrivateIp("172.31.255.255"));
  check("172.30.0.1 matches", isRfc1918PrivateIp("172.30.0.1"));

  check("192.168.0.0/16 matches", isRfc1918PrivateIp("192.168.0.0"));
  check("192.168.255.255 matches", isRfc1918PrivateIp("192.168.255.255"));
  check("192.168.1.1 matches", isRfc1918PrivateIp("192.168.1.1"));

  // IPv6 rejection
  check("rejects ::1", isRfc1918PrivateIp("::1") === false);
  check("rejects 2001:db8::1", isRfc1918PrivateIp("2001:db8::1") === false);
  check("rejects fe80::1", isRfc1918PrivateIp("fe80::1") === false);

  // IPv4-mapped IPv6 rejection
  check("rejects 0:0:0:0:0:0:10.0.0.1", isRfc1918PrivateIp("0:0:0:0:0:0:10.0.0.1") === false);
  check("rejects ::ffff:10.0.0.1", isRfc1918PrivateIp("::ffff:10.0.0.1") === false);

  // Octal / leading zero rejection
  check("rejects 010.0.0.1", isRfc1918PrivateIp("010.0.0.1") === false);
  check("rejects 10.00.0.1", isRfc1918PrivateIp("10.00.0.1") === false);
  check("rejects 010.010.010.010", isRfc1918PrivateIp("010.010.010.010") === false);

  // Hex rejection
  check("rejects 0x0a.0.0.1", isRfc1918PrivateIp("0x0a.0.0.1") === false);
  check("rejects 0x0a.0x00.0x00.0x01", isRfc1918PrivateIp("0x0a.0x00.0x00.0x01") === false);

  // Leading zeros in any octet
  check("rejects 10.01.0.1", isRfc1918PrivateIp("10.01.0.1") === false);
  check("rejects 10.0.01.1", isRfc1918PrivateIp("10.0.01.1") === false);
  check("rejects 10.0.0.01", isRfc1918PrivateIp("10.0.0.01") === false);

  // DNS hostname rejection
  check("rejects localhost", isRfc1918PrivateIp("localhost") === false);
  check("rejects 192.168.1.1.local", isRfc1918PrivateIp("192.168.1.1.local") === false);
  check("rejects internal.example.com", isRfc1918PrivateIp("internal.example.com") === false);

  // Malformed IPs
  check("rejects 10.0.0 (3 octets)", isRfc1918PrivateIp("10.0.0") === false);
  check("rejects 10.0.0.0.1 (5 octets)", isRfc1918PrivateIp("10.0.0.0.1") === false);
  check("rejects 10.0.0.a (non-numeric)", isRfc1918PrivateIp("10.0.0.a") === false);

  // Not RFC1918 but syntactically valid decimal
  check("rejects 0.0.0.0", isRfc1918PrivateIp("0.0.0.0") === false);
  check("rejects 127.0.0.1 (loopback)", isRfc1918PrivateIp("127.0.0.1") === false);
  check("rejects 172.32.0.0", isRfc1918PrivateIp("172.32.0.0") === false);
  check("rejects 172.0.0.0", isRfc1918PrivateIp("172.0.0.0") === false);
  check("rejects 192.169.0.0", isRfc1918PrivateIp("192.169.0.0") === false);

  // Boundary values
  check("boundary 172.16.0.0 matches", isRfc1918PrivateIp("172.16.0.0"));
  check("boundary 172.31.255.255 matches", isRfc1918PrivateIp("172.31.255.255"));
});

// ---- verifyApiRequest Tests ----
suite("verifyApiRequest", () => {
  const secret = "a".repeat(64); // 64 chars, well over 32

  process.env.STEADYGATE_API_SECRET = secret;
  process.env.ALLOWED_HOSTS = "localhost,steadi-gate.local";

  try {
    // Fail closed when SECRET unset
    {
      const original = process.env.STEADYGATE_API_SECRET;
      delete process.env.STEADYGATE_API_SECRET;
      try {
        const req = mockRequest({ host: "localhost" });
        const result = verifyApiRequest(req, { requireAuth: true, requireSession: false });
        check(
          "fail closed when SECRET unset",
          result.authorized === false && result.status === 403 && result.reason === "API_SECRET_MISSING_OR_TOO_SHORT"
        );
      } finally {
        process.env.STEADYGATE_API_SECRET = original;
      }
    }

    // Fail closed when SECRET < 32 chars
    {
      const original = process.env.STEADYGATE_API_SECRET;
      process.env.STEADYGATE_API_SECRET = "short";
      try {
        const req = mockRequest({ host: "localhost" });
        const result = verifyApiRequest(req, { requireAuth: true, requireSession: false });
        check(
          "fail closed when SECRET < 32 chars",
          result.authorized === false && result.status === 403 && result.reason === "API_SECRET_MISSING_OR_TOO_SHORT"
        );
      } finally {
        process.env.STEADYGATE_API_SECRET = original;
      }
    }

    // Accepts allowed host
    {
      const req = mockRequest({ host: "localhost", origin: "http://localhost:3000", method: "POST" });
      const result = verifyApiRequest(req, { requireAuth: true, requireSession: false });
      check("accepts allowed host", result.authorized === true && result.status === 200);
    }

    // Rejects non-allowed host
    {
      const req = mockRequest({ host: "evil-domain.com" });
      const result = verifyApiRequest(req, { requireAuth: true, requireSession: false });
      check(
        "rejects non-allowed host",
        result.authorized === false && result.status === 403 && result.reason === "HOST_NOT_IN_ALLOWLIST"
      );
    }

    // Checks Origin on POST
    {
      const req = mockRequest({ host: "localhost", origin: "http://evil-site.com", method: "POST" });
      const result = verifyApiRequest(req, { requireAuth: true, requireSession: false });
      check(
        "checks Origin on POST",
        result.authorized === false && result.status === 403 && result.reason === "ORIGIN_NOT_IN_ALLOWLIST"
      );
    }

    // Allows GET without Origin check
    {
      const req = mockRequest({ host: "localhost", origin: "http://evil-site.com", method: "GET" });
      const result = verifyApiRequest(req, { requireAuth: true, requireSession: false });
      check("allows GET without Origin check", result.authorized === true && result.status === 200);
    }

    // Allows POST without Origin header
    {
      const req = mockRequest({ host: "localhost", method: "POST" });
      const result = verifyApiRequest(req, { requireAuth: true, requireSession: false });
      check("allows POST without Origin header", result.authorized === true && result.status === 200);
    }
  } finally {
    delete process.env.STEADYGATE_API_SECRET;
    delete process.env.ALLOWED_HOSTS;
  }
});

// ---- Session cookie integration tests ----
suite("session cookie integration", () => {
  const secret = "a".repeat(64);
  process.env.STEADYGATE_API_SECRET = secret;

  try {
    const cookieValue = createSessionCookieValue(secret);
    check("cookie format sessionId.hmac", /^[0-9a-f]{48}\.[0-9a-f]{64}$/.test(cookieValue));

    check("verifySessionCookie roundtrip", verifySessionCookie(cookieValue, secret));

    check("reject cookie with wrong secret", verifySessionCookie(cookieValue, "b".repeat(64)) === false);

    check("reject malformed cookie 'bad-format'", verifySessionCookie("bad-format", secret) === false);
    check("reject malformed cookie 'one.two.three'", verifySessionCookie("one.two.three", secret) === false);
    check("reject empty cookie", verifySessionCookie("", secret) === false);
  } finally {
    delete process.env.STEADYGATE_API_SECRET;
  }
});

// ---- Actuation ticket tests ----
suite("actuation ticket", () => {
  const secret = "a".repeat(64);
  process.env.STEADYGATE_API_SECRET = secret;

  try {
    const ticket = issueActuationTicket("light_1", "SET_POWER_ON", secret);
    check("ticket has ticketId", typeof ticket.ticketId === "string" && ticket.ticketId.length > 0);
    check("ticket has sessionId", typeof ticket.sessionId === "string" && ticket.sessionId.length > 0);
    check("ticket applianceId matches", ticket.applianceId === "light_1");
    check("ticket command matches", ticket.command === "SET_POWER_ON");
    check("ticket nonce defined", typeof ticket.nonce === "string" && ticket.nonce.length > 0);
    check("ticket issuedAt defined", typeof ticket.issuedAt === "number" && ticket.issuedAt > 0);
    check("ticket expiresAt defined", typeof ticket.expiresAt === "number" && ticket.expiresAt > 0);
    check("ticket hmac defined", typeof ticket.hmac === "string" && ticket.hmac.length > 0);
    check("ticket expiresAt > issuedAt", ticket.expiresAt > ticket.issuedAt);
    check("ticket TTL <= 2000ms", ticket.expiresAt - ticket.issuedAt <= 2000);

    // Replay detection
    const result1 = verifyActuationTicket(ticket, "light_1", "SET_POWER_ON", secret);
    check("first use valid", result1.valid === true);
    const result2 = verifyActuationTicket(ticket, "light_1", "SET_POWER_ON", secret);
    check("replay rejected", result2.valid === false && result2.reason === "TICKET_REPLAY_DETECTED");

    // Expired ticket
    const expiredTicket = issueActuationTicket("light_1", "SET_POWER_ON", secret);
    expiredTicket.expiresAt = Date.now() - 1000;
    expiredTicket.issuedAt = Date.now() - 3000;
    const expiredResult = verifyActuationTicket(expiredTicket, "light_1", "SET_POWER_ON", secret);
    check("expired ticket rejected", expiredResult.valid === false && expiredResult.reason === "TICKET_EXPIRED");

    // Wrong appliance ID — ticket issued for light_1, server expects light_2
    const wrongAppliance = issueActuationTicket("light_1", "SET_POWER_ON", secret);
    const wrongApplianceResult = verifyActuationTicket(wrongAppliance, "light_2", "SET_POWER_ON", secret);
    check(
      "wrong appliance rejected",
      wrongApplianceResult.valid === false && wrongApplianceResult.reason === "TICKET_APPLIANCE_MISMATCH"
    );

    // Wrong command — ticket issued for SET_POWER_ON, server expects SET_POWER_OFF
    const wrongCommand = issueActuationTicket("light_1", "SET_POWER_ON", secret);
    const wrongCommandResult = verifyActuationTicket(wrongCommand, "light_1", "SET_POWER_OFF", secret);
    check(
      "wrong command rejected",
      wrongCommandResult.valid === false && wrongCommandResult.reason === "TICKET_COMMAND_MISMATCH"
    );
  } finally {
    delete process.env.STEADYGATE_API_SECRET;
  }
});

// ---- Consent verification tests ----
suite("consent verification", () => {
  check("accepts valid consent", verifyConsent({ consentGranted: true, consentNoticeVersion: "1.0", consentTimestamp: Date.now() }));
  check("rejects consentGranted false", verifyConsent({ consentGranted: false, consentNoticeVersion: "1.0", consentTimestamp: Date.now() }) === false);
  check("rejects missing consentNoticeVersion", verifyConsent({ consentGranted: true, consentTimestamp: Date.now() }) === false);
  check("rejects empty consentNoticeVersion", verifyConsent({ consentGranted: true, consentNoticeVersion: "", consentTimestamp: Date.now() }) === false);
  check("rejects missing consentTimestamp", verifyConsent({ consentGranted: true, consentNoticeVersion: "1.0" }) === false);
});

// ---- Erase token verification tests ----
suite("verifyEraseToken", () => {
  const salt = "a".repeat(32); // 32 hex chars = 16 bytes
  const expectedHash = crypto.createHash("sha256").update(salt + "my-secret-token").digest("hex");

  check("verifies valid erase token", verifyEraseToken("my-secret-token", expectedHash, salt));
  check("rejects wrong token", verifyEraseToken("wrong-token", expectedHash, salt) === false);
  check("rejects missing client token", verifyEraseToken("", expectedHash, salt) === false);
  check("rejects missing stored hash", verifyEraseToken("token", "", salt) === false);
  check("rejects missing stored salt", verifyEraseToken("token", expectedHash, "") === false);
});

// ---- Summary ----
console.log(`\n========================================`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log(`========================================`);
if (failed > 0) {
  process.exit(1);
}