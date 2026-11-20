# SteadyGate — Engineering Verification Report & Research Prototype Checkpoint

> **Status:** Research Prototype Checkpoint (`v6.0-prototype`)  
> **Repository:** `steadygate-prior-art-analysis`  
> **Date:** 2026-11-20  
> **Acyclic Contract:** Stage 4 (BMFLC-Kalman) $\to$ Stage 3B (SPRT + Mondrian Conformal)  
> **Regulatory Notice:** **Research prototype only.** Not evaluated, cleared, or approved by the FDA, EMA, or any regulatory agency. Not a medical device or Software as a Medical Device (SaMD). Not for clinical diagnosis, patient monitoring, or life-critical actuation.

---

## 1. Executive Summary

SteadyGate is an offline-first, tremor-compensated assistive smart-home control engine engineered for individuals with involuntary movement disorders (Parkinsonian rest tremor, essential tremor, choreiform dyskinesia, head titubation, and arthritic finger contracture).

This checkpoint establishes a clean, auditable **research prototype release** with all core biomechanical and safety invariants intact, benchmark terminology corrected, security boundaries verified, and build artifacts/user data purged from version control.

### Verification Matrix Summary

| Suite / Gate | Test Script / Command | Checks / Tests | Result | Target Metric |
| :--- | :--- | :---: | :---: | :--- |
| **Step 1: TypeScript Compiler** | `npm run typecheck` | Strict compilation | **PASS** (0 errors) | Zero type errors (`noEmit: true`) |
| **Step 2: Out-of-Sample Calibration** | `npm run calibrate` | Disjoint 50/50 ($N=500$) | **PASS** | Held-out $\text{ROC AUC} \ge 0.95$ (achieved `0.9542`) |
| **Step 3: Gesture Robustness** | `npm run test:gesture` | 26 checks (HaGRID 500) | **PASS** (26/26) | HaGRID $\ge 98\%$ (`100.0%`), Object Grasp FP $= 0$ |
| **Step 4: Challenger 1 Adversarial** | `npm run test:challenger:1` | 18 checks (Batteries 1–4) | **PASS** (18/18) | Bare-hand FP $= 0$, Object holds blocked $= 100\%$ |
| **Step 5: Challenger 2 Adversarial** | `npm run test:challenger:2` | 70 checks (Suites 1–7) | **PASS** (70/70) | Tremor tracking $4\text{--}14\text{ Hz}$, Acyclic order Stage 4 $\to$ 3B |
| **Step 6: Global Multi-Seed G1–G11** | `npm run test:global` | 41 checks (Seeds 42, 101, 2026) | **PASS** (41/41) | Multi-seed deterministic repeatability, zero FA |
| **Step 7: Python Digital Twin** | `npm run test:py` | 26 pytest cases | **PASS** (26/26) | Chaos matrix, flight recorder, virtual twin |
| **Step 8: Simulated Motor Replay** | `npm run test:soak` | 62.5h simulated replay | **PASS** (0 FA) | $\text{FA/hr} \le 0.05$ (Rule-of-3 bound: $\le 0.0480$) |
| **Shadow Mode Lifecycle** | `npx tsx tests/shadow-mode-lifecycle.test.ts` | 15 checks | **PASS** (15/15) | Candidate isolation, promotion barrier, instant rollback |
| **Security Guard API** | `npx tsx tests/security-api-guard.test.ts` | 73 checks | **PASS** (73/73) | RFC1918 SSRF guard, HMAC tickets, timing-safe auth |

---

## 2. Benchmark Terminology Corrections & Methodological Grounding

To maintain scientific integrity and prevent conflating algorithmic simulation with clinical evidence, the following terminology distinctions are formally adopted across all codebase artifacts:

