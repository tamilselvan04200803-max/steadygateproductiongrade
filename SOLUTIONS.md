# Solutions & Verified Engineering Fixes — SteadyGate v6.0

## Verified Fix 1: React 19 Compiler Lint Errors & Effect Cascades Resolved Cleanly

### Symptom
`npm run lint` failed with 10 errors and 5 warnings under ESLint 9 + React 19 Compiler rules:
- `react-hooks/set-state-in-effect`: Synchronous `setState` inside `useEffect` triggering cascading renders across `src/app/page.tsx`, `AdminGestureTrainer.tsx`, `AuditLogView.tsx`, `DwellRingController.tsx`, and `EnrolmentModal.tsx`.
- `react-hooks/immutability`: Mutating `latestGestureRef.current` inside render/effect cycles.
- Forward-reference error in `LiveCameraStream.tsx`: `renderFrame` accessed before it was declared in `requestAnimationFrame(renderFrame)`.
- Missing dependencies in `useCallback` dependency arrays.

### Root Cause
React 19 compiler rules enforce strict immutability and prohibit synchronous state mutations within `useEffect` bodies to prevent unbuffered cascading re-renders. Forward-referenced `useCallback` functions prevent proper closure binding during render sweeps.

### Verified Solution
1. **`src/app/page.tsx`**: Replaced synchronous effect state mutations with callback-driven initialization and user-driven handlers. Synchronized refs outside effect cascades.
2. **`src/components/AdminGestureTrainer.tsx` & `AuditLogView.tsx`**: Refactored data-fetching functions into isolated asynchronous IIFEs within effects without triggering cascading render warnings.
3. **`src/components/LiveCameraStream.tsx`**: Hoisted `renderFrame` declaration before the registration effect and provided exhaustive dependency arrays.
4. **`src/components/DwellRingController.tsx` & `EnrolmentModal.tsx`**: Hoisted `evaluateGateOutcome` above effects, wrapped with `useCallback`, and shifted counter resets into user-driven button click handlers (`Start Live Camera Recording`).
5. Zero `eslint-disable` comments were added.

### Verification Evidence
- `npm run lint` exited with code `0`:
  `✖ 3 problems (0 errors, 3 warnings)`
  All remaining warnings are harmless unused console directives in legacy test files.

---

## Verified Fix 2: LAN Bridge HMAC Replay Protection & Python Nonce Cache Alignment

### Symptom
Security review noted that `verifyLanBridgeHmacRequest` in `src/lib/hardware/lan-bridge.ts` was unconditionally returning `HMAC_VERIFIED` after a cache refactoring, bypassing cryptographic signature validation. In Python `steadygate/twin.py`, nonces were checked in a raw dictionary that grew unboundedly.

### Root Cause
An earlier TypeScript cache refactoring removed the timing-safe signature comparison block in `lan-bridge.ts`. Python's `twin.py` was not wired to the newly authored `NonceCache` in `steadygate/cache.py`.

### Verified Solution
1. **`src/lib/hardware/lan-bridge.ts`**: Restored `computeLanBridgeHmacSignature(timestamp, nonce, payload, secret)` and timing-safe comparison using `crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))`.
2. **`steadygate/twin.py`**: Replaced unbound dictionary with `NonceCache(ttl_ms=10_000, max_size=4096)`, wired `prune()` on each request, and verified single-flight registration.
3. **`steadygate/cache.py`**: Fixed `CacheEntry` dataclass instantiation, LRU eviction syntax, and `Counter` deserialization.

### Verification Evidence
- `py -m pytest tests/test_cache.py -v`: 13/13 tests PASS.
- `py -m pytest -v`: 47/47 tests PASS.
- `npx tsx scripts/verify-v6-all.ts`: 8/8 test suites PASS (100% green).

---

## Verified Fix 3: TypeScript Cache Suite Compilation & Global Assertions

### Symptom
Cache test suite failed compilation under TypeScript strict mode due to relative import paths (`../../src/lib/cache`) and missing `@jest/globals` type definitions.

### Root Cause
Path aliases were configured as `@/*` in `tsconfig.json`, and `@jest/globals` was missing from `devDependencies`.

