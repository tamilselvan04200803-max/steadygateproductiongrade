# Contributing to SteadyGate

Thank you for your interest in contributing to **SteadyGate**! We welcome contributions from accessibility advocates, biomedical researchers, computer vision engineers, and smart-home enthusiasts.

---

## 🌟 Ways to Contribute

- **Report Bugs:** Open an issue with reproduction steps, browser version, and hardware details.
- **Suggest Features:** Propose new gesture repertoires, IoT bridge integrations, or accessibility adaptations.
- **Code Contributions:** Implement bug fixes, performance optimizations, or additional smart-home drivers.
- **Documentation:** Improve setup guides, architectural explanations, or clinical telemetry specs.
- **Spread the Word:** ⭐ Star the repository and share it with accessibility communities!

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js**: `v20.x` or later
- **Python**: `3.10` or later (`py` on Windows / `python3` on Unix)
- **Webcam**: Standard 30 FPS USB or integrated camera

### 1. Fork & Clone
```bash
git clone https://github.com/tamilselvan04200803-max/steadygateproductiongrade.git
cd steadygateproductiongrade
```

### 2. Install Dependencies
```bash
# Install Node.js packages
npm install

# Install Python package in editable mode with development dependencies
pip install -e ".[dev]"
```

### 3. Start Development Servers
```bash
# Terminal 1: Next.js Web Application
npm run dev

# Terminal 2: Python Digital Twin
npm run twin
```
Open [http://localhost:3000](http://localhost:3000) (or `http://localhost:3001`).

---

## 🛡️ Core Engineering Invariants (Do Not Violate)

When submitting pull requests, you must uphold SteadyGate's core architectural contracts:

1. **Zero Raw Video Persistence:** MediaPipe perception runs 100% locally in browser WebAssembly. Never persist raw video frames, image files, or base64 pixel strings to disk or transmit them over the network. Only 21 normalized landmarks (`Float32Array[21 * 2/3]`) and optical telemetry may be recorded.
2. **Acyclic Pipeline Order:** **Stage 4 (BMFLC-Kalman) runs BEFORE Stage 3B (SPRT intentionality gate).** Stage 3B must consume the tremor-decoupled voluntary trajectory $y_{\text{clean}}$, not trembling raw coordinates.
3. **Candidate Actuation Isolation:** Any experimental or newly trained model operates in **shadow mode** and must remain isolated from actuation until explicitly validated.
4. **Strict Freeze Mandate:** Never adjust classifier decision thresholds using evaluation or held-out test samples.
5. **Small Diffs Mandate:** Prefer small, targeted changes (<50 lines per edit) rather than wholesale file rewrites.

---

## 🧪 Pre-Commit Verification Gate

Before submitting a Pull Request, all automated verification gates must pass:

```bash
# 1. TypeScript strict typecheck
npm run typecheck

# 2. ESLint check
npm run lint

# 3. Full 8-step production verification suite (must be 100% green)
npm test

# 4. Optional: Run Python test suite
npm run test:py
```

---

## 📝 Pull Request Guidelines

1. Create a feature branch from `main`: `git checkout -b feature/your-feature-name`.
2. Commit with clear, descriptive messages following [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add Home Assistant WebSocket bridge`
   - `fix: resolve race condition in dwell ring reset`
   - `docs: improve optical pipeline documentation`
3. Push to your fork and submit a Pull Request against `main`.
4. Include evidence in your PR description (terminal output confirming `npm test` passed).

Thank you for helping make computing accessible to everyone! ♿🖐️