### 2.1 Internal Actuation Overhead $\ne$ Total Activation Latency
- In simulated loop benchmarks (`tools/soak-replay.ts`), the measured step delay at trigger is reported as `0 ms`.
- **Methodological Correction:** This `0 ms` figure represents the internal execution step overhead of the simulation test harness once gating conditions are satisfied.
- **Real-World Latency Reality:** Total real-world activation latency ($T_{\text{act}}$) is bounded by hardware and physiological processes:
  $$\text{Total Latency} = t_{\text{frame\_capture}} (\approx 33.3\text{ ms}) + t_{\text{mediapipe}} (\approx 15\text{--}30\text{ ms}) + t_{\text{pipeline}} (< 1.0\text{ ms}) + t_{\text{SPRT\_dwell}} (\approx 400\text{--}800\text{ ms}) \approx 450\text{--}900\text{ ms}$$
- Calling internal loop step delay "total activation latency" has been corrected to **Simulated Actuation Step Overhead**.

### 2.2 62.5 Hours of Simulated Replay $\ne$ Clinical Observation
- `tools/soak-replay.ts` executes $6,750,065$ synthetic frames across 5 mathematical motor profiles ($12.5\text{ h}$ each) generating simulated harmonic tremor and non-gesture idle trajectories.
- **Methodological Correction:** This is a deterministic **algorithmic stability and stress replay benchmark**, not clinical observation or human patient trial data.
- The term "clinical soak" has been replaced throughout with **Simulated Multi-Hour Pathological Replay**.

### 2.3 Synthetic Gesture Accuracy $\ne$ Real-World In-Situ Accuracy
- Mathematical gesture coordinate generators (`generateSyntheticGestureLandmarks`) produce idealized landmark geometries with additive Gaussian or harmonic perturbations.
- **Methodological Correction:** 100% accuracy on synthetic generators establishes that the mathematical rule-engine and state machines behave correctly under modeled inputs; it does **not** establish real-world accuracy under real camera optics, lens distortion, auto-exposure hunting, skin pigmentation variations, or natural ambient occlusions.

---

## 3. Dataset Provenance & Split Architecture

| Dataset / Fixture | Size / Partition | Modality | Provenance & Description |
| :--- | :--- | :--- | :--- |
| **HaGRID Human Benchmark** | $N=500$ stratified samples | Real 2D landmarks from human video | Kapitanov et al. (2024), stratified across 10 gesture classes, normalized to $21 \times 2$ bounding-box coordinates. |
| **Held-Out Calibration Split** | $50/50$ disjoint ($N=250$ calib, $N=250$ test) | Real landmarks + $\sigma_\theta = 3.5^\circ$ noise | Disjoint participant partition used to calibrate Mondrian conformal quantiles ($\alpha = 0.05$) without leakage into test verification. |
| **100DOH Taxonomy Fixtures** | 5 contact states ($N=500$) | Annotated interaction geometries | 100 Days of Hands dataset: `NO_CONTACT`, `SELF_CONTACT`, `OTHER_PERSON`, `PORTABLE_OBJECT`, `STATIONARY_OBJECT`. |
| **Real Failure Cases** | 6 fixtures (`CASE_1` to `CASE_6` + mirrors) | Live camera captures | Negative object-grasp fixtures: book spine, cup grasp, smartphone grip, edge-on palm, and partial finger occlusion. |
| **Simulated Pathological Profiles** | 5 profiles ($12.5\text{ h}$ each = $62.5\text{ h}$) | Synthetic continuous kinematics | Mathematical harmonic tremor models: PD ($4\text{--}6\text{ Hz}$), ET ($5.2 + 9.4\text{ Hz}$), LID ($1\text{--}3\text{ Hz}$), Titubation ($5\text{ Hz}$), Contracture ($0.52\text{ ROM}$). |

---

## 4. Architectural Safety Invariants