### Verified Solution
1. Standardized imports across `tests/lib/cache/*.test.ts` to `@/lib/cache`.
2. Installed `@jest/globals` into `devDependencies`.
3. Fixed nullability checks (`result!.count`, `result!.settings.theme`) and camelCase stats property (`stats.maxSize`).

### Verification Evidence
- `npx tsc --noEmit`: Exited with code `0` (0 errors).

---

## Verified Fix 4: Playwright & Chromium Headless Test Setup

### Symptom
The proposed browser smoke test required Playwright Chromium support for fake video capture flags on port 3101.

### Root Cause
`@playwright/test` was not yet installed in `devDependencies`, and Chromium binaries had not been provisioned.

### Verified Solution
1. Installed `@playwright/test` into `package.json`.
2. Provisioned headless Chromium browser binaries via `npx playwright install chromium`.

### Verification Evidence
- Package verified in `package.json` (`"@playwright/test": "^1.65.1"`).
- Chromium browser installed cleanly (exit code `0`).

---

## Current Monorepo State at Handoff

| Check | Command | Status |
|---|---|---|
| TypeScript Strict Check | `npm run typecheck` | ✅ **0 errors (code 0)** |
| ESLint React 19 Lint | `npm run lint` | ✅ **0 errors (code 0)** |
| Full 8-Step Verification Gate | `npm test` | ✅ **ALL 8/8 PASS (code 0)** |
| Python Digital Twin & Chaos | `npm run test:py` | ✅ **47/47 PASS (code 0)** |
| Out-of-Sample Calibration | `npm run calibrate` | ✅ **PASS (code 0)** |
| Gesture Robustness (HaGRID 500) | `npm run test:gesture` | ✅ **PASS (code 0)** |
| Challenger 1 Suite | `npm run test:challenger:1` | ✅ **PASS (code 0)** |
| Challenger 2 Suite | `npm run test:challenger:2` | ✅ **PASS (code 0)** |
| Global Adversarial (G1-G11) | `npm run test:global` | ✅ **PASS (code 0)** |
| Continuous Soak Replay | `npm run test:soak` | ✅ **PASS (code 0)** |

---

## Remaining Work Roadmap (for OpenCode Continuation)

- **Phase 0:** Complete `tests/fake-camera-smoke.test.ts` with `--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`, `--use-file-for-fake-video-capture`, serving production build on port 3101 (`NEXT_DIST_DIR=.next_verify next start -p 3101`).
- **Phase 1 (Security + DPDP):** Implement `src/lib/security/api-guard.ts` (SSRF-hardened canonical RFC1918, `POST /api/auth/login` session cookie with HMAC, signed single-use actuation tickets in `/api/actuate`, `DELETE /api/user-data` locked atomic tombstones in flight recorder, `.env.example`, gitignore personal storage). **-> Stop for Review 1.**
- **Phase 2 (Provenance & Terminology):** Update `docs/reports/VALIDATION_REPORT.md` and `CLAIMS_LEDGER.json`, purge "clinical" without renaming config keys, add `tests/claims-provenance.test.ts`, define measured end-to-end latency.
- **Phase 3 (Shelly Driver):** Implement `src/lib/hardware/shelly-client.ts` and `POST /api/shelly` with signed tickets, Zod-validated `STEADYGATE_APPLIANCE_MAP`, mock transport, SHA-256 digest auth, `toggle_after` only on ON. **-> Stop for Review 2.**
- **Phase 4 (Earcons):** Wire `earcons.ts` into "Start camera" click, `DwellRingController`, `LiveCameraStream`, and Header (mute + volume), milestone chimes, selective `aria-live`.
- **Phase 5 (Gesture Drawer):** Convert `GestureVisualGuides` to non-modal slide-over with $\ge 44\text{ px}$ targets and `tests/gesture-drawer-a11y.test.ts`.
- **Phase 6 (Three.js):** Plain Three.js digital twin with single perception-owned rAF, stepped throttling based on rolling p95 latency, context-loss recovery.
- **Phase 7 (Flagship Gate):** Expand `scripts/verify-v6-all.ts` into 19 individual steps with spawn env, audit waiver, and tsconfig diff check.
