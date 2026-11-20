# Persistent Project Memory


### Entry [2026-11-18]
## Phase 1 Security + DPDP — Complete (Review 1 Ready)

### Files modified/added:
- `src/lib/security/api-guard.ts`: isRfc1918PrivateIp, verifyApiRequest, session cookie HMAC, actuation ticket issue/verify, consent verification, erase token comparison
- `src/lib/security/actuation-ticket.ts`: re-exports from api-guard + per-device nonce cache
- `src/app/api/auth/login/route.ts`: login handler with httpOnly SameSite=Strict cookie "sessionId.hmac"
- `src/app/api/admin-train/route.ts`: verifyApiRequest guard on GET/POST (req optional for backward-compat test entry)
- `src/app/api/actuate/route.ts`: verifyApiRequest guard + ticket validation (2s TTL, single-use nonce)
- `src/app/api/enrol/route.ts`: consentGranted===true guard, consentNoticeVersion + timestamp stored, eraseToken issued once (salt+sha256 only)
- `src/app/api/user-data/route.ts`: DELETE handler requiring eraseToken via timingSafeEqual; erases PGlite/Postgres rows + storage/*.json + flight-recorder JSONL tombstones with chain hash
- `src/db/schema.ts`: added eraseTokenSalt, eraseTokenHash columns to calibration_events
- `.env.example`: STEADYGATE_API_SECRET hint with openssl rand -hex 32
- `.gitignore`: storage/*.json, storage/*.jsonl, logs/*.jsonl, .env
- `tests/security-api-guard.test.ts`: 73 tests covering SSRF evasion, fail-closed, login/lockout, ticket single-use, erasure

### Verification results (all green):
- typecheck: 0 errors
- lint: 0 errors
- build: success
- security-api-guard.test.ts: 73 passed / 0 failed
- Python pytest: 47 passed / 0 failed

### Next step per plan:
STOP FOR REVIEW 1 — Report diffs + test output for user review before proceeding to Phase 2.