### 4.1 Acyclic Pipeline Contract (Stage 4 $\to$ Stage 3B)
The pipeline strictly enforces the forward acyclic invariant:
$$\text{Stage 1 (Optics)} \to \text{Stage 2 (Kinematics CKF)} \to \text{Stage 3A (100DOH Contact)} \to \mathbf{\text{Stage 4 (BMFLC Tremor)}} \to \mathbf{\text{Stage 3B (SPRT Intent)}} \to \text{Stage 5 (Air-Dial Actuation)}$$
- **Stage 4 runs BEFORE Stage 3B:** Stage 3B consumes the voluntary trajectory $y_{\text{clean}}$, tremor RMS amplitude $A_{\text{rms}}$, and `dyskinesiaLikelihood` produced by Stage 4.
- This guarantees that intent gating evaluates tremor-stabilized voluntary biomechanics, completely preventing trembling coordinates from corrupting likelihood ratio tests.

### 4.2 Shadow Mode Isolation & Promotion Gate
- **Zero Actuation Leakage:** Candidate models registered in shadow mode evaluate live or replay frames concurrently with production, but candidate decisions are strictly quarantined from the hardware actuation dispatcher.
- **Fail-Closed Promotion Invariants:** Automatic promotion to production is strictly blocked unless:
  1. Accumulated shadow evaluation frames $\ge 1,000$.
  2. Production-candidate agreement rate $\ge 98.0\%$.
  3. False Acceptance Rate delta $\le 0.001$.
- **Instant Rollback:** One-click rollback restores the previous production model state within $0.05\text{ ms}$ with full audit history.

### 4.3 Security & Privacy Guards
- **Private Network Boundaries:** Strict RFC 1918 canonical decimal IP validation blocks SSRF attacks against internal networks and cloud metadata endpoints (`169.254.169.254`).
- **Single-Use Actuation Tickets:** Physical actuation requires an HMAC-SHA256 signed ticket with a 2,000 ms TTL and nonce caching to prevent replay attacks.
- **Zero Client Token Exposure:** Admin tokens (`STEADYGATE_ADMIN_TOKEN`, `STEADYGATE_API_SECRET`) are never bundled in client code, never returned in API response bodies, and authenticated via constant-time comparisons (`crypto.timingSafeEqual`).
- **DPDP Erase Compliance:** User deletion requests execute atomic tombstones in the local append-only recorder and verify 32-byte hex erase tokens using SHA-256 salt hashes.

---

## 5. Known Limitations & Research Boundaries

1. **Illumination Extremes:** Under illuminance $< 15\text{ lux}$ (Mean Luminance $< 0.15$), MediaPipe landmark jitter increases by up to $300\%$, triggering the fail-closed `SAFE_IDLE_LOW_SQI` gate.
2. **Severe Joint Contracture Ceiling:** Individuals with passive finger extension Range of Motion $< 0.40$ (severe Dupuytren's or advanced Parkinsonian rigidity) cannot generate distinct open-palm geometries without individual personalized prototype enrollment.
3. **Hardware Actuator Boundary:** External smart-home relays (e.g. Shelly, MQTT) require local LAN reachability; this checkpoint validates the authenticated software bridge and simulated digital twin.
4. **Browser Runtime Constraints:** Real-time execution requires WebAssembly and WebGL acceleration. Performance on devices lacking GPU acceleration may experience frame drop during simultaneous 3D scene rendering.

---

## 6. Reproducible Execution Commands

```bash
# 1. Typecheck & Lint
npm run typecheck
npm run lint

# 2. Complete 8-Step Verification Gate
npm test

# 3. Individual Subsystem Suites
npm run calibrate          # 50/50 disjoint out-of-sample split calibration
npm run test:gesture       # HaGRID 500 real human benchmark & object-grasp tests
npm run test:challenger:1  # Challenger 1 adversarial grasp & vision suite
npm run test:challenger:2  # Challenger 2 tremor f0 & admin trainer suite
npm run test:global        # Global multi-seed adversarial batteries G1-G11
npm run test:py            # Python digital twin & chaos lab pytest suite
npm run test:soak          # 62.5h continuous simulated pathological replay

# 4. Shadow Mode & Security Verification
npx tsx tests/shadow-mode-lifecycle.test.ts
npx tsx tests/security-api-guard.test.ts
npx tsx scripts/evaluate-adaptive-classifiers.ts
```
